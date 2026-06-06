import { HashRouter, Route, Routes } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { PlayPage } from './pages/PlayPage'

// HashRouter keeps the site deployable to any static host (GitHub Pages, S3,
// Cloudflare Pages, …) with zero server-side rewrite config — a refresh on
// /#/play/drift always resolves to index.html.
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/play/:id" element={<PlayPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </HashRouter>
  )
}
