import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ModelOption } from "./types.js";

const execFileAsync = promisify(execFile);

function parseCliList(stdout: string): string[] {
  const lines = stdout.split(/\r?\n/).map((line) => line.trimEnd());
  const modelNames: string[] = [];

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

async function listViaCli(): Promise<string[]> {
  const { stdout } = await execFileAsync("ollama", ["list"], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024
  });

  return parseCliList(stdout);
}

async function listViaApi(host: string): Promise<string[]> {
  const response = await fetch(`${host.replace(/\/$/, "")}/api/tags`);

  if (!response.ok) {
    throw new Error(`Ollama tags request failed with status ${response.status}`);
  }

  const data = (await response.json()) as {
    models?: Array<{ name?: unknown }>;
  };
  const models = Array.isArray(data?.models) ? data.models : [];

  return models
    .map((model) => model?.name)
    .filter((name): name is string => typeof name === "string" && name.trim().length > 0);
}

export async function discoverOllamaModels(host: string): Promise<string[]> {
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

export function mapModelsToOptions(models: string[]): ModelOption[] {
  return models.map((model) => ({
    label: model,
    value: model
  }));
}
