import { A, Navigate } from '@solidjs/router'
import { createSignal, Show } from 'solid-js'
import { isAuthed, register } from '../lib/auth.js'

export default function Register() {
  const [errors, setErrors] = createSignal({})
  const [general, setGeneral] = createSignal('')
  const [busy, setBusy] = createSignal(false)

  const submit = async (e) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setBusy(true)
    setErrors({})
    setGeneral('')
    try {
      await register({
        username: f.get('username').toString().trim(),
        email: f.get('email').toString().trim(),
        display_name: f.get('display_name').toString().trim() || undefined,
        password: f.get('password').toString(),
      })
    } catch (err) {
      if (err.status === 422) setErrors(err.fields)
      else setGeneral(err.message) // e.g. 409 "username is already taken"
    } finally {
      setBusy(false)
    }
  }

  const Field = (p) => (
    <label class="field">
      <span>{p.label}</span>
      <input name={p.name} type={p.type || 'text'} autocomplete={p.autocomplete} required={p.required !== false} aria-invalid={!!errors()[p.name]} />
      <Show when={errors()[p.name]}>
        <em class="field-error">
          {p.label} {errors()[p.name]}
        </em>
      </Show>
      <Show when={p.hint && !errors()[p.name]}>
        <em class="field-hint">{p.hint}</em>
      </Show>
    </label>
  )

  return (
    <Show when={!isAuthed()} fallback={<Navigate href="/" />}>
      <div class="auth-card">
        <img src="/favicon.svg" alt="" width="64" height="64" />
        <h1>Join Omu</h1>
        <p class="muted">It takes a few seconds.</p>
        <form onSubmit={submit}>
          <Field name="username" label="Username" autocomplete="username" hint="3-15 letters, numbers or underscores" />
          <Field name="display_name" label="Display name" autocomplete="name" required={false} hint="Optional. Defaults to your username" />
          <Field name="email" label="Email" type="email" autocomplete="email" />
          <Field name="password" label="Password" type="password" autocomplete="new-password" hint="At least 8 characters" />
          <Show when={general()}>
            <p class="form-error" role="alert">
              {general()}
            </p>
          </Show>
          <button class="btn btn-primary btn-block" disabled={busy()}>
            {busy() ? 'Creating account…' : 'Sign up'}
          </button>
        </form>
        <p class="muted small">
          Already have an account? <A href="/login">Log in</A>
        </p>
      </div>
    </Show>
  )
}
