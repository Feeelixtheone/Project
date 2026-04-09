# RestaurantApp PRD

## Original Problem Statement
1. Remove all emergent.sh watermarks, construct APK with Capacitor
2. Remove Google login (beta), keep business/user options
3. Admin: mutinyretreat37@gmail.com logs in as admin
4. Add kill switch for admin to protect app
5. Create "Hamza" restaurant from Sibiu with 2D floor plan
6. Interactive table markers - click table number to see photo
7. Business owners: upload 2D image, AI detects table numbers, assign photos
8. Remove 20 lei fee for customer, hide restaurant tax/commission from customer interface
9. Food ready: pay through app. Table only: free but tracked in app

## What's Been Implemented (Apr 8, 2026)
- JWT email/password auth (replaced Google OAuth)
- Admin seeded (mutinyretreat37@gmail.com / karaplange2)
- Kill switch (lock/unlock/wipe)
- Hamza restaurant with 40-table floor plan
- AI table detection (GPT-4o vision)
- Capacitor Android project
- **Removed 20 RON fee**: table_only = free, confirmed instantly
- **food_ready**: pays food total via Stripe, no commission shown
- **Hidden all commission/fee info from customer UI**
- Commission silently deducted from restaurant payout on backend only

## Backlog
- P1: Build APK locally
- P2: Password reset, email verification
