import { parse } from "yaml";

export interface FrontmatterData {
  [key: string]: unknown;
  status?: string | string[];
  date?: string;
  tags?: string | string[];
  desc?: string;
  aliases?: string[];
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;

export function parseFrontmatter(content: string): FrontmatterData | null {
  const match = content.match(FRONTMATTER_RE);
  if (!match) {
    return null;
  }
  try {
    const data = parse(match[1]);
    return data && typeof data === "object" ? (data as FrontmatterData) : null;
  } catch {
    return null;
  }
}