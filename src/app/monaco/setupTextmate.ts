import type * as Monaco from 'monaco-editor'
import { loadWASM } from 'onigasm'
import { Registry } from 'monaco-textmate'
import { wireTmGrammars } from 'monaco-editor-textmate'

import onigasmWasm from 'onigasm/lib/onigasm.wasm?url'

let wasmLoadPromise: Promise<void> | null = null
const wiredMonacoInstances = new WeakSet<typeof Monaco>()
const wiringPromises = new WeakMap<typeof Monaco, Promise<void>>()
const DM_GRAMMAR_URL =
  'https://raw.githubusercontent.com/SpaceManiac/vscode-dm-langclient/refs/heads/master/syntaxes/dm.tmLanguage.json'

export function ensureDmTextmate(monaco: typeof Monaco): Promise<void> {
  if (wiredMonacoInstances.has(monaco)) {
    return Promise.resolve()
  }

  const pending = wiringPromises.get(monaco)
  if (pending) {
    return pending
  }

  const promise = (async () => {
    if (!wasmLoadPromise) {
      wasmLoadPromise = loadWASM(onigasmWasm)
    }
    await wasmLoadPromise

    const registry = new Registry({
      getGrammarDefinition: async (scopeName) => {
        if (scopeName !== 'source.dm') {
          throw new Error(`Unknown scope: ${scopeName}`)
        }

        const response = await fetch(DM_GRAMMAR_URL)
        if (!response.ok) {
          throw new Error(`Failed to fetch DM grammar: ${response.status}`)
        }
        const content = await response.text()
        return { format: 'json', content }
      },
    })

    const grammars = new Map<string, string>()
    grammars.set('dm', 'source.dm')

    await wireTmGrammars(monaco, registry, grammars)
    wiredMonacoInstances.add(monaco)
  })()

  wiringPromises.set(monaco, promise)
  return promise.finally(() => {
    wiringPromises.delete(monaco)
  })
}
