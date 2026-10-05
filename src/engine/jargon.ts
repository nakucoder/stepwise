/**
 * Words Explorer text must avoid (see "Learning levels" in CLAUDE.md). Explorer explains
 * in everyday words: "compare these two numbers", not "index", "iterate" or "O(n)".
 * Matching is whole-word and case-insensitive.
 */
export const EXPLORER_JARGON =
  /\b(BFS|DFS|O\(|index(es)?|indices|iterate|iteration|algorithm|node|traversal|heap|recursion|array|pointer|variable|loop)\b/i

/** Returns the first jargon word found in `text`, or null if it reads plainly. */
export function findJargon(text: string): string | null {
  return EXPLORER_JARGON.exec(text)?.[0] ?? null
}
