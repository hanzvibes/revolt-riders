import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { join } from "node:path";
import test from "node:test";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";
const driverPort = 9515;
const driverUrl = `http://127.0.0.1:${driverPort}`;
const driverBinary = process.env.CHROMEDRIVER ||
  (process.env.CHROMEWEBDRIVER
    ? join(process.env.CHROMEWEBDRIVER, "chromedriver")
    : "chromedriver");

let driverProcess;
let driverOutput = "";
let sessionId = "";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitUntil(check, timeoutMs = 10_000) {
  const startedAt = Date.now();
  let lastError;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      if (await check()) return;
    } catch (error) {
      lastError = error;
    }
    await sleep(150);
  }
  throw lastError || new Error(`Condition was not met within ${timeoutMs}ms`);
}

async function driverRequest(path, { method = "GET", body } = {}) {
  const response = await fetch(`${driverUrl}${path}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.value?.error) {
    throw new Error(
      `ChromeDriver request failed (${method} ${path}): ${JSON.stringify(payload)}\n${driverOutput}`,
    );
  }
  return payload.value;
}

async function execute(script) {
  return driverRequest(`/session/${sessionId}/execute/sync`, {
    method: "POST",
    body: { script, args: [] },
  });
}

async function navigate(pathname) {
  await driverRequest(`/session/${sessionId}/url`, {
    method: "POST",
    body: { url: new URL(pathname, baseUrl).toString() },
  });
  await waitUntil(async () => (await execute("return document.readyState")) === "complete");
  await sleep(250);
}

async function currentUrl() {
  return driverRequest(`/session/${sessionId}/url`);
}

async function setViewport(width, height) {
  await driverRequest(`/session/${sessionId}/window/rect`, {
    method: "POST",
    body: { width, height, x: 0, y: 0 },
  });
}

test.before(async () => {
  driverProcess = spawn(driverBinary, [`--port=${driverPort}`], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  driverProcess.stdout?.on("data", (chunk) => {
    driverOutput += chunk.toString();
  });
  driverProcess.stderr?.on("data", (chunk) => {
    driverOutput += chunk.toString();
  });

  await waitUntil(async () => {
    const response = await fetch(`${driverUrl}/status`);
    return response.ok;
  });

  const session = await driverRequest("/session", {
    method: "POST",
    body: {
      capabilities: {
        alwaysMatch: {
          browserName: "chrome",
          "goog:chromeOptions": {
            args: [
              "--headless=new",
              "--no-sandbox",
              "--disable-dev-shm-usage",
              "--disable-gpu",
            ],
          },
        },
      },
    },
  });

  sessionId = session?.sessionId || "";
  assert.ok(sessionId, `ChromeDriver did not create a session.\n${driverOutput}`);
});

test.after(async () => {
  if (sessionId) {
    await driverRequest(`/session/${sessionId}`, { method: "DELETE" }).catch(() => undefined);
  }
  driverProcess?.kill("SIGTERM");
});

test("public landing renders and member login link navigates in a real browser", async () => {
  await setViewport(1280, 900);
  await navigate("/");

  const landing = await execute(`
    return {
      text: document.body?.innerText || "",
      readyState: document.readyState,
    };
  `);
  assert.equal(landing.readyState, "complete");
  assert.match(landing.text, /REVOLT RIDERS/i);

  const clicked = await execute(`
    const link = [...document.querySelectorAll('a')].find((element) =>
      element.getAttribute('href') === '/login' && element.getClientRects().length > 0
    );
    if (!link) return false;
    link.click();
    return true;
  `);
  assert.equal(clicked, true, "Visible member login link must exist on the public landing page");

  await waitUntil(async () => new URL(await currentUrl()).pathname === "/login");
  await waitUntil(async () => (await execute("return document.readyState")) === "complete");

  const loginText = await execute("return document.body?.innerText || ''");
  assert.match(loginText, /Masuk ke Revolt/i);
});

test("mobile public landing has no document-level horizontal overflow", async () => {
  await setViewport(390, 844);
  await navigate("/");

  const layout = await execute(`
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      viewportWidth: window.innerWidth,
    };
  `);

  assert.ok(layout.clientWidth > 0, "Mobile viewport width must be measurable");
  assert.ok(
    layout.scrollWidth <= layout.clientWidth + 1,
    `Landing page overflows horizontally: scrollWidth=${layout.scrollWidth}, clientWidth=${layout.clientWidth}`,
  );
  assert.ok(
    Math.abs(layout.clientWidth - layout.viewportWidth) <= 1,
    `Document width must match mobile viewport: client=${layout.clientWidth}, viewport=${layout.viewportWidth}`,
  );
});

test("public join form can be opened and validates required fields without writing data", async () => {
  await setViewport(1280, 900);
  await navigate("/");
  const opened = await execute(`
    const trigger = document.querySelector(".btn-nav-join");
    if (!trigger || !trigger.getClientRects().length) return false;
    trigger.click();
    return true;
  `);
  assert.equal(opened, true, "Join trigger must be visible");
  await waitUntil(async () => await execute(`
    const field = document.getElementById("join-full-name");
    return Boolean(field && field.getClientRects().length);
  `));

  const form = await execute(`
    const form = document.querySelector("form.join-form-stack");
    const fullName = document.getElementById("join-full-name");
    const whatsapp = document.getElementById("join-whatsapp");
    return {
      found: Boolean(form),
      invalidWhileEmpty: form ? !form.checkValidity() : false,
      fullNameRequired: Boolean(fullName?.required),
      whatsappRequired: Boolean(whatsapp?.required),
      submitPresent: Boolean(form?.querySelector('button[type="submit"]')),
    };
  `);
  assert.deepEqual(form, {
    found: true,
    invalidWhileEmpty: true,
    fullNameRequired: true,
    whatsappRequired: true,
    submitPresent: true,
  });
});
