import fs from "node:fs";
import path from "node:path";
import {
  parseServerEnv,
  type ServerEnvConfig,
  type ServerEnvPresence,
  getWorkerEnvPresence,
  stripSurroundingQuotes,
} from "./env";

function readLocalDotEnv(): Record<string, string> {
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (!fs.existsSync(envPath)) return {};
    const result: Record<string, string> = {};
    for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      result[trimmed.slice(0, eqIdx).trim()] = stripSurroundingQuotes(trimmed.slice(eqIdx + 1));
    }
    return result;
  } catch {
    return {};
  }
}

export function getNodeEnv(): ServerEnvConfig {
  return parseServerEnv({ ...readLocalDotEnv(), ...process.env });
}

export function getNodeEnvPresence(): ServerEnvPresence {
  return getWorkerEnvPresence({ ...readLocalDotEnv(), ...process.env });
}
