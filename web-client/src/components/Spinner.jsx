export default function Spinner(props) {
  return (
    <div class="spinner-wrap" role="status" aria-label={props.label || 'Loading'}>
      <span class="spinner" />
    </div>
  )
}
