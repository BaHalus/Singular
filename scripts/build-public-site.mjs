import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const output = path.join(root, "dist");
const entries = [
  "mobile.html",
  "manifest.webmanifest",
  "sw.js",
  "icons",
  "src",
];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const entry of entries) {
  await cp(path.join(root, entry), path.join(output, entry), { recursive: true });
}

await writeFile(
  path.join(output, "index.html"),
  '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=./mobile.html"><title>SINGULAR Alpha</title></head><body><p><a href="./mobile.html">Abrir SINGULAR Alpha</a></p></body></html>\n',
  "utf8",
);

await writeFile(path.join(output, ".nojekyll"), "", "utf8");
console.log(`Public site assembled at ${output}`);
