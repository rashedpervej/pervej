import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  InvoiceFormData, 
  InvoiceItem, 
  SavedInvoiceRecord, 
  ClientRecord, 
  InvoiceSettings, 
  DbConfig, 
  ToastMessage 
} from "./invoice/types";
import { 
  DEFAULT_PROFILE, 
  DEFAULT_SETTINGS, 
  DEFAULT_ITEMS, 
  calcTotals, 
  getTodayDateStr, 
  getFormattedInvNumber, 
  generateNextInvNumber,
  shadeColor,
  hexToRgba
} from "./invoice/utils";
import { StorageService } from "./invoice/storage";
import { InvoiceEditor } from "./invoice/InvoiceEditor";
import { InvoicePreview } from "./invoice/InvoicePreview";
import { InvoiceSavedList } from "./invoice/InvoiceSavedList";
import { InvoiceSettingsView } from "./invoice/InvoiceSettingsView";
import { ItemBottomSheet } from "./invoice/ItemBottomSheet";
import { exportInvoiceToPdf, printInvoiceDirect } from "./invoice/pdfExport";
import "./invoice/invoice.css";

import { 
  Printer, 
  Save, 
  RotateCcw, 
  Plus, 
  FileText, 
  Sliders, 
  ArrowLeft, 
  Check, 
  AlertCircle, 
  Eye, 
  Edit3,
  Layers,
  Download,
  Loader2
} from "lucide-react";

export const InvoiceMaker: React.FC = () => {
  // ── Global State ───────────────────────────────────────────
  const [activeMainTab, setActiveMainTab] = useState<"create" | "saved" | "settings">("create");
  const [mobileMode, setMobileMode] = useState<"editor" | "preview">("editor");
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfProgressText, setPdfProgressText] = useState("");

  const [settings, setSettings] = useState<InvoiceSettings>(() => StorageService.getSettings());
  const [dbConfig, setDbConfig] = useState<DbConfig>(() => StorageService.getConfig());
  const [clients, setClients] = useState<ClientRecord[]>(() => StorageService.getClients());
  const [savedInvoices, setSavedInvoices] = useState<SavedInvoiceRecord[]>([]);

  // Current Working Invoice
  const [formData, setFormData] = useState<InvoiceFormData>(() => {
    const draft = StorageService.getCurrentDraft();
    const profile = StorageService.getProfile();
    const currentSettings = StorageService.getSettings();

    if (draft) {
      return {
        ...draft,
        items: draft.items?.length ? draft.items : [...DEFAULT_ITEMS],
      };
    }

    return {
      ...profile,
      invNumber: currentSettings.invStart || 1,
      invDate: getTodayDateStr(),
      invTitle: "INVOICE",
      invCurrency: currentSettings.defaultCurrency || "USD",
      clientName: "",
      clientPhone: "",
      clientAddress: "",
      clientEmail: "",
      taxRate: currentSettings.defaultTax ?? 15,
      discountRate: currentSettings.defaultDiscount ?? 15,
      items: [...DEFAULT_ITEMS],
      logoDataUrl: "",
    };
  });

  // Modals & Bottom Sheet
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InvoiceItem | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    danger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string, type: "success" | "error" | "info" = "success") => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  // ── Load Saved Invoices from Database / Storage ────────────
  useEffect(() => {
    let mounted = true;
    StorageService.getSavedInvoices().then((list) => {
      if (mounted) {
        setSavedInvoices(list);
        // If draft is new, set appropriate next sequence number
        if (!StorageService.getCurrentDraft()) {
          const nextNum = generateNextInvNumber(list, settings.invStart);
          setFormData((prev) => ({ ...prev, invNumber: nextNum }));
        }
      }
    });
    return () => {
      mounted = false;
    };
  }, [settings.invStart]);

  // ── Theme Color Sync ───────────────────────────────────────
  useEffect(() => {
    const accent = settings.accentColor || "#e8176c";
    const dark = shadeColor(accent, -25);
    const light = hexToRgba(accent, 0.12);
    const subtle = hexToRgba(accent, 0.05);

    document.documentElement.style.setProperty("--accent", accent);
    document.documentElement.style.setProperty("--accent-dark", dark);
    document.documentElement.style.setProperty("--accent-light", light);
    document.documentElement.style.setProperty("--accent-subtle", subtle);
  }, [settings.accentColor]);

  // ── Auto-save Current Draft ────────────────────────────────
  useEffect(() => {
    StorageService.saveCurrentDraft(formData);
  }, [formData]);

  // ── Field Updates ──────────────────────────────────────────
  const updateField = useCallback(<K extends keyof InvoiceFormData>(key: K, value: InvoiceFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateItem = useCallback((id: number | string, field: keyof InvoiceItem, value: any) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === id ? { ...it, [field]: value } : it)),
    }));
  }, []);

  const addItem = useCallback((item?: InvoiceItem) => {
    const newItem: InvoiceItem = item || {
      id: Date.now(),
      desc: "New Service / Product Item",
      notes: "",
      price: 100,
      qty: 1,
    };
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  }, []);

  const removeItem = useCallback((id: number | string) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((it) => it.id !== id),
    }));
    showToast("Item removed", "info");
  }, [showToast]);

  const duplicateItem = useCallback((id: number | string) => {
    setFormData((prev) => {
      const idx = prev.items.findIndex((it) => it.id === id);
      if (idx === -1) return prev;
      const target = prev.items[idx];
      const copy: InvoiceItem = {
        ...target,
        id: Date.now(),
        desc: target.desc ? `${target.desc} (Copy)` : "Copy",
      };
      const updated = [...prev.items];
      updated.splice(idx + 1, 0, copy);
      return { ...prev, items: updated };
    });
    showToast("Item duplicated", "info");
  }, [showToast]);

  const reorderItems = useCallback((srcIdx: number, destIdx: number) => {
    setFormData((prev) => {
      const items = [...prev.items];
      const [moved] = items.splice(srcIdx, 1);
      items.splice(destIdx, 0, moved);
      return { ...prev, items };
    });
  }, []);

  const handleSelectClient = useCallback((client: ClientRecord) => {
    setFormData((prev) => ({
      ...prev,
      clientName: client.name,
      clientPhone: client.phone || prev.clientPhone,
      clientAddress: client.address || prev.clientAddress,
      clientEmail: client.email || prev.clientEmail,
    }));
    showToast(`Loaded details for ${client.name}`, "info");
  }, [showToast]);

  const handleUploadLogo = useCallback((file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      showToast("Logo file must be under 2MB", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setFormData((prev) => ({ ...prev, logoDataUrl: dataUrl }));
      showToast("Logo uploaded successfully", "success");
    };
    reader.readAsDataURL(file);
  }, [showToast]);

  const handleClearLogo = useCallback(() => {
    setFormData((prev) => ({ ...prev, logoDataUrl: "" }));
    showToast("Logo removed", "info");
  }, [showToast]);

  // ── Save Current Invoice ───────────────────────────────────
  const handleSaveInvoice = async () => {
    const { total } = calcTotals(formData.items, formData.taxRate, formData.discountRate);
    const formattedNum = getFormattedInvNumber(formData.invNumber, settings.invPrefix, settings.invPad);

    const record: SavedInvoiceRecord = {
      ...formData,
      invNumber: formattedNum,
      total,
      currency: formData.invCurrency,
      date: formData.invDate,
      savedAt: Date.now(),
    };

    try {
      await StorageService.saveInvoice(record);
      const updatedList = await StorageService.getSavedInvoices();
      setSavedInvoices(updatedList);
      setClients(StorageService.getClients());
      showToast(`Invoice ${formattedNum} saved successfully!`, "success");
    } catch (e: any) {
      showToast(e?.message || "Failed to save invoice", "error");
    }
  };

  // ── New Invoice ────────────────────────────────────────────
  const handleNewInvoice = () => {
    const nextNum = generateNextInvNumber(savedInvoices, settings.invStart);
    const profile = StorageService.getProfile();

    setFormData({
      ...profile,
      invNumber: nextNum,
      invDate: getTodayDateStr(),
      invTitle: "INVOICE",
      invCurrency: settings.defaultCurrency || "USD",
      clientName: "",
      clientPhone: "",
      clientAddress: "",
      clientEmail: "",
      taxRate: settings.defaultTax ?? 15,
      discountRate: settings.defaultDiscount ?? 15,
      items: [...DEFAULT_ITEMS],
      logoDataUrl: formData.logoDataUrl || "",
    });

    setActiveMainTab("create");
    setMobileMode("editor");
    showToast(`Created new invoice (${settings.invPrefix || "INV-"}${String(nextNum).padStart(settings.invPad, "0")})`, "info");
  };

  // ── Helper to safely normalize any record to valid InvoiceFormData ──
  const normalizeRecordToFormData = useCallback((record: any): InvoiceFormData => {
    const rawNum = parseInt(String(record?.invNumber || "1").replace(/\D/g, "")) || 1;
    const profile = StorageService.getProfile();
    const currentSettings = StorageService.getSettings();

    return {
      bizName1: record?.bizName1 || profile.bizName1 || "RASHED",
      bizName2: record?.bizName2 || profile.bizName2 || "PERVEJ",
      bizTagline: record?.bizTagline || profile.bizTagline || "360° Design Solution",
      invNumber: rawNum,
      invDate: record?.date || record?.invDate || getTodayDateStr(),
      invTitle: record?.invTitle || "INVOICE",
      invCurrency: record?.invCurrency || record?.currency || currentSettings.defaultCurrency || "USD",
      clientName: record?.clientName || "",
      clientPhone: record?.clientPhone || "",
      clientAddress: record?.clientAddress || "",
      clientEmail: record?.clientEmail || "",
      taxRate: record?.taxRate ?? currentSettings.defaultTax ?? 15,
      discountRate: record?.discountRate ?? currentSettings.defaultDiscount ?? 15,
      items: Array.isArray(record?.items) && record.items.length > 0 ? record.items : [...DEFAULT_ITEMS],
      payCompany: record?.payCompany || profile.payCompany || "Cash Paid",
      payBank: record?.payBank || profile.payBank || "A/C NO - 6024 5879 6687",
      sigName: record?.sigName || profile.sigName || "RASHED PERVEJ",
      sigTitle: record?.sigTitle || profile.sigTitle || "Visualizer",
      footerAddr1: record?.footerAddr1 || profile.footerAddr1 || "",
      footerAddr2: record?.footerAddr2 || profile.footerAddr2 || "",
      footerAddr3: record?.footerAddr3 || profile.footerAddr3 || "",
      footerPhone1: record?.footerPhone1 || profile.footerPhone1 || "",
      footerPhone2: record?.footerPhone2 || profile.footerPhone2 || "",
      footerEmail: record?.footerEmail || profile.footerEmail || "",
      footerWebsite: record?.footerWebsite || profile.footerWebsite || "",
      footerCards: record?.footerCards || profile.footerCards || "",
      conditionsTitle: record?.conditionsTitle || profile.conditionsTitle || "Condition",
      termsText: record?.termsText ?? profile.termsText ?? "",
      thanksMsg: record?.thanksMsg ?? profile.thanksMsg ?? "",
      logoDataUrl: record?.logoDataUrl || "",
    };
  }, []);

  // ── Edit Saved Invoice ─────────────────────────────────────
  const handleEditSavedInvoice = (inv: SavedInvoiceRecord) => {
    const normalized = normalizeRecordToFormData(inv);
    setFormData(normalized);
    setActiveMainTab("create");
    setMobileMode("editor");
    showToast(`Loaded invoice ${inv.invNumber}`, "info");
  };

  // ── Duplicate Saved Invoice ────────────────────────────────
  const handleDuplicateSavedInvoice = async (inv: SavedInvoiceRecord) => {
    const nextNum = generateNextInvNumber(savedInvoices, settings.invStart);
    const formattedNum = getFormattedInvNumber(nextNum, settings.invPrefix, settings.invPad);

    const copyRecord: SavedInvoiceRecord = {
      ...inv,
      invNumber: formattedNum,
      date: getTodayDateStr(),
      savedAt: Date.now(),
    };

    await StorageService.saveInvoice(copyRecord);
    const updatedList = await StorageService.getSavedInvoices();
    setSavedInvoices(updatedList);
    showToast(`Duplicated to ${formattedNum}`, "success");
  };

  // ── Delete Saved Invoice ───────────────────────────────────
  const handleDeleteSavedInvoice = (invNumber: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Invoice?",
      message: `Are you sure you want to delete invoice ${invNumber}? This action cannot be undone.`,
      confirmText: "Delete Invoice",
      danger: true,
      onConfirm: async () => {
        await StorageService.deleteInvoice(invNumber);
        const updated = await StorageService.getSavedInvoices();
        setSavedInvoices(updated);
        setConfirmModal(null);
        showToast(`Invoice ${invNumber} deleted`, "info");
      },
    });
  };

  // ── Reset Current Form ─────────────────────────────────────
  const handleResetForm = () => {
    setConfirmModal({
      isOpen: true,
      title: "Reset Current Invoice?",
      message: "Reset all current fields to business defaults? Any unsaved edits will be discarded.",
      confirmText: "Reset Form",
      danger: true,
      onConfirm: () => {
        handleNewInvoice();
        setConfirmModal(null);
        showToast("Invoice form reset", "info");
      },
    });
  };

  // ── Print / PDF Generation ─────────────────────────────────
  const handleDownloadPdf = async (customRecord?: any) => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    setPdfProgressText("Initializing PDF engine...");
    try {
      let targetData = formData;
      if (customRecord) {
        targetData = normalizeRecordToFormData(customRecord);
        setFormData(targetData);
        await new Promise((r) => setTimeout(r, 100));
      }

      const invNumFormatted = getFormattedInvNumber(targetData.invNumber, settings.invPrefix, settings.invPad);
      const cleanClient = (targetData.clientName || "Client").replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `Invoice_${invNumFormatted}_${cleanClient}.pdf`;
      
      await exportInvoiceToPdf("invoicePreview", filename, (progress) => {
        setPdfProgressText(progress);
      });
      showToast(`Exported ${filename}`, "success");
    } catch (err: any) {
      console.error("PDF Export Error:", err);
      showToast(err?.message || "PDF generation error. You can also use Print to Save as PDF.", "error");
    } finally {
      setIsExportingPdf(false);
      setPdfProgressText("");
    }
  };

  const handlePrint = async (customRecord?: any) => {
    if (customRecord) {
      const targetData = normalizeRecordToFormData(customRecord);
      setFormData(targetData);
      await new Promise((r) => setTimeout(r, 100));
    }
    try {
      printInvoiceDirect("invoicePreview");
    } catch (err) {
      window.print();
    }
  };

  // ── Backup Export / Import ─────────────────────────────────
  const handleExportBackup = async () => {
    try {
      const data = await StorageService.exportFullBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `InvoicePro-Backup-${getTodayDateStr()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("Backup exported successfully", "success");
    } catch (e: any) {
      showToast("Backup export failed", "error");
    }
  };

  const handleImportBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const obj = JSON.parse(e.target?.result as string);
        await StorageService.importFullBackup(obj);
        setSettings(StorageService.getSettings());
        setDbConfig(StorageService.getConfig());
        setClients(StorageService.getClients());
        setSavedInvoices(await StorageService.getSavedInvoices());
        const currentDraft = StorageService.getCurrentDraft();
        if (currentDraft) setFormData(currentDraft);
        showToast("Backup restored successfully!", "success");
      } catch (err: any) {
        showToast("Invalid backup JSON file", "error");
      }
    };
    reader.readAsText(file);
  };

  const handleClearAllData = () => {
    setConfirmModal({
      isOpen: true,
      title: "Clear All App Data?",
      message: "This will permanently remove all saved invoices, client records, and preferences. Are you absolutely sure?",
      confirmText: "Erase Everything",
      danger: true,
      onConfirm: () => {
        localStorage.clear();
        setSettings(DEFAULT_SETTINGS);
        setSavedInvoices([]);
        setClients([]);
        handleNewInvoice();
        setConfirmModal(null);
        showToast("All data cleared", "info");
      },
    });
  };

  // Return to portfolio
  const handleBackToPortfolio = () => {
    window.location.href = "/";
  };

  return (
    <div className="invoice-app-shell">
      {/* ── 1. TOP NAVBAR ────────────────────────────────────── */}
      <nav className="inv-topnav">
        <div
          className="inv-topnav-logo"
          onClick={handleBackToPortfolio}
          title="Return to Main Portfolio"
        >
          <div className="inv-topnav-logo-icon">
            <Layers className="w-5 h-5" />
          </div>
          <span>
            Invoice<span className="accent">Pro</span>
          </span>
        </div>

        <div className="inv-topnav-divider" />

        {/* Desktop Navigation Tabs */}
        <div className="inv-topnav-tabs">
          <button
            type="button"
            className={`inv-topnav-tab ${activeMainTab === "create" ? "active" : ""}`}
            onClick={() => setActiveMainTab("create")}
          >
            <Plus className="w-3.5 h-3.5" />
            Invoice Editor
          </button>
          <button
            type="button"
            className={`inv-topnav-tab ${activeMainTab === "saved" ? "active" : ""}`}
            onClick={() => setActiveMainTab("saved")}
          >
            <FileText className="w-3.5 h-3.5" />
            Saved Invoices ({savedInvoices.length})
          </button>
          <button
            type="button"
            className={`inv-topnav-tab ${activeMainTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveMainTab("settings")}
          >
            <Sliders className="w-3.5 h-3.5" />
            Settings
          </button>
        </div>

        {/* Action Buttons */}
        <div className="inv-topnav-actions">
          <button
            type="button"
            className="inv-btn inv-btn-ghost inv-btn-desktop-only"
            onClick={handleBackToPortfolio}
            title="Exit to Portfolio"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Portfolio</span>
          </button>

          {activeMainTab === "create" && (
            <>
              <button
                type="button"
                className="inv-btn inv-btn-outline inv-btn-desktop-only"
                onClick={handleResetForm}
                title="Reset Form"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
              <button
                type="button"
                className="inv-btn inv-btn-outline"
                onClick={handleSaveInvoice}
                title="Save to database and history"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
              <button
                type="button"
                className="inv-btn inv-btn-secondary"
                onClick={handlePrint}
                title="Print or Save via System Print Dialog"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
              <button
                type="button"
                className="inv-btn inv-btn-primary"
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
                title="Export and Download high-res PDF file"
              >
                {isExportingPdf ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </>
                )}
              </button>
            </>
          )}

          {activeMainTab === "saved" && (
            <button
              type="button"
              className="inv-btn inv-btn-primary"
              onClick={handleNewInvoice}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ New Invoice</span>
            </button>
          )}
        </div>
      </nav>

      {/* ── 2. MAIN APPLICATION VIEWS ────────────────────────── */}
      <main 
        className={`inv-main-view mode-${mobileMode}`}
        style={{ display: activeMainTab === "create" ? undefined : "none" }}
      >
        <InvoiceEditor
          formData={formData}
          invPrefix={settings.invPrefix}
          clients={clients}
          onUpdateField={updateField}
          onUpdateItem={updateItem}
          onAddItem={addItem}
          onRemoveItem={removeItem}
          onDuplicateItem={duplicateItem}
          onReorderItems={reorderItems}
          onOpenItemModal={(item) => {
            setEditingItem(item || null);
            setItemModalOpen(true);
          }}
          onSelectClient={handleSelectClient}
          onUploadLogo={handleUploadLogo}
          onClearLogo={handleClearLogo}
        />
        <InvoicePreview
          formData={formData}
          invPrefix={settings.invPrefix}
          invPad={settings.invPad}
        />
      </main>

      {activeMainTab === "saved" && (
        <InvoiceSavedList
          savedInvoices={savedInvoices}
          onNewInvoice={handleNewInvoice}
          onEditInvoice={handleEditSavedInvoice}
          onDuplicateInvoice={handleDuplicateSavedInvoice}
          onDeleteInvoice={handleDeleteSavedInvoice}
          onDownloadPdf={handleDownloadPdf}
          onPrintInvoice={handlePrint}
        />
      )}

      {activeMainTab === "settings" && (
        <InvoiceSettingsView
          settings={settings}
          dbConfig={dbConfig}
          onUpdateSettings={(newSet) => {
            const updated = { ...settings, ...newSet };
            setSettings(updated);
            StorageService.saveSettings(updated);
            showToast("Settings updated", "info");
          }}
          onUpdateDbConfig={(newDb) => {
            setDbConfig(newDb);
            StorageService.saveConfig(newDb);
            showToast("Database configuration updated", "info");
          }}
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackup}
          onClearAllData={handleClearAllData}
        />
      )}

      {/* ── 3. MOBILE BOTTOM NAVIGATION ──────────────────────── */}
      <div className="inv-mobile-bottom-bar">
        <button
          type="button"
          className={`inv-mobile-bottom-item ${activeMainTab === "create" && mobileMode === "editor" ? "active" : ""}`}
          onClick={() => {
            setActiveMainTab("create");
            setMobileMode("editor");
          }}
        >
          <Edit3 className="w-4 h-4" />
          <span>Editor</span>
        </button>
        <button
          type="button"
          className={`inv-mobile-bottom-item ${activeMainTab === "create" && mobileMode === "preview" ? "active" : ""}`}
          onClick={() => {
            setActiveMainTab("create");
            setMobileMode("preview");
          }}
        >
          <Eye className="w-4 h-4" />
          <span>Preview</span>
        </button>
        <button
          type="button"
          className={`inv-mobile-bottom-item ${activeMainTab === "saved" ? "active" : ""}`}
          onClick={() => setActiveMainTab("saved")}
        >
          <FileText className="w-4 h-4" />
          <span>Saved</span>
        </button>
        <button
          type="button"
          className={`inv-mobile-bottom-item ${activeMainTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveMainTab("settings")}
        >
          <Sliders className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </div>

      {/* ── 4. ITEM EDIT / ADD BOTTOM SHEET ──────────────────── */}
      <ItemBottomSheet
        isOpen={itemModalOpen}
        item={editingItem}
        currency={formData.invCurrency}
        onClose={() => {
          setItemModalOpen(false);
          setEditingItem(null);
        }}
        onSave={(savedItem) => {
          if (editingItem) {
            setFormData((prev) => ({
              ...prev,
              items: prev.items.map((it) => (it.id === savedItem.id ? savedItem : it)),
            }));
            showToast("Item updated", "success");
          } else {
            addItem(savedItem);
            showToast("Item added", "success");
          }
          setItemModalOpen(false);
          setEditingItem(null);
        }}
        onDelete={(id) => {
          removeItem(id);
          setItemModalOpen(false);
          setEditingItem(null);
        }}
      />

      {/* ── 5. CONFIRMATION MODAL ────────────────────────────── */}
      {isExportingPdf && (
        <div className="inv-modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="inv-modal" style={{ maxWidth: 360, textAlign: "center", padding: "28px 20px" }}>
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#e8176c] mb-3" />
            <div className="inv-modal-title" style={{ marginBottom: 6 }}>Generating High-Res PDF</div>
            <p style={{ fontSize: ".82rem", color: "var(--text-mid)", margin: 0 }}>
              {pdfProgressText || "Rendering vector pages..."}
            </p>
          </div>
        </div>
      )}

      {confirmModal && (
        <div
          className="inv-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmModal(null);
          }}
        >
          <div className="inv-modal">
            <div className="inv-modal-title">{confirmModal.title}</div>
            <p style={{ fontSize: ".85rem", color: "var(--text-mid)", lineHeight: 1.5 }}>
              {confirmModal.message}
            </p>
            <div className="inv-modal-actions">
              <button
                type="button"
                className="inv-btn inv-btn-ghost"
                onClick={() => setConfirmModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`inv-btn ${confirmModal.danger ? "inv-btn-danger" : "inv-btn-primary"}`}
                onClick={confirmModal.onConfirm}
              >
                {confirmModal.confirmText || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. TOAST NOTIFICATIONS ───────────────────────────── */}
      <div className="inv-toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`inv-toast ${t.type}`}>
            {t.type === "success" && <Check className="w-4 h-4" />}
            {t.type === "error" && <AlertCircle className="w-4 h-4" />}
            {t.type === "info" && <FileText className="w-4 h-4" />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InvoiceMaker;
