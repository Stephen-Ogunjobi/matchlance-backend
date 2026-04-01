# Matchlance Backend

A REST API backend for **Matchlance**, a freelance marketplace platform that connects clients with freelancers for project-based work.

## Tech Stack

| Category | Technology |
|---|---|
| Language | TypeScript (strict) |
| Runtime | Node.js 22 |
| Framework | Express.js 5 |
| Database | MongoDB (Mongoose) |
| Cache / Sessions | Redis (ioredis, connect-redis) |
| Real-time | Socket.IO 4 with Redis adapter |
| Auth | JWT + Passport.js (Google OAuth 2.0) |
| Email | SendGrid |
| File uploads | Multer |
| Validation | Zod |
| Testing | Jest |

## Features

- **Authentication** — email/password signup with email verification, JWT access + refresh token rotation, Google OAuth 2.0, password reset flow
- **Job board** — post, search, and filter jobs by category, budget type, experience level, and duration
- **Freelancer profiles** — skills, hourly rate, availability, languages, geolocation, profile picture upload, profile completeness scoring
- **Proposals** — freelancers submit bids on jobs; clients review and accept
- **Contracts** — contract lifecycle management between client and freelancer
- **Real-time chat** — Socket.IO messaging with typing indicators, read receipts, and unread counts; Redis pub/sub for multi-server scale
- **Caching** — Redis caching layer for users, jobs, profiles, contracts, and conversations
- **Rate limiting** — per-endpoint limits on all sensitive operations

## Project Structure

```
src/
├── index.ts               # App entry point
├── config/                # Redis, Passport, Multer config
├── controllers/           # Route handlers (auth, job, freelancer, proposal, contract, chat, client)
├── routes/                # Express routers
├── models/                # Mongoose schemas
├── middlewares/           # JWT verification, rate limiting
└── utils/                 # DB connection, Socket.IO, email, caching helpers
```

## Prerequisites

- Node.js 22+
- MongoDB (local or Atlas)
- Redis (local or cloud)
- SendGrid account
- Google Cloud OAuth 2.0 credentials

## Getting Started

**1. Install dependencies**

```bash
npm install
```

**2. Configure environment**

```bash
cp .env.example .env
# Fill in the values below
```

**3. Start the development server**

```bash
npm run dev
```

## Environment Variables

```env
PORT=3001
FRONTEND_URL=http://localhost:5173
NODE_ENV=development

# MongoDB
MONGODB_URL=mongodb+srv://<user>:<pass>@<host>/<db>
TEST_MONGODB_URL=mongodb://localhost:27017/matchlance-test

# JWT
JWT_SECRET=<32-char hex>
JWT_REFRESH_SECRET=<32-char hex>
ACCESS_TOKEN_EXPIRES=15m
REFRESH_TOKEN_EXPIRES=7d

# Sessions
SESSION_SECRET=<32-char hex>

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback

# SendGrid
SENDGRID_API_KEY=SG.<key>
SENDGRID_FROM_EMAIL=no-reply@yourdomain.com
SENDGRID_FROM_NAME=Matchlance

# Email redirect URLs
BACKEND_VERIFY_URL=http://localhost:5173/verify-email
FRONTEND_VERIFY_URL=http://localhost:5173/verify-email
FRONTEND_RESET_PASSWORD_URL=http://localhost:5173/new-password
FRONTEND_PROPOSAL_URL=http://localhost:5173/new-proposal

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

## API Overview

All routes are prefixed with `/api`.

### Auth — `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/signup` | — | Register a new user |
| POST | `/login` | — | Login, returns JWT cookies |
| POST | `/refresh` | — | Rotate access token |
| POST | `/logout` | — | Clear token cookies |
| GET | `/google` | — | Start Google OAuth flow |
| GET | `/google/callback` | — | Google OAuth callback |
| GET | `/verify-email` | — | Verify email address |
| POST | `/resend-verification` | — | Resend verification email |
| POST | `/reset-password` | — | Request password reset email |
| POST | `/new-password` | — | Set new password via reset token |
| GET | `/verify` | JWT | Check if session is valid |
| GET | `/me` | JWT | Get current user info |

### Jobs — `/api/job`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/post-job` | JWT | Create a job |
| GET | `/jobs` | JWT | List jobs (paginated) |
| GET | `/:jobId` | — | Get job details |
| PATCH | `/:jobId` | JWT | Update a job |
| DELETE | `/:jobId` | JWT | Delete a job |
| GET | `/search-jobs` | — | Full-text job search |

### Freelancers — `/api/freelancer`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/profile/:userId` | — | Create freelancer profile |
| GET | `/profile/:freelancerId` | JWT | Get profile |
| PATCH | `/profile/:freelancerId` | JWT | Update profile |
| POST | `/profile/:freelancerId/upload-picture` | JWT | Upload profile picture |
| GET | `/matched-jobs/:freelancerId` | JWT | Get skill-matched jobs |
| GET | `/my-jobs` | JWT | Get accepted jobs |
| GET | `/search-jobs` | — | Search available jobs |

### Proposals — `/api/proposal`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/submit` | JWT | Submit a proposal |
| GET | `/` | JWT | List proposals |
| GET | `/:proposalId` | JWT | Get proposal details |
| PATCH | `/:proposalId` | JWT | Update proposal |

### Contracts — `/api/contract`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | JWT | Create contract |
| GET | `/` | JWT | List contracts |
| GET | `/:contractId` | JWT | Get contract details |
| PATCH | `/:contractId` | JWT | Update contract |

### Chat — `/api/chat`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/conversations` | JWT | List conversations |
| GET | `/:conversationId` | JWT | Get messages |
| POST | `/send` | JWT | Send message (HTTP) |
| GET | `/online` | JWT | Get online users |

Real-time events are handled via Socket.IO: `send_message`, `typing`, `mark_as_read`, `join_conversation`, `leave_conversation`.

### Clients — `/api/client`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/profile/:clientId` | — | Get client profile |
| PATCH | `/profile/:clientId` | JWT | Update client profile |

### Health

```
GET /health
```

## Scripts

```bash
npm run dev      # Development server with hot reload (nodemon + tsx)
npm run build    # Compile TypeScript to dist/
npm start        # Run compiled production build
npm test         # Run Jest test suite
npm run lint     # ESLint
```

## CI/CD

GitHub Actions runs on every push to `main`: lint → build. See [.github/workflows/ci.yml](.github/workflows/ci.yml).
