import { Link } from 'react-router'
import './SimplePage.css'

export function NotFoundPage() {
  return (
    <main id="main" tabIndex={-1} className="simple-page">
      <title>Page not found – Stepwise</title>
      <h1>That page doesn't exist</h1>
      <p>The link may be mistyped, or the page may have moved.</p>
      <p>
        <Link to="/">Go to the home page</Link>
      </p>
    </main>
  )
}
