import React, { useState, useEffect } from "react";
import { InvoiceItem } from "./types";
import { fmt } from "./utils";
import { X, Trash2 } from "lucide-react";

interface ItemBottomSheetProps {
  isOpen: boolean;
  item: InvoiceItem | null;
  currency: string;
  onClose: () => void;
  onSave: (item: InvoiceItem) => void;
  onDelete?: (id: number | string) => void;
}

export const ItemBottomSheet: React.FC<ItemBottomSheetProps> = ({
  isOpen,
  item,
  currency,
  onClose,
  onSave,
  onDelete,
}) => {
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState(100);
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (item) {
      setDesc(item.desc || "");
      setPrice(item.price || 0);
      setQty(item.qty || 1);
      setNotes(item.notes || "");
    } else {
      setDesc("");
      setPrice(100);
      setQty(1);
      setNotes("");
    }
  }, [item, isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim()) {
      alert("Please enter an item description");
      return;
    }

    onSave({
      id: item ? item.id : Date.now(),
      desc: desc.trim(),
      price: Math.max(0, parseFloat(String(price)) || 0),
      qty: Math.max(0.01, parseFloat(String(qty)) || 1),
      notes: notes.trim(),
    });
  };

  const lineTotal = (parseFloat(String(price)) || 0) * (parseFloat(String(qty)) || 0);

  return (
    <div
      className="inv-bottom-sheet-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="inv-bottom-sheet-modal">
        <div className="inv-bottom-sheet-handle" />
        <div className="inv-bottom-sheet-header">
          <div className="inv-bottom-sheet-title">
            {item ? "Edit Invoice Item" : "Add Invoice Item"}
          </div>
          <button
            type="button"
            className="inv-icon-btn"
            onClick={onClose}
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="inv-field-row" style={{ marginBottom: "12px" }}>
            <div className="inv-field">
              <label>Item Description / Title *</label>
              <input
                type="text"
                value={desc}
                placeholder="e.g. Logo & Brand Identity Design"
                onChange={(e) => setDesc(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="inv-field-row" style={{ marginBottom: "12px" }}>
            <div className="inv-field">
              <label>Unit Price ({currency}) *</label>
              <input
                type="number"
                value={price}
                min="0"
                step="0.01"
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="inv-field">
              <label>Quantity</label>
              <div className="inv-qty-stepper">
                <button
                  type="button"
                  className="inv-qty-stepper-btn"
                  onClick={() => setQty((prev) => Math.max(1, prev - 1))}
                >
                  −
                </button>
                <input
                  type="number"
                  className="inv-qty-stepper-input"
                  value={qty}
                  min="0.01"
                  step="1"
                  onChange={(e) => setQty(parseFloat(e.target.value) || 1)}
                />
                <button
                  type="button"
                  className="inv-qty-stepper-btn"
                  onClick={() => setQty((prev) => prev + 1)}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="inv-field-row" style={{ marginBottom: "16px" }}>
            <div className="inv-field">
              <label>Notes / Extra Details (Optional)</label>
              <textarea
                value={notes}
                placeholder="Additional specifications, delivery notes, etc."
                style={{ minHeight: "54px" }}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "var(--surface)",
              padding: "10px 14px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              marginBottom: "16px",
            }}
          >
            <span
              style={{
                fontSize: ".78rem",
                fontWeight: 600,
                color: "var(--text-muted)",
              }}
            >
              Item Subtotal
            </span>
            <span
              style={{
                fontSize: "1.1rem",
                fontWeight: 800,
                color: "var(--accent)",
              }}
            >
              {fmt(lineTotal, currency)}
            </span>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="submit"
              className="inv-btn inv-btn-primary"
              style={{ flex: 1, justifyContent: "center", padding: "12px", fontSize: ".9rem" }}
            >
              💾 Save Item
            </button>
            {item && onDelete && (
              <button
                type="button"
                className="inv-btn inv-btn-danger"
                style={{ padding: "12px 16px" }}
                onClick={() => {
                  onDelete(item.id);
                  onClose();
                }}
                title="Delete item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
