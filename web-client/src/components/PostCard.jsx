import { A, useNavigate } from '@solidjs/router'
import { createSignal, Show } from 'solid-js'
import { api } from '../lib/api.js'
import { isAuthed, user } from '../lib/auth.js'
import { compact, fullDate, timeAgo } from '../lib/format.js'
import { openCompose } from '../lib/modal.js'
import { toast } from '../lib/toast.js'
import Avatar from './Avatar.jsx'
import Icon from './Icon.jsx'
import RichText from './RichText.jsx'

// props: post, onRemove(post), detail (large variant used on the post page)
export default function PostCard(props) {
  const navigate = useNavigate()
  const [p, setP] = createSignal(props.post)
  const mine = () => user()?.id === p().author.id

  const requireLogin = () => {
    if (isAuthed()) return false
    navigate('/login')
    return true
  }

  // Only counters and viewer flags change after an action. Keep entry_id / reposted_by as they are.
  const merge = (fresh) =>
    setP((cur) => ({
      ...cur,
      like_count: fresh.like_count,
      liked: fresh.liked,
      repost_count: fresh.repost_count,
      reposted: fresh.reposted,
      bookmarked: fresh.bookmarked,
      reply_count: fresh.reply_count,
    }))

  // Optimistic toggle: flip locally, call the API, roll back if it fails.
  const toggle = async (flag, countKey, path) => {
    if (requireLogin()) return
    const before = p()
    const on = !before[flag]
    setP({ ...before, [flag]: on, ...(countKey ? { [countKey]: before[countKey] + (on ? 1 : -1) } : {}) })
    try {
      const fresh = on ? await api.post(path) : await api.del(path)
      merge(fresh)
      if (!on && flag === 'reposted' && before.reposted_by === user()?.username) props.onRemove?.(props.post)
      if (!on && flag === 'bookmarked' && props.removeOnUnbookmark) props.onRemove?.(props.post)
    } catch (err) {
      setP(before)
      toast(err.message, 'error')
    }
  }

  const like = () => toggle('liked', 'like_count', `/posts/${p().id}/like`)
  const repost = () => toggle('reposted', 'repost_count', `/posts/${p().id}/repost`)
  const bookmark = () => toggle('bookmarked', null, `/posts/${p().id}/bookmark`)

  const reply = () => {
    if (requireLogin()) return
    openCompose({ parent: p(), onPosted: () => setP((c) => ({ ...c, reply_count: c.reply_count + 1 })) })
  }

  const remove = async () => {
    if (!window.confirm('Delete this post? Its replies will be deleted too.')) return
    try {
      await api.del(`/posts/${p().id}`)
      toast('Post deleted', 'success')
      props.onRemove?.(props.post)
      if (props.detail) navigate('/')
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const open = (e) => {
    if (props.detail || e.target.closest('a, button, textarea, input')) return
    if (window.getSelection()?.toString()) return // the user is selecting text
    navigate(`/post/${p().id}`)
  }

  return (
    <article class="post" classList={{ 'post-detail': props.detail, 'post-clickable': !props.detail }} onClick={open}>
      <Show when={p().reposted_by}>
        <div class="post-context">
          <Icon name="repeat" size={14} />
          <A href={`/u/${p().reposted_by}`}>{p().reposted_by === user()?.username ? 'You' : `@${p().reposted_by}`} reposted</A>
        </div>
      </Show>
      <Show when={p().parent_id && !props.detail}>
        <div class="post-context">
          <Icon name="message" size={14} />
          <A href={`/post/${p().parent_id}`}>Replying to a post</A>
        </div>
      </Show>
      <div class="post-row">
        <A href={`/u/${p().author.username}`} class="post-avatar" aria-label={`${p().author.display_name}'s profile`}>
          <Avatar user={p().author} size={props.detail ? 52 : 46} />
        </A>
        <div class="post-main">
          <div class="post-head">
            <A href={`/u/${p().author.username}`} class="post-name">
              {p().author.display_name}
            </A>
            <span class="muted post-handle">@{p().author.username}</span>
            <Show when={!props.detail}>
              <span class="muted">·</span>
              <time class="muted" datetime={p().created_at} title={fullDate(p().created_at)}>
                {timeAgo(p().created_at)}
              </time>
            </Show>
            <Show when={mine()}>
              <button class="icon-btn post-delete" onClick={remove} aria-label="Delete post" title="Delete">
                <Icon name="trash" size={16} />
              </button>
            </Show>
          </div>
          <p class="post-body">
            <RichText text={p().body} />
          </p>
          <Show when={props.detail}>
            <time class="muted small post-full-date" datetime={p().created_at}>
              {fullDate(p().created_at)}
            </time>
          </Show>
          <div class="post-actions">
            <button class="act act-reply" onClick={reply} aria-label={`Reply, ${p().reply_count} replies`}>
              <Icon name="message" size={18} />
              <span>{compact(p().reply_count)}</span>
            </button>
            <button
              class="act act-repost"
              classList={{ on: p().reposted }}
              onClick={repost}
              aria-pressed={p().reposted}
              aria-label={`Repost, ${p().repost_count} reposts`}
            >
              <Icon name="repeat" size={18} />
              <span>{compact(p().repost_count)}</span>
            </button>
            <button
              class="act act-like"
              classList={{ on: p().liked }}
              onClick={like}
              aria-pressed={p().liked}
              aria-label={`Like, ${p().like_count} likes`}
            >
              <Icon name="heart" size={18} filled={p().liked} />
              <span>{compact(p().like_count)}</span>
            </button>
            <button
              class="act act-bookmark"
              classList={{ on: p().bookmarked }}
              onClick={bookmark}
              aria-pressed={p().bookmarked}
              aria-label="Bookmark"
            >
              <Icon name="bookmark" size={18} filled={p().bookmarked} />
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
