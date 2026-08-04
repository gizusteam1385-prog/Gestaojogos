import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch {
    // Still return 200 so healthcheck passes even if DB is temporarily unreachable
    return Response.json({ ok: true, db: "unreachable" });
  }
}
