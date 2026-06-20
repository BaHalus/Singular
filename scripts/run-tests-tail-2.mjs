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
  const failureIndexes = lines
    .map((line, index) => line.startsWith("not ok ") ? index : -1)
    .filter(index => index >= 0);
  const selected = [];

  for (const index of failureIndexes) {
    const start = Math.max(0, index - 3);
    const end = Math.min(lines.length, index + 45);
    selected.push(...lines.slice(start, end), "--- FAILURE SEPARATOR ---");
  }

  const summaryStart = lines.findLastIndex(line => line.startsWith("1.."));
  if (summaryStart >= 0) selected.push(...lines.slice(summaryStart));
  if (selected.length === 0) selected.push(...lines.slice(-120));

  const diagnostic = `${selected.join("\n")}\n`;
  writeFileSync("test-tail.txt", diagnostic, "utf8");
  process.stdout.write(diagnostic);
  process.exitCode = code ?? 1;
});
