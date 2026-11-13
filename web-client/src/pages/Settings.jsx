import { createSignal, Show } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { api } from '../lib/api.js'
import { logout, setCurrentUser, user } from '../lib/auth.js'
import { canInstall, installed, promptInstall } from '../lib/pwa.js'
import { setTheme, theme } from '../lib/theme.js'
import { toast } from '../lib/toast.js'
import Icon from '../components/Icon.jsx'
import PageHeader from '../components/PageHeader.jsx'

function ProfileForm() {
  const me = user()
  const [bio, setBio] = createSignal(me.bio || '')
  const [errors, setErrors] = createSignal({})
  const [busy, setBusy] = createSignal(false)

  const submit = async (e) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setBusy(true)
    setErrors({})
    try {
      const updated = await api.patch('/me', {
        display_name: f.get('display_name').toString(),
        bio: f.get('bio').toString(),
        avatar_url: f.get('avatar_url').toString().trim(),
      })
      setCurrentUser(updated)
      toast('Profile saved', 'success')
    } catch (err) {
      if (err.status === 422) setErrors(err.fields)
      else toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form class="card form-card" onSubmit={submit}>
      <h2>Profile</h2>
      <label class="field">
        <span>Display name</span>
        <input name="display_name" value={me.display_name} maxlength="50" required />
        <Show when={errors().display_name}>
          <em class="field-error">Display name {errors().display_name}</em>
        </Show>
      </label>
      <label class="field">
        <span>Bio</span>
        <textarea name="bio" rows="3" maxlength="160" value={bio()} onInput={(e) => setBio(e.currentTarget.value)} />
        <em class="field-hint">{160 - bio().length} characters left</em>
      </label>
      <label class="field">
        <span>Avatar URL</span>
        <input name="avatar_url" type="url" value={me.avatar_url || ''} placeholder="https://…" />
        <Show when={errors().avatar_url} fallback={<em class="field-hint">Leave empty to use your initial.</em>}>
          <em class="field-error">Avatar URL {errors().avatar_url}</em>
        </Show>
      </label>
      <button class="btn btn-primary" disabled={busy()}>
        {busy() ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}

function PasswordForm() {
  const [error, setError] = createSignal('')
  const [busy, setBusy] = createSignal(false)

  const submit = async (e) => {
    e.preventDefault()
    const form = e.currentTarget
    const f = new FormData(form)
    setBusy(true)
    setError('')
    try {
      await api.put('/me/password', { current_password: f.get('current').toString(), new_password: f.get('next').toString() })
      form.reset()
      toast('Password changed. Other devices were signed out.', 'success')
    } catch (err) {
      setError(err.fields?.new_password ? `New password ${err.fields.new_password}` : err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form class="card form-card" onSubmit={submit}>
      <h2>Password</h2>
      <label class="field">
        <span>Current password</span>
        <input name="current" type="password" autocomplete="current-password" required />
      </label>
      <label class="field">
        <span>New password</span>
        <input name="next" type="password" autocomplete="new-password" minlength="8" required />
        <em class="field-hint">At least 8 characters.</em>
      </label>
      <Show when={error()}>
        <p class="form-error" role="alert">
          {error()}
        </p>
      </Show>
      <button class="btn btn-outline" disabled={busy()}>
        {busy() ? 'Updating…' : 'Change password'}
      </button>
    </form>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const signOut = async () => {
    await logout()
    navigate('/explore', { replace: true })
  }

  return (
    <>
      <PageHeader title="Settings" back />
      <ProfileForm />

      <section class="card form-card">
        <h2>Appearance</h2>
        <div class="segmented" role="radiogroup" aria-label="Theme">
          {[
            ['auto', 'Automatic'],
            ['light', 'Light'],
            ['dark', 'Dark'],
          ].map(([id, label]) => (
            <button role="radio" aria-checked={theme() === id} classList={{ active: theme() === id }} onClick={() => setTheme(id)}>
              {label}
            </button>
          ))}
        </div>
      </section>

      <section class="card form-card">
        <h2>App</h2>
        <Show
          when={!installed()}
          fallback={<p class="muted">Omu is installed on this device. 🎉</p>}
        >
          <Show
            when={canInstall()}
            fallback={<p class="muted">To install Omu, use your browser's “Install app” or “Add to Home Screen” option.</p>}
          >
            <p class="muted">Install Omu for a full-screen experience and quick launch.</p>
            <button class="btn btn-outline" onClick={promptInstall}>
              <Icon name="download" size={18} /> Install app
            </button>
          </Show>
        </Show>
      </section>

      <PasswordForm />

      <section class="card form-card">
        <h2>Session</h2>
        <button class="btn btn-danger" onClick={signOut}>
          <Icon name="log-out" size={18} /> Log out
        </button>
      </section>
    </>
  )
}
