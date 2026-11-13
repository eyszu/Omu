import { A, useLocation } from '@solidjs/router'
import { createEffect, onCleanup, Show, Suspense } from 'solid-js'
import { isAuthed, user } from '../lib/auth.js'
import { openCompose } from '../lib/modal.js'
import { refreshUnread, setUnread, unread } from '../lib/notifications.js'
import { setTheme, theme } from '../lib/theme.js'
import Aside from './Aside.jsx'
import Avatar from './Avatar.jsx'
import ComposeModal from './ComposeModal.jsx'
import Icon from './Icon.jsx'
import PwaBanners from './PwaBanners.jsx'
import Spinner from './Spinner.jsx'
import Toasts from './Toasts.jsx'

function Logo() {
  return (
    <A href={isAuthed() ? '/' : '/explore'} class="logo" aria-label="Omu home">
      <img src="/favicon.svg" alt="" width="34" height="34" />
      <span>omu</span>
    </A>
  )
}

function NavItem(props) {
  const location = useLocation()
  const active = () => (props.match ? props.match(location.pathname) : location.pathname === props.href)
  return (
    <A href={props.href} class="nav-item" classList={{ active: active() }} aria-current={active() ? 'page' : undefined}>
      <span class="nav-icon">
        <Icon name={props.icon} size={24} filled={false} />
        <Show when={props.badge > 0}>
          <span class="badge" aria-label={`${props.badge} unread`}>
            {props.badge > 99 ? '99+' : props.badge}
          </span>
        </Show>
      </span>
      <span class="nav-label">{props.label}</span>
    </A>
  )
}

function ThemeButton() {
  // Cycles auto -> light -> dark
  const next = () => setTheme({ auto: 'light', light: 'dark', dark: 'auto' }[theme()])
  const label = () => ({ auto: 'Theme: automatic', light: 'Theme: light', dark: 'Theme: dark' })[theme()]
  return (
    <button class="icon-btn" onClick={next} aria-label={label()} title={label()}>
      <Icon name={theme() === 'dark' ? 'moon' : 'sun'} />
      <Show when={theme() === 'auto'}>
        <span class="auto-dot" />
      </Show>
    </button>
  )
}

export default function Layout(props) {
  const location = useLocation()
  const me = () => user()?.username

  // Keep the unread badge fresh: on sign-in, when the tab regains focus, and every minute.
  createEffect(() => {
    if (!isAuthed()) return setUnread(0)
    refreshUnread()
    const tick = setInterval(() => document.visibilityState === 'visible' && refreshUnread(), 60_000)
    const onVisible = () => document.visibilityState === 'visible' && refreshUnread()
    document.addEventListener('visibilitychange', onVisible)
    onCleanup(() => {
      clearInterval(tick)
      document.removeEventListener('visibilitychange', onVisible)
    })
  })

  const authPage = () => ['/login', '/register'].includes(location.pathname)

  return (
    <>
      <PwaBanners />
      <Show
        when={!authPage()}
        fallback={
          <main class="auth-shell">
            <Suspense fallback={<Spinner />}>{props.children}</Suspense>
          </main>
        }
      >
        <div class="shell">
          <nav class="sidebar" aria-label="Main">
            <Logo />
            <div class="nav-list">
              <Show when={isAuthed()}>
                <NavItem href="/" icon="home" label="Home" />
              </Show>
              <NavItem href="/explore" icon="compass" label="Explore" />
              <NavItem href="/search" icon="search" label="Search" match={(p) => p.startsWith('/search') || p.startsWith('/tag/')} />
              <Show when={isAuthed()}>
                <NavItem href="/notifications" icon="bell" label="Notifications" badge={unread()} />
                <NavItem href="/bookmarks" icon="bookmark" label="Bookmarks" />
                <NavItem href={`/u/${me()}`} icon="user" label="Profile" match={(p) => p.toLowerCase().startsWith(`/u/${me()?.toLowerCase()}`)} />
                <NavItem href="/settings" icon="settings" label="Settings" />
              </Show>
            </div>
            <Show
              when={isAuthed()}
              fallback={
                <A href="/login" class="btn btn-primary nav-cta">
                  Log in
                </A>
              }
            >
              <button class="btn btn-primary nav-cta" onClick={() => openCompose()}>
                <Icon name="plus" size={20} />
                <span class="nav-label">Post</span>
              </button>
              <A href={`/u/${me()}`} class="me-chip">
                <Avatar user={user()} size={40} />
                <span class="nav-label me-text">
                  <strong>{user()?.display_name}</strong>
                  <span class="muted">@{me()}</span>
                </span>
              </A>
            </Show>
          </nav>

          <div class="column">
            <div class="topbar">
              <Logo />
              <span class="spacer" />
              <ThemeButton />
              <Show when={!isAuthed()}>
                <A href="/login" class="btn btn-primary btn-sm">
                  Log in
                </A>
              </Show>
            </div>
            <main class="main">
              <Suspense fallback={<Spinner />}>{props.children}</Suspense>
            </main>
          </div>

          <div class="right">
            <div class="theme-row">
              <ThemeButton />
            </div>
            <Aside />
          </div>
        </div>

        <nav class="bottom-nav" aria-label="Main">
          <Show when={isAuthed()}>
            <NavItem href="/" icon="home" label="Home" />
          </Show>
          <NavItem href="/explore" icon="compass" label="Explore" />
          <NavItem href="/search" icon="search" label="Search" match={(p) => p.startsWith('/search') || p.startsWith('/tag/')} />
          <Show when={isAuthed()}>
            <NavItem href="/notifications" icon="bell" label="Alerts" badge={unread()} />
            <NavItem href={`/u/${me()}`} icon="user" label="Me" match={(p) => p.toLowerCase().startsWith(`/u/${me()?.toLowerCase()}`) || p === '/settings' || p === '/bookmarks'} />
          </Show>
          <Show when={!isAuthed()}>
            <NavItem href="/login" icon="user" label="Log in" />
          </Show>
        </nav>

        <Show when={isAuthed()}>
          <button class="fab" onClick={() => openCompose()} aria-label="New post">
            <Icon name="plus" size={26} />
          </button>
        </Show>
      </Show>

      <ComposeModal />
      <Toasts />
    </>
  )
}
