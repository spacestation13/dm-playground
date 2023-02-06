import { createPinia } from "pinia";
import { createApp } from "vue";
import VueCodemirror from "vue-codemirror";
import { createWebHistory, createRouter } from "vue-router";

import rootComponent from "./index.vue";

import "./styles/default.scss";
import "./styles/bulma/bulma.scss";

import * as Emulator from "./vm/emulator";
import * as Command from "./vm/command";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      name: "edit",
      path: "/edit",
      component: () => import("./pages/Editor.vue"),
    },
    {
      path: "/",
      redirect: "/edit",
    },
    {
      name: "notfound",
      path: "/:path(.*)*",
      component: () => import("./pages/PageNotFound.vue"),
    },
  ],
});

const app = createApp(rootComponent);
app.use(router);

app.config.optionMergeStrategies.render = (_parentVal, _childVal) => {
  const parentVal = _parentVal as Function;
  const childVal = _childVal as Function;
  if (parentVal) {
    return function render(this: unknown, ...args: any[]) {
      args.push([childVal.apply(this, args)]);
      return parentVal.apply(this, args);
    };
  }
  return childVal;
};

const pinia = createPinia();

app.use(pinia);

app.use(VueCodemirror, {
  // keep the global default extensions empty
  extensions: [],
});

app.mount("body");

//@ts-ignore
window.emulator = Emulator;
//@ts-ignore
window.command = Command;
