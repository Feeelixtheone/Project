# RestaurantApp PRD

## Original Problem Statement
Remove all emergent.sh watermarks, construct APK file with Capacitor, run bug checks and fixes. Remove Google login (beta). Keep business/user login options. Admin: mutinyretreat37@gmail.com. Add kill switch for admin.

## Architecture
- **Backend**: FastAPI + MongoDB (motor) + JWT Auth (bcrypt + PyJWT)
- **Frontend**: Expo React Native (SDK 54) with web export
- **Mobile**: Capacitor wrapping Expo web export for Android APK
- **Auth**: Email/Password with JWT tokens (7-day expiry)

## User Personas
- **Admin** (mutinyretreat37@gmail.com): Full control, kill switch, company verification, ROTW management
- **User**: Browse restaurants, order, reserve, review
- **Business**: Manage restaurant, menus, orders, receipts

## Core Requirements
- [x] Email/password authentication (JWT)
- [x] Admin seeding on startup
- [x] Business/User registration flows
- [x] Admin kill switch (lock/unlock/wipe)
- [x] Remove all Emergent.sh watermarks
- [x] Remove Google OAuth
- [x] Capacitor Android project setup
- [x] Web export for APK wrapping

## What's Been Implemented (Apr 8, 2026)
- Replaced Emergent Google OAuth with JWT email/password auth
- Added bcrypt password hashing
- Added admin seeding on startup (mutinyretreat37@gmail.com / karaplange2)
- Added kill switch endpoints: /admin/app/lock, /admin/app/unlock, /admin/app/wipe
- Added app status check: /app/status
- Updated frontend with email/password login, register, business registration forms
- Fixed button click issues on web (Pressable instead of TouchableOpacity for LinearGradient)
- Set up Capacitor 6 for Android APK
- Created build-apk.sh script
- Full admin dashboard with app protection controls (lock, unlock, wipe)

## Backlog
- P0: None
- P1: APK build (requires x86_64 machine with Android SDK)
- P2: Push notifications for app lock status
- P2: Password reset functionality
- P2: Email verification for new accounts

## Next Tasks
1. Build APK locally using `cd frontend && bash build-apk.sh`
2. Add password reset flow
3. Add email verification
4. Custom app icon for APK
