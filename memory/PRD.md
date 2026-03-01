# RestaurantApp - PRD

## Problem Statement
Romanian restaurant app with: ROTW, favorites, feedback, referral system, loyalty points, dev quick-login, business accounts, 2D/video/3D media infrastructure.

## Architecture
- **Frontend**: React Native (Expo) with expo-router, Zustand
- **Backend**: FastAPI (Python) with MongoDB (Motor)
- **Auth**: Google OAuth + Dev Quick-Login
- **Payments**: Stripe (test mode)
- **Theme**: Dark mode, Montserrat, orange primary

## Accounts for Testing
| Role | Email | Login |
|------|-------|-------|
| Admin | mutinyretreat37@gmail.com | Dev Login (gold btn) |
| Business Owner | business@restaurant.ro | Dev Login |
| Test User | test.user@restaurant.ro | Dev Login |

Business account: Company "Casa Veche SRL" (CUI: RO12345678), linked to first restaurant.

## What's Been Implemented

### Session 1 (March 1, 2026)
- Cart badge fix, payment error fix, ROTW system, loyalty points, gamification/leaderboard, enhanced feedback

### Session 2 (March 1, 2026) 
- Referral system (E2E), dev quick-login accounts

### Session 3 (March 1, 2026)
**Bug Fixes:**
- **Logout ("Deconectează-te")**: Fixed Alert.alert → window.confirm on web platform
- **Reservation confirmation**: Fixed Alert.alert calls for web compatibility
- **Cart → Reservation flow**: Cart checkout now goes through reservation process (date/time/guests modal) before Stripe payment. Uses `createReservationWithPayment` with `food_ready` type.

**Features:**
1. **2D/Video/3D Media Infrastructure**: All 7 restaurants now have:
   - `gallery_images`: 2-5 high-quality photos per restaurant
   - `video_urls`: Array of {title, url, thumbnail, duration} objects (1-3 per restaurant)
   - `images_3d`: Array of {title, model_url, thumbnail, type} objects (food/interior/panorama)
   
2. **Business Account**: Pre-seeded company "Casa Veche SRL" with:
   - Owner: business@restaurant.ro
   - CUI: RO12345678, verified, active
   - Linked to first restaurant
   - Dev-login button on login page

3. **Three Dev Login Accounts** on login page:
   - Admin (gold button) - full admin access
   - Test User - regular user features
   - Business Owner - company management

## Prioritized Backlog

### P0 (DONE)
- [x] Cart badge, payment, ROTW, loyalty, referral, dev-login
- [x] Logout fix, reservation fix, cart→reservation flow
- [x] 2D/video/3D media infrastructure
- [x] Business account setup

### P1 (High)
- [ ] E2E loyalty points flow test (order → points)
- [ ] Expo Push Notifications integration
- [ ] Restaurant media gallery UI (show videos/3D in restaurant detail page)
- [ ] Business dashboard for restaurant owners

### P2 (Medium)
- [ ] Points redemption (100pts = 10 RON)
- [ ] Referral tiers
- [ ] 3D model viewer component (model-viewer integration)
- [ ] Video player component for restaurant videos

### P3 (Nice to Have)
- [ ] AR food preview
- [ ] Push notification preferences
- [ ] Social sharing
