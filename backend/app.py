import os
import traceback
from datetime import datetime, date
from pathlib import Path
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from sqlalchemy import create_engine, select, or_, func
from sqlalchemy.exc import IntegrityError, DataError, StatementError
from sqlalchemy.orm import sessionmaker, joinedload
from dotenv import load_dotenv

from models import Base, Invoice, Trip
from services import (
    calculate_invoice,
    build_invoice_pdf,
    invoice_to_csv,
    invoice_to_excel,
)

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR.parent / ".env")
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not configured. Set it in .env locally or Vercel Environment Variables.")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    connect_args={"connect_timeout": 10},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

app = Flask(__name__)
origins = os.getenv("FRONTEND_ORIGIN", "*")
CORS(app, resources={r"/api/*": {"origins": origins.split(",") if origins != "*" else "*"}})


def init_tables():
    Base.metadata.create_all(bind=engine)


# Safe for an existing database: CREATE TABLE IF NOT EXISTS semantics are used by SQLAlchemy.
try:
    init_tables()
except Exception:
    # Do not hide a database problem from the API; requests will expose a useful health/error response.
    traceback.print_exc()


def error_response(message, status=400, code=None, details=None):
    payload = {"success": False, "message": message}
    if code:
        payload["code"] = code
    if details:
        payload["details"] = details
    return jsonify(payload), status


def parse_date(value, field="date"):
    if not value:
        raise ValueError(f"{field} is required")
    try:
        return date.fromisoformat(str(value))
    except ValueError:
        raise ValueError(f"{field} must be a valid date in YYYY-MM-DD format")


def serialize_trip(t):
    return {
        "id": t.id,
        "ds_no": t.ds_no or "",
        "trip_date": t.trip_date.isoformat() if t.trip_date else "",
        "end_date": t.end_date.isoformat() if t.end_date else "",
        "vehicle_type": t.vehicle_type or "",
        "vehicle_number": t.vehicle_number or "",
        "start_time": t.start_time or "",
        "end_time": t.end_time or "",
        "start_km": t.start_km or 0,
        "end_km": t.end_km or 0,
        "total_hours": t.total_hours or 0,
        "total_km": t.total_km or 0,
        "slab_hours": t.slab_hours or 0,
        "slab_km": t.slab_km or 0,
        "slab_rate": t.slab_rate or 0,
        "extra_hour_rate": t.extra_hour_rate or 0,
        "extra_km_rate": t.extra_km_rate or 0,
        "extra_hours": t.extra_hours or 0,
        "extra_km": t.extra_km or 0,
        "extra_hour_amount": t.extra_hour_amount or 0,
        "extra_km_amount": t.extra_km_amount or 0,
        "base_amount": t.base_amount or 0,
        "driver_bata": t.driver_bata or 0,
        "parking": t.parking or 0,
        "toll": t.toll or 0,
        "other_charges": t.other_charges or 0,
        "trip_total": t.trip_total or 0,
        "notes": t.notes or "",
    }


def serialize_invoice(inv):
    return {
        "id": inv.id,
        "invoice_number": inv.invoice_number,
        "invoice_series": inv.invoice_series,
        "invoice_serial_number": inv.invoice_serial_number,
        "invoice_date": inv.invoice_date.isoformat() if inv.invoice_date else "",
        "customer_name": inv.customer_name,
        "customer_address": inv.customer_address or "",
        "customer_gstin": inv.customer_gstin or "",
        "booked_by": inv.booked_by or "",
        "used_by": inv.used_by or "",
        "reference_number": inv.reference_number or "",
        "cgst_rate": inv.cgst_rate or 0,
        "sgst_rate": inv.sgst_rate or 0,
        "igst_rate": inv.igst_rate or 0,
        "subtotal": inv.subtotal or 0,
        "cgst": inv.cgst or 0,
        "sgst": inv.sgst or 0,
        "igst": inv.igst or 0,
        "round_off": inv.round_off or 0,
        "grand_total": inv.grand_total or 0,
        "created_at": inv.created_at.isoformat() if inv.created_at else None,
        "updated_at": inv.updated_at.isoformat() if inv.updated_at else None,
        "trips": [serialize_trip(t) for t in inv.trips],
    }


def validate_payload(data):
    if not isinstance(data, dict):
        raise ValueError("Request body must be a JSON object")
    customer_name = str(data.get("customer_name") or "").strip()
    if not customer_name:
        raise ValueError("Customer Name is required")
    series = str(data.get("invoice_series") or "").strip()
    serial = str(data.get("invoice_serial_number") or "").strip()
    if not series:
        raise ValueError("Invoice Series is required")
    if not serial:
        raise ValueError("Invoice Serial Number is required")
    if not data.get("invoice_date"):
        raise ValueError("Invoice Date is required")
    invoice_date = parse_date(data["invoice_date"], "Invoice Date")
    invoice_number = f"{series}{serial}"
    trips = data.get("trips")
    if not isinstance(trips, list) or not trips:
        raise ValueError("At least one trip is required")
    return invoice_number, invoice_date


def apply_invoice(inv, data, calculated):
    invoice_number, invoice_date = validate_payload(data)
    inv.invoice_number = invoice_number
    inv.invoice_series = str(data.get("invoice_series") or "").strip()
    inv.invoice_serial_number = str(data.get("invoice_serial_number") or "").strip()
    inv.invoice_date = invoice_date
    inv.customer_name = str(data.get("customer_name") or "").strip()
    inv.customer_address = str(data.get("customer_address") or "").strip()
    inv.customer_gstin = str(data.get("customer_gstin") or "").strip()
    inv.booked_by = str(data.get("booked_by") or "").strip()
    inv.used_by = str(data.get("used_by") or "").strip()
    inv.reference_number = str(data.get("reference_number") or "").strip()
    for key in ("cgst_rate", "sgst_rate", "igst_rate", "subtotal", "cgst", "sgst", "igst", "round_off", "grand_total"):
        setattr(inv, key, calculated[key])
    return inv


@app.get("/api/health")
def health():
    try:
        with engine.connect() as conn:
            conn.exec_driver_sql("SELECT 1")
        return jsonify({"success": True, "status": "ok", "database": "connected"})
    except Exception as exc:
        return error_response("Database connection failed", 503, "DATABASE_UNAVAILABLE", str(exc))


@app.post("/api/invoices")
def create_invoice():
    session = SessionLocal()

    try:
        data = request.get_json(silent=True) or {}

        invoice_number, _ = validate_payload(data)

        existing = session.execute(
            select(Invoice.id).where(
                Invoice.invoice_number == invoice_number
            )
        ).scalar_one_or_none()

        if existing is not None:
            return error_response(
                "Invoice number already exists",
                409,
                "DUPLICATE_INVOICE_NUMBER"
            )

        calculated_trips, totals = calculate_invoice(
            data,
            data["trips"]
        )

        inv = Invoice()

        apply_invoice(
            inv,
            data,
            totals
        )

        session.add(inv)
        session.flush()

        for tdata in calculated_trips:
            trip = Trip(
                invoice_id=inv.id,
                **tdata
            )

            if trip.trip_date:
                trip.trip_date = parse_date(
                    trip.trip_date,
                    "Trip Date"
                )

            if trip.end_date:
                trip.end_date = parse_date(
                    trip.end_date,
                    "End Date"
                )
            else:
                trip.end_date = trip.trip_date

            session.add(trip)

        session.commit()
        session.refresh(inv)

        return jsonify({
            "success": True,
            "message": "Invoice created successfully",
            "invoice": serialize_invoice(inv)
        }), 201

    except ValueError as exc:
        session.rollback()

        return error_response(
            str(exc),
            400,
            "VALIDATION_ERROR"
        )

    except IntegrityError as exc:
        session.rollback()

        constraint = getattr(
            getattr(exc, "orig", None),
            "diag",
            None
        )

        constraint_name = getattr(
            constraint,
            "constraint_name",
            None
        )

        if constraint_name == "ix_invoices_invoice_number" or constraint_name == "invoices_invoice_number_key":
            return error_response(
                "Invoice number already exists",
                409,
                "DUPLICATE_INVOICE_NUMBER"
            )

        if constraint_name and "not_null" in constraint_name.lower():
            return error_response(
                f"Database NOT NULL constraint failed: {constraint_name}",
                400,
                "NOT_NULL_VIOLATION"
            )

        return error_response(
            "Database constraint error while creating the invoice",
            400,
            "DATABASE_CONSTRAINT_ERROR",
            str(getattr(exc, "orig", exc))
        )

    except (DataError, StatementError) as exc:
        session.rollback()

        return error_response(
            "Invalid data type or value sent to PostgreSQL",
            400,
            "DATABASE_DATA_ERROR",
            str(getattr(exc, "orig", exc))
        )

    except Exception as exc:
        session.rollback()
        traceback.print_exc()

        return error_response(
            "Unexpected server error while creating invoice",
            500,
            "SERVER_ERROR",
            str(exc)
        )

    finally:
        session.close()

@app.get("/api/invoices/<int:invoice_id>")
def get_invoice(invoice_id):
    session = SessionLocal()
    try:
        inv = session.execute(select(Invoice).options(joinedload(Invoice.trips)).where(Invoice.id == invoice_id)).unique().scalar_one_or_none()
        if not inv:
            return error_response("Invoice not found", 404, "NOT_FOUND")
        return jsonify({"success": True, "invoice": serialize_invoice(inv)})
    finally:
        session.close()





@app.put("/api/invoices/<int:invoice_id>")
def update_invoice(invoice_id):
    session = SessionLocal()
    try:
        data = request.get_json(silent=True) or {}
        inv = session.execute(select(Invoice).options(joinedload(Invoice.trips)).where(Invoice.id == invoice_id)).unique().scalar_one_or_none()
        if not inv:
            return error_response("Invoice not found", 404, "NOT_FOUND")
        invoice_number, _ = validate_payload(data)
        other_id = session.execute(select(Invoice.id).where(Invoice.invoice_number == invoice_number, Invoice.id != invoice_id)).scalar_one_or_none()
        if other_id is not None:
            return error_response("Invoice number already exists on another invoice", 409, "DUPLICATE_INVOICE_NUMBER")

        calculated_trips, totals = calculate_invoice(data, data["trips"])
        apply_invoice(inv, data, totals)

        # Full replacement of child rows inside the same transaction is deterministic and prevents stale trips.
        inv.trips.clear()
        session.flush()

        for tdata in calculated_trips:
            trip_date = parse_date(tdata["trip_date"], "Trip Date") if tdata.get("trip_date") else None
            end_date = parse_date(tdata["end_date"], "End Date") if tdata.get("end_date") else trip_date

            tdata["trip_date"] = trip_date
            tdata["end_date"] = end_date

            inv.trips.append(Trip(**tdata))

        session.commit()
        refreshed = session.execute(select(Invoice).options(joinedload(Invoice.trips)).where(Invoice.id == invoice_id)).unique().scalar_one()
        return jsonify({"success": True, "message": "Invoice updated successfully", "invoice": serialize_invoice(refreshed)})
    except ValueError as exc:
        session.rollback()
        return error_response(str(exc), 400, "VALIDATION_ERROR")
    except IntegrityError as exc:
        session.rollback()
        diag = getattr(getattr(exc, "orig", None), "diag", None)
        constraint_name = getattr(diag, "constraint_name", None)
        if constraint_name in ("ix_invoices_invoice_number", "invoices_invoice_number_key"):
            return error_response("Invoice number already exists on another invoice", 409, "DUPLICATE_INVOICE_NUMBER")
        return error_response("Database constraint error while updating the invoice", 400, "DATABASE_CONSTRAINT_ERROR", str(getattr(exc, "orig", exc)))
    except (DataError, StatementError) as exc:
        session.rollback()
        return error_response("Invalid data type or value sent to PostgreSQL", 400, "DATABASE_DATA_ERROR", str(getattr(exc, "orig", exc)))
    except Exception as exc:
        session.rollback()
        traceback.print_exc()
        return error_response("Unexpected server error while updating invoice", 500, "SERVER_ERROR", str(exc))
    finally:
        session.close()


@app.delete("/api/invoices/<int:invoice_id>")
def delete_invoice(invoice_id):
    session = SessionLocal()
    try:
        inv = session.get(Invoice, invoice_id)
        if not inv:
            return error_response("Invoice not found", 404, "NOT_FOUND")
        session.delete(inv)
        session.commit()
        return jsonify({"success": True, "message": "Invoice deleted successfully"})
    except Exception as exc:
        session.rollback()
        return error_response("Unable to delete invoice", 500, "SERVER_ERROR", str(exc))
    finally:
        session.close()


@app.get("/api/invoices/<int:invoice_id>/pdf")
def invoice_pdf(invoice_id):
    session = SessionLocal()
    try:
        inv = session.execute(select(Invoice).options(joinedload(Invoice.trips)).where(Invoice.id == invoice_id)).unique().scalar_one_or_none()
        if not inv:
            return error_response("Invoice not found", 404, "NOT_FOUND")
        pdf = build_invoice_pdf(inv)
        filename = f"{inv.invoice_number.replace('/', '-')}.pdf"
        return send_file(__import__("io").BytesIO(pdf), mimetype="application/pdf", as_attachment=True, download_name=filename)
    except Exception as exc:
        traceback.print_exc()
        return error_response("Unable to generate PDF", 500, "PDF_ERROR", str(exc))
    finally:
        session.close()


@app.get("/api/invoices/export/csv")
def export_csv():
    session = SessionLocal()
    try:
        invoices = session.execute(select(Invoice).options(joinedload(Invoice.trips)).order_by(Invoice.invoice_date.desc(), Invoice.id.desc())).unique().scalars().all()
        csv_bytes = invoice_to_csv(invoices)
        return send_file(__import__("io").BytesIO(csv_bytes), mimetype="text/csv; charset=utf-8", as_attachment=True, download_name="pvr-invoices.csv")
    finally:
        session.close()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=os.getenv("FLASK_DEBUG", "0") == "1")


@app.get("/api/invoices/export/xlsx")
def export_excel():
    session = SessionLocal()

    try:
        invoices = (
            session.execute(
                select(Invoice)
                .options(joinedload(Invoice.trips))
                .order_by(
                    Invoice.invoice_date.desc(),
                    Invoice.id.desc()
                )
            )
            .unique()
            .scalars()
            .all()
        )

        excel_bytes = invoice_to_excel(invoices)

        return send_file(
            __import__("io").BytesIO(excel_bytes),
            mimetype=(
                "application/vnd.openxmlformats-officedocument."
                "spreadsheetml.sheet"
            ),
            as_attachment=True,
            download_name="PVR_Invoice_Register.xlsx",
        )

    except Exception as exc:
        traceback.print_exc()

        return error_response(
            "Unable to export invoices to Excel",
            500,
            "EXCEL_EXPORT_ERROR",
            str(exc),
        )

    finally:
        session.close()
