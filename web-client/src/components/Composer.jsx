import { createSignal, onMount, Show } from 'solid-js'
import { api } from '../lib/api.js'
import { user } from '../lib/auth.js'
import { announcePosted } from '../lib/modal.js'
import { toast } from '../lib/toast.js'
import Avatar from './Avatar.jsx'

const MAX = 280
const RING = 2 * Math.PI * 10

// props: parent (post being replied to), placeholder, autofocus, onPosted(post), label
export default function Composer(props) {
  const [text, setText] = createSignal('')
  const [busy, setBusy] = createSignal(false)
  let area

  // The API counts characters, not UTF-16 units, so emoji count once.
  const length = () => [...text()].length
  const remaining = () => MAX - length()
  const canPost = () => !busy() && text().trim().length > 0 && remaining() >= 0

  onMount(() => props.autofocus && area?.focus())

  const grow = () => {
    area.style.height = 'auto'
    area.style.height = `${Math.min(area.scrollHeight, 320)}px`
  }

  const submit = async () => {
    if (!canPost()) return
    setBusy(true)
    try {
      const post = await api.post('/posts', { body: text().trim(), parent_id: props.parent?.id })
      setText('')
      area.style.height = 'auto'
      announcePosted(post)
      props.onPosted?.(post)
    } catch (err) {
      toast(err.fields?.body ? `Post ${err.fields.body}` : err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div class="composer">
      <Avatar user={user()} size={44} />
      <div class="composer-main">
        <textarea
          ref={area}
          rows="2"
          value={text()}
          placeholder={props.placeholder || "What's on your mind?"}
          aria-label={props.placeholder || 'Write a post'}
          onInput={(e) => {
            setText(e.currentTarget.value)
            grow()
          }}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit()
          }}
        />
        <div class="composer-bar">
          <span class="muted small hide-mobile">Ctrl + Enter to post</span>
          <span class="composer-spacer" />
          <Show when={length() > 0}>
            <span class="counter" classList={{ over: remaining() < 0, near: remaining() <= 20 }} title={`${remaining()} characters left`}>
              <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
                <circle cx="13" cy="13" r="10" fill="none" stroke="var(--border)" stroke-width="3" />
                <circle
                  cx="13"
                  cy="13"
                  r="10"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-dasharray={RING}
                  stroke-dashoffset={RING * (1 - Math.min(length() / MAX, 1))}
                  transform="rotate(-90 13 13)"
                />
              </svg>
              <Show when={remaining() <= 20}>
                <span class="counter-num">{remaining()}</span>
              </Show>
            </span>
          </Show>
          <button class="btn btn-primary" disabled={!canPost()} onClick={submit}>
            {busy() ? 'Posting…' : props.label || 'Post'}
          </button>
        </div>
      </div>
    </div>
  )
}
