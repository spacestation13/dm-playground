import { Component, InjectionKey, Ref } from "vue";

export const provideLayout = Symbol("provideLayout") as InjectionKey<{
  editorElement: Ref<HTMLDivElement | null>;
  remainingXSpace: Ref<number>;
  remainingYSpace: Ref<number>;
  register: (type: "x" | "y", panel: Ref<number>) => void;
  unregister: (panel: Ref<number>) => void;
}>;
