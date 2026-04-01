# Copilot Instructions for FireGo Monorepo

## Overview
FireGo is a rideshare platform with four main components: **backend/** (NestJS API, MongoDB), **web-admin/** (React + Vite dashboard), **mobile-customer/** (React Native), **mobile-driver/** (React Native + Expo). All communication flows through backend REST APIs.

## Critical Architecture

### Backend (NestJS + Mongoose)
- **Module structure**: Each domain (drivers, rides, payment, etc.) is a NestJS module in `src/modules/` with its own controller, service, schema, DTO
- **Shared utilities**: `src/shared/utils/` contains location parsing, `src/shared/constants/` for enums (RideStatus, RideType, DriverStatus)
- **Event-driven**: Uses `@nestjs/event-emitter` for cross-module communication (e.g., ride auto-assignment triggers driver notifications)
- **Schemas**: All models use `@Schema({ timestamps: true })` with Mongoose, enabling `createdAt`/`updatedAt` tracking
- **Key modules**: `rides/` (core trip logic with OSRM routing), `drivers/` (status, location, approval), `delivery/` (separate from rides), `pricing/` (dynamic rates), `combined-trips/` (multi-passenger pooling), `payment/` (wallets, transactions)

### Frontend Patterns
- **Services layer**: All HTTP calls via Axios instances in `services/` directory (no direct fetch in components)
- **Mobile apps** (Expo-based): Use `redux/slices/` for global state (auth, theme), local state for screens via `useState`, **polling pattern** for live updates (e.g., trip status every 2s via `setInterval`)
- **Web Admin**: Uses Zustand for state management (see `store/`) instead of Redux
- **Type safety**: TypeScript throughout; mobile apps have `types/` folder with API response interfaces

### Data Flow
1. **Rides**: Customer calls backend → Auto-assign service finds drivers → Event emits → Driver notification service triggers → Driver receives via socket/polling
2. **Combined trips**: Multi-passenger pooling stored separately; UI polls `combinedTripsService.getCombinedTripDetail()` every 2s to sync seat availability
3. **Delivery**: Separate module parallel to rides with its own auto-assign logic

## Developer Workflows
- **Full setup**: `npm install` (monorepo) → `docker-compose up -d` (MongoDB) → `npm run dev` (backend + web) or `npm run dev:full`
<<<<<<< Updated upstream
- **Backend**: `cd backend && npm run start:dev` → Swagger at `http://192.168.1.12:3000/api/docs`
- **Web Admin**: `cd web-admin && npm run dev` → Vite at `http://192.168.1.12:5173`
- **Mobile**: Expo-managed (`npm run android` / `npm run ios`); Android emulator uses `10.0.2.2` for 192.168.1.12, real devices use `192.168.x.x`
=======
- **Backend**: `cd backend && npm run start:dev` → Swagger at `http://192.168.1.14:3000/api/docs`
- **Web Admin**: `cd web-admin && npm run dev` → Vite at `http://192.168.1.14:5173`
- **Mobile**: Expo-managed (`npm run android` / `npm run ios`); Android emulator uses `10.0.2.2` for 192.168.1.14, real devices use `192.168.x.x`
>>>>>>> Stashed changes
- **Database seeding**: `cd backend && npm run seed` (runs `src/seed.ts`)
- **Debugging mobile**: Add `console.log()` and check Expo terminal output; use Redux DevTools for state inspection

## Project-Specific Patterns

### API Requests
- **Base URLs vary by context**: Mobile has different endpoints for emulator vs device (`process.env.REACT_APP_API_URL` or hardcoded fallback)
- **Token management**: AuthService stores JWT in AsyncStorage (mobile) or localStorage (web); auto-refresh logic in service interceptors
- **Error handling**: Wrap service calls in try-catch; API errors returned as `{ success: false, message: string }`

### State Syncing
- **Mobile polling**: Screens that display live data (rides, driver location, trip status) use `setInterval` with cleanup in `useEffect` return
- **Web Admin**: Ant Design form components; uses `axios` instance with base URL config in `api.ts`

### Component Organization
- **Mobile screens** vs **Web pages**: Mobile uses `screens/` (full-screen navigated), Web uses `pages/` (routed via React Router)
- **Reusable components**: `components/` folder; avoid business logic in UI components, delegate to services
- **Hooks**: Custom hooks in `hooks/` folder (e.g., `useDebounce`, navigation hooks)

## Common Commands
- `npm run lint` — ESLint with auto-fix
- `npm run test` — Jest (backend has unit/e2e, mobile/web have jest setup)
- `npm run build` — Production build (backend: NestJS, web: Vite)

## Integration Points
- **Mapping**: OSRM (Free routing, no API key; backend calls `https://router.project-osrm.org/route/v1/driving/`) and Google Maps (web admin, requires API key in `.env`)
- **MongoDB URI**: In backend `.env`; Docker Compose spins up instance locally
- **External scripts**: Multiple `*.js` files in `backend/` root (e.g., `sync-driver-status.js`, `cleanup-zombie-drivers.js`) for maintenance tasks

---
For workflows involving trip polling or real-time updates, see `TRIP_POLLING_IMPLEMENTATION.md`.
