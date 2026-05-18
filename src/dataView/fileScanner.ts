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
  getDbMtimes,
} from "./database";
import type { FileEntry, FileProperties } from "./types";

let db: import("sql.js").Database | null = null;
let storagePath = "";
let validated = false;

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

  if (!validated) {
    validated = true;
    await incrementalSync(vaultPath, database);
    return;
  }

  // Already validated this session, skip
}

interface FileInfo {
  mtime: number;
}

async function incrementalSync(vaultPath: string, database: import("sql.js").Database): Promise<void> {
  // Collect all .md files on disk with mtime
  const diskFiles = new Map<string, FileInfo>();
  await collectFiles(vaultPath, vaultPath, diskFiles);

  // Get existing DB entries (rel_path → mtime)
  const dbMtimes = getDbMtimes(database);

  // Delete stale entries
  let deleted = 0;
  for (const relPath of dbMtimes.keys()) {
    if (!diskFiles.has(relPath)) {
      removeFileFromDb(database, relPath);
      deleted++;
    }
  }

  // Add or update changed files
  let added = 0;
  let updated = 0;
  for (const [relPath, info] of diskFiles) {
    const dbMtime = dbMtimes.get(relPath);
    if (dbMtime !== undefined && dbMtime === info.mtime) {
      continue; // unchanged
    }
    const fullPath = path.join(vaultPath, relPath);
    const entry = await buildFileEntry(fullPath, relPath);
    if (entry) {
      upsertFile(database, entry, info.mtime);
      if (dbMtime === undefined) {
        added++;
      } else {
        updated++;
      }
    }
  }

  saveDatabase();
  const count = getFileCountFromDb(database);
  console.log(`[w-flow] Sync complete: ${count} files (+${added} new, ${updated} updated, -${deleted} removed)`);
}

async function collectFiles(dir: string, vaultPath: string, result: Map<string, FileInfo>): Promise<void> {
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
      await collectFiles(path.join(dir, entry.name), vaultPath, result);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(vaultPath, fullPath);
      const stat = await fs.stat(fullPath);
      result.set(relPath, { mtime: stat.mtimeMs });
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
    const stat = await fs.stat(fullPath);
    upsertFile(database, entry, stat.mtimeMs);
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
