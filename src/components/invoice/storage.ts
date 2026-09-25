import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import { 
  InvoiceFormData, 
  SavedInvoiceRecord, 
  ClientRecord, 
  InvoiceSettings, 
  UserProfile, 
  DbConfig 
} from "./types";
import { DEFAULT_PROFILE, DEFAULT_SETTINGS } from "./utils";

const STORAGE_KEYS = {
  CURRENT: "invpro_current",
  SAVED: "invpro_saved",
  PROFILE: "invpro_profile",
  CLIENTS: "invpro_clients",
  SETTINGS: "invpro_settings",
  DB_CONFIG: "invpro_db_config",
};

export const StorageService = {
  // ── Database Configuration ──────────────────────────────────
  getConfig(): DbConfig {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DB_CONFIG);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { provider: isSupabaseConfigured ? "supabase" : "local", apiUrl: "", apiKey: "" };
  },

  saveConfig(cfg: DbConfig) {
    try {
      localStorage.setItem(STORAGE_KEYS.DB_CONFIG, JSON.stringify(cfg));
    } catch (e) {
      console.warn("Failed to save DB config to localStorage:", e);
    }
  },

  // ── User Profile ───────────────────────────────────────────
  getProfile(): UserProfile {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (raw) {
        return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
      }
    } catch {}
    return { ...DEFAULT_PROFILE };
  },

  saveProfile(profile: Partial<UserProfile>) {
    try {
      const current = this.getProfile();
      const updated = { ...current, ...profile };
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to save profile to localStorage:", e);
    }
  },

  // ── Settings ───────────────────────────────────────────────
  getSettings(): InvoiceSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (raw) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      }
    } catch {}
    return { ...DEFAULT_SETTINGS };
  },

  saveSettings(settings: Partial<InvoiceSettings>) {
    try {
      const current = this.getSettings();
      const updated = { ...current, ...settings };
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to save settings to localStorage:", e);
    }
  },

  // ── Saved Invoices ─────────────────────────────────────────
  async getSavedInvoices(): Promise<SavedInvoiceRecord[]> {
    const cfg = this.getConfig();

    // 1. Try Supabase if configured or selected
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("invoices")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          const mapped: SavedInvoiceRecord[] = data.map((row: any) => {
            const parsedData = typeof row.data === "string" ? JSON.parse(row.data) : (row.data || {});
            return {
              ...parsedData,
              id: row.id,
              invNumber: row.inv_number || parsedData.invNumber,
              clientName: row.client_name || parsedData.clientName,
              clientPhone: row.client_phone || parsedData.clientPhone,
              clientAddress: row.client_address || parsedData.clientAddress,
              clientEmail: row.client_email || parsedData.clientEmail,
              total: Number(row.total ?? parsedData.total ?? 0),
              date: row.date || parsedData.date,
              currency: row.currency || parsedData.currency || "USD",
              savedAt: row.created_at ? new Date(row.created_at).getTime() : (parsedData.savedAt || Date.now()),
            };
          });

          // Sync into local storage cache
          try {
            localStorage.setItem(STORAGE_KEYS.SAVED, JSON.stringify(mapped));
          } catch {}

          return mapped;
        }
      } catch (err) {
        console.warn("Supabase invoice query skipped/failed, using local cache:", err);
      }
    }

    // 2. Try REST API if configured
    if (cfg.provider === "rest_api" && cfg.apiUrl) {
      try {
        const res = await fetch(cfg.apiUrl, {
          headers: {
            Authorization: cfg.apiKey ? (cfg.apiKey.startsWith("Bearer ") ? cfg.apiKey : `Bearer ${cfg.apiKey}`) : "",
            "Content-Type": "application/json",
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) return data;
        }
      } catch (e) {
        console.warn("REST API fetch failed, using local storage:", e);
      }
    }

    // 3. Fallback to localStorage
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SAVED);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  },

  async saveInvoice(invoiceData: SavedInvoiceRecord): Promise<SavedInvoiceRecord> {
    const cfg = this.getConfig();

    // 1. Always update local cache
    let localSaved: SavedInvoiceRecord[] = [];
    try {
      localSaved = JSON.parse(localStorage.getItem(STORAGE_KEYS.SAVED) || "[]");
    } catch {}
    const existingIndex = localSaved.findIndex((i) => i.invNumber === invoiceData.invNumber);
    if (existingIndex !== -1) {
      localSaved[existingIndex] = invoiceData;
    } else {
      localSaved.unshift(invoiceData);
    }
    try {
      localStorage.setItem(STORAGE_KEYS.SAVED, JSON.stringify(localSaved));
    } catch {}

    // 2. Also save client record for auto-suggestion
    if (invoiceData.clientName) {
      this.saveClient({
        name: invoiceData.clientName,
        phone: invoiceData.clientPhone || "",
        address: invoiceData.clientAddress || "",
        email: invoiceData.clientEmail || "",
      });
    }

    // 3. Supabase integration if active
    if (isSupabaseConfigured && supabase) {
      try {
        const user = (await supabase.auth.getUser())?.data?.user;
        const rowData = {
          inv_number: String(invoiceData.invNumber),
          client_name: invoiceData.clientName,
          client_phone: invoiceData.clientPhone || null,
          client_address: invoiceData.clientAddress || null,
          client_email: invoiceData.clientEmail || null,
          total: invoiceData.total,
          currency: invoiceData.currency || "USD",
          date: invoiceData.date,
          data: invoiceData,
          user_id: user?.id || null,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from("invoices")
          .upsert(rowData, { onConflict: "inv_number" });

        if (error) {
          console.warn("Supabase upsert warning:", error.message);
        }
      } catch (err) {
        console.warn("Could not sync invoice to Supabase:", err);
      }
    }

    // 4. REST API integration if active
    if (cfg.provider === "rest_api" && cfg.apiUrl) {
      try {
        await fetch(cfg.apiUrl, {
          method: "POST",
          headers: {
            Authorization: cfg.apiKey ? (cfg.apiKey.startsWith("Bearer ") ? cfg.apiKey : `Bearer ${cfg.apiKey}`) : "",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(invoiceData),
        });
      } catch (e) {
        console.warn("REST API POST failed:", e);
      }
    }

    return invoiceData;
  },

  async deleteInvoice(invNumber: string): Promise<boolean> {
    const cfg = this.getConfig();

    // 1. Remove from local storage
    try {
      let localSaved: SavedInvoiceRecord[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.SAVED) || "[]");
      localSaved = localSaved.filter((i) => i.invNumber !== invNumber);
      localStorage.setItem(STORAGE_KEYS.SAVED, JSON.stringify(localSaved));
    } catch {}

    // 2. Remove from Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("invoices").delete().eq("inv_number", invNumber);
      } catch (err) {
        console.warn("Supabase delete failed:", err);
      }
    }

    // 3. Remove from REST API
    if (cfg.provider === "rest_api" && cfg.apiUrl) {
      try {
        await fetch(`${cfg.apiUrl}/${encodeURIComponent(invNumber)}`, {
          method: "DELETE",
          headers: {
            Authorization: cfg.apiKey || "",
            "Content-Type": "application/json",
          },
        });
      } catch (e) {}
    }

    return true;
  },

  // ── Clients ────────────────────────────────────────────────
  getClients(): ClientRecord[] {
    try {
      const clients: ClientRecord[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLIENTS) || "[]");
      // Extract unique clients from saved invoices too
      const rawInvoices = localStorage.getItem(STORAGE_KEYS.SAVED);
      if (rawInvoices) {
        const saved: SavedInvoiceRecord[] = JSON.parse(rawInvoices);
        saved.forEach((inv) => {
          if (inv.clientName && inv.clientName.trim()) {
            const exists = clients.some(
              (c) => c.name.toLowerCase() === inv.clientName.trim().toLowerCase()
            );
            if (!exists) {
              clients.push({
                name: inv.clientName.trim(),
                phone: inv.clientPhone || "",
                address: inv.clientAddress || "",
                email: inv.clientEmail || "",
              });
            }
          }
        });
      }
      return clients;
    } catch {
      return [];
    }
  },

  saveClient(client: ClientRecord) {
    if (!client.name || !client.name.trim()) return;
    try {
      const cleanName = client.name.trim();
      const clients = this.getClients();
      const idx = clients.findIndex((c) => c.name.toLowerCase() === cleanName.toLowerCase());
      const record: ClientRecord = {
        name: cleanName,
        phone: client.phone || "",
        address: client.address || "",
        email: client.email || "",
        updated_at: new Date().toISOString(),
      };
      if (idx !== -1) {
        clients[idx] = record;
      } else {
        clients.push(record);
      }
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
    } catch (e) {
      console.warn("Failed to save client to localStorage:", e);
    }
  },

  // ── Current Working Invoice Draft ──────────────────────────
  getCurrentDraft(): InvoiceFormData | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CURRENT);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  },

  saveCurrentDraft(data: InvoiceFormData) {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT, JSON.stringify(data));
      this.saveProfile({
        bizName1: data.bizName1,
        bizName2: data.bizName2,
        bizTagline: data.bizTagline,
        payCompany: data.payCompany,
        payBank: data.payBank,
        sigName: data.sigName,
        sigTitle: data.sigTitle,
        footerAddr1: data.footerAddr1,
        footerAddr2: data.footerAddr2,
        footerAddr3: data.footerAddr3,
        footerPhone1: data.footerPhone1,
        footerPhone2: data.footerPhone2,
        footerEmail: data.footerEmail,
        footerWebsite: data.footerWebsite,
        footerCards: data.footerCards,
        conditionsTitle: data.conditionsTitle,
        termsText: data.termsText,
        thanksMsg: data.thanksMsg,
      });
    } catch (e) {}
  },

  // ── Full Backup & Restore ──────────────────────────────────
  async exportFullBackup() {
    return {
      version: "2026.1",
      exportedAt: new Date().toISOString(),
      currentInvoice: this.getCurrentDraft(),
      profile: this.getProfile(),
      savedInvoices: await this.getSavedInvoices(),
      clients: this.getClients(),
      settings: this.getSettings(),
      dbConfig: this.getConfig(),
    };
  },

  async importFullBackup(backupObj: any): Promise<boolean> {
    if (!backupObj || typeof backupObj !== "object") {
      throw new Error("Invalid backup file format");
    }
    if (backupObj.currentInvoice) {
      localStorage.setItem(STORAGE_KEYS.CURRENT, JSON.stringify(backupObj.currentInvoice));
    }
    if (backupObj.profile) {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(backupObj.profile));
    }
    if (backupObj.savedInvoices) {
      localStorage.setItem(STORAGE_KEYS.SAVED, JSON.stringify(backupObj.savedInvoices));
    }
    if (backupObj.clients) {
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(backupObj.clients));
    }
    if (backupObj.settings) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(backupObj.settings));
    }
    if (backupObj.dbConfig) {
      this.saveConfig(backupObj.dbConfig);
    }
    return true;
  },
};
