async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  })

  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    const data = await response.json()

    if (!response.ok) {
      const message = data.message || 'Request failed'
      const error = new Error(message)
      error.payload = data
      throw error
    }

    return data
  }

  if (!response.ok) {
    throw new Error('Request failed')
  }

  return response
}

export const api = {
  health: () => request('/api/health'),

  listInvoices: (
    search = '',
    month = '',
    year = ''
  ) => {
    const params = new URLSearchParams()

    if (search) {
      params.set('search', search)
    }

    if (month) {
      params.set('month', month)
    }

    if (year) {
      params.set('year', year)
    }

    const query = params.toString()

    return request(
      `/api/invoices${query ? `?${query}` : ''}`
    )
  },

  getInvoice: (id) =>
    request(`/api/invoices/${id}`),

  createInvoice: (payload) =>
    request('/api/invoices', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  updateInvoice: (id, payload) =>
    request(`/api/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  deleteInvoice: (id) =>
    request(`/api/invoices/${id}`, {
      method: 'DELETE'
    }),

  pdfUrl: (id) =>
    `/api/invoices/${id}/pdf`,

  csvUrl: (month = '', year = '') => {
    const params = new URLSearchParams()

    if (month) {
      params.set('month', month)
    }

    if (year) {
      params.set('year', year)
    }

    const query = params.toString()

    return `/api/invoices/export/csv${query ? `?${query}` : ''}`
  },

  xlsxUrl: (month = '', year = '') => {
    const params = new URLSearchParams()

    if (month) {
      params.set('month', month)
    }

    if (year) {
      params.set('year', year)
    }

    const query = params.toString()

    return `/api/invoices/export/xlsx${query ? `?${query}` : ''}`
  }
}
