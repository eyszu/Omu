import { A, Navigate, useSearchParams } from '@solidjs/router'
import { createSignal, Show } from 'solid-js'
import { isAuthed, login } from '../lib/auth.js'

// Only allow same-site relative redirects.
export const safeNext = (next) => (typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : '/')

export default function Login() {
  const [params] = useSearchParams()
  const [error, setError] = createSignal('')
  const [busy, setBusy] = createSignal(false)

  const submit = async (e) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setBusy(true)
    setError('')
    try {
      await login(form.get('login').toString(), form.get('password').toString())
      // Once the session exists, the <Navigate> below takes over.
    } catch (err) {
      setError(err.status === 401 ? 'That username or password is not right.' : err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Show when={!isAuthed()} fallback={<Navigate href={safeNext(params.next)} />}>
      <div class="auth-card">
        <img src="/favicon.svg" alt="" width="64" height="64" />
        <h1>Welcome back</h1>
        <p class="muted">Log in to see what's new.</p>
        <form onSubmit={submit}>
          <label class="field">
            <span>Username or email</span>
            <input name="login" autocomplete="username" required autofocus />
          </label>
          <label class="field">
            <span>Password</span>
            <input name="password" type="password" autocomplete="current-password" required />
          </label>
          <Show when={error()}>
            <p class="form-error" role="alert">
              {error()}
            </p>
          </Show>
          <button class="btn btn-primary btn-block" disabled={busy()}>
            {busy() ? 'Logging in…' : 'Log in'}
          </button>
        </form>
        <p class="muted small">
          New here? <A href="/register">Create an account</A> · <A href="/explore">Just browse</A>
        </p>
      </div>
    </Show>
  )
}
