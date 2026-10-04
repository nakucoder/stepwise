import { useLayoutEffect, useRef } from 'react'
import { keepInView } from '../lib/keepInView'
import './CodePanel.css'

interface CodePanelProps {
  readonly source: string
  /** 1-based line to highlight, or null for none. */
  readonly activeLine: number | null
}

/** The algorithm's source with the active line highlighted and annotated "← here". */
export function CodePanel({ source, activeLine }: CodePanelProps) {
  const lines = source.split('\n')
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLLIElement>(null)

  useLayoutEffect(() => {
    if (scrollRef.current && activeRef.current) keepInView(scrollRef.current, activeRef.current)
  }, [activeLine])

  return (
    <div ref={scrollRef} className="code-scroll">
      <ol className="code-lines">
        {lines.map((text, index) => {
          const number = index + 1
          const isActive = number === activeLine
          return (
            <li
              key={number}
              ref={isActive ? activeRef : undefined}
              className={isActive ? 'code-line is-active' : 'code-line'}
              aria-current={isActive ? 'step' : undefined}
            >
              <span className="code-number" aria-hidden="true">
                {number}
              </span>
              <code className="code-text">{text}</code>
              {isActive && <span className="visually-hidden"> (current line)</span>}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
