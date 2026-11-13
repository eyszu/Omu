import { createEffect, createSignal, For, on, onCleanup, onMount, Show } from 'solid-js'
import EmptyState from './EmptyState.jsx'

// A cursor-paginated, infinitely scrolling list.
//
//   <Feed load={(cursor) => api.get('/timeline/explore', { cursor })}   -> { data, next_cursor }
//         deps={() => username()}      re-fetch from scratch when this changes (optional)
//         controller={ctl}             gets prepend(item) / append(item) / reload() (optional)
//         empty={{ title, text }}      shown when there is nothing
//         onLoaded={(items) => ...}    called after the first page arrives (optional)>
//     {(item, { remove }) => <PostCard ... />}
//   </Feed>
export default function Feed(props) {
  const [items, setItems] = createSignal([])
  const [loading, setLoading] = createSignal(false)
  const [done, setDone] = createSignal(false)
  const [error, setError] = createSignal(null)
  const [firstLoad, setFirstLoad] = createSignal(true)
  let cursor = null
  let generation = 0 // lets us ignore responses that belong to a previous reset
  let sentinel
  let observer

  const more = async () => {
    if (loading() || done()) return
    const mine = generation
    setLoading(true)
    setError(null)
    try {
      const page = await props.load(cursor)
      if (mine !== generation) return
      setItems((list) => [...list, ...page.data])
      cursor = page.next_cursor
      if (cursor == null) setDone(true)
      if (firstLoad()) {
        setFirstLoad(false)
        props.onLoaded?.(page.data)
      }
    } catch (err) {
      if (mine !== generation) return
      setError(err)
    } finally {
      if (mine === generation) {
        setLoading(false)
        fillScreen()
      }
    }
  }

  // If the last page left the sentinel on screen (tall window, short page), keep going.
  const fillScreen = () =>
    requestAnimationFrame(() => {
      if (!sentinel || done() || loading() || error()) return
      if (sentinel.getBoundingClientRect().top < window.innerHeight + 400) more()
    })

  const reset = () => {
    generation++
    cursor = null
    setItems([])
    setDone(false)
    setError(null)
    setLoading(false)
    setFirstLoad(true)
    more()
  }

  if (props.controller) {
    props.controller.prepend = (item) => setItems((list) => [item, ...list])
    props.controller.append = (item) => setItems((list) => [...list, item])
    props.controller.reload = reset
  }

  createEffect(on(() => props.deps?.(), reset))

  onMount(() => {
    observer = new IntersectionObserver((entries) => entries[0].isIntersecting && more(), { rootMargin: '400px' })
    observer.observe(sentinel)
  })
  onCleanup(() => observer?.disconnect())

  const remove = (item) => setItems((list) => list.filter((x) => x !== item))

  return (
    <div class="feed">
      <For each={items()}>{(item) => props.children(item, { remove })}</For>

      <Show when={loading() && items().length === 0}>
        <div class="skeletons" aria-busy="true" aria-label="Loading">
          <For each={[0, 1, 2]}>
            {() => (
              <div class="skeleton">
                <span class="sk sk-avatar" />
                <span class="sk-lines">
                  <span class="sk sk-line" style={{ width: '40%' }} />
                  <span class="sk sk-line" />
                  <span class="sk sk-line" style={{ width: '75%' }} />
                </span>
              </div>
            )}
          </For>
        </div>
      </Show>

      <Show when={loading() && items().length > 0}>
        <div class="feed-note muted">Loading more…</div>
      </Show>

      <Show when={error()}>
        <div class="feed-error">
          <p>{error().message}</p>
          <button class="btn btn-outline" onClick={more}>
            Try again
          </button>
        </div>
      </Show>

      <Show when={!loading() && !error() && done() && items().length === 0}>
        <EmptyState title={props.empty?.title || 'Nothing here yet'} text={props.empty?.text}>
          {props.empty?.children}
        </EmptyState>
      </Show>

      <Show when={done() && items().length > 0}>
        <div class="feed-note muted">That's everything for now.</div>
      </Show>

      <div ref={sentinel} class="sentinel" />
    </div>
  )
}
