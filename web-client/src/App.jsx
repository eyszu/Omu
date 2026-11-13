import { Navigate, Route, Router, useLocation } from '@solidjs/router'
import { lazy, Show } from 'solid-js'
import { isAuthed } from './lib/auth.js'
import Layout from './components/Layout.jsx'

// Each screen is its own chunk, so the first load stays small.
const Home = lazy(() => import('./pages/Home.jsx'))
const Explore = lazy(() => import('./pages/Explore.jsx'))
const Login = lazy(() => import('./pages/Login.jsx'))
const Register = lazy(() => import('./pages/Register.jsx'))
const PostPage = lazy(() => import('./pages/PostPage.jsx'))
const Profile = lazy(() => import('./pages/Profile.jsx'))
const UserList = lazy(() => import('./pages/UserList.jsx'))
const Search = lazy(() => import('./pages/Search.jsx'))
const Tag = lazy(() => import('./pages/Tag.jsx'))
const Notifications = lazy(() => import('./pages/Notifications.jsx'))
const Bookmarks = lazy(() => import('./pages/Bookmarks.jsx'))
const Settings = lazy(() => import('./pages/Settings.jsx'))
const NotFound = lazy(() => import('./pages/NotFound.jsx'))

function RequireAuth(props) {
  const location = useLocation()
  return (
    <Show when={isAuthed()} fallback={<Navigate href={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} />}>
      {props.children}
    </Show>
  )
}

const priv = (Page, extra = {}) => () => (
  <RequireAuth>
    <Page {...extra} />
  </RequireAuth>
)

// "/" is the home timeline when signed in, otherwise the public Explore feed.
const Root = () => (
  <Show when={isAuthed()} fallback={<Navigate href="/explore" />}>
    <Home />
  </Show>
)

export default function App() {
  return (
    <Router root={Layout}>
      <Route path="/" component={Root} />
      <Route path="/explore" component={Explore} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/search" component={Search} />
      <Route path="/tag/:tag" component={Tag} />
      <Route path="/post/:id" component={PostPage} />
      <Route path="/u/:username" component={Profile} />
      <Route path="/u/:username/followers" component={() => <UserList kind="followers" />} />
      <Route path="/u/:username/following" component={() => <UserList kind="following" />} />
      <Route path="/notifications" component={priv(Notifications)} />
      <Route path="/bookmarks" component={priv(Bookmarks)} />
      <Route path="/settings" component={priv(Settings)} />
      <Route path="*404" component={NotFound} />
    </Router>
  )
}
