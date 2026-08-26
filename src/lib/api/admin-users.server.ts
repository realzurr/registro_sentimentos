import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getUserFromToken } from "../supabase/server-fn";
import { getDb } from "../db.server";
import { isAdminEmail } from "../admin-email";

export const checkIsAdmin = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }): Promise<boolean> => {
    const user = await getUserFromToken(data.token);
    if (!user) return false;

    const conn = getDb();

    if (isAdminEmail(user.email)) {
      conn.prepare(`INSERT OR IGNORE INTO papeis (user_id, role) VALUES (?, 'admin')`).run(user.id);
    }

    const row = conn.prepare(`SELECT role FROM papeis WHERE user_id = ?`).get(user.id) as
      { role: string } | undefined;
    return row?.role === "admin";
  });
