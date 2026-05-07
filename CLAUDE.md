# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Couple Finance Backend — a Zalo Mini App backend for group-based expense tracking with AI-powered transaction parsing. Built for Vietnamese users. All user-facing strings are in Vietnamese.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server with nodemon (default port from .env)
npm start            # Production server
```

No test framework or linter is configured.

## Tech Stack

- **Runtime**: Node.js (CommonJS — `require`/`module.exports`)
- **Framework**: Express.js
- **Database**: MongoDB via Mongoose 8
- **Auth**: Zalo OAuth 2.0 → JWT (30-day expiry)
- **AI**: OpenRouter API with Claude Haiku for parsing Vietnamese expense text
- **API Docs**: Swagger UI at `/api-docs` (dev only, disabled in production)

## Architecture

```
src/
├── index.js              # Express app entry, middleware, error handler
├── config/
│   ├── database.js       # MongoDB connection
│   └── swagger.js        # OpenAPI spec
├── routes/index.js       # All route definitions with Swagger annotations
├── controllers/          # Request handlers
├── services/             # Business logic (aiService, fundService)
├── models/               # Mongoose schemas
└── middlewares/
    ├── auth.js           # JWT verification → req.user
    └── groupAccess.js    # Extracts groupId, verifies membership → req.groupId
```

Request flow: `routes → authenticate middleware → groupAccess middleware (where applicable) → controller → service → model`

## Key Patterns

### Multi-Group Scoping

All transaction and fund endpoints require `groupId`, passed via query param (`?groupId=xxx`) or header (`x-group-id`). The `groupAccess` middleware validates group membership and sets `req.groupId`.

### AI Transaction Parsing Flow

1. `POST /transactions/parse` — sends `rawInput` (Vietnamese text) to Claude Haiku via OpenRouter
2. AI returns parsed `{ type, amount, category, description }`
3. User confirms on frontend
4. `POST /transactions` — creates the transaction

Categories are fixed: `Ăn uống`, `Đi lại`, `Nhà ở`, `Mua sắm`, `Giải trí`, `Sức khỏe`, `Khác`

### Fund Balance

Fund balance is computed dynamically: `totalContributed - totalSpent` (no stored balance field). Contributions are upserted per user/group/month.

### Auth

Two auth methods, both producing the same JWT:

1. **Zalo login** (`POST /auth/zalo`): verifies Zalo access token, only pre-registered Zalo IDs allowed (`USER_LOC_ZALO_ID`, `USER_DUONG_ZALO_ID`).
2. **Phone login** (`POST /auth/register` then `POST /auth/login`): register with phone + password, only pre-registered phones allowed (`USER_LOC_PHONE`, `USER_DUONG_PHONE`). Passwords hashed with bcrypt.

Both produce JWTs that work identically with all authenticated endpoints. User model uses `authProvider` field (`'zalo'` or `'phone'`) to distinguish.

## Environment

Copy `.env.example` to `.env`. Key variables: `PORT`, `NODE_ENV`, `MONGODB_URI`, `ZALO_APP_ID`, `ZALO_APP_SECRET_KEY`, `OPENROUTER_API_KEY`, `LLM_MODEL`, `JWT_SECRET`, `USER_LOC_ZALO_ID`, `USER_DUONG_ZALO_ID`, `USER_LOC_PHONE`, `USER_DUONG_PHONE`.
