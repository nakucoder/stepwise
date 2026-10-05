import { createHash } from 'node:crypto'

/** The text of every inline <script> (one without a src attribute), exactly as written. */
export function inlineScripts(html: string): string[] {
  const scripts: string[] = []
  for (const match of html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi)) {
    const attributes = match[1] ?? ''
    if (!/\ssrc\s*=/i.test(attributes)) scripts.push(match[2] ?? '')
  }
  return scripts
}

/** The CSP source that allows a script with exactly this text, e.g. 'sha256-abc…='. */
export function sha256Source(script: string): string {
  return `'sha256-${createHash('sha256').update(script, 'utf8').digest('base64')}'`
}

/** The script-src sources the page needs that the _headers file's CSP doesn't list. */
export function missingHashes(html: string, headers: string): string[] {
  const policy = /^\s*Content-Security-Policy:\s*(.+)$/im.exec(headers)?.[1] ?? ''
  const scriptSrc = /(?:^|;)\s*script-src\s+([^;]*)/i.exec(policy)?.[1]?.split(/\s+/) ?? []
  return inlineScripts(html)
    .map(sha256Source)
    .filter((source) => !scriptSrc.includes(source))
}
