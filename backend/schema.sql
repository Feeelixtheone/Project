-- ================================================================
-- RestaurantApp MySQL Schema
-- Execute these commands in phpMyAdmin on your VPS (92.113.27.90)
-- ================================================================

-- Step 1: Create the database
CREATE DATABASE IF NOT EXISTS restaurant_app
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Step 2: Create the user (if not already created)
CREATE USER IF NOT EXISTS 'restaurant_app'@'%'
  IDENTIFIED BY 'AlphaWRHED12@_';

-- Step 3: Grant permissions
GRANT ALL PRIVILEGES ON restaurant_app.* TO 'restaurant_app'@'%';
FLUSH PRIVILEGES;

-- Step 4: Use the database
USE restaurant_app;

-- ================================================================
-- Tables - Each stores documents as JSON (MongoDB-compatible)
-- ================================================================

CREATE TABLE IF NOT EXISTS `users` (
    _row_id INT AUTO_INCREMENT PRIMARY KEY,
    doc JSON NOT NULL,
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id ((CAST(doc->>'$.user_id' AS CHAR(255)))),
    UNIQUE INDEX idx_email ((CAST(doc->>'$.email' AS CHAR(255))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_sessions` (
    _row_id INT AUTO_INCREMENT PRIMARY KEY,
    doc JSON NOT NULL,
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_session_token ((CAST(doc->>'$.session_token' AS CHAR(255)))),
    INDEX idx_user_id ((CAST(doc->>'$.user_id' AS CHAR(255))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restaurants` (
    _row_id INT AUTO_INCREMENT PRIMARY KEY,
    doc JSON NOT NULL,
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_id ((CAST(doc->>'$.id' AS CHAR(255)))),
    INDEX idx_name ((CAST(doc->>'$.name' AS CHAR(255)))),
    INDEX idx_company_id ((CAST(doc->>'$.company_id' AS CHAR(255))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `reviews` (
    _row_id INT AUTO_INCREMENT PRIMARY KEY,
    doc JSON NOT NULL,
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_restaurant_id ((CAST(doc->>'$.restaurant_id' AS CHAR(255))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `reservations` (
    _row_id INT AUTO_INCREMENT PRIMARY KEY,
    doc JSON NOT NULL,
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id ((CAST(doc->>'$.user_id' AS CHAR(255)))),
    INDEX idx_restaurant_id ((CAST(doc->>'$.restaurant_id' AS CHAR(255)))),
    INDEX idx_status ((CAST(doc->>'$.status' AS CHAR(50))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `orders` (
    _row_id INT AUTO_INCREMENT PRIMARY KEY,
    doc JSON NOT NULL,
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id ((CAST(doc->>'$.user_id' AS CHAR(255)))),
    INDEX idx_restaurant_id ((CAST(doc->>'$.restaurant_id' AS CHAR(255)))),
    INDEX idx_status ((CAST(doc->>'$.status' AS CHAR(50))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `companies` (
    _row_id INT AUTO_INCREMENT PRIMARY KEY,
    doc JSON NOT NULL,
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_id ((CAST(doc->>'$.id' AS CHAR(255)))),
    INDEX idx_owner_id ((CAST(doc->>'$.owner_id' AS CHAR(255)))),
    INDEX idx_cui ((CAST(doc->>'$.cui' AS CHAR(50))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `company_stores` (
    _row_id INT AUTO_INCREMENT PRIMARY KEY,
    doc JSON NOT NULL,
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_id ((CAST(doc->>'$.id' AS CHAR(255)))),
    INDEX idx_company_id ((CAST(doc->>'$.company_id' AS CHAR(255))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `store_products` (
    _row_id INT AUTO_INCREMENT PRIMARY KEY,
    doc JSON NOT NULL,
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_id ((CAST(doc->>'$.id' AS CHAR(255)))),
    INDEX idx_store_id ((CAST(doc->>'$.store_id' AS CHAR(255))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `chat_conversations` (
    _row_id INT AUTO_INCREMENT PRIMARY KEY,
    doc JSON NOT NULL,
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_id ((CAST(doc->>'$.id' AS CHAR(255)))),
    INDEX idx_user_id ((CAST(doc->>'$.user_id' AS CHAR(255))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `chat_messages` (
    _row_id INT AUTO_INCREMENT PRIMARY KEY,
    doc JSON NOT NULL,
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_conversation_id ((CAST(doc->>'$.conversation_id' AS CHAR(255))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payment_methods` (
    _row_id INT AUTO_INCREMENT PRIMARY KEY,
    doc JSON NOT NULL,
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id ((CAST(doc->>'$.user_id' AS CHAR(255))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payment_transactions` (
    _row_id INT AUTO_INCREMENT PRIMARY KEY,
    doc JSON NOT NULL,
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id ((CAST(doc->>'$.user_id' AS CHAR(255)))),
    INDEX idx_session_id ((CAST(doc->>'$.session_id' AS CHAR(255))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restaurant_likes` (
    _row_id INT AUTO_INCREMENT PRIMARY KEY,
    doc JSON NOT NULL,
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id ((CAST(doc->>'$.user_id' AS CHAR(255)))),
    INDEX idx_restaurant_id ((CAST(doc->>'$.restaurant_id' AS CHAR(255))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `favorites` (
    _row_id INT AUTO_INCREMENT PRIMARY KEY,
    doc JSON NOT NULL,
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id ((CAST(doc->>'$.user_id' AS CHAR(255)))),
    INDEX idx_restaurant_id ((CAST(doc->>'$.restaurant_id' AS CHAR(255))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `feedback` (
    _row_id INT AUTO_INCREMENT PRIMARY KEY,
    doc JSON NOT NULL,
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id ((CAST(doc->>'$.user_id' AS CHAR(255)))),
    INDEX idx_restaurant_id ((CAST(doc->>'$.restaurant_id' AS CHAR(255))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `special_offers` (
    _row_id INT AUTO_INCREMENT PRIMARY KEY,
    doc JSON NOT NULL,
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_restaurant_id ((CAST(doc->>'$.restaurant_id' AS CHAR(255))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_notifications` (
    _row_id INT AUTO_INCREMENT PRIMARY KEY,
    doc JSON NOT NULL,
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id ((CAST(doc->>'$.user_id' AS CHAR(255))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restaurant_notifications` (
    _row_id INT AUTO_INCREMENT PRIMARY KEY,
    doc JSON NOT NULL,
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_restaurant_id ((CAST(doc->>'$.restaurant_id' AS CHAR(255))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `admin_notifications` (
    _row_id INT AUTO_INCREMENT PRIMARY KEY,
    doc JSON NOT NULL,
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `restaurant_of_the_week` (
    _row_id INT AUTO_INCREMENT PRIMARY KEY,
    doc JSON NOT NULL,
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_restaurant_id ((CAST(doc->>'$.restaurant_id' AS CHAR(255))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `loyalty_points` (
    _row_id INT AUTO_INCREMENT PRIMARY KEY,
    doc JSON NOT NULL,
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id ((CAST(doc->>'$.user_id' AS CHAR(255))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `loyalty_history` (
    _row_id INT AUTO_INCREMENT PRIMARY KEY,
    doc JSON NOT NULL,
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id ((CAST(doc->>'$.user_id' AS CHAR(255))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `referrals` (
    _row_id INT AUTO_INCREMENT PRIMARY KEY,
    doc JSON NOT NULL,
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id ((CAST(doc->>'$.user_id' AS CHAR(255)))),
    INDEX idx_code ((CAST(doc->>'$.code' AS CHAR(50))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `referral_history` (
    _row_id INT AUTO_INCREMENT PRIMARY KEY,
    doc JSON NOT NULL,
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_referrer_id ((CAST(doc->>'$.referrer_id' AS CHAR(255)))),
    INDEX idx_referred_id ((CAST(doc->>'$.referred_id' AS CHAR(255))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `receipts` (
    _row_id INT AUTO_INCREMENT PRIMARY KEY,
    doc JSON NOT NULL,
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_company_cui ((CAST(doc->>'$.company_cui' AS CHAR(50)))),
    INDEX idx_company_id ((CAST(doc->>'$.company_id' AS CHAR(255))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `push_tokens` (
    _row_id INT AUTO_INCREMENT PRIMARY KEY,
    doc JSON NOT NULL,
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id ((CAST(doc->>'$.user_id' AS CHAR(255))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `app_config` (
    _row_id INT AUTO_INCREMENT PRIMARY KEY,
    doc JSON NOT NULL,
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_key ((CAST(doc->>'$.key' AS CHAR(100))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `floor_plans` (
    _row_id INT AUTO_INCREMENT PRIMARY KEY,
    doc JSON NOT NULL,
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_restaurant_id ((CAST(doc->>'$.restaurant_id' AS CHAR(255))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `transactions` (
    _row_id INT AUTO_INCREMENT PRIMARY KEY,
    doc JSON NOT NULL,
    created_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id ((CAST(doc->>'$.user_id' AS CHAR(255)))),
    INDEX idx_store_id ((CAST(doc->>'$.store_id' AS CHAR(255))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- Verification query
-- ================================================================
SELECT TABLE_NAME, TABLE_ROWS, DATA_LENGTH
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'restaurant_app'
ORDER BY TABLE_NAME;
