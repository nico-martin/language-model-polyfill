import { build } from "esbuild";
import esbuildRawPlugin from "./esbuild/esbuildRawPlugin.mjs";

const mainConfig = {
  bundle: true,
  minify: true,
  minifySyntax: true,
  treeShaking: true,
  logLevel: "info",
  plugins: [esbuildRawPlugin()],
};

await build({
  ...mainConfig,
  outfile: "dist/worker.compiled.js",
  platform: "browser",
  format: "esm",
  external: ["@huggingface/transformers"],
  entryPoints: ["./src/languageModel/worker.ts"],
  define: {
    __IS_WORKER__: "true",
  },
});

const polyfillConfig = {
  ...mainConfig,
  entryPoints: ["src/index.ts"],
  platform: "neutral",
  external: ["react"],
  define: {
    __IS_WORKER__: "false",
  },
};

await build({
  ...polyfillConfig,
  format: "esm",
  outfile: "dist/language-model-polyfill.es.js",
});

await build({
  ...polyfillConfig,
  format: "cjs",
  outfile: "dist/language-model-polyfill.cjs.js",
});
