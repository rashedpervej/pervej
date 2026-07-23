import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const LEADS_FILE = path.join(DATA_DIR, "leads.json");

// Ensure the data directory and leads file exist
function initDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(LEADS_FILE)) {
    fs.writeFileSync(LEADS_FILE, JSON.stringify([], null, 2), "utf-8");
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
    const data = fs.readFileSync(LEADS_FILE, "utf-8");
    return JSON.parse(data) as Lead[];
  } catch (err) {
    console.error("Failed to read local leads file:", err);
    return [];
  }
}

export function writeLeadsLocal(leads: Lead[]): boolean {
  try {
    initDb();
    fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Failed to write local leads file:", err);
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
