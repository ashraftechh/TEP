# Backend — Training Ecosystem Platform

Laravel 13 / PHP 8.4 REST API + Filament admin panel for the Training Ecosystem Platform.

Full setup instructions, architecture, and contribution guidelines live in the repository root — see [`../README.md`](../README.md) and [`../CONTRIBUTING.md`](../CONTRIBUTING.md).

## Quick reference

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve   # or: herd link training-api
```

Run tests:
```bash
php artisan test
```

Lint/format:
```bash
./vendor/bin/pint
```
