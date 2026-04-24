import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function parseCliList(stdout) {
  const lines = stdout.split(/\r?\n/).map((line) => line.trimEnd());
  const modelNames = [];

  for (const line of lines.slice(1)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const name = trimmed.split(/\s+/)[0];
    if (name && name !== "NAME") {
      modelNames.push(name);
    }
  }

  return modelNames;
}

async function listViaCli() {
  const { stdout } = await execFileAsync("ollama", ["list"], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024
  });
  return parseCliList(stdout);
}

async function listViaApi(host) {
  const response = await fetch(`${host.replace(/\/$/, "")}/api/tags`);

  if (!response.ok) {
    throw new Error(`Ollama tags request failed with status ${response.status}`);
  }

  const data = await response.json();
  const models = Array.isArray(data?.models) ? data.models : [];

  return models
    .map((model) => model?.name)
    .filter((name) => typeof name === "string" && name.trim().length > 0);
}

export async function discoverOllamaModels(host) {
  try {
    const models = await listViaCli();
    if (models.length > 0) {
      return models;
    }
  } catch {
    // CLI is optional, so fall back to the local HTTP API.
  }

  try {
    return await listViaApi(host);
  } catch {
    return [];
  }
}

export function mapModelsToOptions(models) {
  return models.map((model) => ({
    label: model,
    value: model
  }));
}

