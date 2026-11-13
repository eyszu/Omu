import { createSignal } from 'solid-js'

// Global "compose" dialog state, so any screen (nav button, reply icon) can open it.
const [composeState, setComposeState] = createSignal(null) // null | { parent?: post }
export { composeState }
export const openCompose = (opts = {}) => setComposeState(opts)
export const closeCompose = () => setComposeState(null)

// The most recently published post; screens listen to prepend it to their feeds.
const [lastPosted, setLastPosted] = createSignal(null)
export { lastPosted }
export const announcePosted = (post) => setLastPosted(post)
