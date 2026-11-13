import { createSignal } from 'solid-js'

const [toasts, setToasts] = createSignal([])
export { toasts }

let nextId = 1

export function dismiss(id) {
  setToasts((list) => list.filter((t) => t.id !== id))
}

// kind: 'info' | 'success' | 'error'
// `onClick` makes the toast a shortcut (e.g. "view the post you just made").
export function toast(message, kind = 'info', ms = 3800, onClick) {
  const id = nextId++
  setToasts((list) => [...list.slice(-2), { id, message, kind, onClick }])
  if (ms) setTimeout(() => dismiss(id), ms)
  return id
}
