import { defineStore } from "pinia";
import { ref, watch } from "vue";
import { emulator } from "../vm/emulator";

export const useSettings = defineStore("settings", () => {
  const doFunny = ref(false);
  function toggleFunny() {
    doFunny.value = !doFunny.value;
  }

  const showConsole = ref(false);
  function toggleShowConsole() {
    showConsole.value = !showConsole.value;
  }
  watch(showConsole, emulator.resetTerminal);

  return { doFunny, toggleFunny, showConsole, toggleShowConsole };
});
