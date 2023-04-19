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
  <div class="editor-container-h">
    <div class="editor-container-v">
      <TestPanel />
      <TextEditor />
    </div>
  </div>
  <ConsolePanel />
  <StatusBar />
</template>

<script setup lang="ts">
import ConsolePanel from "../components/panels/ConsolePanel.vue";
import TestPanel from "../components/panels/TestPanel.vue";
import StatusBar from "../components/StatusBar.vue";
import TextEditor from "../components/TextEditor.vue";
</script>
