import React, { useState, useMemo } from "react";
import { SavedInvoiceRecord } from "./types";
import { fmt, formatDate, CURRENCIES } from "./utils";
import { 
  FileText, 
  Search, 
  Plus, 
  Edit3, 
  Copy, 
  Trash2, 
  Calendar,
  Download,
  Printer
} from "lucide-react";

interface InvoiceSavedListProps {
  savedInvoices: SavedInvoiceRecord[];
  onNewInvoice: () => void;
  onEditInvoice: (invoice: SavedInvoiceRecord) => void;
  onDuplicateInvoice: (invoice: SavedInvoiceRecord) => void;
  onDeleteInvoice: (invNumber: string) => void;
  onDownloadPdf?: (invoice: SavedInvoiceRecord) => void;
  onPrintInvoice?: (invoice: SavedInvoiceRecord) => void;
}

export const InvoiceSavedList: React.FC<InvoiceSavedListProps> = ({
  savedInvoices,
  onNewInvoice,
  onEditInvoice,
  onDuplicateInvoice,
  onDeleteInvoice,
  onDownloadPdf,
  onPrintInvoice,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "recent">("all");

  const filteredInvoices = useMemo(() => {
    let list = [...savedInvoices];

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((inv) => {
        const num = String(inv.invNumber || "").toLowerCase();
        const client = String(inv.clientName || "").toLowerCase();
        const dateStr = formatDate(inv.date).toLowerCase();
        const totalStr = String(inv.total || "");
        return (
          num.includes(q) ||
          client.includes(q) ||
          dateStr.includes(q) ||
          totalStr.includes(q)
        );
      });
    }

    // Filter by recent (30 days)
    if (filterTab === "recent") {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      list = list.filter((inv) => (inv.savedAt || 0) >= thirtyDaysAgo);
    }

    // Sort newest first
    list.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));

    return list;
  }, [savedInvoices, searchQuery, filterTab]);

  return (
    <div className="inv-saved-panel" id="savedPanel">
      <div className="inv-saved-header">
        <div className="inv-saved-title">
          <FileText className="w-5 h-5 text-[#e8176c]" />
          <span>Saved Invoices</span>
          <span className="inv-saved-badge">{savedInvoices.length}</span>
        </div>
        <button
          type="button"
          className="inv-btn inv-btn-primary"
          onClick={onNewInvoice}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ New Invoice</span>
        </button>
      </div>

      <div className="inv-saved-toolbar">
        <div className="inv-saved-search-box">
          <Search className="w-4 h-4" />
          <input
            type="text"
            className="inv-saved-search-input"
            placeholder="Search by invoice #, client, amount or date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="inv-saved-filter-pills">
          <button
            type="button"
            className={`inv-saved-filter-pill ${filterTab === "all" ? "active" : ""}`}
            onClick={() => setFilterTab("all")}
          >
            All Invoices
          </button>
          <button
            type="button"
            className={`inv-saved-filter-pill ${filterTab === "recent" ? "active" : ""}`}
            onClick={() => setFilterTab("recent")}
          >
            Recent
          </button>
        </div>
      </div>

      {savedInvoices.length === 0 ? (
        <div className="inv-empty-state">
          <FileText className="w-12 h-12" />
          <h4>No saved invoices yet</h4>
          <p>
            Create your first professional invoice and save it to manage records
            here with cloud sync.
          </p>
          <button
            type="button"
            className="inv-btn inv-btn-primary"
            onClick={onNewInvoice}
          >
            + Create Invoice
          </button>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="inv-empty-state">
          <Search className="w-12 h-12" />
          <h4>No matching invoices</h4>
          <p>No invoices matched your search filter "{searchQuery}".</p>
          <button
            type="button"
            className="inv-btn inv-btn-ghost"
            onClick={() => setSearchQuery("")}
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="inv-saved-list">
          {filteredInvoices.map((inv) => {
            const currencySym = CURRENCIES[inv.currency || "USD"]?.symbol || "$";
            return (
              <div key={inv.invNumber} className="inv-saved-card">
                <div className="inv-saved-card-icon">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="inv-saved-card-info">
                  <div className="inv-saved-card-num">{inv.invNumber}</div>
                  <div className="inv-saved-card-client">
                    {inv.clientName || "Unknown Client"}
                  </div>
                  <div className="inv-saved-card-meta">
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <Calendar className="w-3 h-3" />
                      {formatDate(inv.date)}
                    </span>
                    <span>•</span>
                    <span>{(inv.items || []).length} items</span>
                  </div>
                </div>
                <div className="inv-saved-card-total">
                  {currencySym}
                  {Number(inv.total || 0).toFixed(2)}
                </div>
                <div className="inv-saved-card-actions">
                  {onDownloadPdf && (
                    <button
                      type="button"
                      className="inv-icon-btn"
                      title="Download PDF"
                      onClick={() => onDownloadPdf(inv)}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {onPrintInvoice && (
                    <button
                      type="button"
                      className="inv-icon-btn"
                      title="Print Invoice"
                      onClick={() => onPrintInvoice(inv)}
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    className="inv-btn inv-btn-outline"
                    style={{ padding: "5px 10px", fontSize: ".76rem" }}
                    title="Open and Edit Invoice"
                    onClick={() => onEditInvoice(inv)}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    className="inv-icon-btn"
                    title="Duplicate Invoice"
                    onClick={() => onDuplicateInvoice(inv)}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    className="inv-icon-btn danger"
                    title="Delete Invoice"
                    onClick={() => onDeleteInvoice(String(inv.invNumber))}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
