import { A, useParams } from '@solidjs/router'
import { createEffect, createResource, Match, on, Show, Switch } from 'solid-js'
import { api } from '../lib/api.js'
import { isAuthed } from '../lib/auth.js'
import { lastPosted } from '../lib/modal.js'
import Composer from '../components/Composer.jsx'
import EmptyState from '../components/EmptyState.jsx'
import PageHeader from '../components/PageHeader.jsx'
import PostCard from '../components/PostCard.jsx'
import PostFeed from '../components/PostFeed.jsx'
import Spinner from '../components/Spinner.jsx'

export default function PostPage() {
  const params = useParams()
  const [post] = createResource(() => params.id, (id) => api.get(`/posts/${id}`))
  const controller = {}

  // A reply written in the compose dialog should show up in this thread right away.
  createEffect(
    on(lastPosted, (p) => p && String(p.parent_id) === params.id && controller.append?.(p), { defer: true }),
  )

  return (
    <>
      <PageHeader title="Post" back />
      <Switch>
        <Match when={post.error}>
          <EmptyState title={post.error.status === 404 ? 'Post not found' : 'Could not load this post'} text={post.error.status === 404 ? 'It may have been deleted.' : post.error.message}>
            <A href="/explore" class="btn btn-outline">
              Back to Explore
            </A>
          </EmptyState>
        </Match>
        <Match when={post.loading}>
          <Spinner />
        </Match>
        <Match when={post()}>
          {/* keyed by id so navigating between posts rebuilds the card */}
          <Show when={post().id} keyed>
            {() => (
              <>
                <PostCard post={post()} detail />
                <Show
                  when={isAuthed()}
                  fallback={
                    <p class="notice">
                      <A href="/login">Log in</A> to join the conversation.
                    </p>
                  }
                >
                  <Composer parent={post()} placeholder="Post your reply" label="Reply" />
                </Show>
                <PostFeed
                  controller={controller}
                  deps={() => params.id}
                  load={(cursor) => api.get(`/posts/${params.id}/replies`, { cursor })}
                  empty={{ title: 'No replies yet', text: 'Start the conversation.' }}
                />
              </>
            )}
          </Show>
        </Match>
      </Switch>
    </>
  )
}
