# PVR Invoice Management System — Neon + GitHub + Vercel Setup

This project is intentionally simple: React/Vite + Flask + SQLAlchemy + Neon PostgreSQL. No extra database server, Redis, Docker, or unnecessary infrastructure is required.

## A. Create the Neon PostgreSQL database

1. Sign in to Neon.
2. Create a PostgreSQL project/database for this PVR invoice application.
3. Copy the PostgreSQL connection string.
4. Keep the password private.

Use the connection string as:

`DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST/DBNAME?sslmode=require`

If Neon gives a URL beginning with `postgresql://`, the backend also accepts it and converts it to the psycopg SQLAlchemy driver automatically.

### Important

If you already have a production Neon database containing real PVR invoices, use that database URL instead of creating a second database. Do not drop/recreate it.

## B. Local environment

At the repository root create `.env`:

```env
DATABASE_URL=YOUR_NEON_CONNECTION_STRING
FRONTEND_ORIGIN=http://localhost:5173
FLASK_DEBUG=0
```

Never commit `.env`.

## C. Create the schema without deleting data

```bash
cd backend
python -m venv .venv
```

Windows:

```bash
.venv\\Scripts\\activate
```

macOS/Linux:

```bash
source .venv/bin/activate
```

Install packages:

```bash
pip install -r requirements.txt
```

Initialize only missing tables:

```bash
python init_db.py
```

This uses SQLAlchemy `create_all()` and does not issue DROP TABLE. If the tables already exist, existing rows are preserved.

## D. Verify the database

```bash
python inspect_db.py
```

It prints the invoice/trip table structure and the important invoice-number uniqueness information.

## E. Start Flask

```bash
python app.py
```

Open:

`http://localhost:5000/api/health`

Expected result:

```json
{"success":true,"status":"ok","database":"connected"}
```

## F. Start React

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL shown by the terminal, normally `http://localhost:5173`.

## G. First production test

Create an invoice with:

- Series: `PVR/2026-27/`
- Serial: `918`
- Customer: any test customer
- At least one trip

For a sample trip:

- Start KM: `47970`
- End KM: `48162`
- Start Time: `16:00`
- End Time: `00:00`
- Slab KM: `80`
- Slab Hours: `10`
- Slab Rate: `3700`
- Extra KM Rate: `23`
- Extra Hour Rate: `180`
- Driver Bata: `130`
- Parking: `100`
- Toll: `60`

The UI should show:

- Included KM = 192
- Included Hours = 8
- Extra KM = 112
- Extra Hours = 0

The final invoice number is exactly:

`PVR/2026-27/918`

## H. GitHub

Create a repository and push the project.

Do not push:

- `.env`
- Neon passwords
- database URLs containing passwords
- API keys
- credentials

The included `.gitignore` protects `.env`.

## I. Vercel

Import the GitHub repository into Vercel.

Set these Environment Variables for Production (and Preview if desired):

```env
DATABASE_URL=YOUR_NEON_CONNECTION_STRING
FRONTEND_ORIGIN=https://YOUR-VERCEL-DOMAIN.vercel.app
FLASK_DEBUG=0
```

Vercel uses:

- `frontend/dist` for the React build
- `api/index.py` for the Flask API
- `vercel.json` to route `/api/*` to Flask and everything else to React

Redeploy after setting the variables.

## J. Production verification checklist

1. Open `/api/health` on the Vercel domain.
2. Create an invoice.
3. Refresh the browser.
4. Confirm the invoice appears in Saved Invoices.
5. Edit the invoice and confirm the same invoice ID is updated.
6. Confirm no second invoice number was created.
7. Download PDF.
8. Open the PDF and verify the full table fits the landscape A4 page.
9. Download CSV.
10. Search the invoice by number/customer/reference.

## K. Why the old 409 error is handled correctly

The API first checks the exact requested invoice number. If PostgreSQL still reports a constraint error, the API checks PostgreSQL's actual constraint name.

Only the invoice-number unique constraint is returned as:

`409 DUPLICATE_INVOICE_NUMBER`

Other database failures return their actual category, such as:

- `DATABASE_CONSTRAINT_ERROR`
- `DATABASE_DATA_ERROR`
- `NOT_NULL_VIOLATION`
- `SERVER_ERROR`

This prevents unrelated PostgreSQL errors from being incorrectly reported as duplicate invoice numbers.
