import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { monaco } from '@bithero/monaco-editor-vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import packageJson from './package.json' with { type: 'json' }

const nodeCryptoStubPath = fileURLToPath(
  new URL('./src/utils/nodeCryptoStub.ts', import.meta.url)
)
const nodeFsPromisesStubPath = fileURLToPath(
  new URL('./src/utils/nodeFsPromisesStub.ts', import.meta.url)
)
const perfHooksStubPath = fileURLToPath(
  new URL('./src/utils/perfHooksStub.ts', import.meta.url)
)

const getAppVersion = () => {
  try {
    const rev = execSync('git rev-parse --short HEAD', {
      encoding: 'utf8',
    }).trim()
    if (rev) return rev
  } catch (_e) {
    return packageJson.version
  }
}

const normalizeMonacoWindowsImports = () => ({
  name: 'normalize-monaco-windows-imports',
  transform(code: string, id: string) {
    if (!/[\\/]esm[\\/]vs[\\/]editor[\\/]editor\.main\.js(?:$|\?)/.test(id)) {
      return
    }
    return code.replaceAll('\\', '/')
  },
})

// https://vite.dev/config/
export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(getAppVersion()),
  },
  resolve: {
    alias: {
      crypto: nodeCryptoStubPath,
      'node:crypto': nodeCryptoStubPath,
      'node:fs/promises': nodeFsPromisesStubPath,
      perf_hooks: perfHooksStubPath,
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    monaco({
      languages: [],
      // export type EditorFeature = 'anchorSelect' | 'bracketMatching' | 'browser' | 'caretOperations' | 'caretOperations' | 'clipboard' | 'codeAction' | 'codeEditor' | 'codelens' | 'codicon' | 'codicon' | 'colorPicker' | 'comment' | 'contextmenu' | 'cursorUndo' | 'diffEditor' | 'diffEditorBreadcrumbs' | 'dnd' | 'documentSymbols' | 'dropOrPasteInto' | 'dropOrPasteInto' | 'find' | 'floatingMenu' | 'folding' | 'fontZoom' | 'format' | 'gotoError' | 'gotoLine' | 'gotoSymbol' | 'gotoSymbol' | 'gpu' | 'hover' | 'iPadShowKeyboard' | 'inPlaceReplace' | 'indentation' | 'inlayHints' | 'inlineCompletions' | 'inlineProgress' | 'insertFinalNewLine' | 'inspectTokens' | 'internal' | 'lineSelection' | 'linesOperations' | 'linkedEditing' | 'links' | 'longLinesHelper' | 'middleScroll' | 'multicursor' | 'parameterHints' | 'placeholderText' | 'quickCommand' | 'quickHelp' | 'quickOutline' | 'readOnlyMessage' | 'referenceSearch' | 'rename' | 'sectionHeaders' | 'semanticTokens' | 'semanticTokens' | 'smartSelect' | 'snippet' | 'stickyScroll' | 'suggest' | 'suggest' | 'toggleHighContrast' | 'toggleTabFocusMode' | 'tokenization' | 'unicodeHighlighter' | 'unusualLineTerminators' | 'wordHighlighter' | 'wordOperations' | 'wordPartOperations';
      features: [
        'bracketMatching',
        // 'caretOperations',
        'clipboard',
        'find',
        'inPlaceReplace',
        'folding',
        // 'fontZoom',
        'gotoLine',
        // 'hover',
        'indentation',
        // 'links',
        // 'linesOperations',
        'multicursor',
        // 'parameterHints',
        // 'quickCommand',
        // 'smartSelect',
        // 'suggest',
        'wordHighlighter',
        // 'wordOperations',
      ],
    }),
    normalizeMonacoWindowsImports(),
  ],
})
