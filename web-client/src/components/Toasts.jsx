import { For } from 'solid-js'
import { toasts, dismiss } from '../lib/toast.js'

export default function Toasts() {
  return (
    <div class="toasts" aria-live="polite">
      <For each={toasts()}>
        {(t) => (
          <button
            class={`toast toast-${t.kind}`}
            onClick={() => {
              t.onClick?.()
              dismiss(t.id)
            }}
          >
            {t.message}
          </button>
        )}
      </For>
    </div>
  )
}
