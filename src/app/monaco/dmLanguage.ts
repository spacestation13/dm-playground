import type * as Monaco from 'monaco-editor'

const DM_LANGUAGE_ID = 'dm'

const controlKeywords = [
  'as',
  'break',
  'catch',
  'continue',
  'do',
  'else',
  'for',
  'goto',
  'if',
  'return',
  'switch',
  'throw',
  'try',
  'while',
]

const otherKeywords = ['del', 'new']

const declarationKeywords = ['operator', 'proc', 'var', 'verb']

const modifierKeywords = ['const', 'final', 'global', 'set', 'static', 'tmp']

const runtimeKeywords = ['sleep', 'spawn']

const operatorWords = ['in', 'step', 'to']

const specialIdentifiers = ['args', 'src', 'usr', 'vars', 'world']

const builtinFunctions = [
  'ASSERT',
  'CRASH',
  'EXCEPTION',
  'REGEX_QUOTE',
  'REGEX_QUOTE_REPLACEMENT',
  'abs',
  'addtext',
  'alert',
  'alist',
  'animate',
  'arccos',
  'arcsin',
  'arctan',
  'arglist',
  'ascii2text',
  'astype',
  'block',
  'bound_pixloc',
  'bounds',
  'bounds_dist',
  'browse',
  'browse_rsc',
  'call',
  'call_ext',
  'ceil',
  'ckey',
  'ckeyEx',
  'clamp',
  'cmptext',
  'cmptextEx',
  'copytext',
  'cos',
  'fcopy',
  'fcopy_rsc',
  'fdel',
  'fexists',
  'file',
  'file2text',
  'filter',
  'findlasttext',
  'findlasttextEx',
  'findtext',
  'findtextEx',
  'flick',
  'flist',
  'floor',
  'fract',
  'ftime',
  'ftp',
  'generator',
  'get_dir',
  'get_dist',
  'get_step',
  'get_step_away',
  'get_step_rand',
  'get_step_to',
  'get_step_towards',
  'get_steps_to',
  'gradient',
  'hascall',
  'hearers',
  'html_decode',
  'html_encode',
  'icon',
  'icon_states',
  'image',
  'initial',
  'input',
  'isarea',
  'isfile',
  'isicon',
  'isinf',
  'islist',
  'isloc',
  'ismob',
  'ismovable',
  'isnan',
  'isnull',
  'isnum',
  'isobj',
  'ispath',
  'ispointer',
  'issaved',
  'istext',
  'isturf',
  'istype',
  'jointext',
  'json_decode',
  'json_encode',
  'length',
  'lentext',
  'lerp',
  'link',
  'list',
  'list2params',
  'load_ext',
  'load_resource',
  'locate',
  'log',
  'lowertext',
  'matrix',
  'max',
  'md5',
  'min',
  'missile',
  'nameof',
  'newlist',
  'noise_hash',
  'nonspantext',
  'num2text',
  'obounds',
  'ohearers',
  'orange',
  'output',
  'oview',
  'oviewers',
  'params2list',
  'pick',
  'pixloc',
  'prob',
  'rand',
  'rand_seed',
  'range',
  'ref',
  'refcount',
  'regex',
  'replacetext',
  'replacetextEx',
  'rgb',
  'rgb2num',
  'roll',
  'round',
  'run',
  'sha1',
  'shell',
  'shutdown',
  'sign',
  'sin',
  'sorttext',
  'sorttextEx',
  'sound',
  'spantext',
  'splicetext',
  'splittext',
  'sqrt',
  'startup',
  'stat',
  'statpanel',
  'step_away',
  'step_rand',
  'step_to',
  'step_towards',
  'tan',
  'text',
  'text2ascii',
  'text2file',
  'text2num',
  'text2path',
  'time2text',
  'trimtext',
  'trunc',
  'typesof',
  'uppertext',
  'url_decode',
  'url_encode',
  'values_cut_over',
  'values_cut_under',
  'values_dot',
  'values_product',
  'values_sum',
  'vector',
  'view',
  'viewers',
  'walk',
  'walk_away',
  'walk_rand',
  'walk_to',
  'walk_towards',
  'winclone',
  'winexists',
  'winget',
  'winset',
  'winshow',
]

const typeKeywords = [
  'alist',
  'area',
  'atom',
  'callee',
  'client',
  'database',
  'datum',
  'exception',
  'generator',
  'icon',
  'image',
  'list',
  'matrix',
  'mob',
  'mutable_appearance',
  'obj',
  'particles',
  'pixloc',
  'regex',
  'savefile',
  'sound',
  'turf',
  'vector',
  'world',
]

const languageConstants = [
  'DEBUG',
  'DM_BUILD',
  'DM_VERSION',
  'FALSE',
  'FILE_DIR',
  'TRUE',
  '__FILE__',
  '__LINE__',
  '__MAIN__',
  '__PROC__',
  '__TYPE__',
  '__IMPLIED_TYPE__',
  'null',
]

const directiveKeywords = [
  'define',
  'elif',
  'else',
  'endif',
  'error',
  'if',
  'ifdef',
  'ifndef',
  'include',
  'pragma',
  'undef',
  'warn',
]

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function createWordMatch(words: string[]): RegExp {
  const pattern = words
    .slice()
    .sort((left, right) => right.length - left.length)
    .map(escapeRegex)
    .join('|')

  return new RegExp(`\\b(?:${pattern})\\b`)
}

const dmKeywordMatch = createWordMatch([...controlKeywords, ...runtimeKeywords])
const dmOtherKeywordMatch = createWordMatch(otherKeywords)
const dmDeclarationKeywordMatch = createWordMatch(declarationKeywords)
const dmModifierKeywordMatch = createWordMatch(modifierKeywords)
const dmOperatorWordMatch = createWordMatch(operatorWords)
const dmSpecialIdentifierMatch = createWordMatch(specialIdentifiers)
const dmBuiltinFunctionMatch = new RegExp(
  `${createWordMatch(builtinFunctions).source}(?=\\s*\\()`
)
const dmTypeKeywordMatch = createWordMatch(typeKeywords)
const dmLanguageConstantMatch = createWordMatch(languageConstants)
const dmDirectiveKeywordMatch = createWordMatch(directiveKeywords)
const dmEscapeSequenceMatch =
  /\\(?:[Tt]he|[Aa]n?|[Hh]e|[Ss]he|[Hh]is|him|himself|herself|hers|proper|improper|th|s|(?:icon|ref|[Rr]oman)(?=\[)|\.\.\.|t|n|"|\\|<|>|\[|x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|U[0-9a-fA-F]{6})/
const dmIdentifierMatch = /[A-Za-z_][A-Za-z0-9_$-]*\b/
const dmScopedIdentifierMatch = /::[A-Za-z_][A-Za-z0-9_$-]*\b/
const dmMemberAccessMatch = /\.(?!\d)[A-Za-z_][A-Za-z0-9_$-]*\b/
const dmPathStartMatch = /(^|[\s([{:;,=<>!&|?+\-*%~])(\/)(?=[A-Za-z_])/
const dmOperatorMatch =
  /(?:\?\[\]|\?\.|\?:|<=>|<<=|>>=|&&=|\|\|=|%%=|\+=|-=|\*=|\/=|%=|&=|\|=|\^=|:=|~=|~!|\|\||&&|%%|\+\+|--|\*\*|<<|>>|<=|>=|==|!=|<>|=|\?|[+\-*/%&|^~!.])/

export const dmCompletionKeywords = Array.from(
  new Set([
    ...controlKeywords,
    ...otherKeywords,
    ...declarationKeywords,
    ...modifierKeywords,
    ...runtimeKeywords,
    ...operatorWords,
    ...specialIdentifiers,
    ...typeKeywords,
    ...builtinFunctions,
    ...languageConstants,
  ])
).sort((left, right) => left.localeCompare(right))

const dmLanguageConfiguration: Monaco.languages.LanguageConfiguration = {
  comments: {
    lineComment: '//',
    blockComment: ['/*', '*/'],
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"', notIn: ['string', 'comment'] },
    { open: "'", close: "'", notIn: ['string', 'comment'] },
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
  wordPattern:
    /(-?\d*\.\d\w*)|([#/A-Za-z_][A-Za-z0-9_/$-]*|::[A-Za-z_][A-Za-z0-9_$-]*)/g,
  indentationRules: {
    increaseIndentPattern: /^((?!\/\/).)*\{[^}"']*$/,
    decreaseIndentPattern: /^\s*[}\]].*$/,
  },
}

const dmMonarchLanguage: Monaco.languages.IMonarchLanguage = {
  defaultToken: '',
  tokenPostfix: '.dm',

  tokenizer: {
    root: [
      [
        /^\s*(#\s*[A-Za-z_][A-Za-z0-9_]*)/,
        'keyword.control.directive',
        '@preprocessor',
      ],
      { include: '@whitespace' },
      [/@\{"/, { token: 'string.quote', next: '@rawMultilineString' }],
      [/\{"/, { token: 'string.quote', next: '@multilineString' }],
      [/"/, { token: 'string.quote', next: '@string' }],
      [/'/, { token: 'string.quote', next: '@singleQuotedString' }],
      { include: '@common' },
    ],

    common: [
      [/1\.#[Ii](?:IND|INF)/, 'number.float'],
      [/\b0[xX][0-9a-fA-F]+\b/, 'number.hex'],
      [/\b(?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?\b/, 'number'],
      [dmPathStartMatch, ['', 'delimiter'], '@path'],
      [dmScopedIdentifierMatch, 'identifier'],
      [dmMemberAccessMatch, 'identifier'],
      [dmOperatorWordMatch, 'keyword.operator'],
      [dmOperatorMatch, 'keyword.operator'],
      [/[{}()[\]]/, '@brackets'],
      [/[;,]/, 'delimiter'],
      [/:/, 'delimiter'],
      [dmKeywordMatch, 'keyword.control'],
      [dmOtherKeywordMatch, 'keyword.other'],
      [dmDeclarationKeywordMatch, 'storage.type'],
      [dmModifierKeywordMatch, 'storage.modifier'],
      [dmSpecialIdentifierMatch, 'variable.language'],
      [dmBuiltinFunctionMatch, 'support.function'],
      [dmTypeKeywordMatch, 'support.type'],
      [dmLanguageConstantMatch, 'support.constant'],
      [/[A-Z_][A-Z_0-9]*\b/, 'constant'],
      [dmIdentifierMatch, 'identifier'],
    ],

    path: [
      [
        dmTypeKeywordMatch,
        { token: 'support.type', next: '@pathAfterSegment' },
      ],
      [dmIdentifierMatch, { token: 'identifier', next: '@pathAfterSegment' }],
      [/./, { token: '', next: '@pop', goBack: 1 }],
    ],

    pathAfterSegment: [
      [/\//, { token: 'delimiter', next: '@path' }],
      [/./, { token: '', next: '@pop', goBack: 1 }],
    ],

    whitespace: [
      [/\s+/, 'white'],
      [/\/\*/, 'comment', '@comment'],
      [/\/\/.*/, 'comment'],
    ],

    comment: [
      [/[^/*]+/, 'comment'],
      [/\/\*/, 'comment', '@push'],
      [/\*\//, 'comment', '@pop'],
      [/[/*]/, 'comment'],
    ],

    string: [
      [/[^\\"[]+/, 'string'],
      [dmEscapeSequenceMatch, 'constant.character.escape'],
      [/\\./, 'invalid'],
      [/\[(?!=)/, { token: 'delimiter.square', next: '@interpolation' }],
      [/"/, { token: 'string.quote', next: '@pop' }],
      [/\[/, 'string'],
    ],

    multilineString: [
      [/[^\\"[]+/, 'string'],
      [dmEscapeSequenceMatch, 'constant.character.escape'],
      [/\\./, 'invalid'],
      [/\[(?!=)/, { token: 'delimiter.square', next: '@interpolation' }],
      [/"\}/, { token: 'string.quote', next: '@pop' }],
      [/./, 'string'],
    ],

    rawMultilineString: [
      [/"\}/, { token: 'string.quote', next: '@pop' }],
      [/./, 'string'],
    ],

    singleQuotedString: [
      [/[^\\']+/, 'string'],
      [/\\./, 'constant.character.escape'],
      [/'/, { token: 'string.quote', next: '@pop' }],
    ],

    interpolation: [
      { include: '@whitespace' },
      [/\[/, { token: 'delimiter.square', next: '@push' }],
      [/\]/, { token: 'delimiter.square', next: '@pop' }],
      [/@\{"/, { token: 'string.quote', next: '@rawMultilineString' }],
      [/\{"/, { token: 'string.quote', next: '@multilineString' }],
      [/"/, { token: 'string.quote', next: '@string' }],
      [/'/, { token: 'string.quote', next: '@singleQuotedString' }],
      { include: '@common' },
    ],

    preprocessor: [
      [/\\\s*$/, 'keyword.control.directive'],
      [/\s+/, 'white'],
      [dmDirectiveKeywordMatch, 'keyword.control.directive'],
      [/"/, { token: 'string.quote', next: '@preprocessorString' }],
      [/'/, { token: 'string.quote', next: '@preprocessorSingleQuotedString' }],
      [dmLanguageConstantMatch, 'support.constant'],
      [/[A-Z_][A-Z_0-9]*\b/, 'constant'],
      [/\/\/.*/, 'comment'],
      [/\/\*/, 'comment', '@comment'],
      { include: '@common' },
      [/$/, '', '@pop'],
    ],

    preprocessorString: [
      [/[^\\"]+/, 'string'],
      [/\\./, 'constant.character.escape'],
      [/"/, { token: 'string.quote', next: '@pop' }],
    ],

    preprocessorSingleQuotedString: [
      [/[^\\']+/, 'string'],
      [/\\./, 'constant.character.escape'],
      [/'/, { token: 'string.quote', next: '@pop' }],
    ],
  },
}

const configuredMonacoInstances = new WeakSet<typeof Monaco>()

export function ensureDmLanguage(monaco: typeof Monaco): void {
  if (configuredMonacoInstances.has(monaco)) {
    return
  }

  const languageExists = monaco.languages
    .getLanguages()
    .some((language) => language.id === DM_LANGUAGE_ID)

  if (!languageExists) {
    monaco.languages.register({
      id: DM_LANGUAGE_ID,
      aliases: ['DM', 'dm', 'DreamMaker'],
      extensions: ['.dm', '.dme'],
    })
  }

  monaco.languages.setMonarchTokensProvider(DM_LANGUAGE_ID, dmMonarchLanguage)
  monaco.languages.setLanguageConfiguration(
    DM_LANGUAGE_ID,
    dmLanguageConfiguration
  )
  configuredMonacoInstances.add(monaco)
}
