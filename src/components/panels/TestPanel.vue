<template>
  <ResizablePanel direction="down" panel-id="test-panel">
    <div class="panel-container-h">
      <ResizablePanel panel-id="test-panel-right" direction="right">
        <h5>Output:</h5>
        <pre style="overflow: auto">{{ outputCompiler }}</pre>
      </ResizablePanel>
      <FixedPanel direction="down">
        <h5>Output:</h5>
        <pre style="overflow: auto">{{ output }}</pre>
      </FixedPanel>
    </div>
  </ResizablePanel>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { useEventListener } from "../../utils/composables";
import { executor } from "../../vm/executor";
import FixedPanel from "../FixedPanel.vue";
import ResizablePanel from "../ResizablePanel.vue";

const output = ref("");
const outputCompiler = ref("");

useEventListener(executor, "output", x => {
  output.value += x + "\n";
});
useEventListener(executor, "reset", () => {
  output.value = "";
});
</script>
