# Implementation Stages - Chatterbox

## Stage 1 - Project Bootstrap ✅
### Goal
Create a clean monorepo-like base with `client` and `server`, TypeScript setup, runnable scripts, health endpoint, base UI shell, and local data folders.

### Deliverables
- Root workspace `package.json` with helper scripts
- `client` scaffold (Vite + React + TS style structure)
- `server` scaffold (Fastify + TS)
- `GET /health` endpoint
- Base UI shell with:
  - Sidebar placeholder
  - Message area placeholder
  - Composer placeholder
  - Light/Dark toggle
- Data directories:
  - `server/data/chats`
  - `server/data/prompts`
- `.env.example` for server

### Exit Criteria
- `npm run dev:server` starts server
- `GET /health` returns 200
- `npm run dev:client` starts UI shell
- Folder structure matches `master_plan.md`

---

## Stage 2 - Text Chat Core ✅
### Goal
Implement end-to-end text chat flow with backend persistence and frontend rendering.

### Tasks
- Define chat contracts (`Message`, `Conversation`)
- Build chat repository (JSON file read/write)
- Implement:
  - `POST /api/chat/send`
  - `GET /api/chat/conversations`
  - `GET /api/chat/conversations/:id`
  - `POST /api/chat/conversations`
  - `DELETE /api/chat/conversations/:id`
- Build chat store in frontend
- Connect composer submit to backend
- Render user/assistant messages and loading state

### Exit Criteria
- New conversation can be created and opened
- User can send message and receive assistant response
- History persists in `server/data/chats/*.json`

---

## Stage 3 - Prompt Presets ✅
### Goal
Add configurable prompt presets and wire them into chat requests.

### Tasks
- Prompt schema and repository (file-based)
- Implement preset CRUD APIs
- Build prompt settings panel in UI
- Preset selector in sidebar/composer
- Attach selected preset to `/api/chat/send`

### Exit Criteria
- User can create/edit/delete/select presets
- Selected preset affects model output behavior
- Presets persist in `server/data/prompts/*.json`

---

## Stage 4 - Image Input (Vision) ✅
### Goal
Support sending image(s) with user messages to vision-capable model endpoints.

### Tasks
- Composer image picker + preview chips
- Backend file validation:
  - mime type
  - max size
  - max image count
- Map images + text to provider payload
- Persist image metadata in message history

### Exit Criteria
- User can send text + images in one message
- Invalid images are rejected with clear errors
- Model response includes vision understanding flow

---

## Stage 5 - Theme and UI Polish ✅
### Goal
Finalize minimal modern UI and complete theme system.

### Tasks
- Token-based light/dark theme variables
- Persist selected theme in browser `localStorage`
- Improve spacing, states, focus ring, empty states
- Responsive behavior for smaller widths

### Exit Criteria
- UI is stable and readable in both themes
- Theme preference persists across reloads

---

## Stage 6 - Hardening and Quality ✅
### Goal
Improve reliability, validation, and test coverage before daily usage.

### Tasks
- Zod validation for all API inputs
- Error normalization and HTTP mapping
- Timeout and retry policy at AI client layer
- Unit tests:
  - chat service
  - repositories
  - image validators
- Frontend tests:
  - composer
  - message list
  - theme toggle

### Exit Criteria
- Core flows covered by tests
- Common failure scenarios handled predictably
- Logs are actionable for debugging

---

## Stage 7 - Optional Enhancements
### Goal
Add non-critical improvements after core is stable.

### Candidate Features
- SSE/WebSocket streaming responses
- SQLite migration
- Export/Import chats
- Slash commands in composer
- Multi-model routing
- Prompt version history

---

## Immediate Action Plan
Stages 1–6 are complete. For publishing:
1. Copy `server/.env.example` → `server/.env` locally (never commit `.env`).
2. Run `npm run test` and both dev servers.
3. Initialize git in this folder and push to GitHub (see root `README.md`).
