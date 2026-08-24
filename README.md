# PVR Invoice Management System

Production-oriented React + Vite + Flask + SQLAlchemy + PostgreSQL (Neon) invoice application for PVR Tours & Travels.

## Architecture

- React/Vite frontend
- Flask API under `/api`
- SQLAlchemy ORM
- Neon PostgreSQL using `DATABASE_URL`
- ReportLab PDF generation
- CSV export
- Vercel deployment from GitHub

The application never contains a real Neon password or connection string. Set `DATABASE_URL` in Vercel Environment Variables and locally in `.env`.

## 1. Neon setup

Create a PostgreSQL database/project in Neon if you do not already have one. Copy the connection string from Neon.

Example `.env`:

```env
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST/DBNAME?sslmode=require
```

Do not commit `.env`.

## 2. Initialize the database

From the project root:

```bash
cd backend
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python init_db.py
```

`init_db.py` creates the required `invoices` and `trips` tables only when they do not exist. It does not drop or replace an existing database.

## 3. Run API locally

```bash
cd backend
python app.py
```

API: `http://localhost:5000`

## 4. Run frontend locally

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` to Flask.

## 5. Vercel deployment

This repository is configured as one Vercel project. The Python API is in `api/index.py`; the Vite application builds to `frontend/dist`.

Set these Vercel environment variables:

```env
DATABASE_URL=<your real Neon connection string>
FRONTEND_ORIGIN=https://your-vercel-domain.vercel.app
```

Optional:

```env
FLASK_DEBUG=0
```

Deploy from GitHub. Do not commit `.env`, credentials, or the Neon connection string.

## API endpoints

- `GET /api/health`
- `GET /api/invoices`
- `GET /api/invoices/:id`
- `POST /api/invoices`
- `PUT /api/invoices/:id`
- `DELETE /api/invoices/:id`
- `GET /api/invoices/:id/pdf`
- `GET /api/invoices/export/csv`

## Important behavior

- `invoice_number = invoice_series + invoice_serial_number`
- Invoice number is unique at the database level.
- Included KM is always `end_km - start_km`.
- Included hours are calculated from start/end times and correctly handle midnight crossing.
- Extra KM and extra hours are never manually entered.
- Editing uses `PUT` and keeps the original invoice ID/number unless the user explicitly changes the invoice number.
- Invoice creation is transactional: header and trips are committed together.
- PostgreSQL constraint errors are classified instead of converting every `IntegrityError` into a duplicate invoice message.
- PDF generation does not create or modify invoices.
