import { useNavigate, useSearchParams } from '@solidjs/router'
import { createResource, For, Match, Show, Switch } from 'solid-js'
import { A } from '@solidjs/router'
import { api } from '../lib/api.js'
import EmptyState from '../components/EmptyState.jsx'
import Feed from '../components/Feed.jsx'
import Icon from '../components/Icon.jsx'
import PageHeader from '../components/PageHeader.jsx'
import PostFeed from '../components/PostFeed.jsx'
import UserRow from '../components/UserRow.jsx'

export default function Search() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const q = () => (params.q || '').toString().trim()
  const tab = () => (params.tab === 'people' ? 'people' : 'posts')
  const [trends] = createResource(async () => {
    try {
      return (await api.get('/hashtags/trending', { limit: 12 })).data
    } catch {
      return []
    }
  })

  const submit = (e) => {
    e.preventDefault()
    const value = new FormData(e.currentTarget).get('q').toString().trim()
    if (!value) return setParams({ q: undefined })
    if (value.startsWith('#') && value.length > 1) return navigate(`/tag/${encodeURIComponent(value.slice(1).toLowerCase())}`)
    setParams({ q: value })
  }

  return (
    <>
      <PageHeader title="Search" />
      <form class="searchbox searchbox-page" role="search" onSubmit={submit}>
        <Icon name="search" size={18} />
        <input name="q" type="search" placeholder="Search posts, people or #tags" aria-label="Search" value={q()} autocomplete="off" autofocus />
        <button class="btn btn-primary btn-sm">Search</button>
      </form>

      <Show
        when={q()}
        fallback={
          <div class="search-home">
            <Show when={trends()?.length}>
              <h2>Trending hashtags</h2>
              <div class="tag-cloud">
                <For each={trends()}>
                  {(t) => (
                    <A class="chip chip-link" href={`/tag/${encodeURIComponent(t.tag)}`}>
                      #{t.tag} <span class="muted">{t.posts}</span>
                    </A>
                  )}
                </For>
              </div>
            </Show>
            <EmptyState title="Find something nice" text="Search for words in posts, people by name, or jump to a #hashtag." />
          </div>
        }
      >
        <div class="tabs" role="tablist">
          <button role="tab" class="tab" classList={{ active: tab() === 'posts' }} aria-selected={tab() === 'posts'} onClick={() => setParams({ tab: undefined })}>
            Posts
          </button>
          <button role="tab" class="tab" classList={{ active: tab() === 'people' }} aria-selected={tab() === 'people'} onClick={() => setParams({ tab: 'people' })}>
            People
          </button>
        </div>
        <Switch>
          <Match when={tab() === 'posts'}>
            <PostFeed
              deps={() => q()}
              load={(cursor) => api.get('/search/posts', { q: q(), cursor })}
              empty={{ title: 'No posts found', text: `Nothing matched “${q()}”.` }}
            />
          </Match>
          <Match when={tab() === 'people'}>
            <Feed
              deps={() => q()}
              // The user search endpoint is not paginated, so wrap it in a single page.
              load={async () => ({ data: (await api.get('/users', { q: q(), limit: 30 })).data, next_cursor: null })}
              empty={{ title: 'No people found', text: `Nobody matched “${q()}”.` }}
            >
              {(u) => <UserRow user={u} />}
            </Feed>
          </Match>
        </Switch>
      </Show>
    </>
  )
}
