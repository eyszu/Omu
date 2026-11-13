import { useParams } from '@solidjs/router'
import { api } from '../lib/api.js'
import PageHeader from '../components/PageHeader.jsx'
import PostFeed from '../components/PostFeed.jsx'

export default function Tag() {
  const params = useParams()
  return (
    <>
      <PageHeader title={`#${decodeURIComponent(params.tag)}`} subtitle="Posts with this hashtag" back />
      <PostFeed
        deps={() => params.tag}
        load={(cursor) => api.get(`/hashtags/${encodeURIComponent(params.tag)}/posts`, { cursor })}
        empty={{ title: 'No posts with this tag yet', text: 'Write one and it will appear here.' }}
      />
    </>
  )
}
