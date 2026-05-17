import * as fs from "fs";
import type { FilterNode, FileEntry } from "./types";

// Cache for hasLink results: key = "filePath::linkTarget"
const linkCache = new Map<string, boolean>();

export function evaluateFilter(node: FilterNode, entry: FileEntry): boolean {
  switch (node.kind) {
    case "method":
      return evaluateMethod(node.property, node.method, node.args, entry);
    case "comparison":
      return evaluateComparison(node.property, node.operator, node.value, entry);
    case "and":
      return node.children.every((child) => evaluateFilter(child, entry));
    case "or":
      return node.children.some((child) => evaluateFilter(child, entry));
    case "not":
      return !evaluateFilter(node.child, entry);
  }
}

function resolveProperty(property: string, entry: FileEntry): unknown {
  if (property.startsWith("file.")) {
    const key = property.slice(5) as keyof typeof entry.file;
    return entry.file[key];
  }
  return entry.frontmatter[property];
}

function toDisplayString(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String);
  }
  if (typeof value === "string") {
    return [value];
  }
  return [];
}

function normSep(s: string): string {
  return s.replace(/\\/g, "/");
}

function isPathProperty(property: string): boolean {
  return property === "file.folder" || property === "file.path";
}

function evaluateMethod(
  property: string,
  method: string,
  args: string[],
  entry: FileEntry,
): boolean {
  // Handle file-level methods (property is just "file")
  if (property === "file") {
    return evaluateFileMethod(method, args, entry);
  }

  const value = resolveProperty(property, entry);
  const strValue = toDisplayString(value);
  const arrValue = toArray(value);
  const pathProp = isPathProperty(property);

  switch (method) {
    case "contains": {
      const target = args[0] ?? "";
      if (pathProp) {
        const normTarget = normSep(target);
        if (arrValue.length > 1) {
          return arrValue.some((v) => normSep(v).includes(normTarget));
        }
        return normSep(strValue).includes(normTarget);
      }
      if (arrValue.length > 1) {
        return arrValue.some((v) => v.includes(target));
      }
      return strValue.includes(target);
    }
    case "containsAny": {
      if (pathProp) {
        const normArgs = args.map(normSep);
        if (arrValue.length > 1) {
          return normArgs.some((arg) => arrValue.some((v) => normSep(v).includes(arg)));
        }
        return normArgs.some((arg) => normSep(strValue).includes(arg));
      }
      if (arrValue.length > 1) {
        return args.some((arg) => arrValue.some((v) => v.includes(arg)));
      }
      return args.some((arg) => strValue.includes(arg));
    }
    case "startsWith": {
      const target = args[0] ?? "";
      if (pathProp) {
        return normSep(strValue).startsWith(normSep(target));
      }
      return strValue.startsWith(target);
    }
    case "endsWith": {
      const target = args[0] ?? "";
      if (pathProp) {
        return normSep(strValue).endsWith(normSep(target));
      }
      return strValue.endsWith(target);
    }
    case "equals": {
      const target = args[0] ?? "";
      if (pathProp) {
        const normTarget = normSep(target);
        if (arrValue.length > 1) {
          return arrValue.some((v) => normSep(v) === normTarget);
        }
        return normSep(strValue) === normTarget;
      }
      if (arrValue.length > 1) {
        return arrValue.includes(target);
      }
      return strValue === target;
    }
    case "inFolder": {
      const folder = entry.file.folder;
      return args.some(
        (arg) => folder === arg || folder.startsWith(arg + "/") || folder.startsWith(arg + "\\"),
      );
    }
    default:
      return false;
  }
}

function evaluateFileMethod(method: string, args: string[], entry: FileEntry): boolean {
  switch (method) {
    case "inFolder": {
      const folder = entry.file.folder;
      return args.some(
        (arg) => folder === arg || folder.startsWith(arg + "/") || folder.startsWith(arg + "\\"),
      );
    }
    case "hasLink": {
      const target = args[0] ?? "";
      return checkHasLink(entry.fullPath, target);
    }
    default:
      return false;
  }
}

function checkHasLink(filePath: string, linkTarget: string): boolean {
  const cacheKey = `${filePath}::${linkTarget}`;
  if (linkCache.has(cacheKey)) {
    return linkCache.get(cacheKey)!;
  }

  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch {
    linkCache.set(cacheKey, false);
    return false;
  }

  // Match [[target]] or [[display|target]]
  const escaped = escapeRegex(linkTarget);
  const pattern = new RegExp(`\\[\\[(?:[^\\]|]*\\|)?${escaped}\\]\\]`);
  const result = pattern.test(content);
  linkCache.set(cacheKey, result);
  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function evaluateComparison(
  property: string,
  operator: string,
  value: string,
  entry: FileEntry,
): boolean {
  const propValue = resolveProperty(property, entry);
  const strValue = toDisplayString(propValue);

  if (property === "file.size") {
    const numProp = Number(propValue);
    const numVal = Number(value);
    if (!isNaN(numProp) && !isNaN(numVal)) {
      return compareNumeric(numProp, operator, numVal);
    }
  }

  if (isPathProperty(property)) {
    return compareString(normSep(strValue), operator, normSep(value));
  }

  return compareString(strValue, operator, value);
}

function compareNumeric(left: number, op: string, right: number): boolean {
  switch (op) {
    case "==": return left === right;
    case "!=": return left !== right;
    case ">": return left > right;
    case "<": return left < right;
    case ">=": return left >= right;
    case "<=": return left <= right;
    default: return false;
  }
}

function compareString(left: string, op: string, right: string): boolean {
  switch (op) {
    case "==": return left === right;
    case "!=": return left !== right;
    case ">": return left > right;
    case "<": return left < right;
    case ">=": return left >= right;
    case "<=": return left <= right;
    default: return false;
  }
}

export function evaluateEntry(
  entry: FileEntry,
  topLevel: FilterNode | undefined,
  viewLevel: FilterNode | undefined,
): boolean {
  if (topLevel && !evaluateFilter(topLevel, entry)) {
    return false;
  }
  if (viewLevel && !evaluateFilter(viewLevel, entry)) {
    return false;
  }
  return true;
}

export function clearLinkCache(): void {
  linkCache.clear();
}
