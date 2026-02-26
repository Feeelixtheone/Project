# PRD - RestaurantApp

## Problem Statement
Restaurant reservation/ordering platform with multiple bug fixes and feature additions needed.

## Architecture
- **Frontend**: Expo React Native (Web) - TypeScript
- **Backend**: FastAPI (Python) 
- **Database**: MongoDB
- **Payments**: Stripe Checkout
- **Auth**: Google OAuth (Emergent)

## Core Requirements
- Restaurant listing, search, filtering
- Table/food-ready reservations with Stripe payment
- Cart-based ordering with direct Stripe checkout
- Company registration with ANAF CUI verification
- Admin panel for managing companies and restaurants
- Notification system for restaurant owners
- Receipt generation based on company CUI
- 2.7% commission deducted from restaurant payout (NOT charged to user)

## What's Been Implemented (2026-02-26)

### Bug Fixes (P0)
1. **Cancel reservation 1h before** - Fixed Platform.OS web compatibility for Alert dialogs
2. **Cart not showing items** - Rewrote cartStore without AsyncStorage persist (web incompatible), simplified zustand store
3. **Cart payment** - Cart now directly creates Stripe checkout via /api/orders/create
4. **Trash button** - Fixed by using Platform.OS === 'web' ? window.confirm : Alert.alert
5. **Commission 2.7%** - Updated from 1.7% to 2.7% in all frontend displays, backend was already 2.7%
6. **User NOT paying commission** - Fixed: user pays base amount only, commission deducted from restaurant payout
7. **Company registration broken** - Added registration modal in profile page with CUI, email, phone fields
8. **Frontend syntax error** - Fixed stray `]);` in restaurant/[id].tsx
9. **Frontend start script** - Fixed to use `expo start --web --port 3000` instead of `expo start`

### Features Added (P1)
1. **Notification system** - In-app notifications for restaurants on new orders/reservations/payments
2. **Admin notifications** - Admin gets notified on new company registrations
3. **Receipts based on CUI** - Auto-generated on payment confirmation via webhook
4. **Company dashboard tabs** - Stores, Notifications, Orders, Receipts sections
5. **Admin restaurant management** - View/delete all restaurants
6. **Store product management** - Delete products from stores (company + admin)
7. **ANAF CUI verification** - Integrated ANAF API for CUI validation during registration

### Backend Routes Added
- GET /api/notifications/company
- PUT /api/notifications/{id}/read
- PUT /api/notifications/mark-all-read
- GET /api/receipts/company
- GET /api/admin/notifications
- PUT /api/admin/notifications/{id}/read
- GET /api/admin/restaurants
- DELETE /api/admin/restaurants/{id}
- DELETE /api/admin/restaurants/{id}/products/{product_id}
- GET /api/admin/orders
- GET /api/admin/reservations
- DELETE /api/stores/{store_id}/products/{product_id}
- GET /api/stores/{store_id}/products
- GET /api/stores/{store_id}/orders

## User Personas
1. **Client** - Browses restaurants, makes reservations, orders food
2. **Restaurant Owner** - Manages restaurant, views orders/notifications/receipts
3. **Admin** - Verifies companies, manages all restaurants, views stats

## Backlog
- P0: None remaining
- P1: Email notification to admin on company registration (currently in-app only)
- P2: Push notifications for mobile
- P2: Receipt PDF download
- P2: Advanced order status management (kitchen flow)
- P3: Real-time order tracking with WebSockets
