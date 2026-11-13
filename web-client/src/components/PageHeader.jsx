import { Show } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import Icon from './Icon.jsx'

export default function PageHeader(props) {
  const navigate = useNavigate()
  const back = () => (window.history.length > 1 ? navigate(-1) : navigate('/'))
  return (
    <header class="page-header">
      <Show when={props.back}>
        <button class="icon-btn" onClick={back} aria-label="Go back">
          <Icon name="arrow-left" />
        </button>
      </Show>
      <div class="page-header-title">
        <h1>{props.title}</h1>
        <Show when={props.subtitle}>
          <span class="muted small">{props.subtitle}</span>
        </Show>
      </div>
      {props.children}
    </header>
  )
}
