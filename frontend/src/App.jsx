import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from './api'
import {
  calculateInvoice,
  calculateTrip,
  hoursToHHMM,
  money,
  num,
  todayISO
} from './calculations'

const VEHICLES = {
  'Innova Crysta': [
    'TG09T0036',
    'TG09T5499',
    'TS09UE4419',
  ],
  'CYAZ': [
    'TG09U0036',
    'TG13T3006',
  ],

  'Grand Vitara': [
    'TG09H6705',
  ],

  'Scoda Slavia': [
    'TG09T1009',
  ],

  
  'Honda City': [
    'TG09T1003',
    'TG09T1004',
    'TG09T0625',
    'TG09T0747',
    'TG09T0627',
    'TG09T1629',
    'TG09T0748',
    'TS09UD8159',
    'TS09UD2888',
    'TG08T8049',
    'TS08UE7437',
    'TS08UF4845',
    'TS09UC2561',
  ],

  'Shift Dzire': [
    'TG09T0619',
    'TG09T0626',
    'TS09UE1656',
  ],
}

//const VEHICLE_TYPES = Object.keys(VEHICLES)
const VEHICLE_TYPES = [
  ...Object.keys(VEHICLES),
  'Other'
]
const DEFAULT_SERIES = 'PVR/2026-27/'
const CUSTOMER_NAMES = [
  'SBI LHO BANK STREET KOTI HYDERABAD'
]

const CUSTOMER_ADDRESSES = [
  'Hyderabad'
]

const CUSTOMER_GSTINS = [
  '36AAACS8577K1ZQ'
]

const BOOKED_BY = [
  'Mr.Y Santosh Kumar Liaison Officer',
  'Mr.Rama Kantha Sarma Liaison Officer',
   'Mr. Rama Krishna Liaison Officer'
]

const REFERENCE_NUMBERS = [
  'SBI'
]
function newTrip() {
  return {
    id: null,
    ds_no: '',
    trip_date: todayISO(),
    end_date: todayISO(),
    vehicle_type: 'Innova Crysta',
    vehicle_number: VEHICLES['Innova Crysta'][0],
    start_time: '',
    end_time: '',
    start_km: 0,
    end_km: 0,
    total_hours: 0,
    total_km: '',
    slab_hours: 0,
    slab_km: 80,
    slab_rate: 3700,
    extra_hour_rate: 180,
    extra_km_rate: 23,
    extra_hours: 0,
    extra_km: 0,
    extra_hour_amount: 0,
    extra_km_amount: 0,
    base_amount: 3700,
    driver_bata: 0,
    parking: 0,
    toll: 0,
    other_charges: 0,
    trip_total:0,
    notes: ''
  }
}

function blankInvoice() {
  return {
    invoice_series: DEFAULT_SERIES,
    invoice_serial_number: '',
    invoice_date: todayISO(),

    customer_name: CUSTOMER_NAMES[0],
    customer_address: CUSTOMER_ADDRESSES[0],
    customer_gstin: CUSTOMER_GSTINS[0],
    booked_by: BOOKED_BY[0],
    used_by: '',
    reference_number: REFERENCE_NUMBERS[0],

    cgst_rate: 2.5,
    sgst_rate: 2.5,
    igst_rate: 0,
    trips: [newTrip()]
  }
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
  step,
  min,
  placeholder,
  readOnly = false,
  required = false,
  className = ''
}) {
  return (
    <label className={`field ${className}`}>
      <span>
        {label}
        {required && <b className="req"> *</b>}
      </span>

      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        step={step}
        min={min}
        placeholder={placeholder}
        readOnly={readOnly}
        required={required}
        className={readOnly ? 'readonly' : ''}
      />
    </label>
  )
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="field">
      <span>{label}</span>

      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
      >
        {options.map(option => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}


function EditableSelect({
  label,
  value,
  onChange,
  options = [],
  placeholder = '',
  className = ''
}) {
  const [otherMode, setOtherMode] = useState(false)

  const handleChange = e => {
    const selected = e.target.value

    if (selected === 'Other') {
      setOtherMode(true)
      onChange('')
    } else {
      setOtherMode(false)
      onChange(selected)
    }
  }

  return (
    <label className={`field ${className}`}>
      <span>{label}</span>

      {otherMode ? (
        <input
          type="text"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus
        />
      ) : (
        <select
          value={value || ''}
          onChange={handleChange}
        >
          {options.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}

          <option value="Other">
            Other
          </option>
        </select>
      )}
    </label>
  )
}

function Stat({ title, value, tone }) {
  return (
    <div className={`stat ${tone || ''}`}>
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  )
}

function Layout({ children }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark">PVR</span>

          <span>
            <strong>PVR Tours & Travels</strong>
            <small>Invoice Management</small>
          </span>
        </Link>

    <nav>
  <Link to="/new">
    Daily Bills
  </Link>

  <Link to="/monthly">
    Monthly Bills
  </Link>

  <Link to="/daily-history">
    Daily Bill History
  </Link>

  <Link to="/monthly-history">
    Monthly Bill History
  </Link>
</nav>
      </header>

      <main className="main-content">
        {children}
      </main>

      <footer className="app-footer">
        PVR Tours & Travels • Invoice Management System
      </footer>
    </div>
  )
}
function Dashboard() {
  const navigate = useNavigate()

  return (
    <Layout>
      <section className="hero">
        <div>
          <div className="eyebrow">
            CONTROL CENTER
          </div>

          <h1>
            PVR Invoice Management
          </h1>

          <p>
            Manage Daily Bills, Monthly Bills,
            and their history from one place.
          </p>
        </div>
      </section>

      <section className="stats-grid">

        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Daily Bills</h2>
              <p>
                Create a new daily bill.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="button primary big"
            onClick={() => navigate('/new')}
          >
            Daily Bills →
          </button>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Monthly Bills</h2>
              <p>
                Create a new monthly bill.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="button primary big"
            onClick={() => navigate('/monthly')}
          >
            Monthly Bills →
          </button>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Daily Bill History</h2>
              <p>
                View, edit, PDF, CSV and Excel
                for daily bills.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="button primary big"
            onClick={() => navigate('/daily-history')}
          >
            Daily Bill History →
          </button>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Monthly Bill History</h2>
              <p>
                View and manage saved monthly bills.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="button primary big"
            onClick={() => navigate('/monthly-history')}
          >
            Monthly Bill History →
          </button>
        </div>
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>E-Invoice Excel</h2>
              <p>
                Download the E-Invoice Excel
                workbook for all invoices.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="button primary big"
            onClick={() =>
              window.open(
                '/api/invoices/export/einvoice-xlsx',
                '_blank'
              )
            }
          >
            E-Invoice Excel →
          </button>
        </div>
      </section>
    </Layout>
  )
}
function DailyBillHistory() {
  const navigate = useNavigate()

 const [rows, setRows] = useState([])
const [search, setSearch] = useState('')
const [month, setMonth] = useState('')
const [year, setYear] = useState('')
const [loading, setLoading] = useState(true)
const [error, setError] = useState('')

const load = async () => {
  setLoading(true)
  setError('')

  try {
   const data = await api.listInvoices(
  search,
  month,
  year
)

    setRows(data.invoices || [])
  } catch (e) {
    setError(
      e.message || 'Unable to load invoices.'
    )
  } finally {
    setLoading(false)
  }
}
useEffect(() => {
  load()
}, [search, month, year])
  const total = useMemo(
    () => rows.reduce((s, r) => s + num(r.grand_total), 0),
    [rows]
  )

  return (
    <Layout>
      <section className="hero">
        <div>
          <div className="eyebrow">CONTROL CENTER</div>

          <h1>Invoice Management</h1>

          <p>
            Create polished PVR invoices, keep every trip calculation
            accurate, and download print-ready PDFs.
          </p>
        </div>

        <button
          type="button"
          className="button primary big"
          onClick={() => navigate('/new')}
        >
          Create New Invoice <span>→</span>
        </button>
      </section>

      {/* Database Connected card removed.
          Only useful invoice information is displayed. */}
      <section className="stats-grid">
        <Stat
          title="Saved invoices"
          value={rows.length}
          tone="purple"
        />

        <Stat
          title="Visible invoice value"
          value={`₹ ${money(total)}`}
          tone="green"
        />
      </section>

      <section className="panel history-panel">
        <div className="panel-heading">
          <div>
            <h2>Saved Invoices</h2>

            <p>
              Search by invoice number, customer, or reference.
            </p>
          </div>

         <div className="heading-actions">

  <select
    className="button ghost"
    value={month}
    onChange={e => setMonth(e.target.value)}
  >
    <option value="">
      All Months
    </option>

    <option value="1">January</option>
    <option value="2">February</option>
    <option value="3">March</option>
    <option value="4">April</option>
    <option value="5">May</option>
    <option value="6">June</option>
    <option value="7">July</option>
    <option value="8">August</option>
    <option value="9">September</option>
    <option value="10">October</option>
    <option value="11">November</option>
    <option value="12">December</option>
  </select>

  <select
    className="button ghost"
    value={year}
    onChange={e => setYear(e.target.value)}
  >
    <option value="">
      All Years
    </option>

    {Array.from(
      { length: 7 },
      (_, index) => 2025 + index
    ).map(value => (
      <option
        key={value}
        value={value}
      >
        {value}
      </option>
    ))}
  </select>

  <button
    type="button"
    className="button ghost"
    onClick={load}
    disabled={loading}
  >
    {loading
      ? 'Loading…'
      : '↻ Refresh'}
  </button>

  <a
    className="button ghost"
    href={api.csvUrl()}
    download
  >
    ⇩ CSV
  </a>

  <a
    className="button ghost"
    href={api.csvUrl().replace(
      '/export/csv',
      '/export/xlsx'
    )}
    download
  >
    ⇩ Excel
  </a>

</div>
        </div>

      <div className="search-row">
  <input
    className="search"
    value={search}
    onChange={e => setSearch(e.target.value)}
    placeholder="Search invoice number, customer, reference…"
  />
</div>
 

      

        <div className="table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th>Invoice Number</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Trips</th>
                <th>Subtotal</th>
                <th>Grand Total</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan="7" className="empty">
                    No invoices found. Create your first PVR invoice.
                  </td>
                </tr>
              )}

              {rows.map(row => (
                <tr key={row.id}>
                  <td>
                    <strong>
                      {row.invoice_number}
                    </strong>
                  </td>

                  <td>
                    {row.invoice_date}
                  </td>

                  <td>
                    {row.customer_name}
                  </td>

                  <td>
                    <span className="pill">
                      {row.trip_count}
                    </span>
                  </td>

                  <td>
                    ₹ {money(row.subtotal)}
                  </td>

                  <td>
                    <strong>
                      ₹ {money(row.grand_total)}
                    </strong>
                  </td>

                  <td className="actions">
                    <button
                      type="button"
                      className="icon-button"
                      title="View / Edit"
                      onClick={() =>
                        navigate(`/edit/${row.id}`)
                      }
                    >
                      View / Edit
                    </button>

                    <a
                      className="icon-button pdf"
                      href={api.pdfUrl(row.id)}
                    >
                      PDF
                    </a>
                  </td>
                </tr>
              ))}

              {loading && (
                <tr>
                  <td colSpan="7" className="empty">
                    Loading invoices…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  )
}

function InvoiceForm() {
  const location = useLocation()
  const navigate = useNavigate()

  const editId = location.pathname.startsWith('/edit/')
    ? location.pathname.split('/')[2]
    : null

  const editing = Boolean(editId)

  const [form, setForm] = useState(blankInvoice())
  const [loading, setLoading] = useState(editing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTrip, setActiveTrip] = useState(0)

  useEffect(() => {
    let mounted = true

    if (!editing) {
      setForm(blankInvoice())
      setLoading(false)
      setError('')
      setSuccess('')
      setActiveTrip(0)

      return () => {
        mounted = false
      }
    }

    setLoading(true)
    setError('')
    setSuccess('')

    api.getInvoice(editId)
      .then(data => {
        if (!mounted) return

        const invoice = data.invoice

        setForm({
          ...invoice,
          trips:
            invoice.trips?.length
              ? invoice.trips
              : [newTrip()]
        })

        setActiveTrip(0)
      })
      .catch(e => {
        if (mounted) {
          setError(
            e.message || 'Unable to load invoice.'
          )
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [editId, editing])

  const calculated = useMemo(
    () => calculateInvoice(form),
    [form]
  )

  const invoiceNumber =
    `${form.invoice_series || ''}${form.invoice_serial_number || ''}`

  const update = (key, value) => {
    setForm(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const updateTrip = (index, key, value) => {
    setForm(prev => ({
      ...prev,
      trips: prev.trips.map((trip, i) =>
        i === index
          ? {
              ...trip,
              [key]: value
            }
          : trip
      )
    }))
  }

  const addTrip = () => {
    setForm(prev => ({
      ...prev,
      trips: [
        ...prev.trips,
        newTrip()
      ]
    }))

    setActiveTrip(form.trips.length)
  }

  const removeTrip = index => {
    if (form.trips.length === 1) {
      return
    }

    setForm(prev => ({
      ...prev,
      trips: prev.trips.filter(
        (_, i) => i !== index
      )
    }))

    setActiveTrip(
      Math.max(
        0,
        Math.min(
          activeTrip,
          form.trips.length - 2
        )
      )
    )
  }

  const submit = async e => {
    e.preventDefault()

    if (saving) {
      return
    }

    setError('')
    setSuccess('')

    if (!form.customer_name.trim()) {
      setError('Customer Name is required.')
      return
    }

    if (!form.invoice_series.trim()) {
      setError('Invoice Series is required.')
      return
    }

    if (!String(form.invoice_serial_number).trim()) {
      setError(
        'Invoice Serial Number is required.'
      )
      return
    }

    if (!form.trips.length) {
      setError(
        'At least one trip is required.'
      )
      return
    }

    for (
      let i = 0;
      i < form.trips.length;
      i++
    ) {
      const t = form.trips[i]

      if (
        num(t.end_km) <
        num(t.start_km)
      ) {
        setError(
          `Trip ${i + 1}: End KM cannot be less than Start KM.`
        )
        return
      }
    }

    setSaving(true)

    try {
      const payload = {
        ...form,
        trips: calculated.trips
      }

      const data = editing
        ? await api.updateInvoice(
            editId,
            payload
          )
        : await api.createInvoice(
            payload
          )

      setSuccess(
        editing
          ? 'Invoice updated successfully.'
          : 'Invoice created successfully.'
      )

      const id = data.invoice.id

      /*
       * React Router navigation.
       * No browser refresh is required.
       */
      navigate(`/edit/${id}`, {
        replace: true,
        state: {
          saved: true
        }
      })
    } catch (e) {
      const code = e.payload?.code

      setError(
        code
          ? `${e.message} [${code}]`
          : e.message ||
            'Unable to save invoice.'
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="loading-card">
          Loading invoice…
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <form onSubmit={submit}>
        <section className="form-hero">
          <div>
            <Link
              className="back-link"
              to="/"
            >
              ← Invoice History
            </Link>

            <div className="eyebrow">
              {editing
                ? 'EDIT INVOICE'
                : 'NEW INVOICE'}
            </div>

            <h1>
              {editing
                ? invoiceNumber || 'Edit Invoice'
                : 'Create PVR Invoice'}
            </h1>

            <p>
              {editing
                ? 'Update this invoice without creating a new invoice record.'
                : 'Enter the details below. KM, hours, extras, GST and totals are calculated automatically.'}
            </p>
          </div>

          <div className="live-invoice-number">
            <span>Invoice Number</span>

            <strong>
              {invoiceNumber || '—'}
            </strong>
          </div>
        </section>

        {error && (
          <div className="alert error">
            {error}
          </div>
        )}

        {success && (
          <div className="alert success">
            {success}
          </div>
        )}

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>
                Invoice & Customer
              </h2>

              <p>
                Keep series and serial separate;
                the final invoice number is generated
                automatically.
              </p>
            </div>

            <span className="section-badge">
              HEADER
            </span>
          </div>

          <div className="form-grid four">
            <Input
              label="Invoice Series"
              value={form.invoice_series}
              onChange={v =>
                update(
                  'invoice_series',
                  v
                )
              }
              required
            />

            <Input
              label="Invoice Serial Number"
              value={form.invoice_serial_number}
              onChange={v =>
                update(
                  'invoice_serial_number',
                  v
                )
              }
              placeholder="918"
              required
            />

            <Input
              label="Invoice Number"
              value={invoiceNumber}
              onChange={() => {}}
              readOnly
            />

            <Input
              label="Invoice Date"
              value={form.invoice_date}
              onChange={v =>
                update(
                  'invoice_date',
                  v
                )
              }
              type="date"
              required
            />
          </div>

          <div className="form-grid three">
  <EditableSelect
    label="Customer Name"
    value={form.customer_name}
    onChange={v =>
      update('customer_name', v)
    }
    options={CUSTOMER_NAMES}
    placeholder="Enter customer name"
  />

  <EditableSelect
    label="Customer GST Number"
    value={form.customer_gstin}
    onChange={v =>
      update('customer_gstin', v)
    }
    options={CUSTOMER_GSTINS}
    placeholder="Enter GSTIN"
  />

  <EditableSelect
    label="Reference / PO Number"
    value={form.reference_number}
    onChange={v =>
      update('reference_number', v)
    }
    options={REFERENCE_NUMBERS}
    placeholder="Enter reference / PO number"
  />
</div>

<div className="form-grid three">
  <EditableSelect
    label="Customer Address"
    value={form.customer_address}
    onChange={v =>
      update('customer_address', v)
    }
    options={CUSTOMER_ADDRESSES}
    placeholder="Enter customer address"
    className="span-2"
  />

  <EditableSelect
    label="Booked By"
    value={form.booked_by}
    onChange={v =>
      update('booked_by', v)
    }
    options={BOOKED_BY}
    placeholder="Enter booked by"
  />

  <Input
    label="Used By"
    value={form.used_by}
    onChange={v =>
      update('used_by', v)
    }
  />
</div>

          
        </section>

        <section className="panel trip-panel">
          <div className="panel-heading">
            <div>
              <h2>Trip Details</h2>

              <p>
                Included KM and Included Hours
                are read-only calculations.
              </p>
            </div>

            <button
              type="button"
              className="button primary"
              onClick={addTrip}
            >
              + Add Trip
            </button>
          </div>

          <div className="trip-tabs">
            {form.trips.map(
              (trip, index) => (
                <button
                  type="button"
                  key={index}
                  className={
                    activeTrip === index
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setActiveTrip(index)
                  }
                >
                  Trip {index + 1}
                  {trip.ds_no
                    ? ` • ${trip.ds_no}`
                    : ''}
                </button>
              )
            )}
          </div>

          {form.trips.map(
            (trip, index) => {
              if (
                index !== activeTrip
              ) {
                return null
              }

              const c =
                calculateTrip(trip)

              return (
                <div
                  className="trip-card"
                  key={index}
                >
                  <div className="trip-card-header">
                    <div>
                      <span className="trip-number">
                        TRIP {index + 1}
                      </span>

                      <h3>
                        {trip.vehicle_type ||
                          'Vehicle'}
                      </h3>
                    </div>

                    {form.trips.length >
                      1 && (
                      <button
                        type="button"
                        className="danger-link"
                        onClick={() =>
                          removeTrip(index)
                        }
                      >
                        Remove trip
                      </button>
                    )}
                  </div>

                  <div className="form-grid four">
                    <Input
                      label="DS No."
                      value={trip.ds_no}
                      onChange={v =>
                        updateTrip(
                          index,
                          'ds_no',
                          v
                        )
                      }
                    />

                    <Input
                      label="Start Date"
                      value={trip.trip_date}
                      onChange={v =>
                        updateTrip(
                          index,
                          'trip_date',
                          v
                        )
                      }
                      type="date"
                    />

                    <Input
                      label="End Date"
                      value={trip.end_date || trip.trip_date}
                      onChange={v =>
                        updateTrip(
                          index,
                          'end_date',
                          v
                        )
                      }
                      type="date"
                    />

                    <EditableSelect
                      label="Vehicle Type"
                      value={trip.vehicle_type}
                      onChange={v => {
                        updateTrip(index, 'vehicle_type', v)

                        // Only automatically select a vehicle number
                        // for predefined vehicle types.
                        const numbers = VEHICLES[v] || []

                        updateTrip(
                          index,
                          'vehicle_number',
                          numbers.length ? numbers[0] : ''
                        )
                      }}
                      options={Object.keys(VEHICLES)}
                      placeholder="Enter vehicle type"
                    />

                    {trip.vehicle_type &&
                    !Object.keys(VEHICLES).includes(trip.vehicle_type) ? (
                      <Input
                        label="Vehicle Number"
                        value={trip.vehicle_number || ''}
                        onChange={v =>
                          updateTrip(
                            index,
                            'vehicle_number',
                            v
                          )
                        }
                        placeholder="Enter vehicle number"
                      />
                    ) : (
                      <Select
                        label="Vehicle Number"
                        value={trip.vehicle_number}
                        onChange={v =>
                          updateTrip(
                            index,
                            'vehicle_number',
                            v
                          )
                        }
                        options={
                          VEHICLES[trip.vehicle_type] || []
                        }
                      />
                    )}
                  </div>

                  <div className="form-grid four">
                    <Input
                      label="Start Time"
                      value={trip.start_time}
                      onChange={v =>
                        updateTrip(
                          index,
                          'start_time',
                          v
                        )
                      }
                      type="text"
                      placeholder="13:00"
                    />

                    <Input
                      label="End Time"
                      value={trip.end_time}
                      onChange={v =>
                        updateTrip(
                          index,
                          'end_time',
                          v
                        )
                      }
                      type="text"
                      placeholder="22:30"
                    />

                    <Input
                      label="Start KM"
                      value={trip.start_km}
                      onChange={v =>
                        updateTrip(
                          index,
                          'start_km',
                          v
                        )
                      }
                      type="number"
                      step="0.01"
                      min="0"
                    />

                    <Input
                      label="End KM"
                      value={trip.end_km}
                      onChange={v =>
                        updateTrip(
                          index,
                          'end_km',
                          v
                        )
                      }
                      type="number"
                      step="0.01"
                      min="0"
                    />
                  </div>

                  <div className="calc-strip">
                    <div>
                      <span>
                        Included KM
                      </span>

                     <strong>
                      {(Number(trip.end_km || 0) - Number(trip.start_km || 0) >= 0 ? Number(trip.end_km || 0) - Number(trip.start_km || 0): 0).toFixed(2)}
                     </strong>

                      <small>
                        End KM − Start KM
                      </small>
                    </div>

                    <div>
                      <span>
                        Included Hours
                      </span>

                      <strong>
                        {hoursToHHMM(c.total_hours)}
                      </strong>

                      <small>
                        End Date/Time − Start Date/Time
                      </small>
                    </div>

                    <div>
                      <span>
                        Extra KM
                      </span>

                      <strong>
                        {c.extra_km.toFixed(2)}
                      </strong>

                      <small>
                        Above slab KM
                      </small>
                    </div>

                    <div>
                      <span>
                        Extra Hours
                      </span>

                      <strong>
                       {hoursToHHMM(c.extra_hours)}
                      </strong>

                      <small>
                        Above slab hours
                      </small>
                    </div>
                  </div>

                  <div className="form-grid six">
                    <Input
                      label="Slab Hours"
                      value={trip.slab_hours}
                      onChange={v =>
                        updateTrip(
                          index,
                          'slab_hours',
                          v
                        )
                      }
                      type="number"
                      step="0.01"
                      min="0"
                    />

                    <Input
                      label="Slab KM"
                      value={trip.slab_km}
                      onChange={v =>
                        updateTrip(
                          index,
                          'slab_km',
                          v
                        )
                      }
                      type="number"
                      step="0.01"
                      min="0"
                    />

                    <Input
                      label="Slab Rate"
                      value={trip.slab_rate}
                      onChange={v =>
                        updateTrip(
                          index,
                          'slab_rate',
                          v
                        )
                      }
                      type="number"
                      step="0.01"
                      min="0"
                    />

                    <Input
                      label="Extra Hour Rate"
                      value={trip.extra_hour_rate}
                      onChange={v =>
                        updateTrip(
                          index,
                          'extra_hour_rate',
                          v
                        )
                      }
                      type="number"
                      step="0.01"
                      min="0"
                    />

                    <Input
                      label="Extra KM Rate"
                      value={trip.extra_km_rate}
                      onChange={v =>
                        updateTrip(
                          index,
                          'extra_km_rate',
                          v
                        )
                      }
                      type="number"
                      step="0.01"
                      min="0"
                    />

                    <Input
                      label="Driver Bata"
                      value={trip.driver_bata}
                      onChange={v =>
                        updateTrip(
                          index,
                          'driver_bata',
                          v
                        )
                      }
                      type="number"
                      step="0.01"
                      min="0"
                    />
                  </div>

                  <div className="form-grid four">
                    <Input
                      label="Parking"
                      value={trip.parking}
                      onChange={v =>
                        updateTrip(
                          index,
                          'parking',
                          v
                        )
                      }
                      type="number"
                      step="0.01"
                      min="0"
                    />

                    <Input
                      label="Toll"
                      value={trip.toll}
                      onChange={v =>
                        updateTrip(
                          index,
                          'toll',
                          v
                        )
                      }
                      type="number"
                      step="0.01"
                      min="0"
                    />

                    <Input
                      label="Other Charges"
                      value={trip.other_charges}
                      onChange={v =>
                        updateTrip(
                          index,
                          'other_charges',
                          v
                        )
                      }
                      type="number"
                      step="0.01"
                      min="0"
                    />

                    <Input
                      label="Trip Total"
                      value={money(c.trip_total)}
                      onChange={() => {}}
                      readOnly
                    />
                  </div>

                  <Input
                    label="Notes"
                    value={trip.notes}
                    onChange={v =>
                      updateTrip(
                        index,
                        'notes',
                        v
                      )
                    }
                    placeholder="Optional trip note"
                  />

                  <div className="trip-breakdown">
                    <span>
                      Extra KM Amount{' '}
                      <b>
                        ₹ {money(c.extra_km_amount)}
                      </b>
                    </span>

                    <span>
                      Extra Hour Amount{' '}
                      <b>
                        ₹ {money(c.extra_hour_amount)}
                      </b>
                    </span>

                    <span>
                      Parking + Toll + Other{' '}
                      <b>
                        ₹{' '}
                        {money(
                          c.parking +
                            c.toll +
                            c.other_charges
                        )}
                      </b>
                    </span>

                    <span>
                      Trip Total{' '}
                      <b>
                        ₹ {money(c.trip_total)}
                      </b>
                    </span>
                  </div>
                </div>
              )
            }
          )}
        </section>

        <section className="summary-layout">
          <div className="panel">
            <div className="panel-heading">
              <div>
                <h2>GST & Totals</h2>

                <p>
                  Tax rates can be changed per
                  invoice.
                </p>
              </div>

              <span className="section-badge">
                TAX
              </span>
            </div>

            <div className="form-grid three">
              <Input
                label="CGST %"
                value={form.cgst_rate}
                onChange={v =>
                  update(
                    'cgst_rate',
                    v
                  )
                }
                type="number"
                step="0.01"
                min="0"
              />

              <Input
                label="SGST %"
                value={form.sgst_rate}
                onChange={v =>
                  update(
                    'sgst_rate',
                    v
                  )
                }
                type="number"
                step="0.01"
                min="0"
              />

              <Input
                label="IGST %"
                value={form.igst_rate}
                onChange={v =>
                  update(
                    'igst_rate',
                    v
                  )
                }
                type="number"
                step="0.01"
                min="0"
              />
            </div>

            <div className="totals-box">
              <div>
                <span>Subtotal</span>

                <strong>
                  ₹ {money(calculated.subtotal)}
                </strong>
              </div>

              <div>
                <span>CGST</span>

                <strong>
                  ₹ {money(calculated.cgst)}
                </strong>
              </div>

              <div>
                <span>SGST</span>

                <strong>
                  ₹ {money(calculated.sgst)}
                </strong>
              </div>

              <div>
                <span>IGST</span>

                <strong>
                  ₹ {money(calculated.igst)}
                </strong>
              </div>

              <div>
                <span>Round Off</span>

                <strong>
                  {calculated.round_off >= 0
                    ? '+'
                    : ''}
                  {money(calculated.round_off)}
                </strong>
              </div>

              <div className="grand">
                <span>Grand Total</span>

                <strong>
                  ₹ {money(calculated.grand_total)}
                </strong>
              </div>
            </div>
          </div>

          <div className="panel preview-card">
            <span className="section-badge">
              PDF READY
            </span>

            <h2>
              Print-ready PVR format
            </h2>

            <p>
              The server generates the PDF in
              a wide A4 landscape layout so all
              invoice columns fit on the printable
              page without horizontal scrolling.
            </p>

            <div className="preview-lines">
              <span>✓ Full trip table</span>
              <span>✓ GST & round-off</span>
              <span>✓ Bank details</span>
              <span>✓ Amount in words</span>
              <span>✓ PVR footer</span>
            </div>

            {editing && (
              <a
                className="button ghost full"
                href={api.pdfUrl(editId)}
              >
                Download Current PDF
              </a>
            )}
          </div>
        </section>

        <div className="sticky-actions">
          <button
            type="button"
            className="button ghost"
            onClick={() => navigate('/')}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="button primary big"
            disabled={saving}
          >
            {saving
              ? 'Saving…'
              : editing
                ? 'Update Invoice'
                : 'Create Invoice'}
          </button>
        </div>
      </form>
    </Layout>
  )
}
function MonthlyBillHistory() {
  const navigate = useNavigate()

 const [bills, setBills] = useState([])
const [search, setSearch] = useState('')
const [month, setMonth] = useState('')
const [year, setYear] = useState('')
const [loading, setLoading] = useState(true)
const [error, setError] = useState('')

  const loadBills = async () => {
    setLoading(true)
    setError('')

    try {
      const data = await api.listMonthlyBills(
  month,
  year
)
      setBills(data.monthly_bills || [])
    } catch (e) {
      setError(
        e.message || 'Unable to load Monthly Bills.'
      )
    } finally {
      setLoading(false)
    }
  }

 useEffect(() => {
  loadBills()
}, [month, year])

  const filteredBills = bills.filter(bill => {
    const text = [
      bill.invoice_number,
      bill.customer_name,
      bill.customer_gstin,
      bill.reference_number
    ]
      .join(' ')
      .toLowerCase()

    return text.includes(search.toLowerCase())
  })

  const total = filteredBills.reduce(
    (sum, bill) =>
      sum + (Number(bill.grand_total) || 0),
    0
  )

  return (
    <Layout>
      <section className="hero">
        <div>
          <div className="eyebrow">
            MONTHLY BILL HISTORY
          </div>

          <h1>
            Monthly Bills
          </h1>

          <p>
            View all saved Monthly Bills.
          </p>
        </div>

        <button
          type="button"
          className="button primary big"
          onClick={() => navigate('/monthly')}
        >
          + New Monthly Bill
        </button>
      </section>

      <section className="stats-grid">
       <Stat
  title="Saved Monthly Bills"
  value={filteredBills.length}
  tone="purple"
/>

        <Stat
          title="Visible bill value"
          value={`₹ ${money(total)}`}
          tone="green"
        />
      </section>

      <section className="panel history-panel">
        <div className="panel-heading">
          <div>
            <h2>
              Saved Monthly Bills
            </h2>

            <p>
              Search by invoice number, customer, or reference.
            </p>
          </div>

          <div className="heading-actions">

  <select
    className="button ghost"
    value={month}
    onChange={e => setMonth(e.target.value)}
  >
    <option value="">
      All Months
    </option>

    <option value="1">January</option>
    <option value="2">February</option>
    <option value="3">March</option>
    <option value="4">April</option>
    <option value="5">May</option>
    <option value="6">June</option>
    <option value="7">July</option>
    <option value="8">August</option>
    <option value="9">September</option>
    <option value="10">October</option>
    <option value="11">November</option>
    <option value="12">December</option>
  </select>

  <select
    className="button ghost"
    value={year}
    onChange={e => setYear(e.target.value)}
  >
    <option value="">
      All Years
    </option>

    {Array.from(
      { length: 7 },
      (_, index) => 2025 + index
    ).map(value => (
      <option
        key={value}
        value={value}
      >
        {value}
      </option>
    ))}
  </select>

  <button
    type="button"
    className="button ghost"
    onClick={loadBills}
    disabled={loading}
  >
    {loading
      ? 'Loading…'
      : '↻ Refresh'}
  </button>

  <a
    className="button ghost"
    href="/api/monthly-bills/export/csv"
    download
  >
    ⇩ CSV
  </a>

  <a
    className="button ghost"
    href="/api/monthly-bills/export/xlsx"
    download
  >
    ⇩ Excel
  </a>

</div>
        </div>

        <div className="search-row">
          <input
            className="search"
            value={search}
            onChange={e =>
              setSearch(e.target.value)
            }
            placeholder="Search invoice number, customer, reference..."
          />
        </div>

        {error && (
          <div className="error-box">
            {error}
          </div>
        )}

        <div className="table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th>INVOICE NUMBER</th>
                <th>DATE</th>
                <th>CUSTOMER</th>
                <th>TAXABLE</th>
                <th>NON-TAXABLE</th>
                <th>GRAND TOTAL</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {!loading && filteredBills.length === 0 && (
                <tr>
                  <td
                    colSpan="7"
                    className="empty"
                  >
                    No Monthly Bills found.
                  </td>
                </tr>
              )}

              {filteredBills.map(bill => (
                <tr key={bill.id}>
                  <td>
                    <strong>
                      {bill.invoice_number}
                    </strong>
                  </td>

                  <td>
                    {bill.invoice_date || '—'}
                  </td>

                  <td>
                    {bill.customer_name || '—'}
                  </td>

                  <td>
                    ₹ {money(bill.taxable_subtotal)}
                  </td>

                  <td>
                    ₹ {money(bill.non_taxable_total)}
                  </td>

                  <td>
                    <strong>
                      ₹ {money(bill.grand_total)}
                    </strong>
                  </td>

                  <td>
                    <div className="actions">
                      <button
                        type="button"
                        className="icon-button"
                        title="View / Edit"
                        onClick={() =>
                          navigate(
                            `/monthly-edit/${bill.id}`
                          )
                        }
                      >
                        View / Edit
                      </button>

                      <a
                        className="icon-button pdf"
                        title="Download PDF"
                        href={`/api/monthly-bills/${bill.id}/pdf`}
                        download
                      >
                        PDF
                      </a>
                    </div>
                  </td>
                </tr>
              ))}

              {loading && (
                <tr>
                  <td
                    colSpan="7"
                    className="empty"
                  >
                    Loading Monthly Bills…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  )
}
function MonthlyBillForm() {
  const navigate = useNavigate()
   const location = useLocation()

  const editId = location.pathname.startsWith('/monthly-edit/')
    ? location.pathname.split('/')[2]
    : null

  const editing = Boolean(editId)

  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(todayISO())

  const [customerName, setCustomerName] = useState(CUSTOMER_NAMES[0])
  const [customerAddress, setCustomerAddress] = useState(
    CUSTOMER_ADDRESSES[0]
  )
  const [customerGstin, setCustomerGstin] = useState(
    CUSTOMER_GSTINS[0]
  )
  const [bookedBy, setBookedBy] = useState(BOOKED_BY[0])
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [referenceNumber, setReferenceNumber] = useState(
    REFERENCE_NUMBERS[0]
  )

  const [activeType, setActiveType] = useState('taxable')

 const [taxableItems, setTaxableItems] = useState([
  {
    description: 'Extra Hours Charges @100 per hour',
    quantity: 1,
    rate: 100,
    amount: 100
  },
  {
    description: 'Out Station Driver Batta @500 per day',
    quantity: 1,
    rate: 500,
    amount: 500
  },
  {
    description: 'Holiday Working Allowance @500 per day (Sunday & Public Holiday)',
    quantity: 1,
    rate: 500,
    amount: 500
  }
])

  const [nonTaxableItems, setNonTaxableItems] = useState([
    {
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0
    }
  ])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
useEffect(() => {
  if (!editing) {
    return
  }

  let mounted = true

  setError('')
  setSuccess('')

  api.getMonthlyBill(editId)
    .then(data => {
      if (!mounted) return

      const bill = data.monthly_bill

      setInvoiceNumber(
        bill.invoice_number || ''
      )

      setInvoiceDate(
        bill.invoice_date || todayISO()
      )

      setCustomerName(
        bill.customer_name || ''
      )

      setCustomerAddress(
        bill.customer_address || ''
      )

      setCustomerGstin(
        bill.customer_gstin || ''
      )

      setBookedBy(
        bill.booked_by || ''
      )

      setVehicleNumber(
         bill.vehicle_number || ''
      )

      setReferenceNumber(
        bill.reference_number || ''
      )

      const items = bill.items || []

      const taxable = items
        .filter(item => item.item_type === 'taxable')
        .map(item => ({
          description: item.description || '',
          quantity: item.quantity || 0,
          rate: item.rate || 0,
          amount: item.amount || 0
        }))

      const nonTaxable = items
        .filter(item => item.item_type === 'non-taxable')
        .map(item => ({
          description: item.description || '',
          quantity: item.quantity || 0,
          rate: item.rate || 0,
          amount: item.amount || 0
        }))

      setTaxableItems(
  taxable.length
    ? taxable
    : [
        {
          description: 'Extra Hours Charges @100 per hour',
          quantity: 1,
          rate: 100,
          amount: 100
        },
        {
          description: 'Out Station Driver Batta @500 per day',
          quantity: 1,
          rate: 500,
          amount: 500
        },
        {
          description: 'Holiday Working Allowance @500 per day (Sunday & Public Holiday)',
          quantity: 1,
          rate: 500,
          amount: 500
        }
      ]
)

      setNonTaxableItems(
        nonTaxable.length
          ? nonTaxable
          : [{
              description: '',
              quantity: 1,
              rate: 0,
              amount: 0
            }]
      )
    })
    .catch(e => {
      if (mounted) {
        setError(
          e.message ||
          'Unable to load Monthly Bill.'
        )
      }
    })

  return () => {
    mounted = false
  }
}, [editId, editing])
  const updateItem = (type, index, key, value) => {
    const setter =
      type === 'taxable'
        ? setTaxableItems
        : setNonTaxableItems

    setter(items =>
      items.map((item, i) => {
        if (i !== index) {
          return item
        }

        const updated = {
          ...item,
          [key]: value
        }

        const quantity =
          Number(updated.quantity) || 0

        const rate =
          Number(updated.rate) || 0

        updated.amount = quantity * rate

        return updated
      })
    )
  }

  const addItem = type => {
    const setter =
      type === 'taxable'
        ? setTaxableItems
        : setNonTaxableItems

    setter(items => [
      ...items,
      {
        description: '',
        quantity: 1,
        rate: 0,
        amount: 0
      }
    ])
  }

  const taxableSubtotal = taxableItems.reduce(
    (sum, item) =>
      sum + (Number(item.amount) || 0),
    0
  )

  const nonTaxableSubtotal =
    nonTaxableItems.reduce(
      (sum, item) =>
        sum + (Number(item.amount) || 0),
      0
    )

  const cgst = taxableSubtotal * 0.025
  const sgst = taxableSubtotal * 0.025

  const totalBeforeRoundOff =
    taxableSubtotal +
    cgst +
    sgst +
    nonTaxableSubtotal

  const roundedTotal = Math.round(
    totalBeforeRoundOff
  )

  const roundOff =
    roundedTotal - totalBeforeRoundOff

  const grandTotal = roundedTotal

  const saveMonthlyBill = async () => {
    if (saving) {
      return
    }

    setError('')
    setSuccess('')

    if (!invoiceNumber.trim()) {
      setError('Invoice Number is required.')
      return
    }

    if (!customerName.trim()) {
      setError('Customer Name is required.')
      return
    }

    if (!invoiceDate) {
      setError('Invoice Date is required.')
      return
    }

    const allItems = [
      ...taxableItems.map(item => ({
        ...item,
        item_type: 'taxable'
      })),
      ...nonTaxableItems.map(item => ({
        ...item,
        item_type: 'non-taxable'
      }))
    ]

    const validItems = allItems.filter(
      item =>
        String(item.description || '').trim() ||
        Number(item.quantity) ||
        Number(item.rate)
    )

    if (!validItems.length) {
      setError('Add at least one Monthly Bill item.')
      return
    }

    setSaving(true)

    try {
      const payload = {
        invoice_number: invoiceNumber.trim(),
        invoice_date: invoiceDate,

        customer_name: customerName.trim(),
        customer_address: customerAddress.trim(),
        customer_gstin: customerGstin.trim(),
        booked_by: bookedBy.trim(),
        vehicle_number: vehicleNumber.trim(),
        reference_number: referenceNumber.trim(),

        cgst_rate: 2.5,
        sgst_rate: 2.5,

        items: validItems.map(item => ({
          item_type: item.item_type,
          description: String(
            item.description || ''
          ).trim(),
          quantity: Number(item.quantity) || 0,
          rate: Number(item.rate) || 0,
          amount:
            (Number(item.quantity) || 0) *
            (Number(item.rate) || 0)
        }))
      }

const data = editing
  ? await api.updateMonthlyBill(
      editId,
      payload
    )
  : await api.createMonthlyBill(
      payload
    )

     setSuccess(
  editing
    ? 'Monthly Bill updated successfully.'
    : 'Monthly Bill saved successfully.'
)

      if (data.monthly_bill) {
        setInvoiceNumber(
          data.monthly_bill.invoice_number
        )
      }
    } catch (e) {
      const code = e.payload?.code

      setError(
        code
          ? `${e.message} [${code}]`
          : e.message ||
            'Unable to save Monthly Bill.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout>
      <section className="form-hero">
        <div>
          <Link
            className="back-link"
            to="/"
          >
            ← Invoice History
          </Link>

          <div className="eyebrow">
            MONTHLY BILL
          </div>

          <h1>Create Monthly Bill</h1>

          <p>
            Create a separate monthly bill with
            taxable and non-taxable items.
          </p>
        </div>
      </section>

      {error && (
        <div className="alert error">
          {error}
        </div>
      )}

      {success && (
        <div className="alert success">
          {success}
        </div>
      )}

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Invoice & Customer</h2>
            <p>
              Monthly bill customer details.
            </p>
          </div>

          <span className="section-badge">
            HEADER
          </span>
        </div>

        <div className="form-grid four">
          <Input
            label="Invoice Number"
            value={invoiceNumber}
            onChange={setInvoiceNumber}
            placeholder="Monthly invoice number"
            required
          />

          <Input
            label="Invoice Date"
            value={invoiceDate}
            onChange={setInvoiceDate}
            type="date"
            required
          />

          <EditableSelect
            label="Customer Name"
            value={customerName}
            onChange={setCustomerName}
            options={CUSTOMER_NAMES}
            placeholder="Enter customer name"
          />

          <EditableSelect
            label="Customer GST Number"
            value={customerGstin}
            onChange={setCustomerGstin}
            options={CUSTOMER_GSTINS}
            placeholder="Enter GSTIN"
          />
        </div>

        <div className="form-grid three">
          <EditableSelect
            label="Customer Address"
            value={customerAddress}
            onChange={setCustomerAddress}
            options={CUSTOMER_ADDRESSES}
            placeholder="Enter customer address"
            className="span-2"
          />

          <EditableSelect
            label="Booked By"
            value={bookedBy}
            onChange={setBookedBy}
            options={BOOKED_BY}
            placeholder="Enter booked by"
          />
        </div>

        <div className="form-grid three">
          <Input
            label="Vehicle Number"
            value={vehicleNumber}
            onChange={setVehicleNumber}
            placeholder="Vehicle number"
          />

          <EditableSelect
            label="Reference / PO Number"
            value={referenceNumber}
            onChange={setReferenceNumber}
            options={REFERENCE_NUMBERS}
            placeholder="Enter reference / PO number"
          />
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Bill Details</h2>
            <p>
              Add taxable and non-taxable charges separately.
            </p>
          </div>

          <span className="section-badge">
            ITEMS
          </span>
        </div>

        <div className="trip-tabs">
          <button
            type="button"
            className={
              activeType === 'taxable'
                ? 'active'
                : ''
            }
            onClick={() =>
              setActiveType('taxable')
            }
          >
            Taxable
          </button>

          <button
            type="button"
            className={
              activeType === 'non-taxable'
                ? 'active'
                : ''
            }
            onClick={() =>
              setActiveType('non-taxable')
            }
          >
            Non-Taxable
          </button>
        </div>

        {activeType === 'taxable' && (
          <>
            <div className="table-wrap">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Quantity</th>
                    <th>Rate</th>
                    <th>Amount</th>
                  </tr>
                </thead>

                <tbody>
                  {taxableItems.map(
                    (item, index) => (
                      <tr key={index}>
                        <td>
                          <input
                            className="search"
                            value={
                              item.description
                            }
                            onChange={e =>
                              updateItem(
                                'taxable',
                                index,
                                'description',
                                e.target.value
                              )
                            }
                            placeholder="Description"
                          />
                        </td>

                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.quantity}
                            onChange={e =>
                              updateItem(
                                'taxable',
                                index,
                                'quantity',
                                e.target.value
                              )
                            }
                          />
                        </td>

                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.rate}
                            onChange={e =>
                              updateItem(
                                'taxable',
                                index,
                                'rate',
                                e.target.value
                              )
                            }
                          />
                        </td>

                        <td>
                          ₹ {money(item.amount)}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              className="button primary"
              onClick={() =>
                addItem('taxable')
              }
            >
              + Add Taxable Item
            </button>
          </>
        )}

        {activeType === 'non-taxable' && (
          <>
            <div className="table-wrap">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Quantity</th>
                    <th>Rate</th>
                    <th>Amount</th>
                  </tr>
                </thead>

                <tbody>
                  {nonTaxableItems.map(
                    (item, index) => (
                      <tr key={index}>
                        <td>
                          <input
                            className="search"
                            value={
                              item.description
                            }
                            onChange={e =>
                              updateItem(
                                'non-taxable',
                                index,
                                'description',
                                e.target.value
                              )
                            }
                            placeholder="Description"
                          />
                        </td>

                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.quantity}
                            onChange={e =>
                              updateItem(
                                'non-taxable',
                                index,
                                'quantity',
                                e.target.value
                              )
                            }
                          />
                        </td>

                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.rate}
                            onChange={e =>
                              updateItem(
                                'non-taxable',
                                index,
                                'rate',
                                e.target.value
                              )
                            }
                          />
                        </td>

                        <td>
                          ₹ {money(item.amount)}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              className="button primary"
              onClick={() =>
                addItem('non-taxable')
              }
            >
              + Add Non-Taxable Item
            </button>
          </>
        )}
      </section>

      <section className="summary-layout">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>GST & Totals</h2>
              <p>
                CGST 2.5% + SGST 2.5%
              </p>
            </div>

            <span className="section-badge">
              TAX
            </span>
          </div>

          <div className="totals-box">
            <div>
              <span>Taxable Subtotal</span>
              <strong>
                ₹ {money(taxableSubtotal)}
              </strong>
            </div>

            <div>
              <span>CGST @ 2.5%</span>
              <strong>
                ₹ {money(cgst)}
              </strong>
            </div>

            <div>
              <span>SGST @ 2.5%</span>
              <strong>
                ₹ {money(sgst)}
              </strong>
            </div>

            <div>
              <span>Non-Taxable Amount</span>
              <strong>
                ₹ {money(nonTaxableSubtotal)}
              </strong>
            </div>

            <div>
              <span>Round Off</span>
              <strong>
                {roundOff >= 0 ? '+' : ''}
                ₹ {money(roundOff)}
              </strong>
            </div>

            <div className="grand">
              <span>Grand Total</span>
              <strong>
                ₹ {money(grandTotal)}
              </strong>
            </div>
          </div>
        </div>
      </section>

      <div className="sticky-actions">
        <button
          type="button"
          className="button ghost"
          onClick={() => navigate('/')}
          disabled={saving}
        >
          Cancel
        </button>

        <button
          type="button"
          className="button primary big"
          onClick={saveMonthlyBill}
          disabled={saving}
        >
          {saving
  ? 'Saving…'
  : editing
    ? 'Update Monthly Bill'
    : 'Save Monthly Bill'}
        </button>
      </div>
    </Layout>
  )
}
export default function App() {
  const location = useLocation()

  if (location.pathname === '/') {
    return <Dashboard />
  }

  if (location.pathname === '/new') {
    return <InvoiceForm />
  }

  if (location.pathname === '/daily-history') {
    return <DailyBillHistory />
  }

  if (location.pathname === '/monthly') {
    return <MonthlyBillForm />
  }

  if (location.pathname === '/monthly-history') {
    return <MonthlyBillHistory />
  }

  if (location.pathname.startsWith('/monthly-edit/')) {
    return <MonthlyBillForm />
  }

  if (location.pathname.startsWith('/edit/')) {
    return <InvoiceForm />
  }

  return <Dashboard />
}
