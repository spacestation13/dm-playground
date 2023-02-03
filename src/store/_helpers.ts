import { watchEffect } from "vue";

export function useSaveSetting<T>(
  storageKey: string,
  callback: () => T,
  debounceTimer = 500,
): T | null {
  function savePanelInfo(value: T) {
    return function () {
      console.log("saving....");
      localStorage.setItem(storageKey, JSON.stringify(value));
    };
  }
  let debounceTimerId: number | null = null;
  watchEffect(() => {
    if (debounceTimerId !== null) clearTimeout(debounceTimerId);
    debounceTimerId = setTimeout(
      savePanelInfo(callback()),
      debounceTimer,
    ) as unknown as number;
  });
  window.addEventListener("beforeunload", () => savePanelInfo(callback()));

  return JSON.parse(localStorage.getItem(storageKey) ?? "null");
}
