// noinspection NodeCoreCodingAssistance
import path from "path";
import vue from "@vitejs/plugin-vue";
import checker from "vite-plugin-checker";
import ConditionalCompile from "vite-plugin-conditional-compiler";

/** @type {import("vite").UserConfig} */
const config = {
  root: "./src",
  plugins: [
    ConditionalCompile(),
    vue(),
    checker({
      typescript: true,
      vueTsc: true,
    }),
  ],
  resolve: {
    alias: {
      "~style": path.resolve(__dirname, "src/styles"),
    },
    preserveSymlinks: true,
  },
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      scss: {
        additionalData: '@import "~style/bulma/theme/_variables.scss";',
      },
    },
  },
  server: {
    host: "0.0.0.0",
    strictPort: true,
  },
  build: {
    sourcemap: true,
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      external: ["old/**"],
    },
  },
};

export default config;
