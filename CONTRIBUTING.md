# Contributing Guide

Thank you for contributing to the **Training Ecosystem Platform**.

This document outlines the development workflow, coding standards, Git practices, and collaboration rules for all contributors.

---

## About the Project

The **Training Ecosystem Platform** is a scalable platform that connects participants in the training ecosystem, including:

- Universities
- Students
- Companies
- Training Supervisors
- Administrators

The platform supports:

- Training opportunities management
- Student applications
- Training workflows
- Reports and evaluations
- Communication
- Administrative management

---

## Technology Stack

**Frontend:**
- React + TypeScript + Vite

**Backend:**
- Laravel 13 / PHP 8.4
- Filament (Admin panel)

**Database:**
- MySQL 8

**RBAC:**
- Custom scoped `user_roles` (not `spatie/laravel-permission`)

**Bilingual content:**
- `spatie/laravel-translatable` (JSON columns, not `_ar`/`_en` column pairs)

**Authentication:**
- Laravel Sanctum (cookie SPA), local login only — no SSO

**Project Management:**
- Jira (project key: TEP)

**Source Control:**
- GitHub

---

## Development Workflow

All development work must follow this process:

1. Pick up a Jira issue (TEP-XXX).
2. Review requirements and acceptance criteria.
3. Create a development branch from `develop`.
4. Implement the required changes.
5. Test locally.
6. Open a Pull Request (PR) into `develop`.
7. Complete code review.
8. Merge only after approval.

**Direct commits to `main` or `develop` are not permitted.**

---

## Branch Strategy

```
main (protected, production only)
 └── develop (integration branch — everything lands here first)
      └── feature/TEP-<number>-<short-description>
      └── fix/TEP-<number>-<short-description>
      └── refactor/TEP-<number>-<short-description>
      └── docs/TEP-<number>-<short-description>
```

- `main` contains only production-released code, deployed from `develop` at release time.
- `develop` is where all feature branches merge and get integration-tested together.
- All development branches must be created from `develop`, not `main`.

**Example:** `feature/TEP-538-project-structure`

---

## Commit Message Convention

Hybrid of Conventional Commits and Jira traceability — every commit must reference its Jira ticket as the scope:

```
<type>(TEP-<number>): <short summary in imperative mood>
```

**Examples:**
- `feat(TEP-538): create backend/frontend folder structure`
- `fix(TEP-627): correct application deadline validation`
- `refactor(TEP-557): simplify user_roles scope resolution`
- `docs(TEP-542): update setup instructions in README`
- `test(TEP-559): add RBAC scope boundary tests`

### Commit Types

| Type     | Usage |
|----------|-------|
| feat     | New feature |
| fix      | Bug fix |
| refactor | Code improvement, no behavior change |
| docs     | Documentation changes |
| test     | Add/update tests |
| chore    | Maintenance tasks |
| perf     | Performance improvements |
| security | Security-related changes |

Smart Commits are supported for direct Jira updates from a commit message, e.g.:
```
feat(TEP-538) #comment folder structure created #time 2h #done
```

---

## Pull Request Guidelines

Every change must be submitted via a Pull Request into `develop`.

A PR must include:

- Related Jira issue link (TEP-XXX)
- Clear summary of changes
- Testing details (what was tested and how)
- Screenshots (for UI changes, if applicable)
- Database migration details (if applicable)
- Rollback plan (for sensitive changes: migrations, security hardening)

### Before opening a PR

- The code builds/runs successfully.
- All tests pass.
- No secrets or sensitive credentials are included.
- Branch name follows the convention: `feature/TEP-<number>-<description>`.
- Commit messages follow the `type(TEP-<number>): summary` convention.
- Changes follow established project standards.
- Documentation is updated when required.
- The changes have been reviewed by the contributor before submission.

---

## Code Standards

- **All code comments (PHP/TypeScript) are written in English, always** — no exception, even when the logic concerns an Arabic-language or academic business rule. Project documentation (README, CONTRIBUTING, `docs/`, Jira descriptions) stays Arabic — this rule is for code comments only.
- Backend: `./vendor/bin/pint` and `./vendor/bin/phpstan analyse` must pass before every commit.
- Frontend: `npm run lint` and `npm run format` must pass before every commit.
- Every bilingual field (AR/EN) is added via `spatie/laravel-translatable`, never separate `_ar`/`_en` columns — check `docs/glossary.md` for the agreed term before naming a new field.

## Frontend Guidelines (React)

- Follow the existing project structure.
- Create reusable components.
- Keep components focused on a single responsibility.
- Avoid duplicate code.
- Handle loading and error states.
- Maintain responsive design (and RTL support for Arabic).
- Use consistent naming conventions.
- Remove unused code before submitting.

## Backend Guidelines (Laravel)

- Follow Laravel best practices.
- Maintain proper separation of responsibilities: Controllers, Form Requests, Policies, Actions/Services, Eloquent models, API Resources.
- Validate all incoming data via Form Requests.
- Apply authorization via Policies/Gates — never trust a role sent from the client (see `docs/glossary.md` and the RBAC design in `academic_supervisor_profiles`/`user_roles`).
- Use migrations for all database changes; never modify a committed migration after it has been merged into `develop` — write a new migration instead.
- Keep API responses consistent (JSON Resources, `problem`-style errors).
- Add tests for important business logic, especially authorization boundaries and workflow state transitions.

## Database Changes

All database changes must include:

- Migration files (with column comments — see existing migrations for the pattern)
- Updated models and relationships
- Required documentation updates in `docs/glossary.md` if new terminology is introduced

Rules:

- Never manually modify production databases.
- Do not remove important data without approval.
- Test migrations locally (`migrate` then `migrate:rollback`) before opening a PR.
- All bilingual columns use `spatie/laravel-translatable` JSON columns.

## API Development Rules

- Follow REST principles under `/api/v1`.
- Validate incoming requests via Form Requests.
- Handle errors with consistent, `problem`-style JSON responses.
- Protect every endpoint with the correct Policy/Gate — verify ownership/scope, not just role.
- Maintain backward compatibility when possible.

## Environment Variables

Do not commit sensitive information.

**Never commit:**
- Passwords
- API keys
- Tokens
- Private credentials
- Certificates

**Use environment variables** and reference `.env.example` (both `backend/.env.example` and `frontend/.env.example`) when adding a new required variable.

## Testing Requirements

Before submitting a PR, verify the following:

### Frontend
- The application starts successfully.
- No console errors are present.
- Core user flows work correctly.
- Responsive behavior has been verified.

### Backend
- API endpoints function correctly.
- Validation works as expected.
- Authorization works as expected (test both the allowed and the denied case).
- Database migrations run successfully against MySQL.
- Tests pass.

## Security Guidelines

Developers must:

- Protect sensitive information.
- Validate all user input.
- Apply proper authorization checks — every sensitive endpoint needs a Policy test proving unauthorized access is rejected (IDOR test).
- Avoid insecure dependencies.
- Report security issues privately.

## Code Review

Reviewers should verify:

- Code quality and maintainability
- Correctness of functionality
- Security considerations (especially authorization/ownership checks)
- Performance considerations
- Test coverage
- Documentation updates
- Alignment with the Jira issue's requirements/acceptance criteria

Approval is required before merging.

## Jira Integration

Jira is the source of truth for:

- Requirements
- Epics
- User stories
- Tasks
- Sprint planning
- Progress tracking

Every PR must reference the related Jira issue.

**Example:** `Jira: TEP-538`

## Project Structure

```
training-ecosystem-platform/
├── backend/    # Laravel 13 API + Filament admin
├── frontend/   # React + TypeScript + Vite (public SPA)
├── docs/       # project-scope.md, glossary.md, ADRs
└── .github/    # CI, issue templates, PR template
```

## Contributor Checklist

Before submitting a PR:

- [ ] Jira issue is linked (TEP-XXX)
- [ ] Branch name follows the convention (`feature/TEP-<number>-<description>`)
- [ ] Commit messages follow the standard (`type(TEP-<number>): summary`)
- [ ] Code has been tested
- [ ] No secrets were committed
- [ ] Documentation updated if required
- [ ] PR description is complete
- [ ] Self-review completed

---

Thank you for contributing to the **Training Ecosystem Platform**.
