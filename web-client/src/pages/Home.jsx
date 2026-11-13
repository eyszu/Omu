import { A } from '@solidjs/router'
import { createEffect, on } from 'solid-js'
import { api } from '../lib/api.js'
import { lastPosted } from '../lib/modal.js'
import Composer from '../components/Composer.jsx'
import PageHeader from '../components/PageHeader.jsx'
import PostFeed from '../components/PostFeed.jsx'

export default function Home() {
  const controller = {}
  // Anything the user publishes (here or from the compose dialog) appears at the top.
  createEffect(on(lastPosted, (post) => post && !post.parent_id && controller.prepend?.(post), { defer: true }))

  return (
    <>
      <PageHeader title="Home" />
      <Composer />
      <PostFeed
        controller={controller}
        load={(cursor) => api.get('/timeline/home', { cursor })}
        empty={{
          title: 'Your timeline is quiet',
          text: 'Post something, or follow a few people to fill this up.',
          children: (
            <A href="/explore" class="btn btn-primary">
              Explore Omu
            </A>
          ),
        }}
      />
    </>
  )
}
