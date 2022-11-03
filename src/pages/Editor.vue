<style lang="scss">
body {
  & > * {
    border-bottom: rgba($grey, 0.5) 1px solid;

    &:last-child {
      border-bottom: none;
    }
  }
}
</style>
<style lang="scss">
.v-codemirror {
  flex: 1 1 0;
  min-height: 0;
  display: block !important;
  padding: var(--dragger-width);
}

.editor-container-h,
.editor-container-v {
  flex: 1 1 auto;
  display: flex;
}

.editor-container-h {
  flex-direction: row;

  & > * {
    border-right: rgba($grey, 0.5) 1px solid;

    &:last-child {
      border-right: none;
    }
  }
}

.editor-container-v {
  flex-direction: column;
  min-width: 0;

  & > * {
    border-bottom: rgba($grey, 0.5) 1px solid;

    &:last-child {
      border-bottom: none;
    }
  }
}
</style>

<template>
  <ResizablePanel direction="down">Project Commands</ResizablePanel>
  <ResizablePanel direction="down">Panel n stuff</ResizablePanel>
  <div class="editor-container-h">
    <ResizablePanel direction="right">Panel n stuff</ResizablePanel>
    <div class="editor-container-v">
      <ResizablePanel direction="down">Editor Commands</ResizablePanel>
      <ResizablePanel direction="down">Panel n stuff</ResizablePanel>
      <Codemirror
        model-value="hiiiiiihiiiiiihiiiiiihiiiiiihiiiiiihiiiiiihiiiiiihiiiiiihiiiiiihiiiiiihiiiiiihiiiiiihiiiiiihiiiiiihiiiiiihiiiiiihiiiiiihiiiiiihiiiiiihiiiiiihiiiiiihiiiiiihiiiiiihiiiiiihiiiiiihiiiiiihiiiiiihiiiiiihiiiiiihiiiiii"
        :extensions="extensions"
        :indent-with-tab="true"
        :tab-size="4"
        @ready="onReady" />
      <ResizablePanel direction="up">Panel n stuff</ResizablePanel>
    </div>
    <ResizablePanel direction="left"
      >Panel n stuhhhhhhhhhhhhhhhhff</ResizablePanel
    >
  </div>
  <StatusBar />
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
import {
  Component,
  inject,
  onMounted,
  onUnmounted,
  provide,
  Ref,
  ref,
  watch,
} from "vue";
import { Codemirror } from "vue-codemirror";
import ResizablePanel from "../components/ResizablePanel.vue";
import StatusBar from "../components/StatusBar.vue";
import { provideLayout } from "../provides";

const editorState = ref<EditorState | null>(null);
const editorView = ref<EditorView | null>(null);
const editorContainer = ref<HTMLDivElement | null>(null);

const remainingXSpace = ref(0);
const remainingYSpace = ref(0);

const observer = new ResizeObserver(entries => {
  remainingXSpace.value = entries[0].borderBoxSize[0].inlineSize;
  remainingYSpace.value = entries[0].borderBoxSize[0].blockSize;
});
onUnmounted(() => observer.disconnect());

const registeredPanels: Record<"x" | "y", Set<Ref<number>>> = {
  x: new Set(),
  y: new Set(),
};
provide(provideLayout, {
  editorElement: editorContainer,
  remainingXSpace,
  remainingYSpace,
  register: (type, size) => {
    registeredPanels[type].add(size);
  },
  unregister: size => {
    registeredPanels.x.delete(size);
    registeredPanels.y.delete(size);
  },
});

function freeBiggestPanel(type: keyof typeof registeredPanels) {
  return function (val: number) {
    if (val >= 100) return;

    const sortedPanels = [...registeredPanels[type].values()].sort(
      ({ value: a }, { value: b }) => b - a,
    );
    const biggestPanel = sortedPanels[0];
    if (!biggestPanel) return;

    biggestPanel.value = 0;
  };
}
watch(remainingXSpace, freeBiggestPanel("x"));
watch(remainingYSpace, freeBiggestPanel("y"));

function onReady({
  state,
  view,
  container,
}: {
  view: import("@codemirror/view").EditorView;
  state: import("@codemirror/state").EditorState;
  container: HTMLDivElement;
}) {
  editorState.value = state;
  editorView.value = view;
  editorContainer.value = container;

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
  panelColorFix,
  noDotted,

  Prec.high(EditorState.tabSize.of(4)),

  controlPanel,
];
</script>
