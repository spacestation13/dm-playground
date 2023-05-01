<template>
  <Codemirror
    :model-value="`/world/New()
  world.log << &quot;meow&quot;
  ..()
  eval(&quot;&quot;)
  shutdown()`"
    :extensions="extensions"
    :indent-with-tab="true"
    :tab-size="2"
    @ready="onReady" />
</template>

<script setup lang="ts">
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from "@codemirror/autocomplete";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  bracketMatching,
  defaultHighlightStyle,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
} from "@codemirror/language";
import { lintKeymap } from "@codemirror/lint";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import {
  EditorState,
  Extension,
  Prec,
  StateEffect,
  StateField,
} from "@codemirror/state";
import {
  crosshairCursor,
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
  showPanel,
} from "@codemirror/view";
import { dracula as draculaTheme } from "thememirror";
import { onUnmounted, ref } from "vue";
import { Codemirror } from "vue-codemirror";
import { useLayout } from "../store/layout";
import { executor } from "../vm/executor";

const layout = useLayout();

let editorView: EditorView;

const observer = new ResizeObserver(entries => {
  layout.setRemainingXSpace(entries[0].borderBoxSize[0].inlineSize);
  layout.setRemainingYSpace(entries[0].borderBoxSize[0].blockSize);
});
onUnmounted(() => observer.disconnect());

function onReady({
  view,
  container,
}: {
  view: EditorView;
  container: HTMLDivElement;
}): void {
  editorView = view;
  layout.setEditorElement(container);

  observer.observe(container);
}

const noDotted = EditorView.theme({
  "&.cm-editor.cm-focused": {
    outline: "none",
  },
});
const panelColorFix = EditorView.theme({
  ".cm-panels": {
    backgroundColor: "#282a36",
  },
});
const fullHeight = EditorView.theme({
  "&": {
    height: "100%",
  },
  ".cm-scroller": {
    flexGrow: 1,
  },
});
const darkMode = EditorView.theme({}, { dark: true });

const runCodeEffect = StateEffect.define<void>();
const runCodeField = StateField.define<void>({
  update(state, tr) {
    if (tr.effects.some(e => e.is(runCodeEffect))) {
      executor.executeImmediate(tr.newDoc.toString());
    }
  },
  create() {},
});
const controlPanel = showPanel.of(() => {
  const dom = document.createElement("div");
  dom.className = "cm-help-panel";

  const btn = document.createElement("button");
  btn.innerText = "Run Code";
  btn.className = "button is-primary";
  btn.onclick = function () {
    editorView.dispatch(
      editorView.state.update({
        effects: [runCodeEffect.of()],
      }),
    );
  };

  dom.appendChild(btn);

  return { top: true, dom };
});

const extensions: Extension[] = [
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
    brackets: "()[]",
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
</script>

<style scoped></style>
