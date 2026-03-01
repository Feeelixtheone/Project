# RestaurantApp - PRD

## Problem Statement
Romanian restaurant application with advanced features: Restaurant of the Week, favorites with push notifications, post-order rating/feedback system, cart badge fixes, payment fixes, and loyalty points system.

## Architecture
- **Frontend**: React Native (Expo) with expo-router, Zustand for state management
- **Backend**: FastAPI (Python) with MongoDB (Motor async driver)
- **Auth**: Google OAuth via Emergent-managed authentication
- **Payments**: Stripe integration (test mode)
- **Theme**: Dark mode with Montserrat font, orange primary color

## User Personas
1. **Regular User**: Browse restaurants, order food, earn loyalty points, leave feedback
2. **Admin** (mutinyretreat37@gmail.com): Manage ROTW, view dashboards, manage companies
3. **Restaurant Owner**: Manage restaurant, view orders, respond to feedback

## Core Requirements (Static)
- Restaurant browsing with categories and search
- Cart & direct ordering with Stripe payment
- Table reservations
- Favorites with notifications
- Restaurant of the Week with 10% discount
- Loyalty points system (1 pt/RON)
- Post-order feedback (food, service, ambiance ratings)
- Admin dashboard with ROTW management

## What's Been Implemented (March 1, 2026)

### Bug Fixes
- **Cart Badge**: Fixed cart icon in main header (acasa.tsx) to show reactive item count badge using Zustand store subscription
- **Payment Error**: Fixed corrupted STRIPE_API_KEY in backend .env; Fixed ObjectId serialization issue in createDirectOrder endpoint
- **Origin URL**: Fixed origin_url construction in cart.tsx for Stripe redirect

### New Features
1. **Restaurant of the Week (ROTW)**:
   - Backend: Auto-select (60% rating, 40% orders weighted), manual admin select, 10% discount
   - Frontend: Golden banner on home page, ROTW badge on restaurant cards, discounted prices on detail page
   - Admin dashboard: ROTW management section with auto/manual selection

2. **Loyalty Points System**:
   - Backend: Points awarded on order completion (1 pt/RON), levels (Bronze/Silver/Gold/Platinum)
   - Frontend: Dedicated /loyalty page with overview, progress, level tiers, history, leaderboard
   - Auto-award on Stripe webhook payment confirmation

3. **Enhanced Feedback System**:
   - Added ambiance rating (1-5 stars) to feedback form
   - Backend already supported ambiance_rating field

4. **Profile Enhancement**:
   - Added loyalty points quick access card in profile tab

## Prioritized Backlog

### P0 (Critical)
- [x] Fix cart badge on main header
- [x] Fix payment error from cart
- [x] Restaurant of the Week system

### P1 (High)
- [x] Loyalty points E2E (order -> points awarded)
- [ ] Real push notifications (Expo Push Notifications integration)
- [ ] Verify push token registration flow

### P2 (Medium)
- [x] Gamification/Leaderboard for loyalty points
- [ ] Points redemption for discounts
- [ ] Monthly/Weekly leaderboard reset options

### P3 (Nice to Have)
- [ ] Push notification preferences per user
- [ ] Social sharing of achievements
- [ ] Loyalty point transfer between users
- [ ] Seasonal ROTW badges/themes

## Next Tasks
1. Integrate Expo Push Notifications for real push delivery
2. Add points redemption flow (e.g., 100 points = 10 RON discount)
3. Add push notification preferences in settings
4. Test complete E2E flow with admin account (ROTW selection -> discount applied -> order -> points awarded)
