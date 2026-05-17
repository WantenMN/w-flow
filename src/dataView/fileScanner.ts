import * as fs from "fs/promises";
import * as path from "path";
import { parseFrontmatter } from "./frontmatterParser";
import { HIDDEN_DIRS } from "./constants";
import {
  getDatabase,
  saveDatabase,
  upsertFile,
  removeFileFromDb,
  getAllFilesFromDb,
  getFileCountFromDb,
} from "./database";
import type { FileEntry, FileProperties } from "./types";

let db: import("sql.js").Database | null = null;
let storagePath = "";

export function setStoragePath(path: string): void {
  storagePath = path;
}

async function ensureDb(): Promise<import("sql.js").Database> {
  if (!db) {
    db = await getDatabase(storagePath);
  }
  return db;
}

export async function scanVault(vaultPath: string): Promise<void> {
  const database = await ensureDb();
  const existingCount = getFileCountFromDb(database);

  if (existingCount > 0) {
    console.log(`[w-flow] Database already has ${existingCount} files, skipping full scan`);
    return;
  }

  console.log(`[w-flow] Starting full vault scan: ${vaultPath}`);
  await walkDir(vaultPath, vaultPath, database);
  saveDatabase();
  const count = getFileCountFromDb(database);
  console.log(`[w-flow] Scan complete: ${count} files indexed`);
}

async function walkDir(dir: string, vaultPath: string, database: import("sql.js").Database): Promise<void> {
  let entries: import("fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (HIDDEN_DIRS.has(entry.name)) {
        continue;
      }
      await walkDir(path.join(dir, entry.name), vaultPath, database);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(vaultPath, fullPath);
      const fileEntry = await buildFileEntry(fullPath, relPath);
      if (fileEntry) {
        upsertFile(database, fileEntry);
      }
    }
  }
}

async function buildFileEntry(
  fullPath: string,
  relPath: string,
): Promise<FileEntry | null> {
  let content: string;
  try {
    content = await fs.readFile(fullPath, "utf-8");
  } catch {
    return null;
  }
  const parsed = path.parse(relPath);
  const stat = await fs.stat(fullPath);
  const frontmatter = parseFrontmatter(content) ?? {};
  const tags = normalizeTags(frontmatter.tags);

  const file: FileProperties = {
    name: parsed.name,
    folder: parsed.dir,
    ext: parsed.ext.replace(/^\./, ""),
    size: stat.size,
    path: relPath,
    tags,
  };

  return { file, frontmatter, fullPath };
}

function normalizeTags(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map(String);
  }
  if (typeof raw === "string") {
    return [raw];
  }
  return [];
}

export async function updateFile(
  vaultPath: string,
  relativePath: string,
): Promise<FileEntry | null> {
  const database = await ensureDb();
  const fullPath = path.join(vaultPath, relativePath);
  const entry = await buildFileEntry(fullPath, relativePath);
  if (entry) {
    upsertFile(database, entry);
  } else {
    removeFileFromDb(database, relativePath);
  }
  saveDatabase();
  return entry;
}

export async function removeFile(relativePath: string): Promise<void> {
  const database = await ensureDb();
  removeFileFromDb(database, relativePath);
  saveDatabase();
}

export async function getAllFiles(): Promise<FileEntry[]> {
  const database = await ensureDb();
  return getAllFilesFromDb(database);
}

export async function getFileCount(): Promise<number> {
  const database = await ensureDb();
  return getFileCountFromDb(database);
}
