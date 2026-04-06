# Brand Kit Capture

A full-stack tool for capturing brand color swatches and typography cards as optimized PNG images, uploaded directly to Google Cloud Storage. Built to produce clean brand assets for AI-powered design workflows.

## Stack

- **Frontend**: React 18 + Vite + Tailwind CSS v4 + shadcn/ui
- **Backend**: Python FastAPI
- **Storage**: Google Cloud Storage (presigned URLs)
- **Capture**: [html-to-image](https://github.com/bubkoo/html-to-image) + [upng-js](https://github.com/nickthedude/upng-js) (browser-native rendering with PNG-8 quantization)

## Features

### Swatch Card
- 4 editable color swatches (Primary, Accent, Secondary, Background)
- Color picker powered by react-colorful wrapped in shadcn Popover
- Dynamic Tailwind color name detection (nearest match from full Tailwind palette)

### Font Card
- Google Fonts picker with search + category filter (1000+ fonts)
- All weight + style variants shown as pills (e.g. Thin, Regular, Bold Italic)
- Typography role selector: Title, Heading, Subheading, Section Header, Body, Quotes, Captions
- Editable preview text with blur-fade animation on font/weight change
- Edit panel closes on outside click

### Shared
- 2x resolution PNG capture via browser-native SVG foreignObject rendering
- Optimized PNG-8 output via upng-js quantization (50-70% smaller than raw PNG-24)
- Direct-to-GCS upload using presigned PUT URLs (backend never touches image bytes)
- Gallery with file size badges, fetched live from GCS on every page load

## Project Structure

```
brand-kit-capture/
  frontend/                     # Vite + React + Tailwind v4 + shadcn/ui
    src/
      components/
        SwatchCard.tsx           # Color swatch editor + capture
        FontCard.tsx             # Typography card editor + capture
        Gallery.tsx              # Gallery of uploaded images
        ui/
          font-picker.tsx        # Google Fonts picker (search, category, variants)
      hooks/
        useOutsideClick.ts       # Reusable outside-click hook
      lib/
        api.ts                   # API client (upload, view, list)
        capture.ts               # html-to-image + upng-js optimized capture
        fonts.ts                 # Google Fonts API client (24h cache)
        tailwind-colors.ts       # Tailwind palette lookup (242 colors)
        utils.ts                 # shadcn cn() utility
      App.tsx
      main.tsx
      index.css                  # Tailwind v4 + shadcn theme
    .env.example
    vite.config.ts
    vercel.json
  backend/                       # FastAPI
    main.py                      # API endpoints
    setup_cors.py                # One-time CORS setup script
    requirements.txt
    Dockerfile
    .env.example
  package.json                   # Root: concurrently dev script
  README.md
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/presign/upload?filename=&folder=` | Signed PUT URL (`folder`: `swatches` or `typography`) |
| GET | `/api/presign/view?object_name=` | Signed GET URL for viewing |
| GET | `/api/swatches` | List color palette captures |
| GET | `/api/typography` | List typography card captures |

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.10+
- A GCS bucket + service account with `Storage Object Admin` role
- A [Google Fonts API key](https://console.cloud.google.com) (APIs & Services → Enable "Web Fonts Developer API" → Credentials → Create API Key)

### Install & run

```bash
# Install root + frontend dependencies
npm install
cd frontend && npm install && cd ..

# Set up backend venv (one-time)
cd backend
python -m venv .venv
.venv\Scripts\activate     # Windows
# source .venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
cd ..

# Configure env files
cp frontend/.env.example frontend/.env   # add VITE_GOOGLE_FONTS_API_KEY
cp backend/.env.example backend/.env     # add GCS credentials

# Run both frontend + backend together
npm run dev
```

Vite dev server runs on http://localhost:5173, backend on http://localhost:8000. Vite proxies `/api` to the backend automatically.

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `GCS_BUCKET_NAME` | GCS bucket name | Yes |
| `FRONTEND_URL` | Frontend origin for CORS | Yes |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account JSON (local dev) | Option A |
| `GCS_CREDENTIALS_JSON` | Base64-encoded service account JSON (cloud deploy) | Option B |

### Frontend (Vercel env vars)

| Variable | Description |
|----------|-------------|
| `VITE_GOOGLE_FONTS_API_KEY` | Google Fonts API key (restrict to your domain in GCP) |
| `VITE_API_URL` | Backend URL (e.g. `https://your-service.asia-south1.run.app`) |

## GCS Setup

1. Create a bucket in [GCP Console](https://console.cloud.google.com/storage)
2. Create a service account with **Storage Object Admin** role
3. Download the JSON key, save as `backend/service-account.json`
4. Set CORS on the bucket:

```bash
# Using the included script (no gcloud needed):
cd backend && python setup_cors.py

# Or with gcloud:
gcloud storage buckets update gs://YOUR_BUCKET --cors-file=cors.json
```

5. For cloud deploy, base64-encode the key:

```bash
# Linux/Mac:
base64 -i service-account.json | tr -d '\n'
# Windows PowerShell:
[Convert]::ToBase64String([IO.File]::ReadAllBytes("service-account.json"))
```

## Deployment

### Frontend → Vercel

1. Push to GitHub
2. Import in Vercel, set root directory to `frontend`
3. Set env var: `VITE_API_URL` = your backend URL
4. Deploy

### Backend → Cloud Run

```bash
cd backend
gcloud run deploy brand-kit-capture-api \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars="GCS_BUCKET_NAME=your-bucket,FRONTEND_URL=https://brand-kit-capture.vercel.app,GCS_CREDENTIALS_JSON=<base64>"
```

## How It Works

1. User edits a color swatch or typography card
2. Clicks **Save & Upload** (edit panel auto-closes first if open)
3. `html-to-image` captures the card at 2x resolution via SVG foreignObject → canvas
4. `upng-js` quantizes the canvas pixels to 256-color PNG-8 (50-70% smaller, visually identical)
5. Frontend gets a presigned PUT URL from the backend with the correct folder (`swatches/` or `typography/`)
6. Frontend uploads the optimized blob directly to GCS (backend never touches the bytes)
7. Gallery refreshes from `/api/swatches` or `/api/typography` showing file size and upload timestamp

## Image Optimization

- Captured at 2x pixel ratio for high-resolution output
- PNG-8 quantization via upng-js (256-color palette) — ideal for solid-color swatch cards
- Typically 50-70% smaller than raw PNG-24 with no visible quality loss
- Uses browser-native rendering (not canvas re-implementation), so all CSS features render correctly
- File size displayed on each gallery thumbnail for visibility
