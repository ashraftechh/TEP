# Training Ecosystem Platform

A cooperative-training management platform connecting universities, students, and companies — built as a white-label product for Yemeni universities.

## Overview

Training Ecosystem Platform manages the full cooperative training lifecycle:

- Companies register and get approved
- Companies publish training opportunities
- Students apply for opportunities
- Companies review, interview, and accept/reject applicants
- Training assignments are created and tracked
- Students submit training reports
- Academic supervisors review reports and evaluate students
- Training Coordinators publish final results

## Architecture

**Frontend:** React + TypeScript + Vite

**Backend:** Laravel 13 / PHP 8.4, REST JSON API under `/api/v1`

**Admin Panel:** Filament (Laravel/Livewire) — separate from the public React SPA

**Database:** MySQL 8

**Authentication:** Laravel Sanctum (cookie SPA) — local (email/password) plus institutional SSO (Google and Microsoft via Laravel Socialite, JIT account provisioning). Local login always available as a fallback alongside SSO.

**Authorization:** Custom scoped RBAC (`user_roles` table with `scope_type`/`scope_id`), not `spatie/laravel-permission`

**Bilingual content (AR/EN):** `spatie/laravel-translatable` (JSON columns)

## Requirements

- PHP 8.4+
- Composer 2
- Node.js 20+
- MySQL 8+
- [Laravel Herd](https://herd.laravel.com) (or an equivalent local PHP environment)

## Local Setup

```bash
git clone <repo-url> training-ecosystem-platform
cd training-ecosystem-platform

# Backend
cd backend
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate --seed
herd link training-api

# Frontend
cd ../frontend
cp .env.example .env
npm install
npm run dev
```

Backend: `http://training-api.test`
Frontend: `http://localhost:5173`

## Project Structure

```
training-ecosystem-platform/
├── backend/    # Laravel 13 API + Filament admin
├── frontend/   # React + TypeScript + Vite (public SPA)
├── docs/       # project-scope.md, glossary.md, ADRs
└── .github/    # CI, issue templates, PR template
```

See [`docs/project-scope.md`](docs/project-scope.md) for the full functional scope and [`docs/glossary.md`](docs/glossary.md) for bilingual terminology mapped to the database schema.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) before opening a Pull Request — branch naming, commit conventions, and the PR checklist are all defined there.

## License

See [`LICENSE`](LICENSE).