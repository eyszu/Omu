import { A } from '@solidjs/router'
import EmptyState from '../components/EmptyState.jsx'
import PageHeader from '../components/PageHeader.jsx'

export default function NotFound() {
  return (
    <>
      <PageHeader title="Page not found" />
      <EmptyState title="We couldn't find that page" text="The link may be broken or the page may have moved.">
        <A href="/" class="btn btn-primary">
          Go home
        </A>
      </EmptyState>
    </>
  )
}
