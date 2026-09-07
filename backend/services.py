from datetime import datetime, timedelta, date
from decimal import Decimal, ROUND_HALF_UP
from io import BytesIO
import csv

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
    KeepTogether,
)
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter


Q = Decimal("0.01")


# ============================================================
# BASIC HELPERS
# ============================================================

def money(value):
    return float(
        Decimal(str(value or 0)).quantize(
            Q,
            rounding=ROUND_HALF_UP
        )
    )


def number(value):
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        raise ValueError(
            "Numeric fields must contain valid numbers"
        )


def parse_time(value):
    if not value:
        return None

    value = str(value).strip()

    # User can enter:
    # 13:00 PM
    # 1:00 PM
    # 01:00 pm
    # 13:00
    # 1:00
    formats = (
        "%H:%M %p",
        "%H:%M:%S %p",
        "%I:%M %p",
        "%I:%M:%S %p",
        "%H:%M",
        "%H:%M:%S",
        "%I:%M",
        "%I:%M:%S",
    )

    for fmt in formats:
        try:
            return datetime.strptime(
                value.upper(),
                fmt
            )
        except ValueError:
            pass

    raise ValueError(
        f"Invalid time format: {value}. "
        "Please enter time like 13:00 PM or 1:00 PM."
    )


def _p(text, style):
    return Paragraph(
        str(text if text is not None else ""),
        style
    )


# ============================================================
# TRIP CALCULATION
# ============================================================

def calculate_trip(raw):
    start_km = number(
        raw.get("start_km")
    )

    end_km = number(
        raw.get("end_km")
    )

    if end_km < start_km:
        raise ValueError(
            "End KM cannot be less than Start KM"
        )

    start_time = parse_time(
        raw.get("start_time")
    )

    end_time = parse_time(
        raw.get("end_time")
    )

    total_hours = 0.0

    if start_time and end_time:

        start_date = raw.get(
            "trip_date"
        )

        end_date = (
            raw.get("end_date")
            or start_date
        )

        if isinstance(start_date, str):
            start_date = date.fromisoformat(
                start_date
            )

        if isinstance(end_date, str):
            end_date = date.fromisoformat(
                end_date
            )

        if start_date:

            start_datetime = datetime.combine(
                start_date,
                start_time.time()
            )

            end_datetime = datetime.combine(
                end_date,
                end_time.time()
            )

            delta = (
                end_datetime
                - start_datetime
            )

            if delta.total_seconds() < 0:
                raise ValueError(
                    "End date/time cannot be before "
                    "Start date/time"
                )

            total_hours = (
                delta.total_seconds()
                / 3600
            )

    total_km = max(
        0.0,
        end_km - start_km
    )

    slab_hours = number(
        raw.get("slab_hours")
    )

    slab_km = number(
        raw.get("slab_km")
    )

    slab_rate = number(
        raw.get("slab_rate")
    )

    extra_hour_rate = number(
        raw.get("extra_hour_rate")
    )

    extra_km_rate = number(
        raw.get("extra_km_rate")
    )

    extra_hours = max(
        0.0,
        total_hours - slab_hours
    )

    extra_km = max(
        0.0,
        total_km - slab_km
    )

    extra_hour_amount = (
        extra_hours
        * extra_hour_rate
    )

    extra_km_amount = (
        extra_km
        * extra_km_rate
    )

    base_amount = slab_rate

    driver_bata = number(
        raw.get("driver_bata")
    )

    parking = number(
        raw.get("parking")
    )

    toll = number(
        raw.get("toll")
    )

    other_charges = number(
        raw.get("other_charges")
    )

    trip_total = (
        base_amount
        + extra_hour_amount
        + extra_km_amount
        + driver_bata
        + parking
        + toll
        + other_charges
    )

    return {
        "ds_no": raw.get("ds_no"),
        "trip_date": raw.get("trip_date"),
        "end_date": (
            raw.get("end_date")
            or raw.get("trip_date")
        ),
        "vehicle_type": raw.get(
            "vehicle_type"
        ),
        "vehicle_number": raw.get(
            "vehicle_number"
        ),
        "start_time": raw.get(
            "start_time"
        ),
        "end_time": raw.get(
            "end_time"
        ),
        "start_km": money(start_km),
        "end_km": money(end_km),
        "total_km": money(total_km),
        "total_hours": money(total_hours),
        "slab_hours": money(slab_hours),
        "slab_km": money(slab_km),
        "slab_rate": money(slab_rate),
        "extra_hour_rate": money(
            extra_hour_rate
        ),
        "extra_km_rate": money(
            extra_km_rate
        ),
        "extra_hours": money(
            extra_hours
        ),
        "extra_km": money(
            extra_km
        ),
        "extra_hour_amount": money(
            extra_hour_amount
        ),
        "extra_km_amount": money(
            extra_km_amount
        ),
        "base_amount": money(
            base_amount
        ),
        "driver_bata": money(
            driver_bata
        ),
        "parking": money(
            parking
        ),
        "toll": money(toll),
        "other_charges": money(
            other_charges
        ),
        "trip_total": money(
            trip_total
        ),
        "notes": raw.get("notes"),
    }


# ============================================================
# INVOICE CALCULATION
# ============================================================

def calculate_invoice(
    invoice_data,
    trip_data
):
    trips = [
        calculate_trip(t)
        for t in trip_data
    ]

    # ========================================================
    # SUBTOTAL
    #
    # trip_total already includes:
    # Base + Extra Hours + Extra KM
    # + Driver Bata + Parking + Toll
    # + Other Charges
    #
    # Therefore Parking/Toll are NOT added again.
    # ========================================================

    subtotal = sum(
        Decimal(
            str(t["trip_total"])
        )
        for t in trips
    )

    # ========================================================
    # PARKING + TOLL + OTHER CHARGES
    #
    # Already included in subtotal.
    # Excluded only from GST calculation.
    # ========================================================

    parking_toll_total = sum(
        Decimal(
            str(
                t["parking"]
                + t["toll"]
                + t["other_charges"]
            )
        )
        for t in trips
    )

    # ========================================================
    # TAXABLE AMOUNT
    # ========================================================

    taxable_amount = (
        subtotal
        - parking_toll_total
    )

    if taxable_amount < Decimal("0"):
        taxable_amount = Decimal("0")

    # ========================================================
    # GST RATES
    # ========================================================

    cgst_rate = max(
        0.0,
        number(
            invoice_data.get(
                "cgst_rate"
            )
        )
    )

    sgst_rate = max(
        0.0,
        number(
            invoice_data.get(
                "sgst_rate"
            )
        )
    )

    igst_rate = max(
        0.0,
        number(
            invoice_data.get(
                "igst_rate"
            )
        )
    )

    # ========================================================
    # GST CALCULATION
    #
    # GST ONLY ON TAXABLE AMOUNT
    # ========================================================

    cgst = (
        taxable_amount
        * Decimal(str(cgst_rate))
        / Decimal("100")
    )

    sgst = (
        taxable_amount
        * Decimal(str(sgst_rate))
        / Decimal("100")
    )

    igst = (
        taxable_amount
        * Decimal(str(igst_rate))
        / Decimal("100")
    )

    # ========================================================
    # GRAND TOTAL
    #
    # Requirement:
    # Grand Total = Subtotal
    #
    # GST is displayed separately.
    # GST is NOT added to Grand Total.
    # ========================================================

    grand_total = subtotal

    # ========================================================
    # ROUND OFF
    # ========================================================

    rounded_total = grand_total.quantize(
        Decimal("1"),
        rounding=ROUND_HALF_UP
    )

    round_off = (
        rounded_total
        - grand_total
    )

    # ========================================================
    # RETURN
    # ========================================================

    return trips, {
        "cgst_rate": cgst_rate,
        "sgst_rate": sgst_rate,
        "igst_rate": igst_rate,

        "subtotal": money(
            subtotal
        ),

        "taxable_amount": money(
            taxable_amount
        ),

        "cgst": money(cgst),
        "sgst": money(sgst),
        "igst": money(igst),

        "round_off": money(
            round_off
        ),

        "grand_total": money(
            rounded_total
        ),
    }


# ============================================================
# AMOUNT TO WORDS - INDIAN NUMBERING
# ============================================================

def amount_to_words_indian(amount):

    n = int(
        round(
            float(amount)
        )
    )

    if n == 0:
        return "Rupees Zero Only"

    ones = [
        "",
        "One",
        "Two",
        "Three",
        "Four",
        "Five",
        "Six",
        "Seven",
        "Eight",
        "Nine",
        "Ten",
        "Eleven",
        "Twelve",
        "Thirteen",
        "Fourteen",
        "Fifteen",
        "Sixteen",
        "Seventeen",
        "Eighteen",
        "Nineteen",
    ]

    tens = [
        "",
        "",
        "Twenty",
        "Thirty",
        "Forty",
        "Fifty",
        "Sixty",
        "Seventy",
        "Eighty",
        "Ninety",
    ]

    def two(x):

        if x < 20:
            return ones[x]

        return (
            tens[x // 10]
            + (
                " " + ones[x % 10]
                if x % 10
                else ""
            )
        )

    def three(x):

        if x < 100:
            return two(x)

        return (
            ones[x // 100]
            + " Hundred"
            + (
                " " + two(x % 100)
                if x % 100
                else ""
            )
        )

    parts = []

    crore = n // 10000000
    n %= 10000000

    lakh = n // 100000
    n %= 100000

    thousand = n // 1000
    n %= 1000

    hundred = n

    if crore:
        parts.append(
            three(crore)
            + " Crore"
        )

    if lakh:
        parts.append(
            three(lakh)
            + " Lakh"
        )

    if thousand:
        parts.append(
            three(thousand)
            + " Thousand"
        )

    if hundred:
        parts.append(
            three(hundred)
        )

    return (
        "Rupees "
        + " ".join(parts)
        + " Only"
    )


# ============================================================
# BUILD INVOICE PDF
# ============================================================

def build_invoice_pdf(invoice):
    """
    Generate the final PVR Tours & Travels invoice PDF.

    PDF formatting:
    - Series and Serial No are hidden.
    - Invoice Number remains visible.
    - Subtotal remains displayed.
    - Grand Total remains displayed.
    - GST is displayed separately.
    - All 22 trip columns remain available.
    - Signature is on the right.
    - Landscape A4 is used.
    """

    buffer = BytesIO()

    # ========================================================
    # A4 LANDSCAPE
    # ========================================================

    page = landscape(A4)

    doc = SimpleDocTemplate(
        buffer,
        pagesize=page,
        rightMargin=5 * mm,
        leftMargin=5 * mm,
        topMargin=5 * mm,
        bottomMargin=5 * mm,
        title=(
            f"PVR Invoice "
            f"{invoice.invoice_number}"
        ),
        author="PVR Tours & Travels",
    )

    # ========================================================
    # STYLES
    # ========================================================

    styles = getSampleStyleSheet()

    company = ParagraphStyle(
        "company",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=19,
        leading=20,
        alignment=TA_CENTER,
        spaceAfter=1,
    )

    company_address = ParagraphStyle(
        "company_address",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=9,
        alignment=TA_CENTER,
    )

    small_center = ParagraphStyle(
        "small_center",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=8.5,
        alignment=TA_CENTER,
    )

    small = ParagraphStyle(
        "small",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7,
        leading=8,
    )

    small_bold = ParagraphStyle(
        "small_bold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7,
        leading=8,
    )

    tiny = ParagraphStyle(
        "tiny",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=6.4,
        leading=7.2,
    )

    tiny_bold = ParagraphStyle(
        "tiny_bold",
        parent=tiny,
        fontName="Helvetica-Bold",
        fontSize=6.5,
        leading=7.3,
    )

    section = ParagraphStyle(
        "section",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=10,
    )

    right = ParagraphStyle(
        "right",
        parent=tiny,
        alignment=TA_RIGHT,
    )

    total_style = ParagraphStyle(
        "total",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=9,
        alignment=TA_RIGHT,
    )

    signature_style = ParagraphStyle(
        "signature",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=9,
        alignment=TA_RIGHT,
    )

    # ========================================================
    # STORY
    # ========================================================

    story = []

    # ========================================================
    # COMPANY HEADER
    # ========================================================

    story.append(
        _p(
            "P.V.R. TOURS AND TRAVELS",
            company,
        )
    )

    story.append(
        _p(
            "H. No. 4-1-756, Tuljaguda, Troop Bazar, "
            "Hyderabad, Telangana State - 500 001.  "
            "Ph: 9030588882 / 9963578399",
            company_address,
        )
    )

    story.append(
        Spacer(
            1,
            2 * mm
        )
    )

    # ========================================================
    # TAXABLE INVOICE
    # ========================================================

    story.append(
        Table(
            [
                [
                    _p(
                        "TAXABLE INVOICE",
                        section,
                    )
                ]
            ],
            colWidths=[
                doc.width
            ],
            style=[
                (
                    "BOX",
                    (0, 0),
                    (-1, -1),
                    0.7,
                    colors.black,
                ),
                (
                    "ALIGN",
                    (0, 0),
                    (-1, -1),
                    "LEFT",
                ),
                (
                    "TOPPADDING",
                    (0, 0),
                    (-1, -1),
                    2.5,
                ),
                (
                    "BOTTOMPADDING",
                    (0, 0),
                    (-1, -1),
                    2.5,
                ),
                (
                    "LEFTPADDING",
                    (0, 0),
                    (-1, -1),
                    3,
                ),
            ],
        )
    )

    # ========================================================
    # CUSTOMER INFORMATION
    # ========================================================

    left = [
        [
            "Billed To",
            invoice.customer_name or ""
        ],
        [
            "Address",
            invoice.customer_address or ""
        ],
        [
            "GSTIN",
            invoice.customer_gstin or ""
        ],
        [
            "Booked By",
            invoice.booked_by or ""
        ],
        [
            "Used By",
            invoice.used_by or ""
        ],
        [
            "Reference / PO",
            invoice.reference_number or ""
        ],
    ]

    # Series and Serial No intentionally removed.
    right_meta = [
        [
            "Invoice Date",
            (
                invoice.invoice_date.strftime(
                    "%d-%m-%Y"
                )
                if invoice.invoice_date
                else ""
            ),
        ],
        [
            "Invoice No",
            invoice.invoice_number or "",
        ],
        [
            "GSTIN",
            "36AYPPR7981L1Z8",
        ],
    ]

    info_data = [
        [
            Table(
                [
                    [
                        _p(k, small_bold),
                        _p(v, small),
                    ]
                    for k, v in left
                ],
                colWidths=[
                    27 * mm,
                    115 * mm,
                ],
                style=[
                    (
                        "VALIGN",
                        (0, 0),
                        (-1, -1),
                        "TOP",
                    ),
                    (
                        "BOX",
                        (0, 0),
                        (-1, -1),
                        0.35,
                        colors.grey,
                    ),
                    (
                        "INNERGRID",
                        (0, 0),
                        (-1, -1),
                        0.2,
                        colors.lightgrey,
                    ),
                    (
                        "LEFTPADDING",
                        (0, 0),
                        (-1, -1),
                        2,
                    ),
                    (
                        "RIGHTPADDING",
                        (0, 0),
                        (-1, -1),
                        2,
                    ),
                    (
                        "TOPPADDING",
                        (0, 0),
                        (-1, -1),
                        1.5,
                    ),
                    (
                        "BOTTOMPADDING",
                        (0, 0),
                        (-1, -1),
                        1.5,
                    ),
                ],
            ),
            Table(
                [
                    [
                        _p(k, small_bold),
                        _p(v, small),
                    ]
                    for k, v in right_meta
                ],
                colWidths=[
                    30 * mm,
                    58 * mm,
                ],
                style=[
                    (
                        "VALIGN",
                        (0, 0),
                        (-1, -1),
                        "TOP",
                    ),
                    (
                        "BOX",
                        (0, 0),
                        (-1, -1),
                        0.35,
                        colors.grey,
                    ),
                    (
                        "INNERGRID",
                        (0, 0),
                        (-1, -1),
                        0.2,
                        colors.lightgrey,
                    ),
                    (
                        "LEFTPADDING",
                        (0, 0),
                        (-1, -1),
                        2,
                    ),
                    (
                        "RIGHTPADDING",
                        (0, 0),
                        (-1, -1),
                        2,
                    ),
                    (
                        "TOPPADDING",
                        (0, 0),
                        (-1, -1),
                        1.5,
                    ),
                    (
                        "BOTTOMPADDING",
                        (0, 0),
                        (-1, -1),
                        1.5,
                    ),
                ],
            ),
        ]
    ]

    story.append(
        Table(
            info_data,
            colWidths=[
                doc.width * 0.72,
                doc.width * 0.28,
            ],
            style=[
                (
                    "VALIGN",
                    (0, 0),
                    (-1, -1),
                    "TOP",
                ),
                (
                    "LEFTPADDING",
                    (0, 0),
                    (-1, -1),
                    0,
                ),
                (
                    "RIGHTPADDING",
                    (0, 0),
                    (-1, -1),
                    0,
                ),
            ],
        )
    )

    story.append(
        Spacer(
            1,
            2 * mm
        )
    )

    # ========================================================
    # TRIP TABLE
    # ========================================================

    headers = [
        "DS No",
        "Date",
        "Car Type",
        "Car No",
        "Slab Hrs",
        "Slab Kms",
        "Slab Rate",
        "Ex. Hrs Rate",
        "Ex. Kms Rate",
        "Start Time",
        "End Time",
        "Start KMS",
        "End KMS",
        "Driver Bata",
        "Parking & Toll",
        "Total Hrs",
        "Ex. Hrs",
        "Ex. Hrs Amount",
        "Total Kms",
        "Ex. Kms",
        "Ex. Kms Amount",
        "Total",
    ]

    widths_mm = [
        24,
        25,
        34,
        32,
        20,
        23,
        28,
        28,
        28,
        23,
        23,
        28,
        28,
        27,
        34,
        23,
        22,
        30,
        25,
        22,
        30,
        30,
    ]

    scale = (
        doc.width
        / (sum(widths_mm) * mm)
    )

    widths = [
        w * mm * scale
        for w in widths_mm
    ]

    table_data = [
        [
            _p(
                h,
                tiny_bold
            )
            for h in headers
        ]
    ]

    # ========================================================
    # TRIP ROWS
    # ========================================================

    for t in invoice.trips:

        d = (
            t.trip_date.strftime(
                "%d-%m-%Y"
            )
            if t.trip_date
            else ""
        )

        parking_toll = (
            (t.parking or 0)
            + (t.toll or 0)
            + (t.other_charges or 0)
        )

        row = [
            t.ds_no or "",
            d,
            t.vehicle_type or "",
            t.vehicle_number or "",

            f"{(t.slab_hours or 0):g}",
            f"{(t.slab_km or 0):g}",
            f"{(t.slab_rate or 0):,.2f}",

            f"{(t.extra_hour_rate or 0):,.2f}",
            f"{(t.extra_km_rate or 0):,.2f}",

            t.start_time or "",
            t.end_time or "",

            f"{(t.start_km or 0):g}",
            f"{(t.end_km or 0):g}",

            f"{(t.driver_bata or 0):,.2f}",
            f"{parking_toll:,.2f}",

            f"{(t.total_hours or 0):g}",
            f"{(t.extra_hours or 0):g}",

            f"{(t.extra_hour_amount or 0):,.2f}",

            f"{(t.total_km or 0):g}",
            f"{(t.extra_km or 0):g}",

            f"{(t.extra_km_amount or 0):,.2f}",

            f"{(t.trip_total or 0):,.2f}",
        ]

        table_data.append(
            [
                _p(v, tiny)
                for v in row
            ]
        )

    trip_table = Table(
        table_data,
        colWidths=widths,
        repeatRows=1,
        hAlign="LEFT",
    )

    trip_table.setStyle(
        TableStyle(
            [
                (
                    "BOX",
                    (0, 0),
                    (-1, -1),
                    0.5,
                    colors.black,
                ),
                (
                    "INNERGRID",
                    (0, 0),
                    (-1, -1),
                    0.25,
                    colors.grey,
                ),
                (
                    "BACKGROUND",
                    (0, 0),
                    (-1, 0),
                    colors.HexColor(
                        "#eaf2ff"
                    ),
                ),
                (
                    "VALIGN",
                    (0, 0),
                    (-1, -1),
                    "MIDDLE",
                ),
                (
                    "ALIGN",
                    (0, 0),
                    (-1, -1),
                    "CENTER",
                ),
                (
                    "LEFTPADDING",
                    (0, 0),
                    (-1, -1),
                    1.2,
                ),
                (
                    "RIGHTPADDING",
                    (0, 0),
                    (-1, -1),
                    1.2,
                ),
                (
                    "TOPPADDING",
                    (0, 0),
                    (-1, -1),
                    2.5,
                ),
                (
                    "BOTTOMPADDING",
                    (0, 0),
                    (-1, -1),
                    2.5,
                ),
            ]
        )
    )

    story.append(
        trip_table
    )

    # ========================================================
    # NOTES
    # ========================================================

    if any(
        (t.notes or "").strip()
        for t in invoice.trips
    ):

        notes = "; ".join(
            [
                f"{t.ds_no}: {t.notes}"
                for t in invoice.trips
                if (t.notes or "").strip()
            ]
        )

        story.append(
            Spacer(
                1,
                1 * mm
            )
        )

        story.append(
            _p(
                f"Notes: {notes}",
                tiny
            )
        )

    story.append(
        Spacer(
            1,
            3 * mm
        )
    )

    # ========================================================
    # PAYMENT / GST / TOTALS
    # ========================================================

    totals_left = [
        [
            _p(
                "HSN No: 996412",
                tiny_bold
            ),
            _p(
                "GST NO: 36AYPPR7981L1Z8",
                tiny_bold
            ),
        ],
        [
            _p(
                "Please make payment by Bank "
                "Transfer to the below account:",
                tiny_bold
            ),
            _p(
                "",
                tiny
            ),
        ],
        [
            _p(
                "Account Name: PVR Tours & Travels<br/>"
                "SBI Account No: 39169597084<br/>"
                "IFSC: SBIN0000487",
                tiny
            ),
            _p(
                "As per Notification No. 22/2019 "
                "Central Tax (Rate) dated 30th September "
                "2019, this supply is covered under "
                "REVERSE CHARGE MECHANISM. Hence, "
                "CGST / SGST payable by the recipient / "
                "receiver @ 5% on the value mentioned "
                "in the invoice.",
                tiny
            ),
        ],
    ]

    totals_right = [
        [
            _p(
                "Subtotal",
                tiny_bold
            ),
            _p(
                f"{invoice.subtotal:,.2f}",
                total_style
            ),
        ],
        [
            _p(
                f"CGST @ {invoice.cgst_rate:g}%",
                tiny
            ),
            _p(
                f"{invoice.cgst:,.2f}",
                right
            ),
        ],
        [
            _p(
                f"SGST @ {invoice.sgst_rate:g}%",
                tiny
            ),
            _p(
                f"{invoice.sgst:,.2f}",
                right
            ),
        ],
        [
            _p(
                f"IGST @ {invoice.igst_rate:g}%",
                tiny
            ),
            _p(
                f"{invoice.igst:,.2f}",
                right
            ),
        ],
        [
            _p(
                "Round Off",
                tiny
            ),
            _p(
                f"{invoice.round_off:+,.2f}",
                right
            ),
        ],
        [
            _p(
                "Grand Total",
                total_style
            ),
            _p(
                f"{invoice.subtotal:,.2f}",
                total_style
            ),
        ],
    ]

    left_width = (
        doc.width
        - 63 * mm
    )

    bottom = Table(
        [
            [
                Table(
                    totals_left,
                    colWidths=[
                        65 * mm,
                        left_width - 65 * mm,
                    ],
                    style=[
                        (
                            "BOX",
                            (0, 0),
                            (-1, -1),
                            0.4,
                            colors.grey,
                        ),
                        (
                            "INNERGRID",
                            (0, 0),
                            (-1, -1),
                            0.2,
                            colors.lightgrey,
                        ),
                        (
                            "VALIGN",
                            (0, 0),
                            (-1, -1),
                            "TOP",
                        ),
                        (
                            "SPAN",
                            (0, 1),
                            (1, 1),
                        ),
                        (
                            "LEFTPADDING",
                            (0, 0),
                            (-1, -1),
                            2,
                        ),
                        (
                            "RIGHTPADDING",
                            (0, 0),
                            (-1, -1),
                            2,
                        ),
                        (
                            "TOPPADDING",
                            (0, 0),
                            (-1, -1),
                            2,
                        ),
                        (
                            "BOTTOMPADDING",
                            (0, 0),
                            (-1, -1),
                            2,
                        ),
                    ],
                ),
                Table(
                    totals_right,
                    colWidths=[
                        35 * mm,
                        28 * mm,
                    ],
                    style=[
                        (
                            "BOX",
                            (0, 0),
                            (-1, -1),
                            0.4,
                            colors.grey,
                        ),
                        (
                            "INNERGRID",
                            (0, 0),
                            (-1, -1),
                            0.2,
                            colors.lightgrey,
                        ),
                        (
                            "VALIGN",
                            (0, 0),
                            (-1, -1),
                            "TOP",
                        ),
                        (
                            "LEFTPADDING",
                            (0, 0),
                            (-1, -1),
                            2,
                        ),
                        (
                            "RIGHTPADDING",
                            (0, 0),
                            (-1, -1),
                            2,
                        ),
                        (
                            "TOPPADDING",
                            (0, 0),
                            (-1, -1),
                            2,
                        ),
                        (
                            "BOTTOMPADDING",
                            (0, 0),
                            (-1, -1),
                            2,
                        ),
                    ],
                ),
            ]
        ],
        colWidths=[
            left_width,
            63 * mm,
        ],
    )

    story.append(
        bottom
    )

    story.append(
        Spacer(
            1,
            2 * mm
        )
    )

    # ========================================================
    # AMOUNT IN WORDS
    # ========================================================

    story.append(
        Table(
            [
                [
                    _p(
                        amount_to_words_indian(
                            invoice.subtotal
                        ),
                        small_bold,
                    ),
                    _p(
                        "For PVR TOURS & TRAVELS",
                        small_bold,
                    ),
                ]
            ],
            colWidths=[
                doc.width * 0.70,
                doc.width * 0.30,
            ],
            style=[
                (
                    "BOX",
                    (0, 0),
                    (-1, -1),
                    0.4,
                    colors.black,
                ),
                (
                    "VALIGN",
                    (0, 0),
                    (-1, -1),
                    "MIDDLE",
                ),
                (
                    "ALIGN",
                    (0, 0),
                    (0, 0),
                    "LEFT",
                ),
                (
                    "ALIGN",
                    (1, 0),
                    (1, 0),
                    "RIGHT",
                ),
                (
                    "TOPPADDING",
                    (0, 0),
                    (-1, -1),
                    3,
                ),
                (
                    "BOTTOMPADDING",
                    (0, 0),
                    (-1, -1),
                    3,
                ),
                (
                    "LEFTPADDING",
                    (0, 0),
                    (-1, -1),
                    3,
                ),
                (
                    "RIGHTPADDING",
                    (0, 0),
                    (-1, -1),
                    3,
                ),
            ],
        )
    )

    # ========================================================
    # FINAL SIGNATURE
    # ========================================================

    story.append(
        Spacer(
            1,
            8 * mm
        )
    )

    signature_table = Table(
        [
            [
                "",
                _p(
                    "Authorised Signatory",
                    signature_style,
                ),
            ]
        ],
        colWidths=[
            doc.width * 0.65,
            doc.width * 0.35,
        ],
        style=[
            (
                "ALIGN",
                (1, 0),
                (1, 0),
                "RIGHT",
            ),
            (
                "VALIGN",
                (0, 0),
                (-1, -1),
                "BOTTOM",
            ),
            (
                "LEFTPADDING",
                (0, 0),
                (-1, -1),
                2,
            ),
            (
                "RIGHTPADDING",
                (0, 0),
                (-1, -1),
                2,
            ),
        ],
    )

    story.append(
        signature_table
    )

    # ========================================================
    # BUILD PDF
    # ========================================================

    doc.build(story)

    buffer.seek(0)

    return buffer.getvalue()


# ============================================================
# EXCEL HELPER
# ============================================================

def _get_value(obj, key, default=None):
    """
    Supports both:
    - dictionary objects
    - SQLAlchemy/model objects
    """

    if isinstance(obj, dict):
        return obj.get(
            key,
            default
        )

    return getattr(
        obj,
        key,
        default
    )


def _get_trips(invoice):
    trips = _get_value(
        invoice,
        "trips",
        []
    )

    return trips or []


# ============================================================
# INVOICE TO EXCEL
# ============================================================


def invoice_to_csv(invoices):
    """
    Export invoice data to CSV.

    One row = one invoice.
    """

    from io import StringIO

    output = StringIO()

    writer = csv.writer(
        output,
        lineterminator="\n"
    )

    headers = [
        "Invoice Number",
        "Invoice Date",
        "Customer Name",
        "Customer Address",
        "Customer GSTIN",
        "Booked By",
        "Used By",
        "Reference / PO",
        "Vehicle Number",
        "Trip Count",

        "Base Amount",
        "Extra Hours Amount",
        "Extra KM Amount",
        "Driver Bata",
        "Parking",
        "Toll",
        "Other Charges",
        "Parking + Toll + Other",

        "Taxable Amount",

        "CGST %",
        "CGST",
        "SGST %",
        "SGST",
        "IGST %",
        "IGST",

        "Round Off",
        "Grand Total",
    ]

    writer.writerow(headers)

    for inv in invoices:

        trips = getattr(inv, "trips", []) or []

        base_amount = Decimal("0")
        extra_hours_amount = Decimal("0")
        extra_km_amount = Decimal("0")
        driver_bata = Decimal("0")
        parking = Decimal("0")
        toll = Decimal("0")
        other_charges = Decimal("0")

        vehicle_numbers = []

        for trip in trips:

            base_amount += Decimal(
                str(getattr(trip, "base_amount", 0) or 0)
            )

            extra_hours_amount += Decimal(
                str(getattr(trip, "extra_hour_amount", 0) or 0)
            )

            extra_km_amount += Decimal(
                str(getattr(trip, "extra_km_amount", 0) or 0)
            )

            driver_bata += Decimal(
                str(getattr(trip, "driver_bata", 0) or 0)
            )

            parking += Decimal(
                str(getattr(trip, "parking", 0) or 0)
            )

            toll += Decimal(
                str(getattr(trip, "toll", 0) or 0)
            )

            other_charges += Decimal(
                str(getattr(trip, "other_charges", 0) or 0)
            )

            vehicle_number = getattr(
                trip,
                "vehicle_number",
                ""
            ) or ""

            if (
                vehicle_number
                and vehicle_number not in vehicle_numbers
            ):
                vehicle_numbers.append(vehicle_number)

        parking_toll_other = (
            parking
            + toll
            + other_charges
        )

        subtotal = (
            base_amount
            + extra_hours_amount
            + extra_km_amount
            + driver_bata
            + parking
            + toll
            + other_charges
        )

        taxable_amount = (
            subtotal
            - parking_toll_other
        )

        if taxable_amount < Decimal("0"):
            taxable_amount = Decimal("0")

        cgst_rate = Decimal(
            str(getattr(inv, "cgst_rate", 0) or 0)
        )

        sgst_rate = Decimal(
            str(getattr(inv, "sgst_rate", 0) or 0)
        )

        igst_rate = Decimal(
            str(getattr(inv, "igst_rate", 0) or 0)
        )

        cgst = (
            taxable_amount
            * cgst_rate
            / Decimal("100")
        )

        sgst = (
            taxable_amount
            * sgst_rate
            / Decimal("100")
        )

        igst = (
            taxable_amount
            * igst_rate
            / Decimal("100")
        )

        grand_total = subtotal

        rounded_total = grand_total.quantize(
            Decimal("1"),
            rounding=ROUND_HALF_UP
        )

        round_off = rounded_total - grand_total

        invoice_date = getattr(
            inv,
            "invoice_date",
            None
        )

        if invoice_date:
            invoice_date = invoice_date.strftime(
                "%d-%m-%Y"
            )
        else:
            invoice_date = ""

        writer.writerow([
            getattr(
                inv,
                "invoice_number",
                ""
            ) or "",

            invoice_date,

            getattr(
                inv,
                "customer_name",
                ""
            ) or "",

            getattr(
                inv,
                "customer_address",
                ""
            ) or "",

            getattr(
                inv,
                "customer_gstin",
                ""
            ) or "",

            getattr(
                inv,
                "booked_by",
                ""
            ) or "",

            getattr(
                inv,
                "used_by",
                ""
            ) or "",

            getattr(
                inv,
                "reference_number",
                ""
            ) or "",

            ", ".join(vehicle_numbers),

            len(trips),

            f"{base_amount:.2f}",
            f"{extra_hours_amount:.2f}",
            f"{extra_km_amount:.2f}",
            f"{driver_bata:.2f}",
            f"{parking:.2f}",
            f"{toll:.2f}",
            f"{other_charges:.2f}",
            f"{parking_toll_other:.2f}",

            f"{taxable_amount:.2f}",

            f"{cgst_rate:.2f}",
            f"{cgst:.2f}",

            f"{sgst_rate:.2f}",
            f"{sgst:.2f}",

            f"{igst_rate:.2f}",
            f"{igst:.2f}",

            f"{round_off:.2f}",
            f"{grand_total:.2f}",
        ])

    output.seek(0)

    # Return bytes so Flask send_file() can download the CSV
    # UTF-8 BOM ensures Excel opens the CSV correctly.
    return ("\ufeff" + output.getvalue()).encode("utf-8")
def invoice_to_excel(invoices):
    """
    Generate Excel workbook containing:

    Sheet 1:
        Invoices / Invoice Register

    Sheet 2:
        Trip Details

    Supports both dictionary-style invoice data
    and ORM/model invoice objects.
    """

    workbook = Workbook()

    # ========================================================
    # SHEET 1 - INVOICES
    # ========================================================

    invoice_sheet = workbook.active

    invoice_sheet.title = "Invoices"

    # ========================================================
    # STYLES
    # ========================================================

    header_fill = PatternFill(
        fill_type="solid",
        fgColor="1F4E78"
    )

    header_font = Font(
        bold=True,
        color="FFFFFF"
    )

    thin_side = Side(
        style="thin",
        color="D9E1F2"
    )

    border = Border(
        left=thin_side,
        right=thin_side,
        top=thin_side,
        bottom=thin_side
    )

    center = Alignment(
        horizontal="center",
        vertical="center"
    )

    left = Alignment(
        horizontal="left",
        vertical="center"
    )

    # ========================================================
    # INVOICE HEADERS
    # ========================================================

    invoice_headers = [
        "Invoice ID",
        "Invoice Number",
        "Invoice Date",
        "Customer Name",
        "Customer Address",
        "Customer GSTIN",
        "Booked By",
        "Used By",
        "Reference / PO",
        "Vehicle Number",
        "Trip Count",
        "HSN No",
        "GSTIN",
        "CGST %",
        "CGST",
        "SGST %",
        "SGST",
        "IGST %",
        "IGST",
        "Subtotal",
        "Taxable Amount",
        "Round Off",
        "Grand Total",
    ]

    invoice_sheet.append(
        invoice_headers
    )

    for cell in invoice_sheet[1]:

        cell.fill = header_fill

        cell.font = header_font

        cell.alignment = center

        cell.border = border

    # ========================================================
    # INVOICE DATA
    # ========================================================

    for inv in invoices:

        trips = _get_trips(inv)

        invoice_id = _get_value(
            inv,
            "id",
            ""
        )

        invoice_number = _get_value(
            inv,
            "invoice_number",
            ""
        )

        invoice_date = _get_value(
            inv,
            "invoice_date",
            ""
        )

        customer_name = _get_value(
            inv,
            "customer_name",
            ""
        )

        customer_address = _get_value(
            inv,
            "customer_address",
            ""
        )

        customer_gstin = _get_value(
            inv,
            "customer_gstin",
            ""
        )

        booked_by = _get_value(
            inv,
            "booked_by",
            ""
        )

        used_by = _get_value(
            inv,
            "used_by",
            ""
        )

        reference_number = _get_value(
            inv,
            "reference_number",
            ""
        )

        cgst_rate = Decimal(
            str(
                _get_value(
                    inv,
                    "cgst_rate",
                    0
                ) or 0
            )
        )

        sgst_rate = Decimal(
            str(
                _get_value(
                    inv,
                    "sgst_rate",
                    0
                ) or 0
            )
        )

        igst_rate = Decimal(
            str(
                _get_value(
                    inv,
                    "igst_rate",
                    0
                ) or 0
            )
        )

        # ====================================================
        # TRIP AMOUNTS
        # ====================================================

        base_amount = Decimal("0")

        extra_hours = Decimal("0")

        extra_km = Decimal("0")

        driver_bata = Decimal("0")

        parking = Decimal("0")

        toll = Decimal("0")

        other_charges = Decimal("0")

        first_vehicle_number = ""

        for trip in trips:

            if not first_vehicle_number:
                first_vehicle_number = _get_value(
                    trip,
                    "vehicle_number",
                    ""
                )

            base_amount += Decimal(
                str(
                    _get_value(
                        trip,
                        "base_amount",
                        0
                    ) or 0
                )
            )

            # =================================================
            # Preserve extra-hours calculation logic
            #
            # Support both:
            # extra_hours_charge
            # and
            # extra_hour_amount
            # =================================================

            extra_hour_charge = _get_value(
                trip,
                "extra_hours_charge",
                None
            )

            if extra_hour_charge is None:
                extra_hour_charge = _get_value(
                    trip,
                    "extra_hour_amount",
                    0
                )

            extra_hours += Decimal(
                str(
                    extra_hour_charge or 0
                )
            )

            # =================================================
            # Preserve extra-KM calculation logic
            # =================================================

            extra_km_charge = _get_value(
                trip,
                "extra_km_charge",
                None
            )

            if extra_km_charge is None:
                extra_km_charge = _get_value(
                    trip,
                    "extra_km_amount",
                    0
                )

            extra_km += Decimal(
                str(
                    extra_km_charge or 0
                )
            )

            driver_bata += Decimal(
                str(
                    _get_value(
                        trip,
                        "driver_bata",
                        0
                    ) or 0
                )
            )

            parking += Decimal(
                str(
                    _get_value(
                        trip,
                        "parking",
                        0
                    ) or 0
                )
            )

            toll += Decimal(
                str(
                    _get_value(
                        trip,
                        "toll",
                        0
                    ) or 0
                )
            )

            other_charges += Decimal(
                str(
                    _get_value(
                        trip,
                        "other_charges",
                        0
                    ) or 0
                )
            )

        # ====================================================
        # PARKING + TOLL + OTHER
        # ====================================================

        non_taxable_total = (
            parking
            + toll
            + other_charges
        )

        # ====================================================
        # FULL SUBTOTAL
        #
        # Includes:
        # Base
        # Extra Hours
        # Extra KM
        # Driver Bata
        # Parking
        # Toll
        # Other Charges
        # ====================================================

        subtotal = (
            base_amount
            + extra_hours
            + extra_km
            + driver_bata
            + parking
            + toll
            + other_charges
        )

        # ====================================================
        # TAXABLE AMOUNT
        #
        # Parking + Toll + Other excluded.
        # ====================================================

        taxable_amount = (
            subtotal
            - non_taxable_total
        )

        if taxable_amount < Decimal("0"):
            taxable_amount = Decimal("0")

        # ====================================================
        # GST
        # ====================================================

        cgst = (
            taxable_amount
            * cgst_rate
            / Decimal("100")
        )

        sgst = (
            taxable_amount
            * sgst_rate
            / Decimal("100")
        )

        igst = (
            taxable_amount
            * igst_rate
            / Decimal("100")
        )

        # ====================================================
        # GRAND TOTAL
        #
        # Requirement:
        # GRAND TOTAL = SUBTOTAL
        #
        # GST is not added again.
        # ====================================================

        grand_total = subtotal

        # ====================================================
        # ROUND OFF
        # ====================================================

        rounded_total = grand_total.quantize(
            Decimal("1"),
            rounding=ROUND_HALF_UP
        )

        round_off = (
            rounded_total
            - grand_total
        )

        # ====================================================
        # INVOICE ROW
        # ====================================================

        invoice_sheet.append(
            [
                invoice_id,
                invoice_number,
                invoice_date,
                customer_name,
                customer_address,
                customer_gstin,
                booked_by,
                used_by,
                reference_number,
                first_vehicle_number,
                len(trips),
                "996412",
                "36AYPPR7981L1Z8",
                float(cgst_rate),
                float(cgst),
                float(sgst_rate),
                float(sgst),
                float(igst_rate),
                float(igst),
                float(subtotal),
                float(taxable_amount),
                float(round_off),
                float(rounded_total),
            ]
        )

    # ========================================================
    # FORMAT INVOICE SHEET
    # ========================================================

    for row in invoice_sheet.iter_rows(
        min_row=2,
        max_row=invoice_sheet.max_row
    ):

        for cell in row:

            cell.border = border

            cell.alignment = left

    # ========================================================
    # DATE FORMAT
    # ========================================================

    for row in range(
        2,
        invoice_sheet.max_row + 1
    ):

        invoice_sheet.cell(
            row,
            3
        ).number_format = "DD-MM-YYYY"

    # ========================================================
    # CURRENCY COLUMNS
    #
    # 15 CGST
    # 17 SGST
    # 19 IGST
    # 20 Subtotal
    # 21 Taxable Amount
    # 22 Round Off
    # 23 Grand Total
    # ========================================================

    currency_columns = [
        15,
        17,
        19,
        20,
        21,
        22,
        23,
    ]

    for row in range(
        2,
        invoice_sheet.max_row + 1
    ):

        for col in currency_columns:

            invoice_sheet.cell(
                row,
                col
            ).number_format = (
                '#,##0.00'
            )

    # ========================================================
    # PERCENTAGE COLUMNS
    # ========================================================

    percentage_columns = [
        14,
        16,
        18,
    ]

    for row in range(
        2,
        invoice_sheet.max_row + 1
    ):

        for col in percentage_columns:

            invoice_sheet.cell(
                row,
                col
            ).number_format = (
                '0.00'
            )

    # ========================================================
    # FREEZE HEADER
    # ========================================================

    invoice_sheet.freeze_panes = "A2"

    # ========================================================
    # FILTER
    # ========================================================

    if invoice_sheet.max_row >= 1:

        invoice_sheet.auto_filter.ref = (
            invoice_sheet.dimensions
        )

    # ========================================================
    # SHEET 2 - TRIP DETAILS
    # ========================================================

    trip_sheet = workbook.create_sheet(
        "Trip Details"
    )

    trip_headers = [
        "Trip ID",
        "Invoice ID",
        "Invoice Number",
        "DS No",
        "Trip Date",
        "Vehicle Type",
        "Vehicle Number",
        "Start Time",
        "End Time",
        "Start KM",
        "End KM",
        "Included Hours",
        "Included KM",
        "Slab Hours",
        "Slab KM",
        "Slab Rate",
        "Extra Hour Rate",
        "Extra KM Rate",
        "Extra Hours",
        "Extra KM",
        "Extra Hour Amount",
        "Extra KM Amount",
        "Base Amount",
        "Driver Bata",
        "Parking",
        "Toll",
        "Other Charges",
        "Trip Total",
        "Notes",
    ]

    trip_sheet.append(
        trip_headers
    )

    # ========================================================
    # HEADER FORMATTING
    # ========================================================

    for cell in trip_sheet[1]:

        cell.fill = header_fill

        cell.font = header_font

        cell.alignment = center

        cell.border = border

    # ========================================================
    # TRIP DATA
    # ========================================================

    for inv in invoices:

        invoice_id = _get_value(
            inv,
            "id",
            ""
        )

        invoice_number = _get_value(
            inv,
            "invoice_number",
            ""
        )

        trips = _get_trips(inv)

        for trip in trips:

            trip_sheet.append(
                [
                    _get_value(
                        trip,
                        "id",
                        ""
                    ),

                    invoice_id,

                    invoice_number,

                    _get_value(
                        trip,
                        "ds_no",
                        ""
                    ),

                    _get_value(
                        trip,
                        "trip_date",
                        ""
                    ),

                    _get_value(
                        trip,
                        "vehicle_type",
                        ""
                    ),

                    _get_value(
                        trip,
                        "vehicle_number",
                        ""
                    ),

                    _get_value(
                        trip,
                        "start_time",
                        ""
                    ),

                    _get_value(
                        trip,
                        "end_time",
                        ""
                    ),

                    _get_value(
                        trip,
                        "start_km",
                        0
                    ) or 0,

                    _get_value(
                        trip,
                        "end_km",
                        0
                    ) or 0,

                    _get_value(
                        trip,
                        "total_hours",
                        0
                    ) or 0,

                    _get_value(
                        trip,
                        "total_km",
                        0
                    ) or 0,

                    _get_value(
                        trip,
                        "slab_hours",
                        0
                    ) or 0,

                    _get_value(
                        trip,
                        "slab_km",
                        0
                    ) or 0,

                    _get_value(
                        trip,
                        "slab_rate",
                        0
                    ) or 0,

                    _get_value(
                        trip,
                        "extra_hour_rate",
                        0
                    ) or 0,

                    _get_value(
                        trip,
                        "extra_km_rate",
                        0
                    ) or 0,

                    _get_value(
                        trip,
                        "extra_hours",
                        0
                    ) or 0,

                    _get_value(
                        trip,
                        "extra_km",
                        0
                    ) or 0,

                    _get_value(
                        trip,
                        "extra_hour_amount",
                        0
                    ) or 0,

                    _get_value(
                        trip,
                        "extra_km_amount",
                        0
                    ) or 0,

                    _get_value(
                        trip,
                        "base_amount",
                        0
                    ) or 0,

                    _get_value(
                        trip,
                        "driver_bata",
                        0
                    ) or 0,

                    _get_value(
                        trip,
                        "parking",
                        0
                    ) or 0,

                    _get_value(
                        trip,
                        "toll",
                        0
                    ) or 0,

                    _get_value(
                        trip,
                        "other_charges",
                        0
                    ) or 0,

                    _get_value(
                        trip,
                        "trip_total",
                        0
                    ) or 0,

                    _get_value(
                        trip,
                        "notes",
                        ""
                    ) or "",
                ]
            )

    # ========================================================
    # FORMAT TRIP DETAILS
    # ========================================================

    for row in trip_sheet.iter_rows(
        min_row=2,
        max_row=trip_sheet.max_row
    ):

        for cell in row:

            cell.border = border

            cell.alignment = left

    # ========================================================
    # TRIP DATE
    # ========================================================

    for row in range(
        2,
        trip_sheet.max_row + 1
    ):

        trip_sheet.cell(
            row,
            5
        ).number_format = (
            "DD-MM-YYYY"
        )

    # ========================================================
    # TRIP CURRENCY COLUMNS
    #
    # 16 Slab Rate
    # 17 Extra Hour Rate
    # 18 Extra KM Rate
    # 21 Extra Hour Amount
    # 22 Extra KM Amount
    # 23 Base Amount
    # 24 Driver Bata
    # 25 Parking
    # 26 Toll
    # 27 Other Charges
    # 28 Trip Total
    # ========================================================

    currency_columns = [
        16,
        17,
        18,
        21,
        22,
        23,
        24,
        25,
        26,
        27,
        28,
    ]

    for row in range(
        2,
        trip_sheet.max_row + 1
    ):

        for col in currency_columns:

            trip_sheet.cell(
                row,
                col
            ).number_format = (
                '#,##0.00'
            )

    # ========================================================
    # FREEZE HEADER
    # ========================================================

    trip_sheet.freeze_panes = "A2"

    # ========================================================
    # FILTER
    # ========================================================

    if trip_sheet.max_row >= 1:

        trip_sheet.auto_filter.ref = (
            trip_sheet.dimensions
        )

    # ========================================================
    # INVOICE REGISTER COLUMN WIDTHS
    # ========================================================

    invoice_widths = {
        1: 12,
        2: 24,
        3: 18,
        4: 20,
        5: 14,
        6: 28,
        7: 35,
        8: 22,
        9: 24,
        10: 24,
        11: 12,
        12: 12,
        13: 20,
        14: 10,
        15: 15,
        16: 10,
        17: 15,
        18: 10,
        19: 15,
        20: 15,
        21: 18,
        22: 15,
        23: 18,
    }

    for column, width in invoice_widths.items():

        invoice_sheet.column_dimensions[
            get_column_letter(column)
        ].width = width

    # ========================================================
    # TRIP DETAIL COLUMN WIDTHS
    # ========================================================

    trip_widths = {
        1: 12,
        2: 12,
        3: 22,
        4: 12,
        5: 15,
        6: 18,
        7: 20,
        8: 15,
        9: 15,
        10: 12,
        11: 12,
        12: 16,
        13: 15,
        14: 15,
        15: 15,
        16: 15,
        17: 18,
        18: 18,
        19: 15,
        20: 15,
        21: 20,
        22: 20,
        23: 18,
        24: 18,
        25: 15,
        26: 15,
        27: 18,
        28: 18,
        29: 35,
    }

    for column, width in trip_widths.items():

        trip_sheet.column_dimensions[
            get_column_letter(column)
        ].width = width

    # ========================================================
    # RETURN EXCEL FILE
    # ========================================================

    output = BytesIO()

    workbook.save(
        output
    )

    output.seek(0)

    return output.getvalue()
