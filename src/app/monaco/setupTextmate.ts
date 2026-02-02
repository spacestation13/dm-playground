import type * as Monaco from 'monaco-editor'
import { loadWASM } from 'onigasm'
import { Registry } from 'monaco-textmate'
import { wireTmGrammars } from 'monaco-editor-textmate'

import onigasmWasm from 'onigasm/lib/onigasm.wasm?url'

let setupPromise: Promise<void> | null = null

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

        const response = await fetch('/grammars/dm.tmLanguage.json')
        const content = await response.text()
        return { format: 'json', content }
      },
    })

    const grammars = new Map<string, string>()
    grammars.set('dm', 'source.dm')

    await wireTmGrammars(monaco, registry, grammars)
  })()

  return setupPromise
}
