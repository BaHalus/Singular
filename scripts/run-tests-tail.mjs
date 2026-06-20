import { spawn } from "node:child_process";

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
  process.stdout.write(`${lines.slice(-500).join("\n")}\n`);
  process.exitCode = code ?? 1;
});
