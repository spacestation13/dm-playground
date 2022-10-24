<template>
  <router-view></router-view>
</template>

<script setup lang="ts">
import { onErrorCaptured } from "vue";

onErrorCaptured(e => {
  console.error("Uncaught error", e);
  alert("Uncaught error!"); //TODO: make this a proper popup
});
</script>

<style scoped lang="scss"></style>
