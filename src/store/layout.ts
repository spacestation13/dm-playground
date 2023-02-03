import { defineStore } from "pinia";
import { reactive, ref, watch } from "vue";
import { useSaveSetting } from "./_helpers";

interface PanelInfo {
  size: number;
  orientation: "x" | "y";
}

export const useLayout = defineStore("layout", () => {
  ///
  // Panel Info
  ///
  const panelInfoMap = ref(new Map<string, PanelInfo>());

  //Restore info from storage
  const storedPanelInfoMap = new Map(
    useSaveSetting("layout-panel-info", () => [
      ...panelInfoMap.value.entries(),
    ]),
  );

  interface PanelConstructor {
    panelId: string;
    orientation: "x" | "y";
  }
  function registerOrFetchPanelInfo(settings: PanelConstructor): PanelInfo {
    const { panelId, ..._panelInfo } = settings;
    if (panelInfoMap.value.has(panelId))
      return panelInfoMap.value.get(panelId)!;

    const panelInfo = reactive(
      Object.assign(
        {
          size: 0,
        },
        _panelInfo,
        storedPanelInfoMap.get(panelId),
      ),
    );
    panelInfoMap.value.set(panelId, panelInfo);
    return panelInfo;
  }
  function getPanelInfo(panelId: string) {
    return panelInfoMap.value.get(panelId);
  }

  ///
  // Remaining space
  ///
  const remainingXSpace = ref(Infinity);
  const setRemainingXSpace = (val: number) => (remainingXSpace.value = val);
  const remainingYSpace = ref(Infinity);
  const setRemainingYSpace = (val: number) => (remainingYSpace.value = val);
  watch(remainingXSpace, freeBiggestPanel("x"));
  watch(remainingYSpace, freeBiggestPanel("y"));
  //Finds the biggest panel and resets it, if next resize we arent big enough, clear the next biggest panel
  function freeBiggestPanel(type: "x" | "y") {
    let invalidatedPanels: Set<string> | null = new Set();

    return function (val: number) {
      if (val >= 100) {
        invalidatedPanels = null;
        return;
      }

      console.log("Layout is invalid, freeing space");

      if (!invalidatedPanels) invalidatedPanels = new Set();

      const sortedPanels = [...panelInfoMap.value]
        .filter(([_id, panelInfo]) => panelInfo.orientation === type)
        .filter(([id, _panelInfo]) => !invalidatedPanels!.has(id))
        .sort(([, { size: a }], [, { size: b }]) => b - a);
      const [biggestPanelId, biggestPanel] = sortedPanels[0];
      if (!biggestPanel) {
        invalidatedPanels = null;
        return;
      }

      biggestPanel.size = 0;
      invalidatedPanels.add(biggestPanelId);
    };
  }

  ///
  // Editor Element
  ///
  const editorElement = ref<HTMLDivElement | null>(null);
  function setEditorElement(element: HTMLDivElement) {
    editorElement.value = element;
  }

  return {
    panelInfoMap,
    getPanelInfo,
    registerOrFetchPanelInfo,
    editorElement,
    setEditorElement,

    remainingXSpace,
    setRemainingXSpace,
    remainingYSpace,
    setRemainingYSpace,
  };
});
