import { A, useNavigate } from '@solidjs/router'
import { createResource, For, Show } from 'solid-js'
import { api } from '../lib/api.js'
import { isAuthed } from '../lib/auth.js'
import { canInstall, promptInstall } from '../lib/pwa.js'
import Icon from './Icon.jsx'
import UserRow from './UserRow.jsx'

export function SearchBox(props) {
  const navigate = useNavigate()
  const submit = (e) => {
    e.preventDefault()
    const q = new FormData(e.currentTarget).get('q').toString().trim()
    if (!q) return
    navigate(q.startsWith('#') && q.length > 1 ? `/tag/${encodeURIComponent(q.slice(1).toLowerCase())}` : `/search?q=${encodeURIComponent(q)}`)
  }
  return (
    <form class="searchbox" role="search" onSubmit={submit}>
      <Icon name="search" size={18} />
      <input name="q" type="search" placeholder={props.placeholder || 'Search Omu'} aria-label="Search" autocomplete="off" value={props.value || ''} />
    </form>
  )
}

// Right-hand column on wide screens: search, trends, who to follow.
export default function Aside() {
  const [trends] = createResource(async () => {
    try {
      return (await api.get('/hashtags/trending', { limit: 6 })).data
    } catch {
      return []
    }
  })
  const [suggestions] = createResource(isAuthed, async (authed) => {
    if (!authed) return []
    try {
      return (await api.get('/users/suggestions', { limit: 4 })).data
    } catch {
      return []
    }
  })

  return (
    <aside class="aside" aria-label="Discover">
      <SearchBox />

      <Show when={!isAuthed()}>
        <section class="card cta">
          <h2>Join Omu</h2>
          <p class="muted">Share a thought, follow people you like, and keep up with what's new.</p>
          <div class="cta-buttons">
            <A href="/register" class="btn btn-primary">
              Sign up
            </A>
            <A href="/login" class="btn btn-outline">
              Log in
            </A>
          </div>
        </section>
      </Show>

      <Show when={trends()?.length}>
        <section class="card">
          <h2>Trending this week</h2>
          <For each={trends()}>
            {(t) => (
              <A class="trend" href={`/tag/${encodeURIComponent(t.tag)}`}>
                <strong>#{t.tag}</strong>
                <span class="muted small">
                  {t.posts} {t.posts === 1 ? 'post' : 'posts'}
                </span>
              </A>
            )}
          </For>
        </section>
      </Show>

      <Show when={suggestions()?.length}>
        <section class="card">
          <h2>Who to follow</h2>
          <For each={suggestions()}>{(u) => <UserRow user={u} compact />}</For>
        </section>
      </Show>

      <Show when={canInstall()}>
        <section class="card">
          <h2>Install Omu</h2>
          <p class="muted">Add Omu to your home screen for a full-screen, app-like experience.</p>
          <button class="btn btn-outline" onClick={promptInstall}>
            <Icon name="download" size={18} /> Install app
          </button>
        </section>
      </Show>
    </aside>
  )
}
