# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Root (runs both together)
```bash
npm run dev      # Start frontend + backend simultaneously via concurrently
```

### Frontend (from `frontend/`)
```bash
npm run dev      # Start Vite dev server (http://localhost:5173)
npm run build    # Type-check (tsc -b) then build to dist/
npm run preview  # Preview production build
```

### Backend (from `backend/`)
```bash
uvicorn main:app --reload --port 8000  # Start dev server
python setup_cors.py                    # One-time: configure CORS on GCS bucket
```

The Vite dev server proxies `/api/*` to `localhost:8000`, so run both together during development.

## Architecture

Full-stack monorepo: React/TypeScript frontend + Python/FastAPI backend. The backend never handles image bytes — it only generates presigned GCS URLs. The frontend does all capture, optimization, and direct upload.

### Save workflow
1. User edits card (colors or typography) → clicks Save & Upload
2. If edit panel is open, it closes first (350ms animation delay) then captures
3. `App.tsx` calls `capture.ts`: renders the card element via `html-to-image` at 2× resolution → quantizes to PNG-8 via `upng-js` (50–70% size reduction)
4. Calls `api.ts` → `GET /api/presign/upload?folder=swatches|typography` to get a short-lived signed PUT URL
5. Uploads blob directly to GCS via the presigned URL into the correct folder
6. Gallery refreshes: `GET /api/swatches` or `GET /api/typography` returns list with fresh signed view URLs + file sizes

### Key modules
- `frontend/src/lib/capture.ts` — HTML→canvas→PNG-8 pipeline
- `frontend/src/lib/api.ts` — Backend calls: `getUploadUrl` (with folder param), `uploadBlob`, `listSwatches`, `listTypography`
- `frontend/src/lib/fonts.ts` — Google Fonts API client with 24h cache, per-variant font loading
- `frontend/src/lib/tailwind-colors.ts` — Nearest Tailwind color lookup by Euclidean RGB distance
- `frontend/src/components/SwatchCard.tsx` — Color swatch card editor with dirty-state tracking
- `frontend/src/components/FontCard.tsx` — Typography card with font picker, variant pills, role selector, blur-fade animation
- `frontend/src/components/Gallery.tsx` — Paginated grid (4 per page) with formatted timestamps and copy URL
- `frontend/src/components/ui/font-picker.tsx` — Google Fonts picker with search, category filter, virtualized list
- `frontend/src/hooks/useOutsideClick.ts` — Reusable hook: closes panel on outside click
- `backend/main.py` — FastAPI: health, presign/upload (folder param), presign/view, list swatches, list typography

### API endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/presign/upload?filename=&folder=` | Signed PUT URL (folder: swatches or typography) |
| GET | `/api/presign/view?object_name=` | Signed GET URL |
| GET | `/api/swatches` | List swatches/ folder |
| GET | `/api/typography` | List typography/ folder |

### GCS folder structure
```
htmltocanvas-swatches/
  swatches/    ← color palette captures
  typography/  ← font card captures
```

### Backend auth
Supports two credential modes via `.env`: `GOOGLE_APPLICATION_CREDENTIALS` (file path) or `GCS_CREDENTIALS_JSON` (base64-encoded JSON). Copy `backend/.env.example` to `backend/.env` to configure.

### Environment variables
**Frontend (`frontend/.env`)**
- `VITE_GOOGLE_FONTS_API_KEY` — Google Fonts API key (baked into bundle at build time)
- `VITE_API_URL` — Backend URL for production (empty = use Vite proxy in dev)

**Backend (`backend/.env`)**
- `GCS_BUCKET_NAME` — GCS bucket name
- `FRONTEND_URL` — Frontend origin for CORS
- `GOOGLE_APPLICATION_CREDENTIALS` — Path to service account JSON (local dev)
- `GCS_CREDENTIALS_JSON` — Base64-encoded service account JSON (cloud deploy)

### Deployment
- Frontend → Vercel (`frontend/vercel.json`), set `VITE_GOOGLE_FONTS_API_KEY` and `VITE_API_URL`
- Backend → Cloud Run (`backend/Dockerfile`, Python 3.12 slim, port 8000), set GCS env vars and `FRONTEND_URL`
