declare module "sql.js" {
  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number>) => Database;
  }

  interface Database {
    run(sql: string, params?: unknown[]): void;
    exec(sql: string): QueryExecResult[];
    prepare(sql: string): Statement;
    export(): Uint8Array;
    close(): void;
  }

  interface Statement {
    step(): boolean;
    getAsObject(): Record<string, unknown>;
    free(): void;
    bind(params?: unknown[]): boolean;
  }

  interface QueryExecResult {
    columns: string[];
    values: unknown[][];
  }

  interface InitSqlJsConfig {
    locateFile?: (filename: string) => string;
  }

  export default function initSqlJs(config?: InitSqlJsConfig): Promise<SqlJsStatic>;
  export { Database, Statement, QueryExecResult, SqlJsStatic };
}
