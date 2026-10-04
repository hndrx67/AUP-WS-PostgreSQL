import "server-only";
import { query } from "@/lib/db";
import { getSessionProfile } from "@/lib/auth";

type Filter = { op: "eq" | "gte" | "in"; column: string; value: unknown };
type Order = { column: string; ascending: boolean };
const ident = (value: string) => value.split(".").map((part) => `"${part.replaceAll('"', '""')}"`).join(".");

class SelectQuery {
  private filters: Filter[] = [];
  private orders: Order[] = [];
  private take?: number;
  private countOnly = false;
  constructor(private table: string, private columns: string, countOnly = false, private departmentId?: string, private role?: string) { this.countOnly = countOnly; }
  eq(column: string, value: unknown) { this.filters.push({ op: "eq", column, value }); return this; }
  gte(column: string, value: unknown) { this.filters.push({ op: "gte", column, value }); return this; }
  in(column: string, value: unknown[]) { this.filters.push({ op: "in", column, value }); return this; }
  order(column: string, options?: { ascending?: boolean }) { this.orders.push({ column, ascending: options?.ascending ?? true }); return this; }
  limit(value: number) { this.take = value; return this; }
  select(_columns?: string, options?: { count?: string; head?: boolean }) { if (options?.count) this.countOnly = true; return this; }
  async maybeSingle() { const result = await this.execute(); return { ...result, data: result.data?.[0] ?? null }; }
  then(resolve: (value: { data: any[] | null; count?: number; error: null }) => unknown, reject?: (reason: unknown) => unknown) { return this.execute().then(resolve, reject); }
  private async execute() {
    const values: unknown[] = [];
    const where = this.filters.map((filter) => {
      values.push(filter.value);
      const param = `$${values.length}`;
      return filter.op === "in" ? `${ident(filter.column)} = ANY(${param})` : `${ident(filter.column)} ${filter.op === "eq" ? "=" : ">="} ${param}`;
    });
    if (this.role === "supervisor" && this.departmentId) {
      const scopedColumn = this.table === "profiles" ? "department_id" : this.table === "departments" ? "id" : null;
      if (scopedColumn) { values.push(this.departmentId); where.push(`${ident(scopedColumn)} = $${values.length}`); }
      else if (["time_logs", "schedules", "payouts", "wallet_transfers"].includes(this.table)) {
        values.push(this.departmentId);
        where.push(`${ident("student_id")} IN (SELECT id FROM profiles WHERE department_id = $${values.length})`);
      }
    }
    if (this.countOnly) {
      const result = await query<{ count: string }>(`SELECT count(*)::text AS count FROM ${ident(this.table)}${where.length ? ` WHERE ${where.join(" AND ")}` : ""}`, values);
      return { data: null, count: Number(result.rows[0]?.count ?? 0), error: null };
    }
    const columns = this.projectColumns();
    const order = this.orders.length ? ` ORDER BY ${this.orders.map((o) => `${ident(o.column)} ${o.ascending ? "ASC" : "DESC"}`).join(", ")}` : "";
    const limit = this.take === undefined ? "" : ` LIMIT ${Math.max(0, Math.floor(this.take))}`;
    const result = await query(`SELECT ${columns} FROM ${ident(this.table)}${where.length ? ` WHERE ${where.join(" AND ")}` : ""}${order}${limit}`, values);
    return { data: result.rows, error: null };
  }
  private projectColumns() {
    const parts = this.columns.match(/(?:[^,(]+|\([^)]*\))+/g)?.map((part) => part.trim()).filter(Boolean) ?? [];
    const projected: string[] = [];
    for (const part of parts) {
      const rel = part.match(/^(\w+):(\w+)(?:![\w]+)?\(([^)]+)\)$/);
      if (!rel) { projected.push(part === "*" ? `${ident(this.table)}.*` : ident(part)); continue; }
      const [, alias, table, fields] = rel;
      const fk = this.table === "profiles" && table === "departments" ? "department_id" : `${table === "profiles" ? "student" : table.replace(/s$/, "")}_id`;
      const joinOn = table === "departments" ? `${ident(table)}."id" = ${ident(this.table)}."department_id"` : `${ident(table)}."id" = ${ident(this.table)}."${fk}"`;
      projected.push(`(SELECT json_build_object(${fields.split(",").map((field) => `'${field.trim()}', ${ident(table)}.${ident(field.trim())}`).join(", ")}) FROM ${ident(table)} WHERE ${joinOn} LIMIT 1) AS ${ident(alias)}`);
    }
    return projected.join(", ");
  }
}

export async function createPostgresClient() {
  const profile = await getSessionProfile();
  return { from(table: string) { return { select(columns = "*", options?: { count?: string; head?: boolean }) { return new SelectQuery(table, columns, !!options?.count, profile?.department_id ?? undefined, profile?.role); } }; } };
}
