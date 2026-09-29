import { Request } from "express";
import { createClient } from "@supabase/supabase-js";

export interface AuthResult {
  authorized: boolean;
  error?: string;
  status: number;
  user?: any;
}

export async function verifyAdminAuth(req: Request, requiredMessage = "Admin privileges required."): Promise<AuthResult> {
  const authHeader = req.headers.authorization || (req.headers["x-supabase-auth"] as string) || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return { authorized: false, error: "Unauthorized: Missing authentication token.", status: 401 };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { authorized: false, error: "Supabase configuration missing on server.", status: 503 };
  }

  try {
    const authClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const { data: { user }, error: userError } = await authClient.auth.getUser(token);
    if (userError || !user) {
      return { authorized: false, error: "Unauthorized: Invalid or expired session.", status: 401 };
    }

    // Site owner email check
    const isOwner = user.email === "rashedpervej2011@gmail.com" || user.email === "admin@portfolio.com";
    if (isOwner) {
      return { authorized: true, status: 200, user };
    }

    // Role check from user_roles table
    const { data: roleData, error: roleError } = await authClient
      .from("user_roles")
      .select("role")
      .eq("id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleData && !roleError) {
      return { authorized: true, status: 200, user };
    }

    return { authorized: false, error: `Forbidden: ${requiredMessage}`, status: 403, user };
  } catch (err: any) {
    return { authorized: false, error: err?.message || "Auth verification failure.", status: 500 };
  }
}
