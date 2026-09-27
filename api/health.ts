import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { readLeadsLocal } from "./localDb";

function getSupabaseClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  const isConfigured = Boolean(
    supabaseUrl && 
    supabaseAnonKey && 
    supabaseUrl !== "https://your-supabase-project.supabase.co"
  );

  if (isConfigured) {
    return createClient(supabaseUrl!, supabaseAnonKey!);
  }
  return null;
}

/**
 * Health Check and Database Keep-Alive Endpoint
 * 
 * Purpose:
 * 1. Monitored by UptimeRobot, BetterUptime, Cron-job.org, etc.
 * 2. Actively pings the Supabase PostgreSQL database to prevent 7-day auto-pause on free tier.
 * 3. Works seamlessly on Vercel Serverless Functions (/api/health) and Express server.
 */
export default async function healthHandler(req: Request, res: Response) {
  // CORS & Cache control headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const timestamp = new Date().toISOString();
  const uptimeSeconds = Math.floor(process.uptime());

  // Test local JSON database (safe fallback)
  let localLeadsCount = 0;
  let localDbStatus = "ok";
  try {
    const localLeads = readLeadsLocal();
    localLeadsCount = localLeads.length;
  } catch (err: any) {
    localDbStatus = "degraded: " + (err.message || "read error");
  }

  const supabase = getSupabaseClient();

  // If Supabase is not configured
  if (!supabase) {
    const payload = {
      status: "degraded",
      message: "Database ping completed in local fallback mode (Supabase credentials not configured).",
      timestamp,
      uptime_seconds: uptimeSeconds,
      database: {
        provider: "local_json",
        status: "local_only",
        configured: false,
        warning: "VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing."
      },
      local_db: {
        status: localDbStatus,
        leads_count: localLeadsCount
      }
    };

    if (req.method === "HEAD") {
      return res.status(200).end();
    }
    return res.status(200).json(payload);
  }

  // Ping Supabase PostgreSQL database
  const startPingTime = Date.now();
  let querySuccess = false;
  let queriedTable = "";
  let queryError: any = null;

  // Try candidate tables in order of preference
  const candidateTables = ["leads", "invoices", "analytics_events", "site_settings", "chatbot_interactions"];

  for (const table of candidateTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select("id")
        .limit(1);

      if (!error) {
        querySuccess = true;
        queriedTable = table;
        break;
      } else {
        // If it's an RLS policy restriction or missing table, keep trying candidate tables
        queryError = error;
      }
    } catch (err: any) {
      queryError = err;
    }
  }

  const latencyMs = Date.now() - startPingTime;

  if (querySuccess) {
    const payload = {
      status: "ok",
      message: "Database ping successful. Database is awake and active.",
      timestamp,
      uptime_seconds: uptimeSeconds,
      database: {
        provider: "supabase",
        status: "healthy",
        configured: true,
        latency_ms: latencyMs,
        queried_table: queriedTable,
        keep_alive: "active"
      },
      local_db: {
        status: localDbStatus,
        leads_count: localLeadsCount
      }
    };

    if (req.method === "HEAD") {
      return res.status(200).end();
    }
    return res.status(200).json(payload);
  } else {
    // Database query failed
    const errorMsg = queryError?.message || "Unable to reach database tables";
    console.error("[Health Check] Supabase ping failed:", errorMsg);

    const payload = {
      status: "error",
      message: "Database ping failed. Could not query database.",
      timestamp,
      uptime_seconds: uptimeSeconds,
      database: {
        provider: "supabase",
        status: "unreachable",
        configured: true,
        latency_ms: latencyMs,
        error: errorMsg,
        keep_alive: "failed"
      },
      local_db: {
        status: localDbStatus,
        leads_count: localLeadsCount
      }
    };

    if (req.method === "HEAD") {
      return res.status(503).end();
    }
    return res.status(503).json(payload);
  }
}
