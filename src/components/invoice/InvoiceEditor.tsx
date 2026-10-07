import React, { useState, useRef } from "react";
import { InvoiceFormData, InvoiceItem, ClientRecord } from "./types";
import { fmt, CURRENCIES, getFormattedInvNumber } from "./utils";
import { 
  Building2, 
  User, 
  ListChecks, 
  CreditCard, 
  FileText, 
  Image as ImageIcon,
  Plus, 
  Trash2, 
  Copy, 
  Edit3, 
  GripVertical,
  Percent,
  MapPin,
  Phone,
  Mail,
  Globe,
  PenTool
} from "lucide-react";

interface InvoiceEditorProps {
  formData: InvoiceFormData;
  invPrefix: string;
  clients: ClientRecord[];
  onUpdateField: <K extends keyof InvoiceFormData>(key: K, value: InvoiceFormData[K]) => void;
  onUpdateItem: (id: number | string, field: keyof InvoiceItem, value: any) => void;
  onAddItem: (item?: InvoiceItem) => void;
  onRemoveItem: (id: number | string) => void;
  onDuplicateItem: (id: number | string) => void;
  onReorderItems: (srcIdx: number, destIdx: number) => void;
  onOpenItemModal: (item?: InvoiceItem) => void;
  onSelectClient: (client: ClientRecord) => void;
  onUploadLogo: (file: File) => void;
  onClearLogo: () => void;
}

export const InvoiceEditor: React.FC<InvoiceEditorProps> = ({
  formData,
  invPrefix,
  clients,
  onUpdateField,
  onUpdateItem,
  onRemoveItem,
  onDuplicateItem,
  onReorderItems,
  onOpenItemModal,
  onSelectClient,
  onUploadLogo,
  onClearLogo,
}) => {
  const [activeTab, setActiveTab] = useState<"business" | "client" | "items" | "payment" | "terms">("business");
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClientNameChange = (name: string) => {
    onUpdateField("clientName", name);
    if (!name.trim()) return;
    const match = clients.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
    if (match) {
      if (match.phone && !formData.clientPhone) onUpdateField("clientPhone", match.phone);
      if (match.address && !formData.clientAddress) onUpdateField("clientAddress", match.address);
      if (match.email && !formData.clientEmail) onUpdateField("clientEmail", match.email);
    }
  };

  return (
    <aside className="inv-editor-sidebar" id="editorSidebar">
      {/* Editor Tabs Navigation */}
      <div className="inv-editor-tabs">
        <button
          type="button"
          className={`inv-editor-tab ${activeTab === "business" ? "active" : ""}`}
          onClick={() => setActiveTab("business")}
        >
          <Building2 className="w-3.5 h-3.5" />
          Business
        </button>
        <button
          type="button"
          className={`inv-editor-tab ${activeTab === "client" ? "active" : ""}`}
          onClick={() => setActiveTab("client")}
        >
          <User className="w-3.5 h-3.5" />
          Client
        </button>
        <button
          type="button"
          className={`inv-editor-tab ${activeTab === "items" ? "active" : ""}`}
          onClick={() => setActiveTab("items")}
        >
          <ListChecks className="w-3.5 h-3.5" />
          Items
        </button>
        <button
          type="button"
          className={`inv-editor-tab ${activeTab === "payment" ? "active" : ""}`}
          onClick={() => setActiveTab("payment")}
        >
          <CreditCard className="w-3.5 h-3.5" />
          Payment
        </button>
        <button
          type="button"
          className={`inv-editor-tab ${activeTab === "terms" ? "active" : ""}`}
          onClick={() => setActiveTab("terms")}
        >
          <FileText className="w-3.5 h-3.5" />
          Terms
        </button>
      </div>

      {/* ── TAB 1: BUSINESS ────────────────────────────────────── */}
      {activeTab === "business" && (
        <div className="inv-tab-content">
          {/* Logo Section */}
          <div className="inv-form-section">
            <div className="inv-form-section-title">
              <ImageIcon className="w-3.5 h-3.5" />
              Logo
            </div>
            <div
              className="inv-logo-upload-area"
              onClick={() => fileInputRef.current?.click()}
            >
              {formData.logoDataUrl ? (
                <img
                  src={formData.logoDataUrl}
                  alt="Uploaded Logo"
                  style={{ maxHeight: "56px", objectFit: "contain" }}
                />
              ) : (
                <ImageIcon className="w-7 h-7" style={{ color: "var(--accent)" }} />
              )}
              <span>{formData.logoDataUrl ? "Click to change logo" : "Click to upload logo"}</span>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    onUploadLogo(e.target.files[0]);
                  }
                }}
              />
            </div>
            {formData.logoDataUrl && (
              <div style={{ marginTop: "8px", display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  className="inv-btn inv-btn-ghost"
                  style={{ flex: 1, fontSize: ".72rem" }}
                  onClick={onClearLogo}
                >
                  Remove Logo
                </button>
              </div>
            )}
          </div>

          {/* Business Info Section */}
          <div className="inv-form-section">
            <div className="inv-form-section-title">
              <Building2 className="w-3.5 h-3.5" />
              Business Info
            </div>
            <div className="inv-field-row">
              <div className="inv-field">
                <label>Name Part 1</label>
                <input
                  type="text"
                  value={formData.bizName1}
                  placeholder="RASHED"
                  onChange={(e) => onUpdateField("bizName1", e.target.value)}
                />
              </div>
              <div className="inv-field">
                <label>Name Part 2 (accent color)</label>
                <input
                  type="text"
                  value={formData.bizName2}
                  placeholder="PERVEJ"
                  onChange={(e) => onUpdateField("bizName2", e.target.value)}
                />
              </div>
            </div>
            <div className="inv-field-row">
              <div className="inv-field">
                <label>Tagline</label>
                <input
                  type="text"
                  value={formData.bizTagline}
                  placeholder="360° Design Solution"
                  onChange={(e) => onUpdateField("bizTagline", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Invoice Details Section */}
          <div className="inv-form-section">
            <div className="inv-form-section-title">
              <FileText className="w-3.5 h-3.5" />
              Invoice Details
            </div>
            <div className="inv-field-row">
              <div className="inv-field">
                <label>
                  Invoice #{" "}
                  <span
                    style={{
                      fontWeight: 600,
                      color: "var(--accent)",
                      fontSize: ".7rem",
                      marginLeft: "4px",
                    }}
                  >
                    (Prefix: {invPrefix || "INV-"})
                  </span>
                </label>
                <input
                  type="number"
                  value={formData.invNumber}
                  placeholder="1"
                  min="1"
                  step="1"
                  onChange={(e) => onUpdateField("invNumber", parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="inv-field">
                <label>Date</label>
                <input
                  type="date"
                  value={formData.invDate}
                  onChange={(e) => onUpdateField("invDate", e.target.value)}
                />
              </div>
            </div>
            <div className="inv-field-row">
              <div className="inv-field">
                <label>Invoice Title</label>
                <input
                  type="text"
                  value={formData.invTitle}
                  placeholder="INVOICE"
                  onChange={(e) => onUpdateField("invTitle", e.target.value)}
                />
              </div>
              <div className="inv-field">
                <label>Currency</label>
                <select
                  value={formData.invCurrency}
                  onChange={(e) => onUpdateField("invCurrency", e.target.value)}
                >
                  {Object.entries(CURRENCIES).map(([code, meta]) => (
                    <option key={code} value={code}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: CLIENT ──────────────────────────────────────── */}
      {activeTab === "client" && (
        <div className="inv-tab-content">
          <div className="inv-form-section">
            <div className="inv-form-section-title">
              <User className="w-3.5 h-3.5" />
              Client Information
            </div>
            <div className="inv-field-row">
              <div className="inv-field">
                <label>Client Name</label>
                <input
                  type="text"
                  value={formData.clientName}
                  placeholder="MAIKEL SMITH"
                  list="clientSuggestions"
                  autoComplete="off"
                  onChange={(e) => handleClientNameChange(e.target.value)}
                />
                <datalist id="clientSuggestions">
                  {clients.map((c) => (
                    <option key={c.name} value={c.name} />
                  ))}
                </datalist>

                {/* Client Suggestion Chips */}
                {clients.length > 0 && (
                  <div className="inv-client-chips-container">
                    {clients.slice(0, 6).map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        className="inv-client-chip"
                        onClick={() => onSelectClient(c)}
                      >
                        <User className="w-3 h-3" />
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="inv-field-row">
              <div className="inv-field">
                <label>Phone</label>
                <input
                  type="text"
                  value={formData.clientPhone}
                  placeholder="01 248 579 623"
                  onChange={(e) => onUpdateField("clientPhone", e.target.value)}
                />
              </div>
            </div>
            <div className="inv-field-row">
              <div className="inv-field">
                <label>Address</label>
                <input
                  type="text"
                  value={formData.clientAddress}
                  placeholder="Sun Francisco, CA100"
                  onChange={(e) => onUpdateField("clientAddress", e.target.value)}
                />
              </div>
            </div>
            <div className="inv-field-row">
              <div className="inv-field">
                <label>Email</label>
                <input
                  type="text"
                  value={formData.clientEmail}
                  placeholder="malgocompany.com"
                  onChange={(e) => onUpdateField("clientEmail", e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: ITEMS ───────────────────────────────────────── */}
      {activeTab === "items" && (
        <div className="inv-tab-content">
          <div className="inv-form-section">
            <div className="inv-form-section-title">
              <Percent className="w-3.5 h-3.5" />
              Tax &amp; Discount
            </div>
            <div className="inv-field-row">
              <div className="inv-field">
                <label>Tax %</label>
                <input
                  type="number"
                  value={formData.taxRate}
                  min="0"
                  max="100"
                  step="0.01"
                  onChange={(e) => onUpdateField("taxRate", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="inv-field">
                <label>Discount %</label>
                <input
                  type="number"
                  value={formData.discountRate}
                  min="0"
                  max="100"
                  step="0.01"
                  onChange={(e) => onUpdateField("discountRate", parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          <div className="inv-form-section">
            <div className="inv-form-section-title">
              <ListChecks className="w-3.5 h-3.5" />
              Invoice Items ({(formData.items || []).length})
            </div>

            <div className="inv-items-list">
              {(formData.items || []).map((item, idx) => {
                const lineTotal = Number(item.qty || 0) * Number(item.price || 0);
                const isDragging = draggedIdx === idx;
                const isDragOver = dragOverIdx === idx;

                return (
                  <div
                    key={item.id}
                    className={`inv-item-card ${isDragging ? "dragging" : ""} ${isDragOver ? "drag-over" : ""}`}
                    draggable
                    onDragStart={(e) => {
                      setDraggedIdx(idx);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => {
                      setDraggedIdx(null);
                      setDragOverIdx(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      setDragOverIdx(idx);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedIdx !== null && draggedIdx !== idx) {
                        onReorderItems(draggedIdx, idx);
                      }
                      setDraggedIdx(null);
                      setDragOverIdx(null);
                    }}
                  >
                    <div className="inv-item-card-header">
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div className="inv-item-drag-handle" title="Drag to reorder">
                          <GripVertical className="w-3.5 h-3.5" />
                        </div>
                        <span className="inv-item-num">{idx + 1}</span>
                      </div>
                      <div className="inv-item-actions">
                        <button
                          type="button"
                          className="inv-icon-btn"
                          title="Edit in Modal"
                          onClick={() => onOpenItemModal(item)}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          className="inv-icon-btn"
                          title="Duplicate"
                          onClick={() => onDuplicateItem(item.id)}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          className="inv-icon-btn danger"
                          title="Delete"
                          onClick={() => onRemoveItem(item.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="inv-field-row">
                      <div className="inv-field" style={{ flex: 2 }}>
                        <label>Description</label>
                        <input
                          type="text"
                          value={item.desc}
                          placeholder="Item description"
                          onChange={(e) => onUpdateItem(item.id, "desc", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="inv-field-row">
                      <div className="inv-field" style={{ flex: 2 }}>
                        <label>Notes / Details</label>
                        <input
                          type="text"
                          value={item.notes || ""}
                          placeholder="Additional notes (optional)"
                          onChange={(e) => onUpdateItem(item.id, "notes", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="inv-field-row">
                      <div className="inv-field">
                        <label>Unit Price</label>
                        <input
                          type="number"
                          value={item.price}
                          min="0"
                          step="0.01"
                          onChange={(e) => onUpdateItem(item.id, "price", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="inv-field">
                        <label>Quantity</label>
                        <input
                          type="number"
                          value={item.qty}
                          min="0.01"
                          step="1"
                          onChange={(e) => onUpdateItem(item.id, "qty", parseFloat(e.target.value) || 1)}
                        />
                      </div>
                    </div>

                    <div className="inv-item-line-total">
                      Line Total: {fmt(lineTotal, formData.invCurrency)}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              className="inv-add-item-btn"
              onClick={() => onOpenItemModal()}
            >
              <Plus className="w-3.5 h-3.5" />
              + Add New Item
            </button>
          </div>
        </div>
      )}

      {/* ── TAB 4: PAYMENT & FOOTER ────────────────────────────── */}
      {activeTab === "payment" && (
        <div className="inv-tab-content">
          <div className="inv-form-section">
            <div className="inv-form-section-title">
              <CreditCard className="w-3.5 h-3.5" />
              Payment Details
            </div>
            <div className="inv-field-row">
              <div className="inv-field">
                <label>Payment Method / Company</label>
                <input
                  type="text"
                  value={formData.payCompany}
                  placeholder="Cash Paid"
                  onChange={(e) => onUpdateField("payCompany", e.target.value)}
                />
              </div>
            </div>
            <div className="inv-field-row">
              <div className="inv-field">
                <label>Bank / Account Details</label>
                <input
                  type="text"
                  value={formData.payBank}
                  placeholder="A/C NO - 6024 5879 6687"
                  onChange={(e) => onUpdateField("payBank", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="inv-form-section">
            <div className="inv-form-section-title">
              <MapPin className="w-3.5 h-3.5" />
              Footer Contact Info
            </div>
            <div className="inv-field-row">
              <div className="inv-field">
                <label>Address Line 1</label>
                <input
                  type="text"
                  value={formData.footerAddr1}
                  placeholder="Jashore IT Park"
                  onChange={(e) => onUpdateField("footerAddr1", e.target.value)}
                />
              </div>
            </div>
            <div className="inv-field-row">
              <div className="inv-field">
                <label>Address Line 2</label>
                <input
                  type="text"
                  value={formData.footerAddr2}
                  placeholder="Najir Shangkarpur, Sadar"
                  onChange={(e) => onUpdateField("footerAddr2", e.target.value)}
                />
              </div>
            </div>
            <div className="inv-field-row">
              <div className="inv-field">
                <label>Address Line 3</label>
                <input
                  type="text"
                  value={formData.footerAddr3}
                  placeholder="Jashore, Bangladesh"
                  onChange={(e) => onUpdateField("footerAddr3", e.target.value)}
                />
              </div>
            </div>
            <div className="inv-field-row">
              <div className="inv-field">
                <label>Phone 1</label>
                <input
                  type="text"
                  value={formData.footerPhone1}
                  placeholder="+88 01932623969"
                  onChange={(e) => onUpdateField("footerPhone1", e.target.value)}
                />
              </div>
              <div className="inv-field">
                <label>Phone 2</label>
                <input
                  type="text"
                  value={formData.footerPhone2}
                  placeholder="+88 01960132424"
                  onChange={(e) => onUpdateField("footerPhone2", e.target.value)}
                />
              </div>
            </div>
            <div className="inv-field-row">
              <div className="inv-field">
                <label>Email</label>
                <input
                  type="text"
                  value={formData.footerEmail}
                  placeholder="rashedpervej2011@gmail.com"
                  onChange={(e) => onUpdateField("footerEmail", e.target.value)}
                />
              </div>
            </div>
            <div className="inv-field-row">
              <div className="inv-field">
                <label>Website</label>
                <input
                  type="text"
                  value={formData.footerWebsite}
                  placeholder="www.pervej.pro.bd"
                  onChange={(e) => onUpdateField("footerWebsite", e.target.value)}
                />
              </div>
            </div>
            <div className="inv-field-row">
              <div className="inv-field">
                <label>We Accept (Cards)</label>
                <input
                  type="text"
                  value={formData.footerCards}
                  placeholder="Visa, Master Card, American Express"
                  onChange={(e) => onUpdateField("footerCards", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="inv-form-section">
            <div className="inv-form-section-title">
              <PenTool className="w-3.5 h-3.5" />
              Signature
            </div>
            <div className="inv-field-row">
              <div className="inv-field">
                <label>Name</label>
                <input
                  type="text"
                  value={formData.sigName}
                  placeholder="RASHED PERVEJ"
                  onChange={(e) => onUpdateField("sigName", e.target.value)}
                />
              </div>
            </div>
            <div className="inv-field-row">
              <div className="inv-field">
                <label>Title</label>
                <input
                  type="text"
                  value={formData.sigTitle}
                  placeholder="Visualizer"
                  onChange={(e) => onUpdateField("sigTitle", e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: TERMS & THANK YOU ───────────────────────────── */}
      {activeTab === "terms" && (
        <div className="inv-tab-content">
          <div className="inv-form-section">
            <div className="inv-form-section-title">
              <FileText className="w-3.5 h-3.5" />
              Terms &amp; Conditions
            </div>
            <div className="inv-field">
              <label>Condition Heading</label>
              <input
                type="text"
                value={formData.conditionsTitle}
                placeholder="Condition"
                onChange={(e) => onUpdateField("conditionsTitle", e.target.value)}
              />
            </div>
            <div className="inv-field" style={{ marginTop: "10px" }}>
              <label>Terms (one per line = numbered list)</label>
              <textarea
                rows={10}
                value={formData.termsText}
                placeholder="Project includes 10 designs.&#10;Completion deadline: 31 July 2026."
                onChange={(e) => onUpdateField("termsText", e.target.value)}
              />
            </div>
          </div>

          <div className="inv-form-section">
            <div className="inv-form-section-title">Thank You Message</div>
            <div className="inv-field">
              <label>Message</label>
              <input
                type="text"
                value={formData.thanksMsg}
                placeholder="THANKS FOR BUSINESS WITH US!"
                onChange={(e) => onUpdateField("thanksMsg", e.target.value)}
              />
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
