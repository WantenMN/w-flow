import * as path from "path";
import * as os from "os";

export const VAULT_PATH = path.join(os.homedir(), "repos", "vault");

export const HIDDEN_DIRS = new Set([
  ".obsidian",
  ".git",
  ".stfolder",
  ".trash",
  "node_modules",
]);

export const DEBOUNCE_MS = 300;
