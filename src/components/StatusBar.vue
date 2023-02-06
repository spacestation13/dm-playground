<style lang="scss" scoped>
button {
  display: inline-block;
  height: 100%;
  border: none;
}

* {
  padding-top: 0;
  padding-bottom: 0;
}
</style>

<template>
  <div class="tool-panel py-0 px-2 has-background-primary">
    hey :)
    <button
      class="b-button button"
      :class="{ 'b-is-primary': settingsStore.doFunny }"
      @click="() => emulator.start()">
      Do Funny
    </button>
    <button
      class="b-button"
      :class="{ 'b-is-primary': settingsStore.showConsole }"
      @click="settingsStore.toggleShowConsole">
      Show Console
    </button>
  </div>
</template>

<script setup lang="ts">
import { useSettings } from "../store/settings";
import { emulator } from "../vm/emulator";
const settingsStore = useSettings();
</script>
