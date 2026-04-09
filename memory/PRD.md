# RestaurantApp PRD

## Original Problem Statement
Migrate MongoDB to MySQL (phpMyAdmin on VPS 92.113.27.90), fix table number centering on 2D floor plan, change commission from 2.7% to 4.7% recurring / 7% new customers, add nutritional values (kcal, protein, carbs, fats, fiber, ingredients) with icons, add reservation capacity notifications, add more restaurants, provide SQL commands for phpMyAdmin and VPS config, no emergent watermarks, keep Capacitor build for Android.

## Architecture
- **Backend**: FastAPI (Python) with MySQL via aiomysql (JSON-document storage pattern)
- **Frontend**: React Native / Expo with Capacitor for Android
- **Database**: MySQL (MariaDB compatible) - JSON doc column per table
- **Auth**: JWT + bcrypt password hashing
- **Payments**: Stripe integration
- **VPS**: 92.113.27.90 (production target)

## User Personas
- Restaurant owners (manage menus, floor plans, reservations)
- End users (browse restaurants, make reservations, order food)
- Companies (manage stores, products, receipts)
- Admin (platform management, commission control)

## Core Requirements
- Multi-restaurant platform with floor plans
- Commission-based business model (4.7% recurring, 7% new)
- Nutritional values for all menu items
- Reservation capacity alerts
- Android APK via Capacitor

## What's Been Implemented (April 2026)
- [x] Full MongoDB → MySQL migration (database.py wrapper with JSON columns)
- [x] Commission rates updated: 4.7% recurring, 7% new customers
- [x] Floor plan table markers centered using transform (was margin offset)
- [x] 5 additional restaurants seeded (Bella Italia, Sakura Sushi, Garden Grill, Bucataria Veche, La Terrazza)
- [x] Nutritional values added to all menu items (kcal, protein, carbs, fats, fiber, ingredients)
- [x] Enhanced nutritional display with colored icons in restaurant detail
- [x] Ingredients section added to menu item detail view
- [x] Reservation capacity alert system (checks per-hour threshold, notifies restaurant)
- [x] Capacity settings API (GET/PUT per restaurant, defaults to 10/hour)
- [x] SQL schema file (schema.sql) for phpMyAdmin import
- [x] VPS setup guide (vps_setup.md) with MySQL, Nginx, systemd config
- [x] StoreProduct model updated with nutritional fields
- [x] All backend tests passing (100%)

## Prioritized Backlog
- P0: Change MYSQL_HOST to 92.113.27.90 for VPS deployment
- P1: Add floor plans for additional restaurants
- P1: Company dashboard nutritional value input UI
- P2: Push notification integration for capacity alerts
- P2: Password reset, email verification
- P2: Multi-language support

## Next Tasks
1. Deploy to VPS and test MySQL connection at 92.113.27.90
2. Import schema.sql via phpMyAdmin
3. Build Android APK with Capacitor (npx cap sync android && cd android && ./gradlew assembleRelease)
