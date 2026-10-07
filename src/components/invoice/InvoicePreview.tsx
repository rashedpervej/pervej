import React, { useEffect, useRef, useState, useMemo } from "react";
import { InvoiceFormData, InvoiceItem } from "./types";
import { 
  fmt, 
  numberToWords, 
  calcTotals, 
  formatDate, 
  getFormattedInvNumber, 
  getTodayDateStr 
} from "./utils";
import { MapPin, Phone, Mail } from "lucide-react";

interface InvoicePreviewProps {
  formData: InvoiceFormData;
  invPrefix?: string;
  invPad?: number;
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({
  formData,
  invPrefix = "INV-",
  invPad = 5,
}) => {
  const previewAreaRef = useRef<HTMLDivElement>(null);
  const previewScalerRef = useRef<HTMLDivElement>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState(1.0);
  const [touchScale, setTouchScale] = useState(1.0);
  const [totalPages, setTotalPages] = useState(1);

  // Totals
  const safeItems = useMemo(() => (Array.isArray(formData?.items) ? formData.items : []), [formData?.items]);

  const { subtotal, tax, discount, total } = useMemo(() => {
    return calcTotals(safeItems, formData?.taxRate, formData?.discountRate);
  }, [safeItems, formData?.taxRate, formData?.discountRate]);

  const formattedInvNum = getFormattedInvNumber(formData?.invNumber, invPrefix, invPad);
  const formattedDate = formatDate(formData?.invDate || getTodayDateStr());

  // ── Pagination Calculation ─────────────────────────────────
  // A4 dimensions at 96dpi: 794px width, 1123px height.
  // Inner page height = 1123px - 36px (top pad) - 48px (bottom pad) = 1039px.
  // We approximate heights for top, footer, table rows, calc block, and cond/sig block.
  const pages = useMemo(() => {
    const A4_INNER_HEIGHT = 1039;
    const hTop = 185;
    const hFooter = 88;
    const hTableHeader = 38;
    const hCalc = 150;
    const hCondSig = (formData?.termsText || formData?.sigName) ? 140 : 0;
    const rowHeight = 42;

    const maxMiddleHeight = Math.max(150, A4_INNER_HEIGHT - hTop - hFooter - 24);

    const calculatedPages: Array<{
      items: InvoiceItem[];
      hasCalc: boolean;
      hasCondSig: boolean;
    }> = [];

    let currentPage = { items: [] as InvoiceItem[], hasCalc: false, hasCondSig: false };
    let currentMiddleHeight = 0;

    // 1. Distribute items
    if (safeItems.length > 0) {
      for (let i = 0; i < safeItems.length; i++) {
        const item = safeItems[i];
        const isFirst = currentPage.items.length === 0;
        const cost = isFirst ? hTableHeader + rowHeight : rowHeight;

        if (currentMiddleHeight + cost <= maxMiddleHeight) {
          currentPage.items.push(item);
          currentMiddleHeight += cost;
        } else {
          if (currentPage.items.length > 0) {
            calculatedPages.push(currentPage);
            currentPage = { items: [item], hasCalc: false, hasCondSig: false };
            currentMiddleHeight = hTableHeader + rowHeight;
          } else {
            currentPage.items.push(item);
            calculatedPages.push(currentPage);
            currentPage = { items: [], hasCalc: false, hasCondSig: false };
            currentMiddleHeight = 0;
          }
        }
      }
    }

    // 2. Place Calculation Block
    if (currentMiddleHeight + hCalc <= maxMiddleHeight) {
      currentPage.hasCalc = true;
      currentMiddleHeight += hCalc;
    } else {
      if (currentPage.items.length > 0) {
        calculatedPages.push(currentPage);
        currentPage = { items: [], hasCalc: true, hasCondSig: false };
        currentMiddleHeight = hCalc;
      } else {
        currentPage.hasCalc = true;
        currentMiddleHeight = hCalc;
      }
    }

    // 3. Place Conditions + Signature Block
    if (hCondSig > 0) {
      if (currentMiddleHeight + hCondSig <= maxMiddleHeight) {
        currentPage.hasCondSig = true;
        currentMiddleHeight += hCondSig;
      } else {
        if (currentPage.items.length > 0 || currentPage.hasCalc) {
          calculatedPages.push(currentPage);
          currentPage = { items: [], hasCalc: false, hasCondSig: true };
          currentMiddleHeight = hCondSig;
        } else {
          currentPage.hasCondSig = true;
          currentMiddleHeight = hCondSig;
        }
      }
    }

    if (
      currentPage.items.length > 0 ||
      currentPage.hasCalc ||
      currentPage.hasCondSig ||
      calculatedPages.length === 0
    ) {
      calculatedPages.push(currentPage);
    }

    return calculatedPages;
  }, [safeItems, formData?.termsText, formData?.sigName]);

  useEffect(() => {
    setTotalPages(pages.length);
  }, [pages]);

  // ── Auto-Scale Calculations ────────────────────────────────
  const handleScale = () => {
    const area = previewAreaRef.current;
    if (!area) return;

    const A4W = 794;
    const isMobile = window.innerWidth <= 880;
    const padding = isMobile ? 16 : 40;
    const areaW = Math.max(260, (area.clientWidth || window.innerWidth) - padding);

    const autoFit = isMobile
      ? Math.min(1.0, Math.max(0.2, areaW / A4W))
      : areaW < A4W
      ? Math.max(0.2, areaW / A4W)
      : 1.0;

    setScale(autoFit);
  };

  useEffect(() => {
    handleScale();
    const area = previewAreaRef.current;
    if (!area) return;

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => handleScale());
      ro.observe(area);
    }
    window.addEventListener("resize", handleScale);

    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener("resize", handleScale);
    };
  }, []);

  // ── Touch Zoom Controller ──────────────────────────────────
  useEffect(() => {
    const area = previewAreaRef.current;
    if (!area) return;

    let baseDist = 0;
    let startScale = touchScale;
    let lastTap = 0;

    const getDist = (t1: Touch, t2: Touch) => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        baseDist = getDist(e.touches[0], e.touches[1]);
        startScale = touchScale;
      } else if (e.touches.length === 1) {
        const now = Date.now();
        if (now - lastTap < 300) {
          setTouchScale((prev) => (prev > 1.2 ? 1.0 : 1.5));
        }
        lastTap = now;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && baseDist > 0) {
        const dist = getDist(e.touches[0], e.touches[1]);
        const factor = dist / baseDist;
        const newScale = Math.max(0.7, Math.min(3.0, startScale * factor));
        setTouchScale(newScale);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        baseDist = 0;
        setTouchScale((prev) => (prev < 0.95 ? 1.0 : prev));
      }
    };

    area.addEventListener("touchstart", onTouchStart, { passive: true });
    area.addEventListener("touchmove", onTouchMove, { passive: true });
    area.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      area.removeEventListener("touchstart", onTouchStart);
      area.removeEventListener("touchmove", onTouchMove);
      area.removeEventListener("touchend", onTouchEnd);
    };
  }, [touchScale]);

  const finalScale = scale * touchScale;
  const A4W = 794;
  const marginOffset = finalScale < 1.0 ? (A4W * (1 - finalScale)) / 2 : 0;

  // Split conditions lines
  const termLines = (formData.termsText || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const fAddrLines = [formData.footerAddr1, formData.footerAddr2, formData.footerAddr3].filter(Boolean);
  const fPhoneLines = [formData.footerPhone1, formData.footerPhone2].filter(Boolean);
  const fWebLines = [formData.footerEmail, formData.footerWebsite].filter(Boolean);

  return (
    <div className="inv-preview-area" ref={previewAreaRef}>
      <div className="inv-preview-wrapper">
        <div className="inv-preview-scale-label">
          Live Preview — A4 Invoice ({totalPages} {totalPages === 1 ? "Page" : "Pages"})
        </div>

        <div
          className="inv-preview-scaler"
          ref={previewScalerRef}
          style={{
            width: `${A4W}px`,
            transform: `scale(${finalScale})`,
            marginLeft: finalScale < 1.0 ? `-${marginOffset}px` : "auto",
            marginRight: finalScale < 1.0 ? `-${marginOffset}px` : "auto",
          }}
        >
          <div className="a4-invoice" id="invoicePreview" ref={invoiceRef}>
            {pages.map((page, pageIdx) => (
              <div key={pageIdx} className="inv-page" data-page={pageIdx + 1}>
                {/* ── 1. TOP BLOCK ── */}
                <div className="inv-top-block">
                  <div className="inv-top-bar" />
                  <div className="inv-header">
                    <div className="inv-brand">
                      {formData.logoDataUrl ? (
                        <img
                          src={formData.logoDataUrl}
                          className="inv-logo"
                          alt="Company Logo"
                        />
                      ) : (
                        <div className="inv-logo-placeholder">
                          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="26" height="26">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                        </div>
                      )}
                      <div>
                        <div className="inv-business-name">
                          {formData.bizName1 || "RASHED"}{" "}
                          <span className="accent">{formData.bizName2 || "PERVEJ"}</span>
                        </div>
                        <div className="inv-tagline">
                          {formData.bizTagline || "360° Design Solution"}
                        </div>
                      </div>
                    </div>
                    <div className="inv-meta">
                      <div className="inv-meta-row">
                        <span className="inv-meta-label">INVOICE#</span>
                        <span className="inv-meta-val">{formattedInvNum}</span>
                      </div>
                      <div className="inv-meta-row">
                        <span className="inv-meta-label">DATE :</span>
                        <span className="inv-meta-val">{formattedDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="inv-divider" />

                  <div className="inv-client-row">
                    <div>
                      <div className="inv-to-label">INVOICE TO:</div>
                      <div className="inv-client-name">
                        {formData.clientName || (
                          <span style={{ color: "#94a3b8", fontWeight: 600 }}>
                            CLIENT NAME
                          </span>
                        )}
                      </div>
                      {formData.clientPhone && (
                        <div className="inv-client-detail">
                          <span className="lbl">PHONE</span>
                          <span className="val">: {formData.clientPhone}</span>
                        </div>
                      )}
                      {formData.clientAddress && (
                        <div className="inv-client-detail">
                          <span className="lbl">ADDRESS</span>
                          <span className="val">: {formData.clientAddress}</span>
                        </div>
                      )}
                      {formData.clientEmail && (
                        <div className="inv-client-detail">
                          <span className="lbl">EMAIL</span>
                          <span className="val">: {formData.clientEmail}</span>
                        </div>
                      )}
                    </div>
                    <div className="inv-invoice-heading-section">
                      <div className="inv-big-heading">
                        {formData.invTitle || "INVOICE"}
                      </div>
                      <div className="inv-due-box">
                        <div className="inv-due-label">Invoice Total</div>
                        <div className="inv-due-amount">
                          DUE - {fmt(total, formData.invCurrency)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── 2. MIDDLE CONTENT ── */}
                <div className="inv-page-middle">
                  {/* Items Table */}
                  {page.items.length > 0 && (
                    <div className="inv-table-section">
                      <table className="inv-table">
                        <thead>
                          <tr>
                            <th>ITEM DESCRIPTION</th>
                            <th>UNIT</th>
                            <th>QUANTITY</th>
                            <th>TOTAL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {page.items.map((item, itIdx) => {
                            const lineTotal = Number(item.qty || 0) * Number(item.price || 0);
                            return (
                              <tr key={item.id || itIdx}>
                                <td>
                                  <div className="inv-item-desc">{item.desc || "—"}</div>
                                  {item.notes && (
                                    <div className="inv-item-notes">{item.notes}</div>
                                  )}
                                </td>
                                <td>{fmt(item.price, formData.invCurrency)}</td>
                                <td>{item.qty}</td>
                                <td>{fmt(lineTotal, formData.invCurrency)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Calculation Block */}
                  {page.hasCalc && (
                    <div className="inv-calculation-block">
                      <div className="inv-bottom-section">
                        <div className="inv-payment-section">
                          <div className="inv-payment-heading">Payment</div>
                          {formData.payCompany && (
                            <div className="inv-payment-row">
                              <span className="lbl">Company</span>
                              <span className="val">: {formData.payCompany}</span>
                            </div>
                          )}
                          {formData.payBank && (
                            <div className="inv-payment-row">
                              <span className="lbl">Bank</span>
                              <span className="val">: {formData.payBank}</span>
                            </div>
                          )}
                          {formData.thanksMsg && (
                            <div className="inv-thanks">{formData.thanksMsg}</div>
                          )}
                        </div>

                        <div>
                          <table className="inv-summary-table">
                            <tbody>
                              <tr>
                                <td style={{ color: "var(--text-mid)" }}>Sub Total</td>
                                <td>{fmt(subtotal, formData.invCurrency)}</td>
                              </tr>
                              <tr>
                                <td style={{ color: "var(--text-mid)" }}>
                                  Tax ({formData.taxRate || 0}%)
                                </td>
                                <td>{fmt(tax, formData.invCurrency)}</td>
                              </tr>
                              <tr>
                                <td style={{ color: "var(--text-mid)" }}>
                                  Discount ({formData.discountRate || 0}%)
                                </td>
                                <td>{fmt(discount, formData.invCurrency)}</td>
                              </tr>
                              <tr className="inv-summary-row-total">
                                <td>Total Due -</td>
                                <td>{fmt(total, formData.invCurrency)}</td>
                              </tr>
                            </tbody>
                          </table>
                          <div className="inv-amount-words">
                            <span className="lbl">Amount in words:</span>
                            <br />
                            {numberToWords(total)}
                          </div>
                        </div>
                      </div>
                      <div className="inv-divider-thin" />
                    </div>
                  )}

                  {/* Conditions & Signature Block */}
                  {page.hasCondSig && (
                    <div className="inv-conditions-signature-block">
                      <div className="inv-conditions-section">
                        {formData.conditionsTitle && (
                          <div className="inv-conditions-heading">
                            {formData.conditionsTitle}
                          </div>
                        )}
                        {termLines.length > 0 && (
                          <ol className="inv-conditions-list">
                            {termLines.map((line, lIdx) => (
                              <li key={lIdx}>{line}</li>
                            ))}
                          </ol>
                        )}
                      </div>

                      {formData.sigName && (
                        <div className="inv-signature-section">
                          <div className="inv-signature-box">
                            <div className="inv-signature-line" />
                            <div className="inv-signature-name">{formData.sigName}</div>
                            {formData.sigTitle && (
                              <div className="inv-signature-title">
                                {formData.sigTitle}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── 3. SPACER ── */}
                <div className="inv-footer-spacer" />

                {/* ── 4. FOOTER BLOCK ── */}
                <div className="inv-footer-wrap">
                  <div className="inv-footer-divider" />
                  <div className="inv-footer">
                    {/* Col 1: We Accept */}
                    <div className="inv-footer-col inv-footer-accept">
                      <div className="acc-label">We Accept</div>
                      <div>{formData.footerCards || "Visa, Master Card, American Express"}</div>
                    </div>

                    {/* Col 2: Address */}
                    <div className="inv-footer-col">
                      {fAddrLines.length > 0 && (
                        <>
                          <div className="inv-footer-icon">
                            <MapPin className="w-3.5 h-3.5" />
                          </div>
                          <div className="inv-footer-text">
                            {fAddrLines.map((l, i) => (
                              <React.Fragment key={i}>
                                {l}
                                {i < fAddrLines.length - 1 && <br />}
                              </React.Fragment>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Col 3: Phone */}
                    <div className="inv-footer-col">
                      {fPhoneLines.length > 0 && (
                        <>
                          <div className="inv-footer-icon">
                            <Phone className="w-3.5 h-3.5" />
                          </div>
                          <div className="inv-footer-text">
                            {fPhoneLines.map((p, i) => (
                              <React.Fragment key={i}>
                                {p}
                                {i < fPhoneLines.length - 1 && <br />}
                              </React.Fragment>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Col 4: Email / Web */}
                    <div className="inv-footer-col">
                      {fWebLines.length > 0 && (
                        <>
                          <div className="inv-footer-icon">
                            <Mail className="w-3.5 h-3.5" />
                          </div>
                          <div className="inv-footer-text">
                            {fWebLines.map((w, i) => (
                              <React.Fragment key={i}>
                                {w}
                                {i < fWebLines.length - 1 && <br />}
                              </React.Fragment>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
