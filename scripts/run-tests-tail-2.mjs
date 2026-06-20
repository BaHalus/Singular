import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const child = spawn(process.execPath, ["--test"], {
  cwd: process.cwd(),
  env: process.env,
  stdio: ["ignore", "pipe", "pipe"],
});

let output = "";
child.stdout.on("data", chunk => { output += chunk; });
child.stderr.on("data", chunk => { output += chunk; });
child.on("close", code => {
  const lines = output.split(/\r?\n/);
  const diagnostic = `${lines.slice(-1200).join("\n")}\n`;
  writeFileSync("test-tail.txt", diagnostic, "utf8");
  process.stdout.write(`${lines.slice(-80).join("\n")}\n`);
  process.exitCode = code ?? 1;
});
