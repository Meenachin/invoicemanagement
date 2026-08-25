import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from './api'
import {
  calculateInvoice,
  calculateTrip,
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

const VEHICLE_TYPES = Object.keys(VEHICLES)

const DEFAULT_SERIES = 'PVR/2026-27/'

function newTrip() {
  return {
    id: null,
    ds_no: '',
    trip_date: todayISO(),
    vehicle_type: 'Innova Crysta',
vehicle_number: VEHICLES['Innova Crysta'][0],
    start_time: '',
    end_time: '',
    start_km: 0,
    end_km: 0,
    total_hours: 0,
    total_km: 0,
    slab_hours: 0,
    slab_km: 0,
    slab_rate: 00,
    extra_hour_rate: 0,
    extra_km_rate: 0,
    extra_hours: 0,
    extra_km: 0,
    extra_hour_amount: 0,
    extra_km_amount: 0,
    base_amount:0,
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
    customer_name: '',
    customer_address: '',
    customer_gstin: '',
    booked_by: '',
    used_by: '',
    reference_number: '',
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
          <Link to="/">Invoices</Link>

          <Link to="/new" className="nav-primary">
            + New Invoice
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

  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')

    try {
      const data = await api.listInvoices(search)
      setRows(data.invoices || [])
    } catch (e) {
      setError(e.message || 'Unable to load invoices.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [search])

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
  <button
    type="button"
    className="button ghost"
    onClick={load}
    disabled={loading}
  >
    {loading ? 'Loading…' : '↻ Refresh'}
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
    href={api.csvUrl().replace('/export/csv', '/export/xlsx')}
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

        {error && (
          <div className="alert error">
            {error}
          </div>
        )}

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
            <Input
              label="Customer Name"
              value={form.customer_name}
              onChange={v =>
                update(
                  'customer_name',
                  v
                )
              }
              required
            />

            <Input
              label="Customer GST Number"
              value={form.customer_gstin}
              onChange={v =>
                update(
                  'customer_gstin',
                  v
                )
              }
              placeholder="Optional"
            />

            <Input
              label="Reference / PO Number"
              value={form.reference_number}
              onChange={v =>
                update(
                  'reference_number',
                  v
                )
              }
            />
          </div>

          <div className="form-grid three">
            <Input
              label="Customer Address"
              value={form.customer_address}
              onChange={v =>
                update(
                  'customer_address',
                  v
                )
              }
              className="span-2"
            />

            <Input
              label="Booked By"
              value={form.booked_by}
              onChange={v =>
                update(
                  'booked_by',
                  v
                )
              }
            />

            <Input
              label="Used By"
              value={form.used_by}
              onChange={v =>
                update(
                  'used_by',
                  v
                )
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
                      label="Trip Date"
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

                  <Select
  label="Vehicle Type"
  value={trip.vehicle_type}
  onChange={v => {
    updateTrip(index, 'vehicle_type', v)

    const numbers = VEHICLES[v] || []

    updateTrip(
      index,
      'vehicle_number',
      numbers.length ? numbers[0] : ''
    )
  }}
  options={VEHICLE_TYPES}
/>

<Select
  label="Vehicle Number"
  value={trip.vehicle_number}
  onChange={v => updateTrip(index, 'vehicle_number', v)}
  options={VEHICLES[trip.vehicle_type] || []}
/>
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
                      type="time"
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
                      type="time"
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
                        {c.total_km.toFixed(2)}
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
                        {c.total_hours.toFixed(2)}
                      </strong>

                      <small>
                        End Time − Start Time
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
                        {c.extra_hours.toFixed(2)}
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

export default function App() {
  /*
   * IMPORTANT:
   * useLocation() makes App reactive to React Router
   * navigation. This means /new and /edit/:id render
   * immediately without requiring a browser refresh.
   */
  const location = useLocation()

  if (location.pathname === '/') {
    return <Dashboard />
  }

  return <InvoiceForm />
}
