import * as fs from "fs/promises";
import * as path from "path";
import { parse } from "yaml";
import type { BaseConfig, ViewConfig, FilterGroup, SortConfig } from "./types";

export function parseBaseFile(content: string): BaseConfig {
  const raw = parse(content) as Record<string, unknown>;

  const filters = raw.filters ? normalizeFilterGroup(raw.filters) : undefined;

  const views = Array.isArray(raw.views)
    ? (raw.views as Record<string, unknown>[]).map(normalizeView)
    : [];

  return {
    filters,
    views,
    formulas: raw.formulas as Record<string, string> | undefined,
    properties: raw.properties as Record<string, { displayName?: string }> | undefined,
  };
}

function normalizeView(raw: Record<string, unknown>): ViewConfig {
  const order = Array.isArray(raw.order) ? (raw.order as string[]) : [];
  const sort = Array.isArray(raw.sort)
    ? (raw.sort as Record<string, unknown>[]).map(normalizeSort)
    : [];

  // Normalize columnSize keys: strip "note." prefix
  let columnSize: Record<string, number> | undefined;
  if (raw.columnSize && typeof raw.columnSize === "object") {
    columnSize = {};
    for (const [key, val] of Object.entries(raw.columnSize as Record<string, number>)) {
      const normalizedKey = key.replace(/^note\./, "");
      columnSize[normalizedKey] = val;
    }
  }

  return {
    type: "table",
    name: String(raw.name ?? ""),
    filters: raw.filters ? normalizeFilterGroup(raw.filters) : undefined,
    order,
    sort,
    columnSize,
    cardSize: typeof raw.cardSize === "number" ? raw.cardSize : undefined,
  };
}

function normalizeSort(raw: Record<string, unknown>): SortConfig {
  return {
    property: String(raw.property ?? ""),
    direction: (raw.direction as string)?.toUpperCase() === "ASC" ? "ASC" : "DESC",
  };
}

function normalizeFilterGroup(raw: unknown): FilterGroup {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const obj = raw as Record<string, unknown>;
  const group: FilterGroup = {};
  if (Array.isArray(obj.and)) {
    group.and = obj.and.map((item: unknown) =>
      typeof item === "string" ? item : normalizeFilterGroup(item),
    );
  }
  if (Array.isArray(obj.or)) {
    group.or = obj.or.map((item: unknown) =>
      typeof item === "string" ? item : normalizeFilterGroup(item),
    );
  }
  if (Array.isArray(obj.not)) {
    group.not = obj.not.map((item: unknown) =>
      typeof item === "string" ? item : normalizeFilterGroup(item),
    );
  }
  return group;
}

export async function discoverBaseFiles(vaultPath: string): Promise<string[]> {
  const results: string[] = [];
  await walkForBaseFiles(vaultPath, vaultPath, results);
  console.log(`[w-flow] discoverBaseFiles: found ${results.length} .base files`);
  return results.sort();
}

async function walkForBaseFiles(dir: string, vaultPath: string, results: string[]): Promise<void> {
  let entries: import("fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") {
        continue;
      }
      await walkForBaseFiles(path.join(dir, entry.name), vaultPath, results);
    } else if (entry.isFile() && entry.name.endsWith(".base")) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(vaultPath, fullPath);
      results.push(relPath);
    }
  }
}

export async function loadBaseConfig(vaultPath: string, fileName: string): Promise<BaseConfig> {
  const content = await fs.readFile(path.join(vaultPath, fileName), "utf-8");
  return parseBaseFile(content);
}
