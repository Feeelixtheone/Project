# RestaurantApp PRD

## Original Problem Statement
Migrate MongoDB to MySQL (phpMyAdmin on VPS 92.113.27.90), fix table number centering on 2D floor plan, change commission from 2.7% to 4.7% recurring / 7% new customers, add nutritional values (kcal, protein, carbs, fats, fiber, ingredients) with icons, add reservation capacity notifications, add more restaurants, provide SQL commands for phpMyAdmin and VPS config, no emergent watermarks, keep Capacitor build for Android.

## Iteration 2 Requirements
- Dark themed nutrition boxes (matching dark UI, no pastel backgrounds)
- New ingredient guessing game for kids area
- Flashier game cards with glow effects, colored borders, larger icons
- Manual table numbering system for floor plans

## Architecture
- **Backend**: FastAPI (Python) with MySQL via aiomysql (JSON-document storage pattern)
- **Frontend**: React Native / Expo with Capacitor for Android
- **Database**: MySQL (MariaDB compatible) - JSON doc column per table
- **Auth**: JWT + bcrypt password hashing
- **Payments**: Stripe integration
- **VPS**: 92.113.27.90 (production target)

## What's Been Implemented

### Iteration 1 (April 2026)
- [x] Full MongoDB to MySQL migration (database.py wrapper with JSON columns)
- [x] Commission rates: 4.7% recurring, 7% new customers
- [x] Floor plan table markers centered using transform
- [x] 5 additional restaurants seeded
- [x] Nutritional values for all menu items
- [x] Reservation capacity alert system
- [x] SQL schema file (schema.sql) for phpMyAdmin
- [x] VPS setup guide (vps_setup.md)

### Iteration 2 (April 2026)
- [x] Dark themed nutrition boxes (COLORS.surface #141414 bg, colored borders)
- [x] New ingredient guessing game (/kids/guess-ingredient.tsx)
- [x] Flashier game cards with glow shadows, colored borders, larger icons
- [x] Updated all existing games (candy-crush, memory, whack) with enhanced visual effects
- [x] Fixed empty $in SQL query bug in database wrapper

## Prioritized Backlog
- P0: Deploy to VPS with MYSQL_HOST=92.113.27.90
- P1: Company floor plan editor (drag-and-drop table placement)
- P1: Company dashboard nutritional value input UI
- P2: Push notification integration for capacity alerts
- P2: More restaurant floor plans
