import { Show } from 'solid-js'

export default function EmptyState(props) {
  return (
    <div class="empty">
      <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden="true">
        <circle cx="48" cy="48" r="40" fill="var(--lav-soft)" />
        <circle cx="34" cy="40" r="14" fill="var(--pink-soft)" />
        <circle cx="62" cy="58" r="16" fill="var(--mint-soft)" />
        <circle cx="58" cy="32" r="8" fill="var(--butter-soft)" />
        <circle cx="48" cy="48" r="5" fill="none" stroke="var(--lav-ink)" stroke-width="3" />
      </svg>
      <h2>{props.title}</h2>
      <Show when={props.text}>
        <p class="muted">{props.text}</p>
      </Show>
      {props.children}
    </div>
  )
}
