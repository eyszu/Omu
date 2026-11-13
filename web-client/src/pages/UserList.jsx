import { useParams } from '@solidjs/router'
import { api } from '../lib/api.js'
import Feed from '../components/Feed.jsx'
import PageHeader from '../components/PageHeader.jsx'
import UserRow from '../components/UserRow.jsx'

// /u/:username/followers and /u/:username/following
export default function UserList(props) {
  const params = useParams()
  const kind = () => props.kind
  return (
    <>
      <PageHeader title={kind() === 'followers' ? 'Followers' : 'Following'} subtitle={`@${params.username}`} back />
      <Feed
        deps={() => `${params.username}:${kind()}`}
        load={(cursor) => api.get(`/users/${params.username}/${kind()}`, { cursor })}
        empty={{ title: kind() === 'followers' ? 'No followers yet' : 'Not following anyone yet' }}
      >
        {(u) => <UserRow user={u} />}
      </Feed>
    </>
  )
}
