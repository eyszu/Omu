import { createSignal } from 'solid-js'
import { api, configureApi } from './api.js'
import { toast } from './toast.js'

const read = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key))
  } catch {
    return null
  }
}
const write = (key, value) => {
  try {
    value == null ? localStorage.removeItem(key) : localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage unavailable (private mode): the session just won't survive a reload
  }
}

const [token, setToken] = createSignal(read('omu.token'))
const [user, setUser] = createSignal(read('omu.user'))

export { user }
export const isAuthed = () => !!token()

function setSession(nextToken, nextUser) {
  setToken(nextToken)
  setUser(nextUser)
  write('omu.token', nextToken)
  write('omu.user', nextUser)
}

async function clearCaches() {
  // Cached API responses are personalised; don't leave them behind after sign-out.
  try {
    await caches.delete('omu-api')
  } catch {
    // Cache API unavailable
  }
}

configureApi({
  getToken: () => token(),
  onUnauthorized: () => {
    setSession(null, null)
    clearCaches()
    toast('Your session expired. Please log in again.', 'error')
  },
})

export async function register(fields) {
  const data = await api.post('/auth/register', fields)
  setSession(data.token, data.user)
  return data.user
}

export async function login(loginName, password) {
  const data = await api.post('/auth/login', { login: loginName, password })
  setSession(data.token, data.user)
  return data.user
}

export async function logout() {
  try {
    await api.post('/auth/logout')
  } catch {
    // already invalid or offline: sign out locally regardless
  }
  setSession(null, null)
  await clearCaches()
}

export function setCurrentUser(me) {
  setUser(me)
  write('omu.user', me)
}

// Re-reads /me and keeps the stored copy fresh.
export async function refreshMe() {
  if (!token()) return null
  const me = await api.get('/me')
  setCurrentUser(me)
  return me
}
