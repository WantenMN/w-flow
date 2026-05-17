import type { FilterNode } from "./types";

// --- Tokenizer ---

type TokenType =
  | "ident"
  | "string"
  | "number"
  | "op"
  | "lparen"
  | "rparen"
  | "dot"
  | "comma"
  | "and"
  | "not"
  | "eof";

interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];

    // whitespace
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // string literal
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      while (j < expr.length && expr[j] !== quote) {
        if (expr[j] === "\\") {
          j++; // skip escaped char
        }
        j++;
      }
      tokens.push({ type: "string", value: expr.slice(i + 1, j), pos: i });
      i = j + 1;
      continue;
    }

    // number literal
    if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < expr.length && /[0-9.]/.test(expr[j])) {
        j++;
      }
      tokens.push({ type: "number", value: expr.slice(i, j), pos: i });
      i = j;
      continue;
    }

    // && (and)
    if (ch === "&" && expr[i + 1] === "&") {
      tokens.push({ type: "and", value: "&&", pos: i });
      i += 2;
      continue;
    }

    // || (or)
    if (ch === "|" && expr[i + 1] === "|") {
      tokens.push({ type: "op", value: "||", pos: i });
      i += 2;
      continue;
    }

    // operators
    if (ch === "!" && expr[i + 1] === "=") {
      tokens.push({ type: "op", value: "!=", pos: i });
      i += 2;
      continue;
    }
    if (ch === "=" && expr[i + 1] === "=") {
      tokens.push({ type: "op", value: "==", pos: i });
      i += 2;
      continue;
    }
    if (ch === ">" && expr[i + 1] === "=") {
      tokens.push({ type: "op", value: ">=", pos: i });
      i += 2;
      continue;
    }
    if (ch === "<" && expr[i + 1] === "=") {
      tokens.push({ type: "op", value: "<=", pos: i });
      i += 2;
      continue;
    }
    if (ch === ">") {
      tokens.push({ type: "op", value: ">", pos: i });
      i++;
      continue;
    }
    if (ch === "<") {
      tokens.push({ type: "op", value: "<", pos: i });
      i++;
      continue;
    }

    // not
    if (ch === "!") {
      tokens.push({ type: "not", value: "!", pos: i });
      i++;
      continue;
    }

    // punctuation
    if (ch === "(") {
      tokens.push({ type: "lparen", value: "(", pos: i });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "rparen", value: ")", pos: i });
      i++;
      continue;
    }
    if (ch === ".") {
      tokens.push({ type: "dot", value: ".", pos: i });
      i++;
      continue;
    }
    if (ch === ",") {
      tokens.push({ type: "comma", value: ",", pos: i });
      i++;
      continue;
    }

    // identifier
    if (/[a-zA-Z_]/.test(ch)) {
      let j = i;
      while (j < expr.length && /[a-zA-Z0-9_]/.test(expr[j])) {
        j++;
      }
      tokens.push({ type: "ident", value: expr.slice(i, j), pos: i });
      i = j;
      continue;
    }

    // skip unknown char
    i++;
  }
  tokens.push({ type: "eof", value: "", pos: i });
  return tokens;
}

// --- Parser ---

class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private advance(): Token {
    const tok = this.tokens[this.pos];
    this.pos++;
    return tok;
  }

  private expect(type: TokenType): Token {
    const tok = this.peek();
    if (tok.type !== type) {
      throw new Error(`Expected ${type} but got ${tok.type} at position ${tok.pos}`);
    }
    return this.advance();
  }

  parse(): FilterNode {
    const node = this.parseAnd();
    return node;
  }

  private parseAnd(): FilterNode {
    let left = this.parseUnary();
    while (this.peek().type === "and") {
      this.advance(); // consume &&
      const right = this.parseUnary();
      if (left.kind === "and") {
        left.children.push(right);
      } else {
        left = { kind: "and", children: [left, right] };
      }
    }
    return left;
  }

  private parseUnary(): FilterNode {
    if (this.peek().type === "not") {
      this.advance(); // consume !
      const child = this.parseUnary();
      return { kind: "not", child };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): FilterNode {
    const tok = this.peek();

    // parenthesized expression
    if (tok.type === "lparen") {
      this.advance();
      const node = this.parseAnd();
      this.expect("rparen");
      return node;
    }

    // must be a property path
    const property = this.parsePropertyPath();

    // method call: property.method(args)
    if (this.peek().type === "dot") {
      this.advance(); // consume dot
      const methodTok = this.expect("ident");
      this.expect("lparen");
      const args = this.parseArgs();
      this.expect("rparen");
      return { kind: "method", property, method: methodTok.value, args };
    }

    // comparison: property op value
    if (this.peek().type === "op") {
      const opTok = this.advance();
      const valueTok = this.peek();
      if (valueTok.type === "string" || valueTok.type === "number") {
        this.advance();
        return { kind: "comparison", property, operator: opTok.value, value: valueTok.value };
      }
      throw new Error(`Expected value after operator at position ${valueTok.pos}`);
    }

    // bare property (treat as truthy check) - fallback
    throw new Error(`Unexpected token ${this.peek().type} at position ${this.peek().pos}`);
  }

  private parsePropertyPath(): string {
    const parts: string[] = [];
    const tok = this.expect("ident");
    parts.push(tok.value);
    while (this.peek().type === "dot") {
      // look ahead: if `.ident(` it's a method call, stop before the dot
      if (
        this.pos + 2 < this.tokens.length &&
        this.tokens[this.pos + 1].type === "ident" &&
        this.tokens[this.pos + 2].type === "lparen"
      ) {
        break;
      }
      this.advance(); // consume dot
      if (this.peek().type === "ident") {
        parts.push(this.advance().value);
      } else {
        break;
      }
    }
    return parts.join(".");
  }

  private parseArgs(): string[] {
    const args: string[] = [];
    if (this.peek().type === "rparen") {
      return args;
    }
    args.push(this.parseArgValue());
    while (this.peek().type === "comma") {
      this.advance(); // consume comma
      args.push(this.parseArgValue());
    }
    return args;
  }

  private parseArgValue(): string {
    const tok = this.peek();
    if (tok.type === "string" || tok.type === "number") {
      this.advance();
      return tok.value;
    }
    throw new Error(`Expected string or number argument at position ${tok.pos}`);
  }
}

export function parseFilterExpression(expr: string): FilterNode {
  const tokens = tokenize(expr);
  const parser = new Parser(tokens);
  try {
    return parser.parse();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[w-flow] Failed to parse filter expression: "${expr}"`);
    console.error(`[w-flow] Error: ${msg}`);
    console.error(`[w-flow] Tokens: ${JSON.stringify(tokens)}`);
    throw new Error(`Failed to parse filter: "${expr}" - ${msg}`);
  }
}

export function parseFilterGroup(
  group: Record<string, unknown>,
): FilterNode | undefined {
  const nodes: FilterNode[] = [];

  if (Array.isArray(group.and)) {
    for (const item of group.and) {
      if (typeof item === "string") {
        nodes.push(parseFilterExpression(item));
      } else if (typeof item === "object" && item !== null) {
        const child = parseFilterGroup(item as Record<string, unknown>);
        if (child) {
          nodes.push(child);
        }
      }
    }
    return nodes.length === 1 ? nodes[0] : { kind: "and", children: nodes };
  }

  if (Array.isArray(group.or)) {
    for (const item of group.or) {
      if (typeof item === "string") {
        nodes.push(parseFilterExpression(item));
      } else if (typeof item === "object" && item !== null) {
        const child = parseFilterGroup(item as Record<string, unknown>);
        if (child) {
          nodes.push(child);
        }
      }
    }
    return nodes.length === 1 ? nodes[0] : { kind: "or", children: nodes };
  }

  if (Array.isArray(group.not)) {
    for (const item of group.not) {
      if (typeof item === "string") {
        nodes.push(parseFilterExpression(item));
      } else if (typeof item === "object" && item !== null) {
        const child = parseFilterGroup(item as Record<string, unknown>);
        if (child) {
          nodes.push(child);
        }
      }
    }
    const inner = nodes.length === 1 ? nodes[0] : { kind: "and" as const, children: nodes };
    return { kind: "not", child: inner };
  }

  return undefined;
}
