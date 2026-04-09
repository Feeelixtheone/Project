# RestaurantApp PRD

## Architecture
- **Backend**: FastAPI (Python) with MySQL via aiomysql (JSON-document storage)
- **Frontend**: React Native / Expo with Capacitor for Android
- **Database**: MySQL/MariaDB at 92.113.27.90 (prod) / 127.0.0.1 (preview)
- **Payments**: Stripe (sk_test_emergent)

## What's Been Implemented

### Iteration 1-2: Core migration + UI improvements
- [x] MongoDB → MySQL migration (database.py wrapper)
- [x] Commission: 4.7% recurring, 7% new customers (dynamic per user)
- [x] 6 restaurants (Amza + 5 new), all with nutritional data
- [x] Dark themed nutrition boxes, ingredient guessing game, flashier game cards

### Iteration 3-4: Bug fixes
- [x] Renamed Hamza → Amza throughout code + DB
- [x] Fixed payment flow: checkout status now updates order from pending_payment → confirmed when Stripe reports paid
- [x] Loyalty points now awarded from REAL payments (via checkout status + confirm-payment endpoints), not just mock data
- [x] Fixed datetime tzinfo crash (MySQL JSON stores dates as strings)
- [x] Fixed reservation metadata missing "type":"reservation" field
- [x] Dynamic commission rates applied in both order + reservation flows

## Backlog
- P0: Deploy to VPS (MYSQL_HOST=92.113.27.90)
- P1: Company floor plan editor
- P1: Company nutritional value input dashboard
