/**
 * Just enough of the Chrome DevTools Protocol to drive a headless Chrome from a script: launch
 * it, send commands (to the browser or to one page's session) and wait for an event. It uses
 * Node's own WebSocket, so it needs no package; Chrome comes from the system (CHROME_PATH, or
 * the usual install paths; GitHub's Ubuntu runners have it).
 */
import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CANDIDATES = [
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
]

export function findChrome(): string {
  const path = process.env.CHROME_PATH ?? CANDIDATES.find((candidate) => existsSync(candidate))
  if (!path) throw new Error('No Chrome found: set CHROME_PATH to a Chrome or Chromium binary.')
  return path
}

type Message = {
  id?: number
  method?: string
  params?: Record<string, unknown>
  sessionId?: string
  result?: Record<string, unknown>
  error?: { message: string }
}

export interface Browser {
  /** Sends a command; with a session id, to that page. Resolves with its result. */
  send(method: string, params?: object, sessionId?: string): Promise<Record<string, unknown>>
  /** Resolves with the params of the next `method` event (on that page, with a session id). */
  next(method: string, sessionId?: string): Promise<Record<string, unknown>>
  close(): Promise<void>
}

export async function launchChrome(): Promise<Browser> {
  const profile = mkdtempSync(join(tmpdir(), 'stepwise-fit-'))
  const chrome: ChildProcess = spawn(
    findChrome(),
    [
      '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--no-sandbox',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  )
  const endpoint = await new Promise<string>((resolve, reject) => {
    let output = ''
    chrome.stderr?.on('data', (chunk: Buffer) => {
      output += chunk.toString()
      const found = /DevTools listening on (ws:\/\/\S+)/.exec(output)
      if (found?.[1]) resolve(found[1])
    })
    chrome.on('exit', (code) => {
      reject(new Error(`Chrome exited (${String(code)}) before it was ready:\n${output}`))
    })
  })

  const socket = new WebSocket(endpoint)
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })

  let lastId = 0
  const pending = new Map<
    number,
    { resolve: (r: Record<string, unknown>) => void; reject: (e: Error) => void }
  >()
  const waiting: {
    method: string
    sessionId?: string
    resolve: (p: Record<string, unknown>) => void
  }[] = []
  socket.addEventListener('message', (event: MessageEvent<string>) => {
    const message = JSON.parse(event.data) as Message
    if (message.id !== undefined) {
      const call = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) call?.reject(new Error(message.error.message))
      else call?.resolve(message.result ?? {})
      return
    }
    const k = waiting.findIndex(
      (w) => w.method === message.method && w.sessionId === message.sessionId,
    )
    if (k >= 0) waiting.splice(k, 1)[0]?.resolve(message.params ?? {})
  })

  return {
    send(method, params = {}, sessionId) {
      const id = ++lastId
      socket.send(JSON.stringify({ id, method, params, ...(sessionId && { sessionId }) }))
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
    },
    next(method, sessionId) {
      return new Promise((resolve) => waiting.push({ method, sessionId, resolve }))
    },
    async close() {
      socket.close()
      const exited = new Promise((resolve) => chrome.once('exit', resolve))
      chrome.kill()
      await exited
      rmSync(profile, { recursive: true, force: true })
    },
  }
}
