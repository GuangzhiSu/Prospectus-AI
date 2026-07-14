import { spawn, type SpawnOptions } from "child_process";
import path from "path";
import { existsSync } from "fs";

export type PythonCommand = {
  command: string;
  argsPrefix: string[];
  label: string;
  executable?: string;
};

export type PythonResolution =
  | { ok: true; python: PythonCommand; executable: string }
  | { ok: false; error: string; attempts: string[] };

function stripQuotes(value: string): string {
  return value.trim().replace(/^"+|"+$/g, "");
}

function venvPython(root: string): string {
  return process.platform === "win32"
    ? path.join(root, "venv", "Scripts", "python.exe")
    : path.join(root, "venv", "bin", "python3");
}

function candidateCommands(root: string): PythonCommand[] {
  const envPython = stripQuotes(process.env.AGENT1_PYTHON || "");
  const candidates: PythonCommand[] = [];

  if (envPython) {
    candidates.push({
      command: path.isAbsolute(envPython) ? envPython : path.resolve(root, envPython),
      argsPrefix: [],
      label: "AGENT1_PYTHON",
    });
  }

  candidates.push({
    command: venvPython(root),
    argsPrefix: [],
    label: "bundled venv",
  });

  if (process.platform === "win32") {
    candidates.push({ command: "py", argsPrefix: ["-3"], label: "Windows py launcher" });
  }

  candidates.push(
    { command: "python3", argsPrefix: [], label: "python3 on PATH" },
    { command: "python", argsPrefix: [], label: "python on PATH" }
  );

  const seen = new Set<string>();
  return candidates.filter((c) => {
    const key = `${c.command}\0${c.argsPrefix.join(" ")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isExplicitPath(command: string): boolean {
  return path.isAbsolute(command) || command.includes(path.sep) || command.includes("/");
}

function testPython(
  candidate: PythonCommand,
  cwd: string,
  timeoutMs = 10000
): Promise<{ ok: boolean; executable?: string; error?: string }> {
  if (isExplicitPath(candidate.command) && !existsSync(candidate.command)) {
    return Promise.resolve({
      ok: false,
      error: `missing executable: ${candidate.command}`,
    });
  }

  return new Promise((resolve) => {
    const proc = spawn(
      candidate.command,
      [
        ...candidate.argsPrefix,
        "-c",
        "import sys; print(sys.executable)",
      ],
      {
        cwd,
        env: process.env,
        windowsHide: true,
      }
    );
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      proc.kill();
      resolve({ ok: false, error: "timed out while checking Python" });
    }, timeoutMs);

    proc.stdout?.on("data", (d) => {
      stdout += d.toString();
    });
    proc.stderr?.on("data", (d) => {
      stderr += d.toString();
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ ok: true, executable: stdout.trim().split(/\r?\n/).pop() || candidate.command });
      } else {
        resolve({ ok: false, error: stderr.trim() || stdout.trim() || `exit ${code}` });
      }
    });
    proc.on("error", (err) => {
      clearTimeout(timer);
      resolve({ ok: false, error: err.message });
    });
  });
}

export async function resolvePythonCommand(root: string): Promise<PythonResolution> {
  const attempts: string[] = [];
  for (const candidate of candidateCommands(root)) {
    const result = await testPython(candidate, root);
    if (result.ok) {
      return {
        ok: true,
        python: { ...candidate, executable: result.executable },
        executable: result.executable || candidate.command,
      };
    }
    attempts.push(`${candidate.label} (${candidate.command}): ${result.error || "failed"}`);
  }
  return {
    ok: false,
    attempts,
    error: formatPythonResolutionError(attempts),
  };
}

export function spawnPython(
  python: PythonCommand,
  args: string[],
  options: SpawnOptions
) {
  return spawn(python.command, [...python.argsPrefix, ...args], {
    ...options,
    windowsHide: true,
  });
}

export function pythonDisplayName(python: PythonCommand | string): string {
  if (typeof python === "string") return path.basename(python);
  if (python.executable) return python.executable;
  return [python.command, ...python.argsPrefix].join(" ");
}

export function formatPythonResolutionError(attempts: string[]): string {
  const joined = attempts.join("\n");
  const hostedToolcache = /hostedtoolcache|did not find executable/i.test(joined);
  if (hostedToolcache) {
    return (
      "Python runtime is not usable. The packaged app appears to contain a virtual environment " +
      "that still points to the build machine (hostedtoolcache). Close Prospectus AI, delete the " +
      "install folder's venv directory, then reopen the app so it can rebuild Python locally.\n\n" +
      joined
    );
  }
  return "Could not find a usable Python 3 runtime for Prospectus AI.\n\n" + joined;
}

export function formatPythonProcessError(message: string): string {
  if (/hostedtoolcache|did not find executable/i.test(message)) {
    return (
      "Python runtime is broken because the bundled venv points to the build machine. " +
      "Restart the Windows app after deleting the install folder's venv directory; the launcher will rebuild it locally.\n\n" +
      message
    );
  }
  return message;
}
