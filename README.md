## Streami Backend (Milestone 1)

NestJS 11 + TypeORM + PostgreSQL backend delivering the Foundations milestone:
- Email/password auth with verification (Resend)
- JWT access tokens (15m)
- Opaque refresh tokens (30d, rotation)
- Global rate limiting and secure cookies
- Daily cleanup job for expired tokens

## Tech
- NestJS 11 (feature-based structure)
- TypeORM (PostgreSQL); `citext` for case-insensitive email
- Resend for transactional emails
- `@nestjs/throttler` for rate limiting

## Project setup
```bash
npm install
```

## Database setup
```bash
# Local Postgres (macOS/Homebrew example)
createdb streami
psql -d streami -c "CREATE EXTENSION IF NOT EXISTS citext;"
```

Alternative with dedicated role:
```bash
psql -d postgres -c "CREATE ROLE streami WITH LOGIN PASSWORD 'streami' SUPERUSER;"
psql -d postgres -c "CREATE DATABASE streami OWNER streami;"
psql -d streami -U streami -c "CREATE EXTENSION IF NOT EXISTS citext;"
# DATABASE_URL=postgresql://streami:streami@localhost:5432/streami
```

## Environment variables
Create a `.env` in the project root:
```bash
# Runtime
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://localhost:5432/streami?user=YOUR_USER
TYPEORM_LOGGING=false

# Auth
JWT_ACCESS_SECRET=REPLACE_WITH_LONG_RANDOM_STRING
REFRESH_TOKEN_PEPPER=REPLACE_WITH_LONG_RANDOM_STRING

# Email (Resend)
MAIL_FROM=Streami <no-reply@streami.dev>
RESEND_API_KEY=your_resend_key
# (optional fallback)
# MAIL_PROVIDER_API_KEY=

# URLs
APP_URL=http://localhost:3000
WEB_URL=http://localhost:5173
```
Generate strong secrets:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Run
```bash
# development
npm run start:dev

# production build
npm run build && npm run start:prod
```

## API Overview (v1)
Base URL: `http://localhost:3000/v1`

### Auth
- POST `/auth/register`
  - Body:
    ```json
    { "email": "user@example.com", "password": "P@ssw0rd!", "displayName": "User" }
    ```
  - Returns: `201 { "message": "verification_email_sent" }`
  - Notes: Creates an unverified user and emails a verification link.

- GET `/auth/verify-email?token=...`
  - Returns: `200 { "message": "email_verified" }`
  - Notes: Consumes token and marks user as verified.

- POST `/auth/login`
  - Body:
    ```json
    { "email": "user@example.com", "password": "P@ssw0rd!" }
    ```
  - Returns:
    ```json
    {
      "accessToken": "...",
      "user": { "id": "...", "email": "user@example.com", "displayName": "User", "isEmailVerified": true }
    }
    ```
  - Also sets `rt` httpOnly cookie with refresh token (30 days).

- POST `/auth/refresh`
  - Reads `rt` cookie; returns `200 { "accessToken": "..." }` and rotates the cookie.

- POST `/auth/logout`
  - Reads `rt` cookie; revokes it and clears the cookie. Returns `200 { "message": "logged_out" }`.

- GET `/auth/me`
  - Header: `Authorization: Bearer <accessToken>`
  - Returns: `200 { "id": "...", "email": "...", "role": "USER" }`

### Status
- GET `/health`
  - Returns `OK`.

## cURL examples
```bash
# Register
curl -X POST http://localhost:3000/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"P@ssw0rd!","displayName":"You"}'

# Verify (use token from email or console log if no API key)
curl "http://localhost:3000/v1/auth/verify-email?token=RAW_TOKEN"

# Login
curl -X POST http://localhost:3000/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"P@ssw0rd!"}'

# Refresh (send cookie from login response)
curl -X POST http://localhost:3000/v1/auth/refresh \
  -H 'Cookie: rt=YOUR_REFRESH_COOKIE'

# Logout
curl -X POST http://localhost:3000/v1/auth/logout \
  -H 'Cookie: rt=YOUR_REFRESH_COOKIE'

# Me
curl http://localhost:3000/v1/auth/me \
  -H 'Authorization: Bearer ACCESS_TOKEN'
```

## Behaviors & Security
- Passwords hashed with Argon2id
- Access JWT (15m) contains `sub`, `email`, and `role`
- Refresh tokens are opaque random secrets, stored hashed and rotated on refresh
- Cookies: `httpOnly`, `sameSite=lax`, `secure` in production
- Rate limits: global 100/min; tighter can be added per-route
- Daily cleanup job removes expired email and refresh tokens

## Repo automations
- Dependabot: `.github/dependabot.yml`
- GitGuardian secrets scanning: `.github/workflows/gitguardian.yml` (requires `GITGUARDIAN_API_KEY`)

## Notes
- Ensure Postgres `citext` extension exists before first run
- For local dev without Resend key, verification links are logged to console
