import { A } from '@solidjs/router'
import { Show } from 'solid-js'
import { api } from '../lib/api.js'
import { timeAgo } from '../lib/format.js'
import { refreshUnread, setUnread } from '../lib/notifications.js'
import Avatar from '../components/Avatar.jsx'
import Feed from '../components/Feed.jsx'
import Icon from '../components/Icon.jsx'
import PageHeader from '../components/PageHeader.jsx'

const KINDS = {
  follow: { icon: 'user-plus', tone: 'lav', text: 'followed you' },
  like: { icon: 'heart', tone: 'pink', text: 'liked your post' },
  repost: { icon: 'repeat', tone: 'mint', text: 'reposted your post' },
  reply: { icon: 'message', tone: 'sky', text: 'replied to your post' },
  mention: { icon: 'at-sign', tone: 'butter', text: 'mentioned you' },
}

function Item(props) {
  const n = props.n
  const kind = KINDS[n.kind] || KINDS.mention
  const href = n.post_id ? `/post/${n.post_id}` : `/u/${n.actor.username}`
  return (
    <A href={href} class="notif" classList={{ unread: !n.read }}>
      <span class={`notif-icon tone-${kind.tone}`}>
        <Icon name={kind.icon} size={18} filled={n.kind === 'like'} />
      </span>
      <span class="notif-body">
        <span class="notif-who">
          <Avatar user={n.actor} size={30} />
          <time class="muted small" datetime={n.created_at}>
            {timeAgo(n.created_at)}
          </time>
        </span>
        <span>
          <strong>{n.actor.display_name}</strong> {kind.text}
        </span>
        <Show when={n.post_body}>
          <span class="notif-snippet muted">{n.post_body}</span>
        </Show>
      </span>
    </A>
  )
}

export default function Notifications() {
  // Items keep the read/unread state they were fetched with, so you can still see what's new
  // while the server (and the nav badge) mark everything read.
  const markRead = async (items) => {
    if (!items.some((n) => !n.read)) return
    try {
      await api.post('/notifications/read')
      setUnread(0)
    } catch {
      refreshUnread()
    }
  }

  return (
    <>
      <PageHeader title="Notifications" />
      <Feed
        load={(cursor) => api.get('/notifications', { cursor })}
        onLoaded={markRead}
        empty={{ title: 'Nothing yet', text: 'Likes, replies, follows and mentions will show up here.' }}
      >
        {(n) => <Item n={n} />}
      </Feed>
    </>
  )
}
