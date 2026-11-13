import { A } from '@solidjs/router'
import { Show } from 'solid-js'
import { api } from '../lib/api.js'
import { isAuthed } from '../lib/auth.js'
import PageHeader from '../components/PageHeader.jsx'
import PostFeed from '../components/PostFeed.jsx'

export default function Explore() {
  return (
    <>
      <PageHeader title="Explore" subtitle="Everything people are saying" />
      <Show when={!isAuthed()}>
        <section class="hero">
          <h2>Say something soft, loud, or silly.</h2>
          <p>Omu is a small, friendly place to share thoughts in 280 characters.</p>
          <div class="cta-buttons">
            <A href="/register" class="btn btn-primary">
              Create an account
            </A>
            <A href="/login" class="btn btn-outline">
              Log in
            </A>
          </div>
        </section>
      </Show>
      <PostFeed
        load={(cursor) => api.get('/timeline/explore', { cursor })}
        empty={{ title: 'No posts yet', text: 'Be the first to say hello.' }}
      />
    </>
  )
}
