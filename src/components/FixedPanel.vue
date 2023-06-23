<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  direction: "up" | "down" | "left" | "right";
}>();

const flexOrder = computed(() => {
  switch (props.direction) {
    case "up":
      return "column-reverse";
    case "down":
      return "column";
    case "left":
      return "row-reverse";
    case "right":
      return "row";
  }
});
</script>

<template>
  <div class="tool-panel" :style="{ flexDirection: flexOrder, flexGrow: 1 }">
    <div class="tool-panel-main">
      <slot />
    </div>
  </div>
</template>

<style scoped lang="scss"></style>
