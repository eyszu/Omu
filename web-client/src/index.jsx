/* @refresh reload */
import { render } from 'solid-js/web'
import './styles/global.css'
import App from './App.jsx'
import { initPWA } from './lib/pwa.js'

initPWA()
render(() => <App />, document.getElementById('root'))
