// parse compiler output into text segments with optional color/bold
export type OutputSegment = { text: string; color?: string; bold?: boolean }

// Modified, originally from Wrench by Lohikar 💜
const LINE_RE =
  /^(?:.*\/)?([^:\s]+):(\d+):(?:(error|warning)(?:\s*\([A-Za-z_]+\))?:)?\s*(?:(\d+):\s*)?(.*)$/i
const SUMMARY_RE = /-\s*(\d+)\s+errors?\s*,\s*(\d+)\s+warnings?/i
const TOKEN_RE = /\b(errors?|warnings?)\b/gi

export function parseCompilerErrorLine(line: string) {
  const matches = LINE_RE.exec(line)
  if (!matches) return null
  const err = matches[3] ? matches[3].toLowerCase() : 'error'
  return {
    file: matches[1],
    line: matches[2],
    errtype: err,
    col: matches[4],
    issue: (matches[5] || '').trim(),
  }
}

export function parseCompilerOutput(text: string): OutputSegment[] {
  if (!text) return []
  const lines = text.match(/.*\n|.+$/g) || []
  const out: OutputSegment[] = []
  for (const line of lines) {
    const summary = SUMMARY_RE.exec(line)
    const allowError = summary ? Number(summary[1]) > 1 : true
    const allowWarn = summary ? Number(summary[2]) > 1 : true

    TOKEN_RE.lastIndex = 0
    let last = 0
    let m: RegExpExecArray | null
    while ((m = TOKEN_RE.exec(line)) !== null) {
      const idx = m.index
      if (idx > last) out.push({ text: line.slice(last, idx) })
      const tok = m[0]
      out.push({
        text: tok,
        color: tok.toLowerCase().startsWith('error')
          ? allowError
            ? 'var(--editor-error-text)'
            : undefined
          : allowWarn
            ? 'var(--editor-warning-text)'
            : undefined,
      })
      last = idx + tok.length
    }
    if (last < line.length) out.push({ text: line.slice(last) })
  }
  return out
}
