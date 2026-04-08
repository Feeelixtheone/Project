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

## What's Been Implemented (Apr 8, 2026)
- Replaced Emergent Google OAuth with JWT email/password auth
- Admin seeded on startup (mutinyretreat37@gmail.com / karaplange2)
- Kill switch: /admin/app/lock, /admin/app/unlock, /admin/app/wipe
- Hamza restaurant seeded with floor plan (40 tables)
- Interactive 2D floor plan viewer with clickable table markers
- Floor plan management page for business owners
- AI table detection (GPT-4o vision)
- Capacitor 6 Android project configured
- **Removed 20 RON reservation fee from customer flow**
- **Hidden 2.7% commission from all customer-facing pages (profil, rezervari, index)**
- Commission info kept only in company dashboard (business-facing)

## Backlog
- P1: Build APK on local machine
- P2: Password reset, email verification
- P2: Custom app icon
