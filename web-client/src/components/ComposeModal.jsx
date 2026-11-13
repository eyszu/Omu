import { createEffect, onCleanup, Show } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { closeCompose, composeState } from '../lib/modal.js'
import { toast } from '../lib/toast.js'
import Avatar from './Avatar.jsx'
import Composer from './Composer.jsx'
import Icon from './Icon.jsx'
import RichText from './RichText.jsx'

export default function ComposeModal() {
  const navigate = useNavigate()

  createEffect(() => {
    if (!composeState()) return
    const onKey = (e) => e.key === 'Escape' && closeCompose()
    document.addEventListener('keydown', onKey)
    document.body.classList.add('no-scroll')
    onCleanup(() => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('no-scroll')
    })
  })

  return (
    <Show when={composeState()}>
      {(state) => (
        <div class="modal-backdrop" onClick={(e) => e.target === e.currentTarget && closeCompose()}>
          <div class="modal" role="dialog" aria-modal="true" aria-label={state().parent ? 'Reply' : 'New post'}>
            <div class="modal-head">
              <button class="icon-btn" onClick={closeCompose} aria-label="Close">
                <Icon name="x" />
              </button>
            </div>
            <Show when={state().parent}>
              <div class="modal-parent">
                <Avatar user={state().parent.author} size={40} />
                <div>
                  <strong>{state().parent.author.display_name}</strong> <span class="muted">@{state().parent.author.username}</span>
                  <p>
                    <RichText text={state().parent.body} />
                  </p>
                </div>
              </div>
            </Show>
            <Composer
              autofocus
              parent={state().parent}
              placeholder={state().parent ? 'Post your reply' : "What's on your mind?"}
              label={state().parent ? 'Reply' : 'Post'}
              onPosted={(post) => {
                state().onPosted?.(post)
                closeCompose()
                toast('Posted! Tap to view.', 'success', 4500, () => navigate(`/post/${post.id}`))
              }}
            />
          </div>
        </div>
      )}
    </Show>
  )
}
