import fs from "fs";
import path from "path";
import os from "os";

function getPaths() {
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const dataDir = isServerless ? path.join(os.tmpdir(), "data") : path.join(process.cwd(), "data");
  const leadsFile = path.join(dataDir, "leads.json");
  return { dataDir, leadsFile };
}

// In-memory fallback ledger if filesystem is constrained or read-only
let memoryLeads: Lead[] = [];

// Ensure the data directory and leads file exist safely
function initDb() {
  try {
    const { dataDir, leadsFile } = getPaths();
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(leadsFile)) {
      fs.writeFileSync(leadsFile, JSON.stringify([], null, 2), "utf-8");
    }
  } catch (err: any) {
    // Graceful catch for read-only or permission-constrained environments
    console.warn("[LocalDb] Filesystem write restricted, using in-memory cache:", err.message);
  }
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject: string;
  message: string;
  status: "new" | "read" | "replied" | "archived";
  notes?: string;
  visitor_ip?: string;
  created_at: string;
}

export function readLeadsLocal(): Lead[] {
  try {
    initDb();
    const { leadsFile } = getPaths();
    if (fs.existsSync(leadsFile)) {
      const data = fs.readFileSync(leadsFile, "utf-8");
      const parsed = JSON.parse(data) as Lead[];
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[LocalDb] Read from filesystem skipped, returning memory ledger:", err);
  }
  return memoryLeads;
}

export function writeLeadsLocal(leads: Lead[]): boolean {
  memoryLeads = leads;
  try {
    initDb();
    const { leadsFile } = getPaths();
    fs.writeFileSync(leadsFile, JSON.stringify(leads, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.warn("[LocalDb] Failed to write local leads file (using memory):", err);
    return false;
  }
}

export function addLeadLocal(lead: Omit<Lead, "id" | "status" | "created_at"> & { visitor_ip?: string }): Lead {
  initDb();
  const leads = readLeadsLocal();
  const newLead: Lead = {
    ...lead,
    id: `lead_local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    status: "new",
    created_at: new Date().toISOString(),
    notes: lead.notes || ""
  };
  leads.unshift(newLead);
  writeLeadsLocal(leads);
  return newLead;
}

export function updateLeadLocal(id: string, updates: Partial<Omit<Lead, "id" | "created_at">>): Lead | null {
  initDb();
  const leads = readLeadsLocal();
  const index = leads.findIndex((l) => l.id === id);
  if (index !== -1) {
    leads[index] = { ...leads[index], ...updates };
    writeLeadsLocal(leads);
    return leads[index];
  }
  return null;
}

export function deleteLeadLocal(id: string): boolean {
  initDb();
  const leads = readLeadsLocal();
  const filtered = leads.filter((l) => l.id !== id);
  if (filtered.length !== leads.length) {
    writeLeadsLocal(filtered);
    return true;
  }
  return false;
}
