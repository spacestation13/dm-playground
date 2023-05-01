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
</style>

<template>
  <div class="panel-container-h">
    <div class="panel-container-v">
      <TestPanel />
      <TextEditor />
    </div>
    <ResizablePanel panel-id="test-panel-right-2" direction="left">
      <h5>Output:</h5>
      <pre style="overflow: auto"></pre>
    </ResizablePanel>
  </div>
  <ConsolePanel />
  <StatusBar />
</template>

<script setup lang="ts">
import ConsolePanel from "../components/panels/ConsolePanel.vue";
import TestPanel from "../components/panels/TestPanel.vue";
import ResizablePanel from "../components/ResizablePanel.vue";
import StatusBar from "../components/StatusBar.vue";
import TextEditor from "../components/TextEditor.vue";
</script>
