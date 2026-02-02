type EmulatorPort = "console" | "screen" | "controller";

declare function importScripts(...urls: string[]): void;

type EmulatorInboundMessage =
  | { type: "sendPort"; port: EmulatorPort; data: string }
  | { type: "resizePort"; port: EmulatorPort; rows: number; cols: number }
  | { type: "start" }
  | { type: "pause" }
  | { type: "sendFile"; name: string; data: Uint8Array };

type EmulatorOutboundMessage =
  | { type: "receivedOutput"; port: EmulatorPort; data: string }
  | { type: "resetOutputConsole" }
  | { type: "asyncResponse"; commandId: string };

const url = new URL(self.location.href);
const vmRemoteUrl =
  url.searchParams.get("vmRemoteUrl") ??
  "https://spacestation13.github.io/dm-playground-linux/";
const vmLocalUrl = "/lib/";

let controllerBuffer = "";
const pendingEvents: Array<{
  type: "stdout" | "stderr" | "pidexit";
  pid: number;
  data?: string;
  code?: number;
}> = [];

const base64Encode = (value: string) => {
  try {
    return btoa(value);
  } catch {
    return value;
  }
};

const enqueueStdout = (pid: number, data: string) => {
  pendingEvents.push({ type: "stdout", pid, data });
};

const enqueueStderr = (pid: number, data: string) => {
  pendingEvents.push({ type: "stderr", pid, data });
};

const enqueueExit = (pid: number, code = 0) => {
  pendingEvents.push({ type: "pidexit", pid, code });
};

const post = (message: EmulatorOutboundMessage) => {
  self.postMessage(message);
};

self.addEventListener(
  "message",
  (event: MessageEvent<EmulatorInboundMessage>) => {
    const { data } = event;

    switch (data.type) {
      case "start":
        post({ type: "resetOutputConsole" });
        post({
          type: "receivedOutput",
          port: "console",
          data: `VM assets (remote): ${vmRemoteUrl}bzImage and ${vmRemoteUrl}rootfs.cpio.lz4\n`,
        });
        try {
          importScripts(`${vmLocalUrl}libv86.js`);
          post({
            type: "receivedOutput",
            port: "console",
            data: "Loaded libv86.js\n",
          });
          post({ type: "receivedOutput", port: "controller", data: "HELLO\0" });
        } catch (error) {
          post({
            type: "receivedOutput",
            port: "console",
            data: `Failed to load libv86.js: ${(error as Error).message}\n`,
          });
        }
        break;
      case "pause":
        post({ type: "receivedOutput", port: "console", data: "VM paused\n" });
        break;
      case "sendPort": {
        if (data.port !== "controller") {
          post({ type: "receivedOutput", port: data.port, data: data.data });
          break;
        }

        controllerBuffer += data.data;
        const parts = controllerBuffer.split("\0");
        controllerBuffer = parts.pop() ?? "";
        for (const part of parts) {
          const message = part.trim();
          if (!message) {
            continue;
          }
          if (message.startsWith("run")) {
            const tokens = message.split(" ");
            const pid = Number(tokens[1]);
            const command = tokens.slice(2).join(" ");
            enqueueStdout(pid, `Simulated run: ${command}\n`);
            enqueueExit(pid, 0);
          } else if (message.startsWith("signal")) {
            const tokens = message.split(" ");
            const pid = Number(tokens[1]);
            enqueueStderr(pid, `Simulated signal ${tokens[2] ?? ""}\n`);
            enqueueExit(pid, 0);
          } else if (message.startsWith("poll")) {
            const lines = pendingEvents.splice(0).map((eventItem) => {
              if (eventItem.type === "pidexit") {
                return base64Encode(
                  `pidexit ${eventItem.pid} ${eventItem.code ?? 0}`,
                );
              }
              const payload = eventItem.data ?? "";
              return base64Encode(
                `${eventItem.type} ${eventItem.pid} ${payload}`,
              );
            });
            post({
              type: "receivedOutput",
              port: "controller",
              data: `${lines.join("\n")}\0`,
            });
          }
        }
        break;
      }
      case "resizePort":
        break;
      case "sendFile":
        post({
          type: "receivedOutput",
          port: "console",
          data: `Received file ${data.name}\n`,
        });
        break;
      default:
        break;
    }
  },
);
