import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const root = path.resolve("dist");
const outDir = path.resolve("docs/screenshots");
const keys = [
  "alpha",
  "bravo",
  "charlie",
  "delta",
  "echo",
  "foxtrot",
  "golf",
  "hotel",
  "india",
  "juliet",
  "kilo",
  "lima",
];
const previewUrl =
  "https://example.com/search?" +
  keys.map((key, index) => `${key}=value${index + 1}`).join("&");

const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
};

function listen(server, port) {
  return new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => resolve(JSON.parse(data)));
      })
      .on("error", reject);
  });
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.next = 0;
    this.pending = new Map();
    ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id || !this.pending.has(message.id)) return;
      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result);
    });
  }

  send(method, params = {}) {
    const id = ++this.next;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  const filePath = path.normalize(
    path.join(root, decodeURIComponent(url.pathname === "/" ? "/popup.html" : url.pathname))
  );
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end();
    return;
  }
  fs.readFile(filePath, (error, body) => {
    if (error) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, {
      "content-type": mime[path.extname(filePath)] || "application/octet-stream",
    });
    res.end(body);
  });
});

await listen(server, 8765);

const chrome = spawn(
  "google-chrome",
  [
    "--headless=new",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--no-first-run",
    "--remote-debugging-port=9333",
    "--user-data-dir=/tmp/chrome-params-reorder",
    "--window-size=520,720",
  ],
  { stdio: "ignore", env: { ...process.env, GTK_OVERLAY_SCROLLING: "0" } }
);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let cdp;
try {
  let version;
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      version = await getJson("http://127.0.0.1:9333/json/version");
      break;
    } catch {
      await sleep(150);
    }
  }
  if (!version) throw new Error("Chrome DevTools did not start");

  const browser = new Cdp(new WebSocket(version.webSocketDebuggerUrl));
  await new Promise((resolve, reject) => {
    browser.ws.addEventListener("open", resolve);
    browser.ws.addEventListener("error", reject);
  });

  const { targetId } = await browser.send("Target.createTarget", {
    url: "about:blank",
  });
  const { sessionId } = await browser.send("Target.attachToTarget", {
    targetId,
    flatten: true,
  });

  cdp = {
    send(method, params = {}) {
      const id = ++browser.next;
      browser.ws.send(JSON.stringify({ id, sessionId, method, params }));
      return new Promise((resolve, reject) => {
        browser.pending.set(id, { resolve, reject });
      });
    },
  };

  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 500,
    height: 680,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `window.__previewUrl = ${JSON.stringify(previewUrl)};
      window.__updates = [];
      window.chrome = {
        runtime: {
          sendMessage(message, callback) {
            let response = {};
            if (message && message.type === "GET_CURRENT_URL") {
              response = { url: window.__previewUrl };
            } else if (message && message.type === "UPDATE_URL") {
              window.__updates.push(message.url);
              response = { success: true };
            }
            if (typeof callback === "function") callback(response);
            return Promise.resolve(response);
          }
        },
        tabs: {
          query(_query, callback) { if (callback) callback([]); },
          reload() {}
        }
      };`,
  });

  await cdp.send("Page.navigate", { url: "http://127.0.0.1:8765/popup.html" });

  const evalJson = async (expression) => {
    const result = await cdp.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error(JSON.stringify(result.exceptionDetails));
    }
    return result.result.value;
  };

  for (let attempt = 0; attempt < 40; attempt++) {
    const count = await evalJson(
      "document.querySelectorAll('#paramsBody tr[data-param-index]').length"
    );
    if (count >= 12) break;
    await sleep(100);
    if (attempt === 39) throw new Error("Popup did not render 12 parameters");
  }

  const state = async () =>
    evalJson(`(() => {
      const scroll = document.getElementById("paramsScroll");
      const footer = document.querySelector(".sticky.bottom-0");
      const body = document.body.getBoundingClientRect();
      return {
        width: Math.round(body.width),
        height: Math.ceil(footer.getBoundingClientRect().bottom + 12),
        scrollTop: scroll.scrollTop,
        scrollHeight: scroll.scrollHeight,
        clientHeight: scroll.clientHeight,
        keys: [...document.querySelectorAll("#paramsBody .param-key-cell input")].map((input) => input.value),
        dragging: !!document.querySelector("#paramsBody tr.is-dragging"),
        handles: document.querySelectorAll(".param-drag-handle").length,
        disabledHandles: document.querySelectorAll('.param-drag-handle[aria-disabled="true"]').length,
        bodyDragging: document.body.classList.contains("params-dragging"),
      };
    })()`);

  const shot = async (name) => {
    const info = await state();
    const { data } = await cdp.send("Page.captureScreenshot", {
      format: "png",
      clip: { x: 0, y: 0, width: info.width, height: info.height, scale: 1 },
      captureBeyondViewport: true,
    });
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, name), Buffer.from(data, "base64"));
    return info;
  };

  const mouse = async (type, x, y, buttons) => {
    await cdp.send("Input.dispatchMouseEvent", {
      type,
      x,
      y,
      button: "left",
      buttons,
      clickCount: 1,
    });
  };

  const handleCenter = async (index) =>
    evalJson(`(() => {
      const row = document.querySelectorAll("#paramsBody tr[data-param-index]")[${index}];
      const handle = row.querySelector(".param-drag-handle");
      const rect = handle.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, key: row.querySelector("input").value };
    })()`);

  const initial = await shot("01-drag-handles.png");

  const start = await handleCenter(0);
  await mouse("mouseMoved", start.x, start.y, 0);
  await mouse("mousePressed", start.x, start.y, 1);

  const scrollBox = await evalJson(`(() => {
    const rect = document.getElementById("paramsScroll").getBoundingClientRect();
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
  })()`);
  const dragX = start.x;
  const dragY = scrollBox.bottom - 6;
  await mouse("mouseMoved", dragX, dragY, 1);

  let mid = await state();
  for (
    let attempt = 0;
    attempt < 40 && (mid.scrollTop < 30 || mid.keys[0] === "alpha");
    attempt++
  ) {
    await sleep(50);
    await mouse("mouseMoved", dragX, dragY, 1);
    mid = await state();
  }

  // Leave the edge zone so auto-scroll stops before the still frame.
  const settleY = scrollBox.top + (scrollBox.bottom - scrollBox.top) * 0.62;
  await mouse("mouseMoved", dragX, settleY, 1);
  await sleep(120);
  const midShot = await shot("02-mid-drag.png");

  await mouse("mouseReleased", dragX, settleY, 0);
  await sleep(80);
  const dropped = await shot("03-after-reorder.png");

  const beforeApply = await state();
  const addButton = await evalJson(`(() => {
    const rect = document.getElementById("addParamBtn").getBoundingClientRect();
    const body = document.body.getBoundingClientRect();
    const table = document.getElementById("paramsTable").getBoundingClientRect();
    return {
      text: document.getElementById("addParamBtn").innerText,
      right: rect.right,
      width: rect.width,
      bodyRight: body.right,
      tableRight: table.right,
      scrollWidth: document.documentElement.scrollWidth,
    };
  })()`);
  await evalJson("window.paramsEditorInstance.applyChanges()");
  await sleep(150);
  const appliedUrl = await evalJson("window.__updates[0] || null");
  const resetAfterApply = await evalJson(`(() => {
    document.getElementById("resetBtn").click();
    return [...document.querySelectorAll("#paramsBody .param-key-cell input")].map((input) => input.value);
  })()`);

  await cdp.send("Page.navigate", { url: "http://127.0.0.1:8765/popup.html" });
  for (let attempt = 0; attempt < 40; attempt++) {
    const count = await evalJson(
      "document.querySelectorAll('#paramsBody tr[data-param-index]').length"
    );
    if (count >= 12) break;
    await sleep(100);
  }
  const nudge = await handleCenter(1);
  await mouse("mouseMoved", nudge.x, nudge.y, 0);
  await mouse("mousePressed", nudge.x, nudge.y, 1);
  await mouse("mouseMoved", nudge.x, nudge.y + 80, 1);
  await sleep(40);
  await mouse("mouseReleased", nudge.x, nudge.y + 80, 0);
  await sleep(40);
  const reset = await evalJson(`(() => {
    document.getElementById("resetBtn").click();
    return [...document.querySelectorAll("#paramsBody .param-key-cell input")].map((input) => input.value);
  })()`);

  const upward = await evalJson(`(() => {
    const scroll = document.getElementById("paramsScroll");
    scroll.scrollTop = scroll.scrollHeight;
    return scroll.scrollTop;
  })()`);
  await sleep(30);
  const bottomHandle = await evalJson(`(() => {
    const rows = [...document.querySelectorAll("#paramsBody tr[data-param-index]")];
    const visible = rows.filter((row) => {
      const rect = row.getBoundingClientRect();
      const box = document.getElementById("paramsScroll").getBoundingClientRect();
      return rect.top >= box.top && rect.bottom <= box.bottom;
    });
    const row = visible[visible.length - 1];
    const rect = row.querySelector(".param-drag-handle").getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, key: row.querySelector("input").value };
  })()`);
  await mouse("mouseMoved", bottomHandle.x, bottomHandle.y, 0);
  await mouse("mousePressed", bottomHandle.x, bottomHandle.y, 1);
  const upY = scrollBox.top + 4;
  await mouse("mouseMoved", bottomHandle.x, upY, 1);
  let upwardState = await state();
  for (let attempt = 0; attempt < 40 && upwardState.scrollTop >= upward - 10; attempt++) {
    await sleep(50);
    await mouse("mouseMoved", bottomHandle.x, upY, 1);
    upwardState = await state();
  }
  await mouse("mouseReleased", bottomHandle.x, upY, 0);
  await sleep(40);

  const typed = await evalJson(`(() => {
    const input = document.querySelector("#paramsBody .param-key-cell input");
    input.focus();
    input.value = input.value + "X";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    const editor = window.paramsEditorInstance;
    return editor.currentParams[0].key;
  })()`);

  const filtered = await evalJson(`(() => new Promise((resolve) => {
    const search = document.getElementById("searchParams");
    search.value = "juliet";
    search.dispatchEvent(new Event("input", { bubbles: true }));
    setTimeout(() => {
      resolve({
        rows: document.querySelectorAll("#paramsBody tr[data-param-index]").length,
        disabled: document.querySelectorAll('.param-drag-handle[aria-disabled="true"]').length,
      });
    }, 250);
  }))()`);

  console.log(
    JSON.stringify(
      {
        initial,
        start,
        midShot,
        dropped,
        reset,
        resetAfterApply,
        beforeApply,
        addButton,
        appliedUrl,
        upward,
        bottomHandle,
        upwardState,
        typed,
        filtered,
      },
      null,
      2
    )
  );
} finally {
  chrome.kill("SIGKILL");
  server.close();
  if (cdp) {
    try {
      cdp.ws?.close?.();
    } catch {
      /* ignore */
    }
  }
}
