import { createSignal, Show } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { api } from '../lib/api.js'
import { isAuthed, user } from '../lib/auth.js'
import { toast } from '../lib/toast.js'

// props.user: a profile object. props.onChange(updatedProfile) lets the parent refresh counts.
export default function FollowButton(props) {
  const navigate = useNavigate()
  const [busy, setBusy] = createSignal(false)
  const [hover, setHover] = createSignal(false)

  const toggle = async (e) => {
    e.stopPropagation()
    if (!isAuthed()) return navigate('/login')
    if (busy()) return
    setBusy(true)
    try {
      const path = `/users/${props.user.username}/follow`
      const updated = props.user.following ? await api.del(path) : await api.post(path)
      props.onChange?.(updated)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Show when={user()?.username?.toLowerCase() !== props.user.username.toLowerCase()}>
      <button
        class={props.user.following ? 'btn btn-outline' : 'btn btn-primary'}
        classList={{ 'btn-sm': props.small }}
        onClick={toggle}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        disabled={busy()}
        aria-pressed={props.user.following}
      >
        {props.user.following ? (hover() ? 'Unfollow' : 'Following') : 'Follow'}
      </button>
    </Show>
  )
}
