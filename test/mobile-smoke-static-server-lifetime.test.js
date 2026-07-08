import { spawn } from "node:child_process";
import { once } from "node:events";
import { get } from "node:http";
import { Agent } from "node:http";
import { createServer } from "node:net";
import { test } from "node:test";
import assert from "node:assert/strict";

async function getAvailablePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const port = address.port;
  server.close();
  await once(server, "close");
  return port;
}

function wait(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

async function stopServer(process) {
  if (process.exitCode !== null || process.signalCode !== null) return;
  process.kill("SIGTERM");
  const stoppedBySignal = await Promise.race([
    once(process, "exit"),
    wait(1_000).then(() => {
      if (process.exitCode === null && process.signalCode === null) process.kill("SIGKILL");
      return once(process, "exit");
    }),
  ]);
  return stoppedBySignal;
}

async function requestWithKeepAlive(port) {
  const agent = new Agent({ keepAlive: true });
  await new Promise((resolve, reject) => {
    const request = get(
      {
        agent,
        host: "127.0.0.1",
        path: "/mobile.html",
        port,
      },
      response => {
        response.resume();
        response.on("end", resolve);
      },
    );
    request.on("error", reject);
  });
  return agent;
}

test("mobile smoke static server stays alive by default while Playwright owns it", async () => {
  const port = await getAvailablePort();
  const serverProcess = spawn(
    process.execPath,
    ["browser-tests/static-server.mjs", String(port)],
    {
      env: {
        ...process.env,
        SINGULAR_SMOKE_SERVER_IDLE_MS: undefined,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  try {
    await once(serverProcess.stdout, "data");
    const keepAliveAgent = await requestWithKeepAlive(port);
    await wait(5_500);
    assert.equal(serverProcess.exitCode, null);
    assert.equal(serverProcess.signalCode, null);
    const [exitCode, signalCode] = await stopServer(serverProcess);
    keepAliveAgent.destroy();
    assert.notEqual(signalCode, "SIGKILL");
    assert.ok(exitCode === 0 || signalCode === "SIGTERM");
  } finally {
    await stopServer(serverProcess);
  }
});
