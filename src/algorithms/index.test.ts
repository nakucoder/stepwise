import { describe, expect, it } from 'vitest'
import { findAlgorithm, findCategory } from '../data/categories'
import { collectFrames } from '../engine/collect'
import { findJargon } from '../engine/jargon'
import { randomArrays } from '../test/random'
import { ALGORITHMS, findImplementation } from './index'

describe('algorithm registry', () => {
  it.each(Object.entries(ALGORITHMS))('%s matches its entry in the category data', (key, alg) => {
    const category = findCategory(alg.category)
    const entry = category && findAlgorithm(category, alg.id)
    expect(entry, `${key} is missing from src/data/categories.ts`).toBeDefined()
    expect(alg.name).toBe(entry?.name)
    expect(alg.explorerName).toBe(entry?.explorerName)
    expect(key).toBe(`${alg.category}/${alg.id}`)
    expect(alg.bestFor.engineer.trim(), `${key} bestFor.engineer`).not.toBe('')
    expect(findJargon(alg.bestFor.explorer), `${key} bestFor.explorer`).toBeNull()
  })

  it.each(Object.entries(ALGORITHMS))('%s explains its idea at both levels', (key, alg) => {
    for (const level of ['explorer', 'engineer'] as const) {
      const { lead, points } = alg.idea[level]
      expect(lead.trim(), `${key} idea.${level}.lead`).not.toBe('')
      expect(points.length, `${key} idea.${level} has questions`).toBeGreaterThan(0)
      for (const { question, answer } of points) {
        expect(question.trim(), `${key} idea.${level} question`).not.toBe('')
        expect(answer.trim(), `${key} idea.${level}: ${question}`).not.toBe('')
      }
    }
    const explorer = alg.idea.explorer
    for (const text of [explorer.lead, ...explorer.points.flatMap((p) => [p.question, p.answer])]) {
      expect(findJargon(text), `${key} Explorer idea: ${text}`).toBeNull()
    }
  })

  it.each(Object.entries(ALGORITHMS))(
    '%s gives help at every decision, at both levels, in plain words for Explorer',
    (key, alg) => {
      const inputs = [
        [5, 2, 8, 1, 9, 3],
        [4, 4, 1],
        ...randomArrays(7, 30, { maxLength: 10, min: 0, max: 99 }),
      ]
      for (const input of inputs) {
        const { frames } = collectFrames(alg, input)
        frames.forEach((ask, k) => {
          const answer = frames[k + 1]
          if (!ask.decision || !answer) return
          const hints = alg.hints(ask, answer)
          for (const level of ['explorer', 'engineer'] as const) {
            for (const text of [hints[level].nudge, hints[level].concept, hints[level].showMe]) {
              expect(text.trim(), `${key} ${level} hint at frame ${String(k)}`).not.toBe('')
            }
          }
          for (const text of [
            hints.explorer.nudge,
            hints.explorer.concept,
            hints.explorer.showMe,
          ]) {
            expect(findJargon(text), `${key} Explorer hint: ${text}`).toBeNull()
          }
        })
      }
    },
  )

  it('finds implementations by URL segments', () => {
    expect(findImplementation('sorting', 'bubble-sort')?.name).toBe('Bubble sort')
    expect(findImplementation('sorting', 'quick-sort')).toBeUndefined()
    expect(findImplementation(undefined, undefined)).toBeUndefined()
  })
})
