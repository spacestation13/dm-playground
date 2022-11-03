import { defineStore } from "pinia";
import { ref } from "vue";

export const useSettings = defineStore("settings", () => {
  const doFunny = ref(false);
  function toggleFunny() {
    doFunny.value = !doFunny.value;
  }

  const showConsole = ref(false);
  function toggleShowConsole() {
    showConsole.value = !showConsole.value;
  }

  return { doFunny, toggleFunny, showConsole, toggleShowConsole };
});
