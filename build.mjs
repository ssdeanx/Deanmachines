import { build } from "esbuild";
import { fixExtensionsPlugin } from "esbuild-fix-imports-plugin";

build({
  entryPoints: ["src/mastra/index.ts"], // or your entry file(s)
  outdir: ".mastra",
  bundle: false,
  format: "esm",
  plugins: [fixExtensionsPlugin()],
  platform: "node",
  sourcemap: true,
  target: "node16", // or your Node version
  // ...other options
}).catch(() => process.exit(1));