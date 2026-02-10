import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { monaco } from '@bithero/monaco-editor-vite-plugin'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    tailwindcss(),
    monaco({
      languages: [],
      // export type EditorFeature = 'anchorSelect' | 'bracketMatching' | 'browser' | 'caretOperations' | 'caretOperations' | 'clipboard' | 'codeAction' | 'codeEditor' | 'codelens' | 'codicon' | 'codicon' | 'colorPicker' | 'comment' | 'contextmenu' | 'cursorUndo' | 'diffEditor' | 'diffEditorBreadcrumbs' | 'dnd' | 'documentSymbols' | 'dropOrPasteInto' | 'dropOrPasteInto' | 'find' | 'floatingMenu' | 'folding' | 'fontZoom' | 'format' | 'gotoError' | 'gotoLine' | 'gotoSymbol' | 'gotoSymbol' | 'gpu' | 'hover' | 'iPadShowKeyboard' | 'inPlaceReplace' | 'indentation' | 'inlayHints' | 'inlineCompletions' | 'inlineProgress' | 'insertFinalNewLine' | 'inspectTokens' | 'internal' | 'lineSelection' | 'linesOperations' | 'linkedEditing' | 'links' | 'longLinesHelper' | 'middleScroll' | 'multicursor' | 'parameterHints' | 'placeholderText' | 'quickCommand' | 'quickHelp' | 'quickOutline' | 'readOnlyMessage' | 'referenceSearch' | 'rename' | 'sectionHeaders' | 'semanticTokens' | 'semanticTokens' | 'smartSelect' | 'snippet' | 'stickyScroll' | 'suggest' | 'suggest' | 'toggleHighContrast' | 'toggleTabFocusMode' | 'tokenization' | 'unicodeHighlighter' | 'unusualLineTerminators' | 'wordHighlighter' | 'wordOperations' | 'wordPartOperations';
      features: [
        'bracketMatching',
        'caretOperations',
        'clipboard',
        'find',
        'inPlaceReplace',
        'folding',
        'fontZoom',
        'gotoLine',
        'hover',
        'indentation',
        'links',
        'linesOperations',
        'multicursor',
        'parameterHints',
        'quickCommand',
        'smartSelect',
        'suggest',
        'wordHighlighter',
        'wordOperations',
      ],
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/react')) {
            return 'react'
          }
        },
      },
    },
  },
})
