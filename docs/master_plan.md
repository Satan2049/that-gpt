# Master Plan - Chatterbox

## 1) Product Goal
Build a small, fast, maintainable Chatterbox app that runs locally, connects to a text/vision model API, has a modern minimal UI with Day/Night themes, and supports clean, extensible prompt/chat management.

---

## 2) MVP Scope

### 2.1 In-Scope Features
- Text chat with model
- Send images to model (image input / vision)
- Render model responses in UI
- Keep conversation history
- Select/update system prompt
- Light/Dark theme toggle
- API error handling (`timeout`, `rate-limit`, `invalid-key`, `network`)

### 2.2 Out of Scope for MVP
- Authentication / multi-user
- Cloud sync
- RBAC / permissions
- Advanced plugins
- Complex agent orchestration

---

## 3) Architecture Decisions

### 3.1 Architecture Pattern
- **Frontend + Backend Proxy**
  - Frontend manages UI and state only.
  - Local backend is the single integration point for AI provider APIs.
  - API keys remain server-side only.

### 3.2 Why Backend Proxy Is Required
- Prevent API key exposure in browser
- Full control over request/response schema
- Easy retries, local rate limits, and logging
- Provider migration becomes straightforward

### 3.3 Chat Storage Strategy
Requirement: store chats locally inside project folder.  
Browser `localStorage` alone is not enough (it does not create files in project directory).  
Correct strategy:
- Keep active state in frontend
- Persist primary data on backend as files in project:
  - Recommended path: `./data/chats/*.json`
- (Optional) Keep small UI cache in browser `localStorage` for fast reload

---

## 4) Recommended Tech Stack

### 4.1 Frontend
- React + Vite + TypeScript
- TailwindCSS (or CSS variables) for theming
- Zustand or Redux Toolkit (Zustand is lighter for MVP)
- React Query (optional, for fetch lifecycle)

### 4.2 Backend
- Node.js + Fastify (or Express; Fastify preferred for cleaner structure/perf)
- TypeScript
- Zod for schema validation
- Axios or native fetch for API calls
- Multer (if multipart upload is needed)

### 4.3 Persistence
- Start: file-based JSON under `data/`
- Upgrade path: SQLite (Drizzle/Prisma) with minimal service-layer changes

---

## 5) Clean Folder Structure

```txt
Chatterbox/
  client/
    src/
      app/
        providers/
        router/
      features/
        chat/
          components/
          hooks/
          store/
          services/
          types/
        prompt/
          components/
          store/
          types/
      shared/
        components/
        lib/
        styles/
        types/
      main.tsx
    index.html
    vite.config.ts
  server/
    src/
      app.ts
      config/
        env.ts
      modules/
        chat/
          chat.controller.ts
          chat.service.ts
          chat.repository.ts
          chat.schema.ts
          chat.types.ts
        prompt/
          prompt.controller.ts
          prompt.service.ts
          prompt.repository.ts
      providers/
        ai/
          ai.client.ts
          ai.mapper.ts
          ai.types.ts
      shared/
        errors/
        logger/
        utils/
    data/
      chats/
      prompts/
    .env
    .env.example
  docs/
    master_plan.md
```

---

## 6) Data Contracts

### 6.1 Message
- `id`
- `conversationId`
- `role` = `system | user | assistant`
- `content` (text)
- `images` (optional array)
- `createdAt`

### 6.2 Conversation
- `id`
- `title`
- `messages[]`
- `promptPresetId` (optional)
- `createdAt`
- `updatedAt`

### 6.3 Prompt Preset
- `id`
- `name`
- `systemPrompt`
- `temperature`
- `maxTokens`
- `model`

---

## 7) Local Backend API Design

### 7.1 Chat APIs
- `POST /api/chat/send`
  - body: `conversationId`, `message`, `images?`, `promptPresetId?`
  - response: assistant message + usage/meta

- `GET /api/chat/conversations`
- `GET /api/chat/conversations/:id`
- `POST /api/chat/conversations`
- `DELETE /api/chat/conversations/:id`

### 7.2 Prompt APIs
- `GET /api/prompts`
- `POST /api/prompts`
- `PUT /api/prompts/:id`
- `DELETE /api/prompts/:id`

### 7.3 Health
- `GET /health`

---

## 8) Image-to-Model Flow

### 8.1 Flow
1. User selects image(s) in UI.
2. Frontend sends file(s) to backend (multipart or base64).
3. Backend validates image(s): size, mime, count.
4. Backend builds provider-specific payload.
5. Model response returns and is persisted with message history.

### 8.2 Recommended Limits
- Max 4 images per message
- Max 5MB per file
- Allowed mime types: `image/jpeg`, `image/png`, `image/webp`

---

## 9) Prompt Engineering UX (Clean and Configurable)

### 9.1 Prompt Layers
- **System Prompt**: global behavior/rules
- **Session Prompt**: per-conversation context
- **Message Input**: current user message

### 9.2 Prompt Presets
User can save reusable presets, e.g.:
- `General Assistant`
- `Code Reviewer`
- `Translator`
- `Image Analyzer`

### 9.3 Required UX Behaviors
- Quick switch between presets
- Show model settings summary near composer
- Clone preset and edit without overwriting original

---

## 10) Modern Minimal UI (Day/Night)

### 10.1 Layout
- Sidebar: conversations + preset selector
- Main panel: message list
- Composer: text input + image upload + send

### 10.2 Theme System
- CSS variables as design tokens:
  - `--bg`, `--surface`, `--text`, `--muted`, `--primary`, `--border`
- Root attribute: `data-theme="light|dark"`
- Persist theme choice in browser `localStorage`

### 10.3 Design Principles
- Consistent spacing (4/8 scale)
- Soft border radius
- Clean typography
- Subtle short animations
- Proper contrast in dark mode

---

## 11) Security and Reliability

### 11.1 Security
- Keep API key only in `server/.env`
- Sanitize text inputs
- Strict image validation
- Request payload size limits

### 11.2 Reliability
- Provider request timeout
- Limited retry with backoff
- User-friendly error messages
- Structured backend logging

---

## 12) Phased Execution Roadmap

### Phase 1 - Bootstrap (Half Day)
- Create `client` and `server` with TypeScript
- Setup lint/format
- Add health endpoint
- Add base UI skeleton

### Phase 2 - Text Chat MVP (1 Day)
- Composer + message list
- `send` endpoint
- Persist conversations/messages in `server/data/chats`
- Loading and error states

### Phase 3 - Prompt Management (0.5 to 1 Day)
- Prompt preset CRUD
- Preset selection in UI
- Attach preset to conversation

### Phase 4 - Image Input (1 Day)
- Image upload in composer
- Backend validation
- Multi-part payload mapping for provider
- Preview and upload status in UI

### Phase 5 - Theme + Polish (Half Day)
- Full Day/Night support
- Improve spacing/typography/states
- Persist theme selection

### Phase 6 - Hardening (1 Day)
- Error-path tests
- Better logging
- Architecture cleanup
- Practical README

---

## 13) Minimum Test Plan

### 13.1 Backend
- Unit tests for `chat.service`
- Image input validation tests
- File repository read/write tests

### 13.2 Frontend
- Message list render test
- Composer submit test
- Theme toggle test

### 13.3 Manual QA Checklist
- Send plain text
- Send valid/invalid images
- Switch prompt presets
- Switch themes
- Restart app and verify history persistence

---

## 14) Definition of Done
- End-to-end text and image chat works
- Conversations persist in `server/data/chats`
- Presets can be created/edited/selected
- Minimal UI stable in light/dark
- API keys are not exposed in frontend
- Errors are understandable and logged

---

## 15) Post-MVP Extensions
- Streaming responses (SSE/WebSocket)
- SQLite migration
- Conversation export/import
- Prompt versioning
- Multi-model routing
- Slash commands in composer

---

## 16) Final Recommended Baseline
- Frontend: **React + Vite + TypeScript**
- Backend: **Fastify + TypeScript + Zod**
- Persistence: JSON file storage in `server/data`
- Prompt presets from day one for extensibility
- Token-based minimal theming for light/dark modes
