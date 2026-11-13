import { createSignal } from 'solid-js'
import { registerSW } from 'virtual:pwa-register'

const [needRefresh, setNeedRefresh] = createSignal(false)
const [offlineReady, setOfflineReady] = createSignal(false)
const [online, setOnline] = createSignal(navigator.onLine)
const [installEvent, setInstallEvent] = createSignal(null)
const [installed, setInstalled] = createSignal(
  window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
)

export { needRefresh, offlineReady, online, installed }
export const canInstall = () => !!installEvent() && !installed()

let updateSW = async () => {}

export function initPWA() {
  updateSW = registerSW({
    onNeedRefresh: () => setNeedRefresh(true),
    onOfflineReady: () => setOfflineReady(true),
    // Look for a new version once an hour while the app stays open.
    onRegisteredSW(_url, reg) {
      if (reg) setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000)
    },
  })

  window.addEventListener('online', () => setOnline(true))
  window.addEventListener('offline', () => setOnline(false))
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // keep it so our own button can trigger it
    setInstallEvent(e)
  })
  window.addEventListener('appinstalled', () => {
    setInstallEvent(null)
    setInstalled(true)
  })
}

export const applyUpdate = () => updateSW(true)
export const dismissOfflineReady = () => setOfflineReady(false)
export const dismissUpdate = () => setNeedRefresh(false)

export async function promptInstall() {
  const e = installEvent()
  if (!e) return
  e.prompt()
  await e.userChoice
  setInstallEvent(null)
}
