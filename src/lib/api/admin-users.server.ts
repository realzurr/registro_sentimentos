import { createServerFn } from "@tanstack/react-start";
import { getUserFromSession } from "../supabase/server-fn";
import { getDb } from "../db.server";
import { isAdminEmail } from "../admin-email";

export const checkIsAdmin = createServerFn({ method: "POST" }).handler(
  async (): Promise<boolean> => {
    const user = await getUserFromSession();
    if (!user) return false;

    const conn = getDb();

    if (isAdminEmail(user.email)) {
      conn.prepare(`INSERT OR IGNORE INTO papeis (user_id, role) VALUES (?, 'admin')`).run(user.id);
    }

    const row = conn.prepare(`SELECT role FROM papeis WHERE user_id = ?`).get(user.id) as
      { role: string } | undefined;
    return row?.role === "admin";
  },
);
