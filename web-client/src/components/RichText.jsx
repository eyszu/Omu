import { A } from '@solidjs/router'
import { For } from 'solid-js'

const TOKEN = /(#[\p{L}\p{N}_]{1,50}|@[A-Za-z0-9_]{3,15}|https?:\/\/[^\s<]+)/gu

// Turns #tags, @mentions and links into router links. Builds elements, never HTML strings.
export default function RichText(props) {
  const parts = () => props.text.split(TOKEN).filter((p) => p !== '')
  return (
    <For each={parts()}>
      {(part) => {
        if (part.startsWith('#')) return <A href={`/tag/${encodeURIComponent(part.slice(1).toLowerCase())}`}>{part}</A>
        if (part.startsWith('@')) return <A href={`/u/${part.slice(1)}`}>{part}</A>
        if (/^https?:\/\//.test(part)) {
          return (
            <a href={part} target="_blank" rel="noopener noreferrer nofollow">
              {part}
            </a>
          )
        }
        return part
      }}
    </For>
  )
}
