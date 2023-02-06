<template>
  <ResizablePanel direction="right" panel-id="test-panel">
    <button class="b-btn b-is-primary" @click="runCursed">Run test code</button>
    <button class="b-btn b-is-primary" @click="poll">Poll</button>
    <h5>Output:</h5>
    <pre>
      {{ output }}
    </pre>
  </ResizablePanel>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { commandQueue } from "../../vm/command";
import { emulator } from "../../vm/emulator";
import ResizablePanel from "../ResizablePanel.vue";

const output = ref("");

async function runCursed() {
  emulator.sendFile(
    "code.dme",
    `/world/New()
    world.log << "meow"
    ..()
    shutdown()`,
  );
  const compiler = await commandQueue.runProcess(
    "/byond/bin/DreamMaker",
    "/mnt/host/code.dme",
    new Map([["LD_LIBRARY_PATH", "/byond/bin"]]),
  );
  await new Promise(r => compiler.on("exit", r));
  const server = await commandQueue.runProcess(
    "/byond/bin/DreamDaemon",
    "/mnt/host/code.dmb\0-trusted",
    new Map([["LD_LIBRARY_PATH", "/byond/bin"]]),
  );
  server.on("stderr", val => {
    output.value += val;
  });
}

function poll() {
  commandQueue.queueCommand({
    type: "poll",
  });
}
</script>
