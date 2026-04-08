# RestaurantApp PRD

## Original Problem Statement
1. Remove all emergent.sh watermarks, construct APK with Capacitor
2. Remove Google login (beta), keep business/user options
3. Admin: mutinyretreat37@gmail.com logs in as admin
4. Add kill switch for admin to protect app
5. Create "Hamza" restaurant from Sibiu with 2D floor plan
6. Interactive table markers - click table number to see photo
7. Business owners: upload 2D image, AI detects table numbers, assign photos

## Architecture
- **Backend**: FastAPI + MongoDB (motor) + JWT Auth (bcrypt + PyJWT)
- **Frontend**: Expo React Native (SDK 54) with web export
- **Mobile**: Capacitor 6 wrapping Expo web export for Android APK
- **Auth**: Email/Password with JWT tokens (7-day expiry)
- **AI**: OpenAI GPT-4o vision via emergentintegrations for floor plan analysis

## User Personas
- **Admin** (mutinyretreat37@gmail.com): Full control, kill switch, company verification
- **User**: Browse restaurants, order, reserve, review, view floor plans
- **Business**: Manage restaurant, upload floor plans, AI table detection, assign photos

## What's Been Implemented (Apr 8, 2026)
- Replaced Emergent Google OAuth with JWT email/password auth
- Added bcrypt password hashing + JWT token generation
- Admin seeded on startup (mutinyretreat37@gmail.com / karaplange2)
- Kill switch: /admin/app/lock, /admin/app/unlock, /admin/app/wipe
- App status check: /app/status
- Frontend login/register/business registration forms (no Google login)
- "Hamza" restaurant from Sibiu seeded with cover image, menu, floor plan
- Interactive 2D floor plan viewer (40 tables with photo assignments)
- Floor plan management page for business owners (/floorplan/[id])
- AI table detection endpoint (GPT-4o vision analyzes floor plan images)
- Capacitor 6 Android project configured and synced
- Build script (build-apk.sh) and ZIP package (RestaurantApp-Android.zip)
- All Emergent.sh watermarks removed from codebase

## Testing Results
- Backend: 100% (10/10 tests passed)
- Frontend: 95% (18/18 features working, 1 minor modal click on web)
- AI Detection: Working (detected 37 tables from floor plan)

## Backlog
- P1: Build APK on local machine (ARM64 container limitation)
- P2: Password reset flow
- P2: Email verification for new accounts
- P2: Custom app icon for APK
- P3: Push notifications for app lock status

## Next Tasks
1. Download ZIP and build APK locally
2. Test on physical Android device
3. Add password reset flow
4. Custom branding (app icon, splash screen)
