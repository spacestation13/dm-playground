import type * as Monaco from 'monaco-editor'

// Highlighting for the bytecode panel, in the editor theme's colors and laid out like x86 viewers:
// mnemonics as keywords (branches and calls as control keywords), built-in variables like registers,
// numbers, strings and jump labels, and debug info dimmed like comments.

/** dmasm's instruction text: `Mnemonic operand operand` */
export const DM_ASM_LANGUAGE_ID = 'dmasm'
/** The hex column: the opcode word, then operand words */
export const DM_ASM_HEX_LANGUAGE_ID = 'dmasm-hex'

const controlFlowMnemonics = [
  'Catch',
  'Crash',
  'End',
  'ForRange',
  'ForRangeStep',
  'Jmp',
  'JmpAnd',
  'JmpLoop',
  'JmpOr',
  'Jnz',
  'JnzLoop',
  'Jz',
  'JzLoop',
  'PickProb',
  'PickSwitch',
  'Ret',
  'SetCacheJmpIfNull',
  'SetCachePopJmpIfNull',
  'Spawn',
  'Switch',
  'SwitchRange',
  'Throw',
  'Try',
  'TryJmp',
]

const dmAsmLanguage: Monaco.languages.IMonarchLanguage = {
  defaultToken: '',
  controlFlowMnemonics,
  registers: [
    'args',
    'cache',
    'cache_key',
    'callee',
    'caller',
    'dot',
    'null',
    'src',
    'usr',
    'world',
  ],
  tokenizer: {
    // One instruction per line: the line-start anchors find the mnemonic, so no state carries over.
    root: [
      [/^Dbg(File|Line)\b.*$/, 'comment'],
      [
        /^[A-Z][A-Za-z0-9]*/,
        {
          cases: {
            '@controlFlowMnemonics': 'keyword.control',
            '~Call.*': 'keyword.control',
            '@default': 'keyword',
          },
        },
      ],
      [/\s+/, 'white'],
      [/"/, { token: 'string.quote', next: '@string' }],
      [/'[^']*'/, 'string'],
      [/LAB_[0-9A-F]+/, 'type'],
      [/ref\(/, { token: 'support.function', next: '@hexRef' }],
      [/arg(?=\()/, 'variable.parameter'],
      [/(local|global)(?=\()/, 'variable'],
      [/[a-z_]+(?=\()/, 'support.function'],
      [/\/[A-Za-z0-9_/]*/, 'support.type'],
      [/-?\d+\.\d+(e[+-]?\d+)?/, 'number.float'],
      [/-?\d+(e[+-]?\d+)?/, 'number'],
      [/(default|to)\b/, 'keyword.operator'],
      [
        /[A-Za-z_][A-Za-z0-9_]*/,
        {
          cases: {
            '@registers': 'variable.language',
            '@default': 'identifier',
          },
        },
      ],
      [/=>|[=,;|&*()[\]{}]/, 'delimiter'],
    ],

    string: [
      [/[^\\"[]+/, 'string'],
      [/\\./, 'constant.character.escape'],
      [/\[\]/, 'delimiter.square'],
      [/\[/, 'string'],
      [/"/, { token: 'string.quote', next: '@pop' }],
    ],

    hexRef: [
      [/[0-9A-F]+/, 'number.hex'],
      [/\)/, { token: 'support.function', next: '@pop' }],
    ],
  },
}

const dmAsmHexLanguage: Monaco.languages.IMonarchLanguage = {
  defaultToken: '',
  tokenizer: {
    root: [
      [/^[0-9a-f]+/, 'keyword'],
      [/\s+/, 'white'],
      [/\b0+\b/, 'comment'],
      [/[0-9a-f]+/, 'number.hex'],
    ],
  },
}

const configuredMonacoInstances = new WeakSet<typeof Monaco>()

export function ensureDmAsmLanguages(monaco: typeof Monaco): void {
  if (configuredMonacoInstances.has(monaco)) {
    return
  }

  const registered = new Set(monaco.languages.getLanguages().map((l) => l.id))
  for (const [id, language] of [
    [DM_ASM_LANGUAGE_ID, dmAsmLanguage],
    [DM_ASM_HEX_LANGUAGE_ID, dmAsmHexLanguage],
  ] as const) {
    if (!registered.has(id)) {
      monaco.languages.register({ id })
    }
    monaco.languages.setMonarchTokensProvider(id, language)
  }
  configuredMonacoInstances.add(monaco)
}
