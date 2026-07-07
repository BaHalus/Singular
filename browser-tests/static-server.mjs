import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

const port = Number.parseInt(process.env.PORT ?? process.argv[2] ?? "4173", 10);
const host = process.env.HOST ?? "127.0.0.1";
const root = process.cwd();
const idleTimeoutMs = Number.parseInt(process.env.SINGULAR_SMOKE_SERVER_IDLE_MS ?? "30000", 10);
let idleTimer = null;
const activeSockets = new Set();

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".svg", "image/svg+xml"],
]);

function resolveFilePath(url) {
  const requestUrl = new URL(url, `http://${host}:${port}`);
  const pathname = requestUrl.pathname === "/" ? "/mobile.html" : requestUrl.pathname;
  const decodedPath = decodeURIComponent(pathname);
  const resolvedPath = path.resolve(root, `.${decodedPath}`);

  if (resolvedPath !== root && !resolvedPath.startsWith(`${root}${path.sep}`)) {
    return null;
  }

  return resolvedPath;
}

const server = createServer(async (request, response) => {
  scheduleIdleShutdown();

  try {
    const filePath = resolveFilePath(request.url ?? "/");
    if (filePath === null) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "content-length": fileStat.size,
      "content-type": contentTypes.get(path.extname(filePath)) ?? "application/octet-stream",
    });
    createReadStream(filePath).pipe(response);
  } catch (error) {
    if (error?.code === "ENOENT") {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(500);
    response.end("Internal server error");
  }
});

server.on("connection", socket => {
  activeSockets.add(socket);
  socket.on("close", () => {
    activeSockets.delete(socket);
  });
});

function scheduleIdleShutdown() {
  if (!Number.isFinite(idleTimeoutMs) || idleTimeoutMs <= 0) return;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    shutdown();
  }, idleTimeoutMs);
}

function shutdown() {
  clearTimeout(idleTimer);
  server.close(() => process.exit(0));
  for (const socket of activeSockets) {
    socket.destroy();
  }
}

server.listen(port, host, () => {
  console.log(`SINGULAR mobile smoke server listening at http://${host}:${port}`);
  scheduleIdleShutdown();
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    shutdown();
  });
}
