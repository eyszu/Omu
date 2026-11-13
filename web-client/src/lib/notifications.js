import { createSignal } from 'solid-js'
import { api } from './api.js'

const [unread, setUnread] = createSignal(0)
export { unread, setUnread }

export async function refreshUnread() {
  try {
    const { unread: n } = await api.get('/notifications/unread_count')
    setUnread(n)
  } catch {
    // keep the old number; this is a nicety, not critical
  }
}
