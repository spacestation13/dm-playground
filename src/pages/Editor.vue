<style scoped lang="scss">
.v-codemirror {
  max-width: 100%;
  flex-grow: 1;
  display: block !important;
}

.editor-container {
  width: 100%;
  flex-grow: 1;
  display: flex;
  flex-direction: row;
}

.toolbar {
  width: 100%;
}
</style>

<template>
  <div class="toolbar">
    <button class="button is-primary">Run Code</button>
  </div>
  <div class="editor-container">
    <Codemirror
      :extensions="extensions"
      :indent-with-tab="true"
      :tab-size="4"
      @ready="yoink" />
  </div>
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
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
} from "@codemirror/language";
import { lintKeymap } from "@codemirror/lint";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { EditorState, Extension, Prec } from "@codemirror/state";
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
import { Codemirror } from "vue-codemirror";

const fullHeight = EditorView.theme({
  "&": {
    height: "100%",
  },
  ".cm-scroller": {
    flexGrow: 1,
  },
});
const darkMode = EditorView.theme({}, { dark: true });

const controlPanel = showPanel.of(() => {
  const dom = document.createElement("div");
  dom.className = "cm-help-panel";

  const btn = document.createElement("button");
  btn.innerText = "Run Code";
  btn.className = "button is-primary";

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

  Prec.high(EditorState.tabSize.of(4)),

  controlPanel,
];

function yoink(stuff: any) {
  //@ts-ignore
  window.lmao = stuff;
}
</script>
