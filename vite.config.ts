import * as path from "node:path";
import { defineConfig } from "vite";
import dtsPlugin from "vite-plugin-dts";
import { externalDepsPlugin } from "@saber71/external-deps-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    externalDepsPlugin({ root: "../" }),
    dtsPlugin({ rollupTypes: true }),
  ],
  build: {
    lib: {
      entry: path.resolve(".", "src/index.ts"),
      formats: ["es"],
      fileName: "index",
    },
  },
});
