# RestaurantApp - PRD

## Problem Statement
Romanian restaurant application cu features avansate: Restaurant of the Week, favorites cu push notifications, post-order rating/feedback, cart badge fixes, payment fixes, loyalty points system, referral system, dev quick-login.

## Architecture
- **Frontend**: React Native (Expo) cu expo-router, Zustand state management
- **Backend**: FastAPI (Python) cu MongoDB (Motor async driver)
- **Auth**: Google OAuth via Emergent + Dev Quick-Login
- **Payments**: Stripe integration (test mode)
- **Theme**: Dark mode, Montserrat font, orange primary

## User Personas
1. **Regular User**: Browse restaurants, order food, earn loyalty points, refer friends
2. **Admin** (mutinyretreat37@gmail.com): Manage ROTW, dashboards, companies
3. **Restaurant Owner**: Manage restaurant, view orders, respond to feedback

## What's Been Implemented

### Session 1 (March 1, 2026)
**Bug Fixes:**
- Cart Badge: Fixed reactive item count on main cart icon
- Payment Error: Fixed corrupted STRIPE_API_KEY + ObjectId serialization
- Origin URL: Fixed Stripe redirect URL construction

**Features:**
1. Restaurant of the Week (ROTW): Auto-select (60% rating/40% orders), manual admin, 10% discount, golden badge
2. Loyalty Points: 1pt/RON, 4 levels (Bronze/Silver/Gold/Platinum), history, auto-award via webhook
3. Gamification: Leaderboard top 20, medal icons
4. Enhanced Feedback: Ambiance rating added
5. Profile: Loyalty quick access card

### Session 2 (March 1, 2026)
**Features:**
1. **Referral System** (E2E):
   - Unique referral code per user (GET /api/referral/my-code)
   - Apply referral code (POST /api/referral/apply) - 25 welcome pts
   - Referrer gets 50 bonus pts when friend completes first order (auto via webhook)
   - Referral leaderboard (GET /api/referral/leaderboard)
   - Full UI: copy code, share, apply code input, history, stats
   
2. **Dev Quick-Login** (POST /api/auth/dev-login):
   - Admin account (mutinyretreat37@gmail.com) - gold button
   - Test User account (test.user@restaurant.ro)
   - Instant login without Google OAuth for testing

3. **Loyalty Page Enhanced**:
   - 3 tabs: Puncte, Clasament, Referral
   - "Invita" card in how-it-works section
   - Referral history and stats

## Prioritized Backlog

### P0 (Critical) - DONE
- [x] Fix cart badge on main header
- [x] Fix payment error from cart
- [x] Restaurant of the Week system
- [x] Loyalty points E2E
- [x] Referral system
- [x] Dev quick-login accounts

### P1 (High)
- [x] Gamification/Leaderboard
- [ ] Real push notifications (Expo Push Notifications)
- [ ] Push token registration flow

### P2 (Medium)
- [ ] Points redemption for discounts (100pts = 10 RON)
- [ ] Monthly/Weekly leaderboard reset
- [ ] Referral tiers (more referrals = better rewards)

### P3 (Nice to Have)
- [ ] Push notification preferences
- [ ] Social sharing of achievements
- [ ] Seasonal ROTW badges/themes
- [ ] Loyalty point transfer between users

## Next Tasks
1. Integrate Expo Push Notifications for real push delivery
2. Points redemption flow
3. Complete E2E test: ROTW selection -> discount -> order -> points + referral bonus
