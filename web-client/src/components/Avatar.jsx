import { createSignal, Show } from 'solid-js'
import { hueFor } from '../lib/format.js'

// Shows the user's picture, or a pastel circle with their initial.
// Accepts anything with { username, display_name, avatar_url }.
export default function Avatar(props) {
  const [broken, setBroken] = createSignal(false)
  const name = () => props.user.display_name || props.user.username || '?'
  const hue = () => hueFor(props.user.username || name())
  const size = () => props.size || 44

  return (
    <span
      class="avatar"
      style={{
        width: `${size()}px`,
        height: `${size()}px`,
        'font-size': `${Math.round(size() * 0.42)}px`,
        background: `hsl(${hue()} 85% 88%)`,
        color: `hsl(${hue()} 35% 30%)`,
      }}
      aria-hidden="true"
    >
      <Show when={props.user.avatar_url && !broken()} fallback={name().trim().charAt(0).toUpperCase()}>
        <img src={props.user.avatar_url} alt="" loading="lazy" onError={() => setBroken(true)} />
      </Show>
    </span>
  )
}
