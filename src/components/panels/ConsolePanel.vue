<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 100%;

  & > *:not(:last-child) .console-inner {
    margin-right: 1px;
  }

  & h5 {
    text-align: center;
    font-size: larger;
  }
}

.console-console {
  flex: 1 1 0;
}

.console-screen,
.console-controller {
  flex: 25% 0 0;
}

.console {
  display: flex;
  flex-direction: column;
}

.console-inner {
  flex: 1 1 0;
}
</style>

<template>
  <ResizablePanel
    direction="up"
    panel-id="console"
    ref="panel"
    v-show="settings.showConsole">
    <div class="container" ref="elementContainer">
      <div class="console console-console">
        <h5
          @pointerdown.prevent="panel?.onDragStart"
          @pointermove="panel?.onDragMove"
          @pointerup="panel?.onDragEnd">
          Terminal
        </h5>
        <div class="console-inner" ref="elementCon"></div>
      </div>
      <div class="console console-screen">
        <h5
          @pointerdown.prevent="panel?.onDragStart"
          @pointermove="panel?.onDragMove"
          @pointerup="panel?.onDragEnd">
          Screen Output
        </h5>
        <div class="console-inner" ref="elementSrn"></div>
      </div>
      <div class="console console-controller">
        <h5
          @pointerdown.prevent="panel?.onDragStart"
          @pointermove="panel?.onDragMove"
          @pointerup="panel?.onDragEnd">
          Controller
        </h5>
        <div class="console-inner" ref="elementCtl"></div>
      </div>
    </div>
  </ResizablePanel>
</template>

<script lang="ts" setup>
import { onMounted, ref } from "vue";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { useSettings } from "../../store/settings";
import { useEventListener } from "../../utils/composables";
import { emulator } from "../../vm/emulator";
import ResizablePanel from "../ResizablePanel.vue";
import "xterm/css/xterm.css";

const settings = useSettings();

const panel = ref<typeof ResizablePanel | null>(null);

const termCon = new Terminal({ convertEol: true, logLevel: "off" });
const termSrn = new Terminal({
  convertEol: true,
  logLevel: "off",
  disableStdin: true,
});
const termCtl = new Terminal({ convertEol: true, logLevel: "off" });
const fitAddonCon = new FitAddon();
const fitAddonSrn = new FitAddon();
const fitAddonCtl = new FitAddon();

termCon.loadAddon(fitAddonCon);
termSrn.loadAddon(fitAddonSrn);
termCtl.loadAddon(fitAddonCtl);

const elementContainer = ref<HTMLDivElement | null>(null);
const elementCon = ref<HTMLDivElement | null>(null);
const elementSrn = ref<HTMLDivElement | null>(null);
const elementCtl = ref<HTMLDivElement | null>(null);

onMounted(() => {
  termCon.open(elementCon.value!);
  termSrn.open(elementSrn.value!);
  termCtl.open(elementCtl.value!);

  observer.observe(elementContainer.value!);
  reFit();
});

const observer = new ResizeObserver(reFit);

function reFit() {
  //Why do we need to resize them all to 1x1 before resizing them, BECAUSE IT DOESN'T WORK OTHERWISE AND FUCK YOU I HATE YOU
  termCon.resize(1, 1);
  fitAddonCon.fit();
  //For some reason, resizing the terminal moves the cursor 1 character to the left
  termCon.write(" ");
  termSrn.resize(1, 1);
  fitAddonSrn.fit();
  termCtl.resize(1, 1);
  fitAddonCtl.fit();
  //For some reason, resizing the terminal moves the cursor 1 character to the left
  termCtl.write(" ");
}

function handleResetOutputConsole() {
  termCon.reset();
  termCon.writeln(
    "This console allows you to interact with the virtual machine that is running BYOND. The virtual machine runs a custom stripped down version of linux. The only installed text editor is `vi`. Run the `resize` command if the terminal size is wrong.",
  );
  reFit();
}
useEventListener(emulator, "resetOutputConsole", handleResetOutputConsole);
useEventListener(emulator, "receivedOutputConsole", chr => {
  termCon.write(chr);
});
useEventListener(emulator, "receivedOutputScreen", chr => termSrn.write(chr));
useEventListener(emulator, "receivedOutputController", chr => {
  console.log(chr);
  if (chr === "\n") {
    chr = "\n< ";
  }
  if (chr === "\u0000") {
    chr = "\n---\n> ";
  }
  termCtl.write(chr);
});
useEventListener(emulator, "sentToController", chr => {
  termCtl.write(chr.replace(/\x00/g, "\n---\n< "));
});

termCon.onData(data => {
  emulator.sendTerminal(data);
});
termCtl.onData(data => {
  if (data === "\r") {
    data = "\0";
  }

  emulator.sendController(data);
});
</script>
