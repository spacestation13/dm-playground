import type * as Monaco from 'monaco-editor'
import { loadWASM } from 'onigasm'
import { Registry } from 'monaco-textmate'
import { wireTmGrammars } from 'monaco-editor-textmate'

import onigasmWasm from 'onigasm/lib/onigasm.wasm?url'

let setupPromise: Promise<void> | null = null
const DM_GRAMMAR_URL =
  'https://raw.githubusercontent.com/SpaceManiac/vscode-dm-langclient/refs/heads/master/syntaxes/dm.tmLanguage.json'

export function ensureDmTextmate(monaco: typeof Monaco): Promise<void> {
  if (setupPromise) {
    return setupPromise
  }

  setupPromise = (async () => {
    await loadWASM(onigasmWasm)

    const registry = new Registry({
      getGrammarDefinition: async (scopeName) => {
        if (scopeName !== 'source.dm') {
          throw new Error(`Unknown scope: ${scopeName}`)
        }

        try {
          const response = await fetch(DM_GRAMMAR_URL)
          if (!response.ok) {
            throw new Error(`Failed to fetch DM grammar: ${response.status}`)
          }
          const content = await response.text()
          return { format: 'json', content }
        } catch {
          const fallback = await fetch('/grammars/dm.tmLanguage.json')
          const content = await fallback.text()
          return { format: 'json', content }
        }
      },
    })

    const grammars = new Map<string, string>()
    grammars.set('dm', 'source.dm')

    await wireTmGrammars(monaco, registry, grammars)
  })()

  return setupPromise
}
