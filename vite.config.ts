import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { monaco } from '@bithero/monaco-editor-vite-plugin'
import packageJson from './package.json'
import { execSync } from 'child_process'

const getAppVersion = () => {
  try {
    const rev = execSync('git rev-parse --short HEAD', {
      encoding: 'utf8',
    }).trim()
    if (rev) return rev
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return packageJson.version
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(getAppVersion()),
  },
  resolve: {
    alias: {
      crypto: '/src/utils/nodeCryptoStub.ts',
      'node:crypto': '/src/utils/nodeCryptoStub.ts',
      'node:fs/promises': '/src/utils/nodeFsPromisesStub.ts',
      perf_hooks: '/src/utils/perfHooksStub.ts',
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
  ],
})
