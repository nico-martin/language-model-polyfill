import fs from "fs";
import path from "path";

const esbuildRawPlugin = () => ({
  name: "raw-plugin",
  setup(build) {
    build.onResolve({ filter: /\?raw$/ }, (args) => {
      return {
        path: path.resolve(args.resolveDir, args.path.split("?")[0]),
        namespace: "raw",
      };
    });

    build.onLoad({ filter: /.*/, namespace: "raw" }, async (args) => {
      const contents = await fs.promises.readFile(args.path, "utf8");
      return {
        contents: `export default ${JSON.stringify(contents)};`,
        loader: "js",
      };
    });
  },
});

export default esbuildRawPlugin;
