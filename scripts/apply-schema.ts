import { readFileSync } from "node:fs";
import { lookup } from "node:dns/promises";
import postgres from "postgres";

const url = readFileSync("secrets/supabase", "utf8").trim();
const schema = readFileSync(process.argv[2] ?? "supabase/schema.sql", "utf8");
const parsed = new URL(url);
const { address } = await lookup(parsed.hostname, { family: 4 });
const sql = postgres({
  host: address,
  port: Number(parsed.port || 5432),
  database: decodedPath(parsed.pathname),
  username: decodeURIComponent(parsed.username),
  password: decodeURIComponent(parsed.password),
  ssl: "require",
  onnotice: () => {},
});

function decodedPath(pathname: string): string {
  const name = pathname.replace(/^\//, "");
  return name.length > 0 ? decodeURIComponent(name) : "postgres";
}
try {
  await sql.unsafe(schema);
  const tables = await sql`
    select tablename from pg_publication_tables
    where pubname = 'supabase_realtime'
      and tablename in ('conversations', 'messages', 'sales')
    order by tablename
  `;
  console.log("schema ok; realtime:", tables.map((t) => t.tablename).join(", "));
} finally {
  await sql.end();
}
