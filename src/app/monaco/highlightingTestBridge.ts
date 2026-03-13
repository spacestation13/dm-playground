import type * as Monaco from 'monaco-editor'

export interface HighlightingTestToken {
  startIndex: number
  endIndex: number
  text: string
  type: string
}

declare global {
  interface Window {
    __DM_PLAYGROUND_TEST__?: {
      tokenizeDm: (source: string) => HighlightingTestToken[][]
    }
  }
}

function createHighlightingTestTokenizer(
  monaco: typeof Monaco
): (source: string) => HighlightingTestToken[][] {
  return (source: string) => {
    const normalizedSource = source.replace(/\r\n/g, '\n')
    const lines = normalizedSource.split('\n')
    const tokenLines = monaco.editor.tokenize(normalizedSource, 'dm')

    return tokenLines.map((tokens, lineIndex) => {
      const line = lines[lineIndex] ?? ''

      return tokens
        .map((token, tokenIndex) => {
          const startIndex = token.offset
          const endIndex =
            tokenIndex + 1 < tokens.length
              ? (tokens[tokenIndex + 1]?.offset ?? line.length)
              : line.length
          const text = line.slice(startIndex, endIndex)

          return {
            startIndex,
            endIndex,
            text,
            type: token.type,
          }
        })
        .filter((token) => token.text.length > 0 && token.type !== 'white.dm')
    })
  }
}

export function installHighlightingTestBridge(monaco: typeof Monaco): void {
  window.__DM_PLAYGROUND_TEST__ = {
    tokenizeDm: createHighlightingTestTokenizer(monaco),
  }
}
