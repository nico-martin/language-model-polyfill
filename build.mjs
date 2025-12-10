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

const polyfillConfig = {
  ...mainConfig,
  entryPoints: ["src/index.ts"],
  platform: "neutral",
  external: ["react"],
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
