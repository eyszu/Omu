import { api } from '../lib/api.js'
import PageHeader from '../components/PageHeader.jsx'
import PostFeed from '../components/PostFeed.jsx'

export default function Bookmarks() {
  return (
    <>
      <PageHeader title="Bookmarks" subtitle="Only you can see these" />
      <PostFeed
        removeOnUnbookmark
        load={(cursor) => api.get('/bookmarks', { cursor })}
        empty={{ title: 'No bookmarks yet', text: 'Tap the ribbon on a post to save it for later.' }}
      />
    </>
  )
}
