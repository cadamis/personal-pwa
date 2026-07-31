import React from 'react'
import ReactDOM from 'react-dom/client'

// Self-hosted fonts so the installed PWA renders correctly offline. The canvas
// renderer draws text in these families, so they must be present locally —
// a CDN miss would silently fall back to generic serif/sans mid-game.
// Latin-only subsets: the other subsets would roughly triple the precache size.
import '@fontsource/playfair-display/latin-400.css'
import '@fontsource/playfair-display/latin-600.css'
import '@fontsource/playfair-display/latin-700.css'
import '@fontsource/playfair-display/latin-400-italic.css'
import '@fontsource/playfair-display/latin-700-italic.css'
import '@fontsource/lato/latin-300.css'
import '@fontsource/lato/latin-400.css'
import '@fontsource/lato/latin-700.css'
import '@fontsource/caveat/latin-400.css'

import App from './App'
import './index.css'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Missing #root element')

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
