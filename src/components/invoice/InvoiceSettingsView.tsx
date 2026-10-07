import React, { useRef } from "react";
import { InvoiceSettings, DbConfig } from "./types";
import { CURRENCIES } from "./utils";
import { isSupabaseConfigured } from "../../lib/supabase";
import { 
  Sliders, 
  Palette, 
  Hash, 
  Database, 
  Download, 
  Upload, 
  Trash2,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface InvoiceSettingsViewProps {
  settings: InvoiceSettings;
  dbConfig: DbConfig;
  onUpdateSettings: (settings: Partial<InvoiceSettings>) => void;
  onUpdateDbConfig: (config: DbConfig) => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
  onClearAllData: () => void;
}

const PRESET_COLORS = [
  "#e8176c", // Vivid Pink (Default)
  "#2563eb", // Royal Blue
  "#059669", // Emerald Green
  "#7c3aed", // Deep Violet
  "#ea580c", // Amber Orange
  "#0f172a", // Slate Black
  "#0891b2", // Cyan Teal
  "#dc2626", // Crimson Red
];

export const InvoiceSettingsView: React.FC<InvoiceSettingsViewProps> = ({
  settings,
  dbConfig,
  onUpdateSettings,
  onUpdateDbConfig,
  onExportBackup,
  onImportBackup,
  onClearAllData,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="inv-settings-panel" id="settingsPanel">
      <div style={{ marginBottom: "20px" }}>
        <h3
          style={{
            fontSize: "1.2rem",
            fontWeight: 800,
            color: "var(--text-dark)",
            letterSpacing: "-0.02em",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Sliders className="w-5 h-5 text-[#e8176c]" />
          Invoice &amp; App Settings
        </h3>
        <p style={{ fontSize: ".82rem", color: "var(--text-mid)", marginTop: "4px" }}>
          Customize branding, invoice sequence, cloud synchronization, and backup preferences.
        </p>
      </div>

      {/* ── 1. APPEARANCE & BRANDING ──────────────────────────── */}
      <div className="inv-form-section">
        <div className="inv-form-section-title">
          <Palette className="w-3.5 h-3.5" />
          Appearance &amp; Brand Color
        </div>
        <div className="inv-field-row">
          <div className="inv-field" style={{ maxWidth: "160px" }}>
            <label>Accent Color</label>
            <input
              type="color"
              value={settings.accentColor || "#e8176c"}
              onChange={(e) => onUpdateSettings({ accentColor: e.target.value })}
            />
          </div>
          <div className="inv-field">
            <label>Preset Color Palettes</label>
            <div className="inv-theme-swatches">
              {PRESET_COLORS.map((color) => (
                <div
                  key={color}
                  className={`inv-theme-swatch ${settings.accentColor === color ? "active" : ""}`}
                  style={{ backgroundColor: color }}
                  onClick={() => onUpdateSettings({ accentColor: color })}
                  title={color}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. INVOICE NUMBERING & DEFAULTS ───────────────────── */}
      <div className="inv-form-section">
        <div className="inv-form-section-title">
          <Hash className="w-3.5 h-3.5" />
          Invoice Numbering &amp; Defaults
        </div>
        <div className="inv-field-row">
          <div className="inv-field">
            <label>Invoice Prefix</label>
            <input
              type="text"
              value={settings.invPrefix}
              placeholder="INV-"
              onChange={(e) => onUpdateSettings({ invPrefix: e.target.value })}
            />
          </div>
          <div className="inv-field">
            <label>Start Sequence Number</label>
            <input
              type="number"
              value={settings.invStart}
              min="1"
              onChange={(e) => onUpdateSettings({ invStart: parseInt(e.target.value) || 1 })}
            />
          </div>
          <div className="inv-field">
            <label>Padding Digits</label>
            <input
              type="number"
              value={settings.invPad}
              min="1"
              max="10"
              onChange={(e) => onUpdateSettings({ invPad: parseInt(e.target.value) || 5 })}
            />
          </div>
        </div>
        <div className="inv-field-row" style={{ marginTop: "10px" }}>
          <div className="inv-field">
            <label>Default Currency</label>
            <select
              value={settings.defaultCurrency}
              onChange={(e) => onUpdateSettings({ defaultCurrency: e.target.value })}
            >
              {Object.entries(CURRENCIES).map(([code, meta]) => (
                <option key={code} value={code}>
                  {meta.label}
                </option>
              ))}
            </select>
          </div>
          <div className="inv-field">
            <label>Default Tax %</label>
            <input
              type="number"
              value={settings.defaultTax}
              min="0"
              max="100"
              onChange={(e) => onUpdateSettings({ defaultTax: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="inv-field">
            <label>Default Discount %</label>
            <input
              type="number"
              value={settings.defaultDiscount}
              min="0"
              max="100"
              onChange={(e) => onUpdateSettings({ defaultDiscount: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>
      </div>

      {/* ── 3. DATABASE & PERSISTENCE ─────────────────────────── */}
      <div className="inv-form-section">
        <div className="inv-form-section-title">
          <Database className="w-3.5 h-3.5" />
          Database &amp; Cloud Sync
        </div>
        <div className="inv-field-row">
          <div className="inv-field">
            <label>Persistence Backend</label>
            <select
              value={dbConfig.provider}
              onChange={(e) =>
                onUpdateDbConfig({
                  ...dbConfig,
                  provider: e.target.value as "local" | "supabase" | "rest_api",
                })
              }
            >
              <option value="supabase">
                Supabase Cloud Database {isSupabaseConfigured ? "(Active & Connected)" : "(Config Available)"}
              </option>
              <option value="local">Local Browser Storage (Offline Only)</option>
              <option value="rest_api">Custom REST API Endpoint</option>
            </select>
          </div>
        </div>

        {dbConfig.provider === "supabase" && (
          <div
            style={{
              padding: "10px 14px",
              background: "var(--surface)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              marginTop: "8px",
              fontSize: ".78rem",
            }}
          >
            {isSupabaseConfigured ? (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#059669", fontWeight: 600 }}>
                <CheckCircle className="w-4 h-4" />
                Supabase client is configured and active. Invoices will automatically synchronize to the database.
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#d97706", fontWeight: 600 }}>
                <AlertCircle className="w-4 h-4" />
                Supabase environment variables not set; using hybrid fallback with local persistence.
              </div>
            )}
          </div>
        )}

        {dbConfig.provider === "rest_api" && (
          <div style={{ marginTop: "10px" }}>
            <div className="inv-field-row">
              <div className="inv-field">
                <label>API Endpoint URL</label>
                <input
                  type="url"
                  placeholder="https://api.yourdomain.com/v1/invoices"
                  value={dbConfig.apiUrl || ""}
                  onChange={(e) => onUpdateDbConfig({ ...dbConfig, apiUrl: e.target.value })}
                />
              </div>
            </div>
            <div className="inv-field-row">
              <div className="inv-field">
                <label>API Bearer / Secret Key</label>
                <input
                  type="password"
                  placeholder="Bearer token or secret key"
                  value={dbConfig.apiKey || ""}
                  onChange={(e) => onUpdateDbConfig({ ...dbConfig, apiKey: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 4. BACKUP & RESTORE ───────────────────────────────── */}
      <div className="inv-form-section">
        <div className="inv-form-section-title">
          <Download className="w-3.5 h-3.5" />
          Backup &amp; Data Management
        </div>
        <p style={{ fontSize: ".8rem", color: "var(--text-mid)", marginBottom: "14px" }}>
          Export all your invoices, client directory, business profile, and custom settings into a secure JSON backup.
        </p>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="inv-btn inv-btn-outline"
            onClick={onExportBackup}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON Backup</span>
          </button>
          <button
            type="button"
            className="inv-btn inv-btn-outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Restore From Backup</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            accept=".json"
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                onImportBackup(e.target.files[0]);
              }
            }}
          />
          <button
            type="button"
            className="inv-btn inv-btn-danger"
            style={{ marginLeft: "auto" }}
            onClick={onClearAllData}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset All App Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
