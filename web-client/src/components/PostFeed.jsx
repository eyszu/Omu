import Feed from './Feed.jsx'
import PostCard from './PostCard.jsx'

// A Feed whose items are posts.
export default function PostFeed(props) {
  return (
    <Feed load={props.load} deps={props.deps} controller={props.controller} empty={props.empty} onLoaded={props.onLoaded}>
      {(post, { remove }) => <PostCard post={post} onRemove={remove} removeOnUnbookmark={props.removeOnUnbookmark} />}
    </Feed>
  )
}
