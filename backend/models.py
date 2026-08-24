from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Text, Float, Date, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class Invoice(Base):
    __tablename__ = "invoices"
    __table_args__ = (
        Index("ix_invoices_invoice_number", "invoice_number", unique=True),
    )

    id = Column(Integer, primary_key=True)
    invoice_number = Column(String(120), nullable=False)
    invoice_series = Column(String(80), nullable=False, default="PVR/2026-27/")
    invoice_serial_number = Column(String(80), nullable=False)
    invoice_date = Column(Date, nullable=False)
    customer_name = Column(String(255), nullable=False)
    customer_address = Column(Text)
    customer_gstin = Column(String(30))
    booked_by = Column(String(255))
    used_by = Column(String(255))
    reference_number = Column(String(255))
    cgst_rate = Column(Float, default=0)
    sgst_rate = Column(Float, default=0)
    igst_rate = Column(Float, default=0)
    subtotal = Column(Float, default=0)
    cgst = Column(Float, default=0)
    sgst = Column(Float, default=0)
    igst = Column(Float, default=0)
    round_off = Column(Float, default=0)
    grand_total = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    trips = relationship(
        "Trip",
        back_populates="invoice",
        cascade="all, delete-orphan",
        order_by="Trip.id",
    )


class Trip(Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    ds_no = Column(String(80))
    trip_date = Column(Date)
    vehicle_type = Column(String(100))
    vehicle_number = Column(String(100))
    start_time = Column(String(10))
    end_time = Column(String(10))
    start_km = Column(Float, default=0)
    end_km = Column(Float, default=0)
    total_hours = Column(Float, default=0)
    total_km = Column(Float, default=0)
    slab_hours = Column(Float, default=0)
    slab_km = Column(Float, default=0)
    slab_rate = Column(Float, default=0)
    extra_hour_rate = Column(Float, default=0)
    extra_km_rate = Column(Float, default=0)
    extra_hours = Column(Float, default=0)
    extra_km = Column(Float, default=0)
    extra_hour_amount = Column(Float, default=0)
    extra_km_amount = Column(Float, default=0)
    base_amount = Column(Float, default=0)
    driver_bata = Column(Float, default=0)
    parking = Column(Float, default=0)
    toll = Column(Float, default=0)
    other_charges = Column(Float, default=0)
    trip_total = Column(Float, default=0)
    notes = Column(Text)

    invoice = relationship("Invoice", back_populates="trips")
