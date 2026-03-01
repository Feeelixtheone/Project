# RestaurantApp - PRD

## Problem Statement
Romanian restaurant app with ROTW, favorites, feedback, referral system, loyalty points, dev quick-login, business accounts, 2D/video/3D media infrastructure.

## Architecture
- Frontend: React Native (Expo) with expo-router, Zustand
- Backend: FastAPI (Python) with MongoDB (Motor)
- Auth: Google OAuth + Dev Quick-Login
- Payments: Stripe (test mode)
- Theme: Dark mode, Montserrat, orange primary

## What's Been Implemented

### Session 1-2: Core features + Referral + Dev Login
### Session 3: Bug fixes (logout, reservation, cart→reservation flow), media infrastructure, business account
### Session 4 (Latest): Referral UI style fix
- Redesigned referral card: centered code box with uppercase label, letter-spaced code
- Unified button styles: "Copiaza" + "Distribuie" equal-width, no text wrapping
- Stats section with proper borders and padding
- Apply code section in separate card
- Fixed text wrapping on mobile for action buttons
- Icon uses solid orange background instead of transparent

## Accounts
| Role | Email |
|------|-------|
| Admin | mutinyretreat37@gmail.com |
| Business | business@restaurant.ro (Company: Casa Veche SRL) |
| User | test.user@restaurant.ro |

## Next Tasks
- P1: Restaurant media gallery UI (video player, 3D viewer in detail page)
- P1: Business owner dashboard
- P2: Points redemption flow
