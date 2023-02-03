<template>
  <div class="tool-panel" :style="{ flexDirection: flexOrder }">
    <div class="tool-panel-main" :style="mainStyle" ref="contentsElement">
      <slot />
    </div>

    <div :class="cssClass">
      <div
        class="dragger-inner"
        @pointerdown.prevent="onDragStart"
        @pointermove="onDragMove"
        @pointerup="onDragEnd" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useLayout } from "../store/layout";

const props = withDefaults(
  defineProps<{
    direction: "up" | "down" | "left" | "right";
    panelId: string;
    baseSize?: string;
  }>(),
  {
    baseSize: "5em",
  },
);

const contentsElement = ref<HTMLDivElement | null>(null);
const isY = computed(
  () => props.direction === "up" || props.direction === "down",
);
const isReversed = computed(
  () => props.direction === "up" || props.direction === "left",
);
const layout = useLayout();
const panelInfo = layout.registerOrFetchPanelInfo({
  panelId: props.panelId,
  orientation: isY.value ? "y" : "x",
});

const cssClass = computed(() => (isY.value ? "dragger-y" : "dragger-x"));
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

const mainStyle = computed(() => ({
  [isY.value
    ? "height"
    : "width"]: `calc(${props.baseSize} + ${panelInfo.size}px )`,
}));

let pointerid: number;
const dragOrigin = ref<[x: number, y: number] | null>(null);
function onDragStart(e: PointerEvent) {
  dragOrigin.value = [e.clientX, e.clientY];
  (e.target as HTMLDivElement).setPointerCapture(e.pointerId);
  pointerid = e.pointerId;
}
function onDragEnd(e: PointerEvent) {
  if (e.pointerId !== pointerid) return;

  onDragMove(e);
  dragOrigin.value = null;
  (e.target as HTMLDivElement).releasePointerCapture(pointerid);
}

/*const tracker = document.createElement("div");
tracker.style.width = "40px";
tracker.style.height = "40px";
tracker.style.position = "fixed";
tracker.style.marginTop = "-20px";
tracker.style.marginLeft = "-20px";
tracker.style.backgroundColor = "yellow";
document.body.appendChild(tracker);
watch(dragOrigin, val => {
  if (!val) return;

  tracker.style.left = val[0] + "px";
  tracker.style.top = val[1] + "px";
});*/

let originLockedGrowth = false;
let originLockedShrink = false;
function onDragMove(e: PointerEvent) {
  if (e.pointerId !== pointerid) return;
  if (!dragOrigin.value) return;

  const newOrigin: [number, number] = [e.clientX, e.clientY];

  const deltas = [
    newOrigin[0] - dragOrigin.value[0],
    newOrigin[1] - dragOrigin.value[1],
  ];
  let delta = isY.value ? deltas[1] : deltas[0];
  delta = isReversed.value ? -delta : delta;

  const remainingSpace = isY.value
    ? layout.editorElement!.getBoundingClientRect().height
    : layout.editorElement!.getBoundingClientRect().width;

  if (remainingSpace - delta < 100) {
    delta = remainingSpace - 100;

    newOrigin[isY.value ? 1 : 0] = isY.value
      ? (e.target as HTMLDivElement).getBoundingClientRect().y
      : (e.target as HTMLDivElement).getBoundingClientRect().x;
    dragOrigin.value = newOrigin;
    originLockedGrowth = true;
  } else {
    originLockedGrowth = false;
  }

  contentsElement.value!.style.backgroundPosition = `calc(${props.baseSize} + ${
    panelInfo.size + delta
  }px )`;
  const computedSize = parseInt(
    getComputedStyle(contentsElement.value!).backgroundPosition.slice(0, -2),
  );
  if (computedSize < 50) {
    delta += 50 - computedSize;

    newOrigin[isY.value ? 1 : 0] = isY.value
      ? (e.target as HTMLDivElement).getBoundingClientRect().y
      : (e.target as HTMLDivElement).getBoundingClientRect().x;
    dragOrigin.value = newOrigin;
    originLockedShrink = true;
  } else {
    originLockedShrink = false;
  }

  //dont update the origin if we are clamped
  if (!originLockedGrowth && !originLockedShrink) dragOrigin.value = newOrigin;

  panelInfo.size += delta;
}

defineExpose({
  onDragStart,
  onDragEnd,
  onDragMove,
});
</script>

<style lang="scss" scoped>
.tool-panel-main {
  //padding: var(--dragger-width);
  overflow: auto;
  width: 100%;
  height: 100%;
}

%dragger {
  /*position: absolute;*/
  flex: 0 0 0;
  overflow: visible;
}

.dragger-inner {
  position: absolute;
  z-index: $z-index-draggers;
}

.dragger-x {
  @extend %dragger;
  /*top: 0;
  bottom: 0;*/
  //margin-right: -50%;
  cursor: ew-resize;

  & .dragger-inner {
    width: var(--dragger-width);
    height: 100%;
    margin-left: calc(var(--dragger-width) * -0.5);
  }
}

.dragger-y {
  @extend %dragger;
  /*left: 0;
  right: 0;*/
  //margin-bottom: -50%;
  cursor: ns-resize;
  & .dragger-inner {
    height: var(--dragger-width);
    width: 100%;
    margin-top: calc((var(--dragger-width) - 1px) * -0.5);
  }
}
</style>
