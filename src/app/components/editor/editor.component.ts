import { Component, ViewChild } from '@angular/core';
import { EditorView } from 'codemirror';
import {
  bracketMatching,
  defaultHighlightStyle,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language';
import {
  EditorState,
  Extension,
  Prec,
  StateEffect,
  StateField,
} from '@codemirror/state';
import {
  crosshairCursor,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
  showPanel,
} from '@codemirror/view';
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from '@codemirror/autocomplete';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands';
import { lintKeymap } from '@codemirror/lint';
import { ExecutorService } from '../../../vm/executor.service';
import { CodeEditor } from '@acrodata/code-editor';
import { dracula as draculaTheme } from 'thememirror';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [CodeEditor, FormsModule],
  templateUrl: './editor.component.html',
  styleUrl: './editor.component.scss',
})
export class EditorComponent {
  protected extensions: Extension[];
  protected content = `/world/New()
  world.log << "meow";
  ..()
  eval("")
  shutdown()
  `;
  @ViewChild('editor')
  private editor!: CodeEditor;

  constructor(private executor: ExecutorService) {
    const noDotted = EditorView.theme({
      '&.cm-editor.cm-focused': {
        outline: 'none',
      },
    });
    const panelColorFix = EditorView.theme({
      '.cm-panels': {
        backgroundColor: '#282a36',
      },
    });
    const fullHeight = EditorView.theme({
      '&': {
        height: '100%',
      },
      '.cm-scroller': {
        flexGrow: 1,
      },
    });
    const darkMode = EditorView.theme({}, { dark: true });

    const runCodeEffect = StateEffect.define<void>();
    const runCodeField = StateField.define<void>({
      update(state, tr) {
        if (tr.effects.some((e) => e.is(runCodeEffect))) {
          executor.executeImmediate(tr.newDoc.toString());
        }
      },
      create() {},
    });
    const controlPanel = showPanel.of(() => {
      const dom = document.createElement('div');
      dom.className = 'cm-help-panel';

      const btn = document.createElement('button');
      btn.innerText = 'Run Code';
      btn.className = 'button is-primary';
      btn.onclick = () => {
        this.editor.view?.dispatch(
          this.editor.view?.state.update({
            effects: [runCodeEffect.of()],
          }),
        );
      };

      dom.appendChild(btn);

      return { top: true, dom };
    });

    this.extensions = [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      history(),
      //foldGutter(), TODO: fix dis shiet
      drawSelection(),
      dropCursor(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      bracketMatching({
        brackets: '()[]',
      }),
      closeBrackets(),
      autocompletion(), //todo: the smart
      rectangularSelection(),
      crosshairCursor(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap,
        ...lintKeymap,
        indentWithTab,
      ]),

      draculaTheme,

      fullHeight,
      darkMode,
      panelColorFix,
      noDotted,

      Prec.high(EditorState.tabSize.of(2)),

      [controlPanel],
      [runCodeField],
    ];
  }
}
