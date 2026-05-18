import initSqlJs, { Database as SqlJsDatabase } from "sql.js";
import * as path from "path";
import * as fs from "fs";
import type { FileEntry, FileProperties, FrontmatterData } from "./types";

let dbInstance: SqlJsDatabase | null = null;
let dbPath: string | null = null;

export async function getDatabase(storagePath: string): Promise<SqlJsDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true });
  }
  dbPath = path.join(storagePath, "index.db");

  // Locate the WASM file for sql.js (bundled alongside extension.js)
  const wasmPath = path.join(__dirname, "sql-wasm.wasm");

  const SQL = await initSqlJs({
    locateFile: () => wasmPath,
  });

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    dbInstance = new SQL.Database(buffer);
  } else {
    dbInstance = new SQL.Database();
  }

  // Initialize schema
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rel_path TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      folder TEXT NOT NULL,
      ext TEXT NOT NULL,
      size INTEGER NOT NULL,
      full_path TEXT NOT NULL,
      frontmatter_json TEXT DEFAULT '{}',
      tags_json TEXT DEFAULT '[]',
      indexed_at INTEGER NOT NULL
    )
  `);

  dbInstance.run("CREATE INDEX IF NOT EXISTS idx_files_folder ON files(folder)");
  dbInstance.run("CREATE INDEX IF NOT EXISTS idx_files_ext ON files(ext)");
  dbInstance.run("CREATE INDEX IF NOT EXISTS idx_files_name ON files(name)");

  saveDatabase();
  return dbInstance;
}

export function saveDatabase(): void {
  if (dbInstance && dbPath) {
    const data = dbInstance.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
  }
}

export function closeDatabase(): void {
  if (dbInstance) {
    saveDatabase();
    dbInstance.close();
    dbInstance = null;
    dbPath = null;
  }
}

export function upsertFile(db: SqlJsDatabase, entry: FileEntry, mtime: number = 0): void {
  db.run(
    `INSERT INTO files (rel_path, name, folder, ext, size, full_path, frontmatter_json, tags_json, indexed_at, mtime)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(rel_path) DO UPDATE SET
       name = excluded.name,
       folder = excluded.folder,
       ext = excluded.ext,
       size = excluded.size,
       full_path = excluded.full_path,
       frontmatter_json = excluded.frontmatter_json,
       tags_json = excluded.tags_json,
       indexed_at = excluded.indexed_at,
       mtime = excluded.mtime`,
    [
      entry.file.path,
      entry.file.name,
      entry.file.folder,
      entry.file.ext,
      entry.file.size,
      entry.fullPath,
      JSON.stringify(entry.frontmatter),
      JSON.stringify(entry.file.tags),
      Date.now(),
      mtime,
    ],
  );
}

export function removeFileFromDb(db: SqlJsDatabase, relPath: string): void {
  db.run("DELETE FROM files WHERE rel_path = ?", [relPath]);
}

export function getAllFilesFromDb(db: SqlJsDatabase): FileEntry[] {
  const results: FileEntry[] = [];
  const stmt = db.prepare("SELECT * FROM files");
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push(rowToEntry(row));
  }
  stmt.free();
  return results;
}

export function getFileCountFromDb(db: SqlJsDatabase): number {
  const stmt = db.prepare("SELECT COUNT(*) as count FROM files");
  stmt.step();
  const row = stmt.getAsObject();
  stmt.free();
  return (row.count as number) || 0;
}

export function clearDatabase(db: SqlJsDatabase): void {
  db.run("DELETE FROM files");
}

export function getDbMtimes(db: SqlJsDatabase): Map<string, number> {
  const map = new Map<string, number>();
  const stmt = db.prepare("SELECT rel_path, mtime FROM files");
  while (stmt.step()) {
    const row = stmt.getAsObject();
    map.set(row.rel_path as string, (row.mtime as number) || 0);
  }
  stmt.free();
  return map;
}

interface DbRow {
  rel_path: string;
  name: string;
  folder: string;
  ext: string;
  size: number;
  full_path: string;
  frontmatter_json: string;
  tags_json: string;
}

function rowToEntry(row: Record<string, unknown>): FileEntry {
  const r = row as unknown as DbRow;
  const frontmatter: FrontmatterData = JSON.parse(r.frontmatter_json);
  const tags: string[] = JSON.parse(r.tags_json);
  const file: FileProperties = {
    name: r.name,
    folder: r.folder,
    ext: r.ext,
    size: r.size,
    path: r.rel_path,
    tags,
  };
  return { file, frontmatter, fullPath: r.full_path };
}
