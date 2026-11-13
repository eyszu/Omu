import { Show } from 'solid-js'
import { needRefresh, offlineReady, online, applyUpdate, dismissUpdate, dismissOfflineReady } from '../lib/pwa.js'
import Icon from './Icon.jsx'

export default function PwaBanners() {
  return (
    <>
      <Show when={!online()}>
        <div class="banner banner-offline" role="status">
          <Icon name="wifi" size={16} /> You're offline. Showing what was saved on this device.
        </div>
      </Show>
      <Show when={needRefresh()}>
        <div class="banner banner-update" role="alert">
          <span>A new version of Omu is ready.</span>
          <button class="btn btn-sm btn-primary" onClick={applyUpdate}>
            Reload
          </button>
          <button class="icon-btn" onClick={dismissUpdate} aria-label="Dismiss">
            <Icon name="x" size={16} />
          </button>
        </div>
      </Show>
      <Show when={offlineReady()}>
        <div class="banner banner-update" role="status">
          <span>Omu is ready to work offline.</span>
          <button class="icon-btn" onClick={dismissOfflineReady} aria-label="Dismiss">
            <Icon name="x" size={16} />
          </button>
        </div>
      </Show>
    </>
  )
}
