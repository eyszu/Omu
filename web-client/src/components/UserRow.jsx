import { A } from '@solidjs/router'
import { createSignal, Show } from 'solid-js'
import Avatar from './Avatar.jsx'
import FollowButton from './FollowButton.jsx'

export default function UserRow(props) {
  const [u, setU] = createSignal(props.user)
  return (
    <div class="user-row">
      <A href={`/u/${u().username}`} class="user-row-link">
        <Avatar user={u()} size={46} />
        <span class="user-row-text">
          <strong>{u().display_name}</strong>
          <span class="muted">@{u().username}</span>
          <Show when={u().bio && !props.compact}>
            <span class="bio">{u().bio}</span>
          </Show>
        </span>
      </A>
      <FollowButton user={u()} small onChange={setU} />
    </div>
  )
}
