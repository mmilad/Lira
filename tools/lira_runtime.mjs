/**
 * Run emitted multi-file Lira apps and compare stdout across targets.
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..");
const OUTPUT = path.join(repo, "test", "lira_output");

/** Apps with a main.lira entry module */
export const RUNNABLE_APPS = ["notes_app", "api_service"];

function ensurePyPackage(appDir) {
  const init = path.join(appDir, "__init__.py");
  if (!fs.existsSync(init)) fs.writeFileSync(init, "", "utf8");
}

function runPythonApp(appName) {
  const appDir = path.join(OUTPUT, "py", appName);
  const parent = path.join(OUTPUT, "py");
  ensurePyPackage(appDir);
  const result = spawnSync("python3", ["-m", `${appName}.main`], {
    cwd: parent,
    encoding: "utf8",
    env: { ...process.env, PYTHONPATH: parent },
  });
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    status: result.status,
  };
}

function runTypeScriptApp(appName) {
  const appDir = path.join(OUTPUT, "ts", appName);
  const main = path.join(appDir, "main.ts");
  const result = spawnSync("npx", ["--yes", "tsx", main], {
    cwd: appDir,
    encoding: "utf8",
  });
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    status: result.status,
  };
}

function normalizeStdout(text) {
  return text.replace(/\r\n/g, "\n").replace(/\n+$/, "\n");
}

export function runAppParity(appName) {
  const py = runPythonApp(appName);
  const ts = runTypeScriptApp(appName);
  const pyOut = normalizeStdout(py.stdout);
  const tsOut = normalizeStdout(ts.stdout);
  const ok = py.status === 0 && ts.status === 0 && pyOut === tsOut;
  return { appName, ok, py, ts, pyOut, tsOut };
}

export function testRunnableApps(apps = RUNNABLE_APPS) {
  let failures = 0;
  for (const app of apps) {
    const result = runAppParity(app);
    if (!result.ok) {
      failures += 1;
      console.log(`FAIL runtime ${app}: stdout mismatch or nonzero exit`);
      if (result.py.status !== 0) {
        console.log(`  py exit ${result.py.status}: ${result.py.stderr.trim()}`);
      }
      if (result.ts.status !== 0) {
        console.log(`  ts exit ${result.ts.status}: ${result.ts.stderr.trim()}`);
      }
      if (result.py.status === 0 && result.ts.status === 0 && result.pyOut !== result.tsOut) {
        console.log("  expected matching stdout:");
        console.log(result.tsOut.split("\n").map((l) => `    ts: ${l}`).join("\n"));
        console.log(result.pyOut.split("\n").map((l) => `    py: ${l}`).join("\n"));
      }
    } else {
      console.log(`ok   runtime ${app} (${result.pyOut.split("\n").filter(Boolean).length} lines)`);
    }
  }
  return failures;
}
