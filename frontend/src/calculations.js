export const num = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export function hoursBetween(start, end) {
  if (!start || !end) return 0

  const parseTime = (value) => {
    const text = String(value).trim().toUpperCase()

    // Supports:
    // 13:00
    // 22:30
    // 1:23 AM
    // 1:23 PM
    // 13:23 AM / PM also won't crash

    const match = text.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/)

    if (!match) return null

    let hour = Number(match[1])
    const minute = Number(match[2])
    const period = match[3]

    if (minute < 0 || minute > 59) return null

    // 12-hour format with AM/PM
    if (period) {
      if (hour < 1 || hour > 12) return null

      if (period === 'AM') {
        if (hour === 12) hour = 0
      } else if (period === 'PM') {
        if (hour !== 12) hour += 12
      }
    } else {
      // 24-hour format
      if (hour < 0 || hour > 23) return null
    }

    return hour * 60 + minute
  }

  const startMinutes = parseTime(start)
  const endMinutes = parseTime(end)

  if (startMinutes === null || endMinutes === null) {
    return 0
  }

  let difference = endMinutes - startMinutes

  // Trip crossing midnight
  if (difference < 0) {
    difference += 24 * 60
  }

  return difference / 60
}

export function calculateTrip(trip) {
  const startKm = num(trip.start_km)
  const endKm = num(trip.end_km)
  const totalKm = Math.max(0, endKm - startKm)
  const totalHours = hoursBetween(trip.start_time, trip.end_time)
  const slabKm = Math.max(0, num(trip.slab_km))
  const slabHours = Math.max(0, num(trip.slab_hours))
  const slabRate = Math.max(0, num(trip.slab_rate))
  const extraKmRate = Math.max(0, num(trip.extra_km_rate))
  const extraHourRate = Math.max(0, num(trip.extra_hour_rate))
  const extraKm = slabKm > 0 ? Math.max(0, totalKm - slabKm) : 0
  const extraHours = slabHours > 0 ? Math.max(0, totalHours - slabHours) : 0
  const extraKmAmount = extraKm * extraKmRate
  const extraHourAmount = extraHours * extraHourRate
  const driverBata = Math.max(0, num(trip.driver_bata))
  const parking = Math.max(0, num(trip.parking))
  const toll = Math.max(0, num(trip.toll))
  const otherCharges = Math.max(0, num(trip.other_charges))
  const tripTotal = slabRate + extraKmAmount + extraHourAmount + driverBata + parking + toll + otherCharges

  return {
    ...trip,
    start_km: startKm,
    end_km: endKm,
    total_km: totalKm,
    total_hours: totalHours,
    slab_km: slabKm,
    slab_hours: slabHours,
    slab_rate: slabRate,
    extra_km: extraKm,
    extra_hours: extraHours,
    extra_km_rate: extraKmRate,
    extra_hour_rate: extraHourRate,
    extra_km_amount: extraKmAmount,
    extra_hour_amount: extraHourAmount,
    base_amount: slabRate,
    driver_bata: driverBata,
    parking,
    toll,
    other_charges: otherCharges,
    trip_total: tripTotal
  }
}

export function calculateInvoice(form) {
  const trips = form.trips.map(calculateTrip)
  const subtotal = trips.reduce((sum, trip) => sum + trip.trip_total, 0)
  const cgst = subtotal * num(form.cgst_rate) / 100
  const sgst = subtotal * num(form.sgst_rate) / 100
  const igst = subtotal * num(form.igst_rate) / 100
  const exact = subtotal + cgst + sgst + igst
  const grandTotal = Math.round(exact)
  const roundOff = grandTotal - exact
  return {
    trips,
    subtotal,
    cgst,
    sgst,
    igst,
    round_off: roundOff,
    grand_total: grandTotal
  }
}

export function money(value) {
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num(value))
}

export function todayISO() {
  const d = new Date()
  const offset = d.getTimezoneOffset()
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10)
}
