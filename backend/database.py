"""
MySQL Database Wrapper - MongoDB-compatible API over MySQL with JSON storage.
Each MongoDB collection maps to a MySQL table with a single `doc` JSON column.
"""
import aiomysql
import json
import os
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


def _serialize_value(v):
    """Convert Python objects to JSON-safe types."""
    if isinstance(v, datetime):
        return v.isoformat()
    if isinstance(v, bytes):
        return v.decode('utf-8', errors='replace')
    return v


def _serialize_doc(doc: dict) -> str:
    """Serialize a document dict to JSON string."""
    def default_serializer(obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, bytes):
            return obj.decode('utf-8', errors='replace')
        raise TypeError(f"Object of type {type(obj)} is not JSON serializable")
    return json.dumps(doc, default=default_serializer)


def _deserialize_doc(raw) -> dict:
    """Parse a JSON string or dict from MySQL into a Python dict."""
    if raw is None:
        return None
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        return json.loads(raw)
    if isinstance(raw, bytes):
        return json.loads(raw.decode('utf-8'))
    return raw


def _build_where(query: dict) -> Tuple[str, list]:
    """Build a WHERE clause from a MongoDB-style query dict."""
    if not query:
        return "1=1", []

    clauses = []
    params = []

    for key, value in query.items():
        if key == "$or":
            or_clauses = []
            for sub_query in value:
                sub_where, sub_params = _build_where(sub_query)
                or_clauses.append(f"({sub_where})")
                params.extend(sub_params)
            clauses.append(f"({' OR '.join(or_clauses)})")
        elif isinstance(value, dict):
            for op, op_val in value.items():
                json_path = f"JSON_UNQUOTE(JSON_EXTRACT(doc, '$.{key}'))"
                if op == "$in":
                    if not op_val:
                        clauses.append("1=0")  # Empty IN means no match
                    else:
                        placeholders = ", ".join(["%s"] * len(op_val))
                        clauses.append(f"{json_path} IN ({placeholders})")
                        params.extend([str(v) for v in op_val])
                elif op == "$ne":
                    clauses.append(f"({json_path} != %s OR {json_path} IS NULL)")
                    params.append(str(op_val))
                elif op == "$gt":
                    clauses.append(f"CAST({json_path} AS DECIMAL(20,4)) > %s")
                    params.append(op_val)
                elif op == "$gte":
                    clauses.append(f"CAST({json_path} AS DECIMAL(20,4)) >= %s")
                    params.append(op_val)
                elif op == "$lt":
                    clauses.append(f"CAST({json_path} AS DECIMAL(20,4)) < %s")
                    params.append(op_val)
                elif op == "$lte":
                    clauses.append(f"CAST({json_path} AS DECIMAL(20,4)) <= %s")
                    params.append(op_val)
                elif op == "$regex":
                    pattern = op_val
                    options = value.get("$options", "")
                    if "i" in options:
                        clauses.append(f"LOWER({json_path}) LIKE LOWER(%s)")
                    else:
                        clauses.append(f"{json_path} LIKE %s")
                    params.append(f"%{pattern}%")
                elif op == "$exists":
                    if op_val:
                        clauses.append(f"JSON_EXTRACT(doc, '$.{key}') IS NOT NULL")
                    else:
                        clauses.append(f"JSON_EXTRACT(doc, '$.{key}') IS NULL")
        elif isinstance(value, bool):
            clauses.append(f"JSON_EXTRACT(doc, '$.{key}') = %s")
            params.append(json.dumps(value))
        elif isinstance(value, (int, float)):
            clauses.append(f"JSON_EXTRACT(doc, '$.{key}') = %s")
            params.append(value)
        else:
            clauses.append(f"JSON_UNQUOTE(JSON_EXTRACT(doc, '$.{key}')) = %s")
            params.append(str(value))

    return " AND ".join(clauses) if clauses else "1=1", params


def _build_update_sql(update: dict) -> Tuple[str, list]:
    """Build SET clause from MongoDB-style update operators."""
    set_parts = []
    params = []

    if "$set" in update:
        for key, value in update["$set"].items():
            if "." in key:
                # Handle nested paths like "tables.$.photo_url"
                # For simplicity, skip positional operator and handle in code
                pass
            else:
                set_parts.append(f"doc = JSON_SET(doc, '$.{key}', CAST(%s AS JSON))")
                params.append(json.dumps(_serialize_value(value)))

    if "$inc" in update:
        for key, value in update["$inc"].items():
            if isinstance(value, int):
                set_parts.append(
                    f"doc = JSON_SET(doc, '$.{key}', "
                    f"COALESCE(CAST(JSON_EXTRACT(doc, '$.{key}') AS SIGNED), 0) + %s)"
                )
            else:
                set_parts.append(
                    f"doc = JSON_SET(doc, '$.{key}', "
                    f"COALESCE(CAST(JSON_EXTRACT(doc, '$.{key}') AS DECIMAL(20,2)), 0) + %s)"
                )
            params.append(value)

    if "$setOnInsert" in update:
        # Handled separately during upsert
        pass

    if not set_parts:
        return None, []

    return ", ".join(set_parts), params


class MySQLCursor:
    """Mimics MongoDB cursor with sort() and to_list() methods."""

    def __init__(self, pool, table: str, query: dict, projection: dict = None):
        self.pool = pool
        self.table = table
        self.query = query or {}
        self.projection = projection
        self._sort_field = None
        self._sort_dir = "ASC"
        self._limit = None

    def sort(self, field, direction=-1):
        self._sort_field = field
        self._sort_dir = "DESC" if direction == -1 else "ASC"
        return self

    async def to_list(self, limit=1000):
        self._limit = limit
        where_clause, params = _build_where(self.query)
        sql = f"SELECT doc FROM `{self.table}` WHERE {where_clause}"

        if self._sort_field:
            json_path = f"JSON_EXTRACT(doc, '$.{self._sort_field}')"
            sql += f" ORDER BY {json_path} {self._sort_dir}"

        if self._limit:
            sql += f" LIMIT {self._limit}"

        async with self.pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(sql, params)
                rows = await cur.fetchall()

        results = []
        for row in rows:
            doc = _deserialize_doc(row[0])
            if doc:
                doc.pop('_id', None)
                results.append(doc)
        return results


class UpdateResult:
    def __init__(self, matched=0, modified=0):
        self.matched_count = matched
        self.modified_count = modified


class DeleteResult:
    def __init__(self, deleted=0):
        self.deleted_count = deleted


class MySQLCollection:
    """Mimics a MongoDB collection backed by a MySQL table with JSON doc column."""

    def __init__(self, pool, table_name: str):
        self.pool = pool
        self.table = table_name

    async def find_one(self, query: dict = None, projection: dict = None) -> Optional[dict]:
        where_clause, params = _build_where(query or {})
        sql = f"SELECT doc FROM `{self.table}` WHERE {where_clause} LIMIT 1"
        try:
            async with self.pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute(sql, params)
                    row = await cur.fetchone()
            if row:
                doc = _deserialize_doc(row[0])
                if doc:
                    doc.pop('_id', None)
                return doc
            return None
        except Exception as e:
            logger.error(f"find_one error on {self.table}: {e}")
            return None

    def find(self, query: dict = None, projection: dict = None) -> MySQLCursor:
        return MySQLCursor(self.pool, self.table, query or {}, projection)

    async def insert_one(self, document: dict):
        doc_copy = dict(document)
        doc_copy.pop('_id', None)
        doc_json = _serialize_doc(doc_copy)
        sql = f"INSERT INTO `{self.table}` (doc) VALUES (%s)"
        try:
            async with self.pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute(sql, (doc_json,))
                    await conn.commit()
        except Exception as e:
            logger.error(f"insert_one error on {self.table}: {e}")
            raise

    async def insert_many(self, documents: list):
        if not documents:
            return
        sql = f"INSERT INTO `{self.table}` (doc) VALUES (%s)"
        values = []
        for doc in documents:
            doc_copy = dict(doc)
            doc_copy.pop('_id', None)
            values.append((_serialize_doc(doc_copy),))
        try:
            async with self.pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.executemany(sql, values)
                    await conn.commit()
        except Exception as e:
            logger.error(f"insert_many error on {self.table}: {e}")
            raise

    async def update_one(self, query: dict, update: dict, upsert: bool = False) -> UpdateResult:
        where_clause, where_params = _build_where(query)

        # Handle $push and $pull specially (read-modify-write)
        if "$push" in update or "$pull" in update:
            return await self._update_with_array_ops(query, update, where_clause, where_params)

        set_sql, set_params = _build_update_sql(update)

        if set_sql:
            sql = f"UPDATE `{self.table}` SET {set_sql} WHERE {where_clause} LIMIT 1"
            all_params = set_params + where_params
            try:
                async with self.pool.acquire() as conn:
                    async with conn.cursor() as cur:
                        await cur.execute(sql, all_params)
                        affected = cur.rowcount
                        await conn.commit()

                if affected == 0 and upsert:
                    return await self._do_upsert(query, update)
                return UpdateResult(matched=affected, modified=affected)
            except Exception as e:
                logger.error(f"update_one error on {self.table}: {e}")
                if upsert:
                    return await self._do_upsert(query, update)
                return UpdateResult()
        elif upsert:
            return await self._do_upsert(query, update)
        return UpdateResult()

    async def _do_upsert(self, query: dict, update: dict) -> UpdateResult:
        """Handle upsert: insert if not found."""
        doc = dict(query)
        if "$set" in update:
            doc.update(update["$set"])
        if "$setOnInsert" in update:
            doc.update(update["$setOnInsert"])
        if "$inc" in update:
            for k, v in update["$inc"].items():
                doc[k] = doc.get(k, 0) + v
        await self.insert_one(doc)
        return UpdateResult(matched=0, modified=1)

    async def _update_with_array_ops(self, query, update, where_clause, where_params):
        """Handle $push and $pull by read-modify-write."""
        # Read current doc
        doc = await self.find_one(query)
        if not doc:
            return UpdateResult()

        modified = False

        # Apply $set first
        if "$set" in update:
            for key, value in update["$set"].items():
                doc[key] = _serialize_value(value)
                modified = True

        # Apply $inc
        if "$inc" in update:
            for key, value in update["$inc"].items():
                doc[key] = doc.get(key, 0) + value
                modified = True

        # Apply $push
        if "$push" in update:
            for key, value in update["$push"].items():
                if key not in doc:
                    doc[key] = []
                if isinstance(doc[key], list):
                    doc[key].append(_serialize_value(value) if isinstance(value, dict) else value)
                    modified = True

        # Apply $pull
        if "$pull" in update:
            for key, match in update["$pull"].items():
                if key in doc and isinstance(doc[key], list):
                    if isinstance(match, dict):
                        # Match dict fields
                        new_list = []
                        for item in doc[key]:
                            if isinstance(item, dict):
                                if not all(item.get(k) == v for k, v in match.items()):
                                    new_list.append(item)
                            else:
                                new_list.append(item)
                        doc[key] = new_list
                    else:
                        doc[key] = [x for x in doc[key] if x != match]
                    modified = True

        if modified:
            doc_json = _serialize_doc(doc)
            sql = f"UPDATE `{self.table}` SET doc = %s WHERE {where_clause} LIMIT 1"
            async with self.pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute(sql, [doc_json] + where_params)
                    await conn.commit()
            return UpdateResult(matched=1, modified=1)
        return UpdateResult(matched=1, modified=0)

    async def update_many(self, query: dict, update: dict) -> UpdateResult:
        where_clause, where_params = _build_where(query)
        set_sql, set_params = _build_update_sql(update)
        if not set_sql:
            return UpdateResult()

        sql = f"UPDATE `{self.table}` SET {set_sql} WHERE {where_clause}"
        all_params = set_params + where_params
        try:
            async with self.pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute(sql, all_params)
                    affected = cur.rowcount
                    await conn.commit()
            return UpdateResult(matched=affected, modified=affected)
        except Exception as e:
            logger.error(f"update_many error on {self.table}: {e}")
            return UpdateResult()

    async def delete_one(self, query: dict) -> DeleteResult:
        where_clause, params = _build_where(query)
        sql = f"DELETE FROM `{self.table}` WHERE {where_clause} LIMIT 1"
        try:
            async with self.pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute(sql, params)
                    affected = cur.rowcount
                    await conn.commit()
            return DeleteResult(deleted=affected)
        except Exception as e:
            logger.error(f"delete_one error on {self.table}: {e}")
            return DeleteResult()

    async def delete_many(self, query: dict = None) -> DeleteResult:
        if query:
            where_clause, params = _build_where(query)
        else:
            where_clause, params = "1=1", []
        sql = f"DELETE FROM `{self.table}` WHERE {where_clause}"
        try:
            async with self.pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute(sql, params)
                    affected = cur.rowcount
                    await conn.commit()
            return DeleteResult(deleted=affected)
        except Exception as e:
            logger.error(f"delete_many error on {self.table}: {e}")
            return DeleteResult()

    async def count_documents(self, query: dict = None) -> int:
        where_clause, params = _build_where(query or {})
        sql = f"SELECT COUNT(*) FROM `{self.table}` WHERE {where_clause}"
        try:
            async with self.pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute(sql, params)
                    row = await cur.fetchone()
            return row[0] if row else 0
        except Exception as e:
            logger.error(f"count_documents error on {self.table}: {e}")
            return 0

    async def create_index(self, field, **kwargs):
        """No-op - indexes created in schema."""
        pass


class MySQLDB:
    """Mimics a MongoDB database object. Access collections as attributes."""

    def __init__(self, pool):
        self.pool = pool
        self._collections = {}

    def __getattr__(self, name: str):
        if name.startswith('_') or name == 'pool':
            return super().__getattribute__(name)
        if name not in self._collections:
            self._collections[name] = MySQLCollection(self.pool, name)
        return self._collections[name]


# Global pool reference
_pool = None


async def init_mysql_pool():
    """Initialize MySQL connection pool."""
    global _pool
    mysql_host = os.environ.get('MYSQL_HOST', '92.113.27.90')
    mysql_port = int(os.environ.get('MYSQL_PORT', 3306))
    mysql_user = os.environ.get('MYSQL_USER', 'restaurant_app')
    mysql_password = os.environ.get('MYSQL_PASSWORD', '')
    mysql_db = os.environ.get('MYSQL_DB', 'restaurant_app')

    _pool = await aiomysql.create_pool(
        host=mysql_host,
        port=mysql_port,
        user=mysql_user,
        password=mysql_password,
        db=mysql_db,
        charset='utf8mb4',
        autocommit=False,
        minsize=2,
        maxsize=10,
        connect_timeout=10
    )
    logger.info(f"MySQL pool created: {mysql_host}:{mysql_port}/{mysql_db}")

    # Create tables if they don't exist
    await _create_tables()

    return MySQLDB(_pool)


async def _create_tables():
    """Create all required tables if they don't exist."""
    tables = [
        "users", "user_sessions", "restaurants", "reviews", "reservations",
        "orders", "companies", "company_stores", "store_products",
        "chat_conversations", "chat_messages", "payment_methods",
        "payment_transactions", "restaurant_likes", "favorites",
        "feedback", "special_offers", "user_notifications",
        "restaurant_notifications", "admin_notifications",
        "restaurant_of_the_week", "loyalty_points", "loyalty_history",
        "referrals", "referral_history", "receipts", "push_tokens",
        "app_config", "floor_plans", "transactions"
    ]

    async with _pool.acquire() as conn:
        async with conn.cursor() as cur:
            for table in tables:
                await cur.execute(f"""
                    CREATE TABLE IF NOT EXISTS `{table}` (
                        _row_id INT AUTO_INCREMENT PRIMARY KEY,
                        doc JSON NOT NULL,
                        created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """)
            await conn.commit()
    logger.info("All tables verified/created")


async def close_mysql_pool():
    """Close MySQL connection pool."""
    global _pool
    if _pool:
        _pool.close()
        await _pool.wait_closed()
        _pool = None
        logger.info("MySQL pool closed")
