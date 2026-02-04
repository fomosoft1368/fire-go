# Copilot Instructions for FireGo Monorepo

## Overview
FireGo is a rideshare platform with four main components:
- **backend/**: NestJS API server (TypeScript, MongoDB)
- **web-admin/**: React + Vite admin dashboard
- **mobile-customer/**: React Native app for customers
- **mobile-driver/**: React Native app for drivers

## Key Architectural Patterns
- **Backend** uses NestJS modules for each domain (drivers, rides, payment, etc.) in `src/modules/`. Shared logic is in `src/shared/`.
- **Web Admin** and **Mobile Apps** use a clear separation: `components/`, `screens/` (or `pages/`), `services/` (API calls), `redux/` (state), `utils/`, and `types/`.
- **API communication**: All frontends use REST APIs from the backend. See `services/` in each app for API patterns.
- **MongoDB** is the only database. Connection config is in backend `.env` and `docker-compose.yml`.

## Developer Workflows
- **Install all dependencies**: `npm install` at root, or `npm run install:all`
- **Start all dev servers**: `npm run dev` (backend + web-admin), `npm run dev:full` (includes mobile-customer)
- **Backend dev**: `cd backend && npm run start:dev`
- **Web Admin dev**: `cd web-admin && npm run dev`
- **Mobile dev**: `cd mobile-customer` or `cd mobile-driver`, then `npm run android` or `npm run ios`
- **Database**: Start MongoDB with `docker-compose up -d`
- **Linting**: `npm run lint` in any package
- **Testing**: `npm run test` in any package
- **Seeding**: Backend: `npm run seed` (runs `src/seed.ts`)

## Project Conventions
- **TypeScript everywhere** (except legacy JS scripts)
- **Env files**: Copy `.env.example` to `.env` in each package before running
- **Component structure**: Place UI in `components/`, screens/pages in `screens/` or `pages/`, API logic in `services/`, state in `redux/`, helpers in `utils/`, types in `types/`
- **Backend modules**: Add new features as a module in `src/modules/`
- **API docs**: Swagger at `/api/docs` when backend is running

## Integration & External Dependencies
- **Backend**: NestJS, Mongoose, JWT, Passport.js
- **Web Admin**: React, Ant Design, Zustand, Axios, TailwindCSS
- **Mobile**: React Native, Redux Toolkit, Axios, React Navigation, Maps
- **All apps**: Use Axios for HTTP, see `services/` for API usage

## Examples
- Add a new backend feature: create a module in `backend/src/modules/`, register in `app.module.ts`
- Add a new screen: create in `screens/`, connect to API via `services/`, manage state in `redux/`
- Add a new API call: implement in backend controller/service, document in Swagger, consume in frontend `services/`

## References
- See [README.md](../../README.md) for full setup, scripts, and troubleshooting
- See `docs/` (if present) for API/database details

---
For any unclear conventions or missing documentation, ask for clarification or check the root README.
