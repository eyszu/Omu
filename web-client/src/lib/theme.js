import { createSignal } from 'solid-js'

// 'auto' follows the OS; 'light' / 'dark' are explicit.
const saved = (() => {
  try {
    return localStorage.getItem('omu.theme')
  } catch {
    return null
  }
})()

const [theme, setThemeSignal] = createSignal(saved === 'light' || saved === 'dark' ? saved : 'auto')
export { theme }

export function setTheme(mode) {
  setThemeSignal(mode)
  const root = document.documentElement
  if (mode === 'auto') delete root.dataset.theme
  else root.dataset.theme = mode
  try {
    mode === 'auto' ? localStorage.removeItem('omu.theme') : localStorage.setItem('omu.theme', mode)
  } catch {
    // ignore
  }
}
