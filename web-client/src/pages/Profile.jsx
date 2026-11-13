import { A, useParams } from '@solidjs/router'
import { createEffect, createResource, createSignal, Match, on, Show, Switch } from 'solid-js'
import { api } from '../lib/api.js'
import { user } from '../lib/auth.js'
import { compact, hueFor, joinedDate } from '../lib/format.js'
import Avatar from '../components/Avatar.jsx'
import EmptyState from '../components/EmptyState.jsx'
import FollowButton from '../components/FollowButton.jsx'
import PageHeader from '../components/PageHeader.jsx'
import PostFeed from '../components/PostFeed.jsx'
import Spinner from '../components/Spinner.jsx'

const TABS = [
  { id: 'posts', label: 'Posts' },
  { id: 'replies', label: 'Posts & replies' },
  { id: 'likes', label: 'Likes' },
]

export default function Profile() {
  const params = useParams()
  const [tab, setTab] = createSignal('posts')
  const [profile, { mutate }] = createResource(() => params.username, (name) => api.get(`/users/${name}`))
  createEffect(on(() => params.username, () => setTab('posts'), { defer: true }))

  const isMe = () => user()?.username?.toLowerCase() === params.username.toLowerCase()
  const load = (cursor) => {
    const name = params.username
    if (tab() === 'likes') return api.get(`/users/${name}/likes`, { cursor })
    return api.get(`/users/${name}/posts`, { cursor, replies: tab() === 'replies' ? 'true' : undefined })
  }

  return (
    <Switch>
      <Match when={profile.error}>
        <PageHeader title="Profile" back />
        <EmptyState
          title={profile.error.status === 404 ? 'This account does not exist' : 'Could not load this profile'}
          text={profile.error.status === 404 ? `Nobody is using @${params.username} yet.` : profile.error.message}
        />
      </Match>
      <Match when={profile.loading && !profile()}>
        <PageHeader title="Profile" back />
        <Spinner />
      </Match>
      <Match when={profile()}>
        <PageHeader title={profile().display_name} subtitle={`${compact(profile().posts_count)} posts`} back />
        <section class="profile">
          <div class="profile-banner" style={{ '--h': hueFor(profile().username) }} />
          <div class="profile-top">
            <div class="profile-avatar">
              <Avatar user={profile()} size={96} />
            </div>
            <div class="profile-actions">
              <Show when={isMe()} fallback={<FollowButton user={profile()} onChange={mutate} />}>
                <A href="/settings" class="btn btn-outline">
                  Edit profile
                </A>
                <A href="/bookmarks" class="btn btn-outline hide-desktop">
                  Bookmarks
                </A>
              </Show>
            </div>
          </div>
          <div class="profile-info">
            <h2>{profile().display_name}</h2>
            <div class="muted">
              @{profile().username}
              <Show when={profile().follows_you}>
                <span class="chip">Follows you</span>
              </Show>
            </div>
            <Show when={profile().bio}>
              <p class="profile-bio">{profile().bio}</p>
            </Show>
            <p class="muted small">Joined {joinedDate(profile().created_at)}</p>
            <p class="profile-counts">
              <A href={`/u/${profile().username}/following`}>
                <strong>{compact(profile().following_count)}</strong> <span class="muted">Following</span>
              </A>
              <A href={`/u/${profile().username}/followers`}>
                <strong>{compact(profile().followers_count)}</strong> <span class="muted">Followers</span>
              </A>
            </p>
          </div>
        </section>

        <div class="tabs" role="tablist">
          {TABS.map((t) => (
            <button role="tab" class="tab" classList={{ active: tab() === t.id }} aria-selected={tab() === t.id} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <PostFeed
          deps={() => `${params.username}:${tab()}`}
          load={load}
          empty={{
            title: tab() === 'likes' ? 'No likes yet' : 'No posts yet',
            text: isMe() ? 'When you post, it will show up here.' : `@${params.username} has nothing here yet.`,
          }}
        />
      </Match>
    </Switch>
  )
}
