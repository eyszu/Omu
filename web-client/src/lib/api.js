// Thin fetch wrapper for the Omu API (JSON in, JSON out, bearer token, typed errors).
const BASE = ((import.meta.env.VITE_API_URL || '').replace(/\/$/, '')) + '/api/v1'

export class ApiError extends Error {
  constructor(status, message, fields) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields || {}
  }
}

let getToken = () => null
let onUnauthorized = () => {}

// Called once by the auth store so api.js has no import cycle.
export function configureApi(opts) {
  getToken = opts.getToken
  onUnauthorized = opts.onUnauthorized
}

async function request(method, path, { body, query } = {}) {
  const url = new URL(BASE + path, window.location.origin)
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
    }
  }
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let res
  try {
    res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  } catch {
    throw new ApiError(0, "Can't reach Omu. Check your connection and try again.")
  }

  if (res.status === 204) return null
  let data = null
  try {
    data = await res.json()
  } catch {
    // non-JSON body (e.g. a 405 from the framework)
  }
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized()
    throw new ApiError(res.status, data?.error || res.statusText || 'Something went wrong', data?.fields)
  }
  return data
}

export const api = {
  get: (path, query) => request('GET', path, { query }),
  post: (path, body) => request('POST', path, { body }),
  put: (path, body) => request('PUT', path, { body }),
  patch: (path, body) => request('PATCH', path, { body }),
  del: (path) => request('DELETE', path),
}
