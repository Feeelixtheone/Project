# RestaurantApp PRD

## Original Problem Statement
Migrate MongoDB to MySQL (phpMyAdmin on VPS 92.113.27.90), fix table number centering on 2D floor plan, change commission from 2.7% to 4.7% recurring / 7% new customers, add nutritional values with icons, add reservation capacity notifications, add more restaurants, provide SQL commands for phpMyAdmin, VPS config, no emergent watermarks, keep Capacitor build.

## Architecture
- **Backend**: FastAPI (Python) with MySQL via aiomysql (JSON-document storage)
- **Frontend**: React Native / Expo with Capacitor for Android
- **Database**: MySQL/MariaDB - JSON doc column per table
- **Payments**: Stripe (sk_test_emergent)
- **VPS Target**: 92.113.27.90

## What's Been Implemented

### Iteration 1 (MySQL migration, commissions, nutritional values, capacity alerts)
- [x] Full MongoDB to MySQL migration with aiomysql wrapper
- [x] Commission: 4.7% recurring, 7% new customers
- [x] Floor plan markers centered
- [x] 6 restaurants total (Amza + 5 new)
- [x] Nutritional values + ingredients on all menus
- [x] Reservation capacity alerts
- [x] SQL schema (schema.sql) + VPS guide (vps_setup.md)

### Iteration 2 (Dark nutrition boxes, flashier games, ingredient guessing game)
- [x] Dark themed nutrition boxes matching UI
- [x] New "Ghiceste Ingredientul" kids game
- [x] Flashier game cards with glow effects

### Iteration 3 (Bug fixes - .env, payments, loyalty, rename)
- [x] Backend .env confirmed present with all keys
- [x] Renamed Hamza -> Amza throughout backend + MySQL data
- [x] Fixed datetime tzinfo crash (MySQL JSON strings)
- [x] Fixed $inc SIGNED vs DECIMAL for integer values
- [x] Payments verified working (Stripe checkout URL generated)
- [x] Loyalty points verified working (award + read + history)
- [x] Cleaned up duplicate DB entries from rename

## Backlog
- P0: Deploy to VPS (MYSQL_HOST=92.113.27.90)
- P1: Company floor plan editor (drag-and-drop table placement)
- P1: Company nutritional value input dashboard
- P2: Push notifications for capacity alerts
