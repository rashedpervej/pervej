import { InvoiceItem, InvoiceSettings, UserProfile, Totals } from "./types";

export const DEFAULT_PROFILE: UserProfile = {
  bizName1: "RASHED",
  bizName2: "PERVEJ",
  bizTagline: "360° Design Solution",
  payCompany: "Cash Paid",
  payBank: "A/C NO - 6024 5879 6687",
  sigName: "RASHED PERVEJ",
  sigTitle: "Visualizer",
  footerAddr1: "Jashore IT Park",
  footerAddr2: "Najir Shangkarpur, Sadar",
  footerAddr3: "Jashore, Bangladesh",
  footerPhone1: "+88 01932623969",
  footerPhone2: "+88 01960132424",
  footerEmail: "rashedpervej2011@gmail.com",
  footerWebsite: "www.pervej.pro.bd",
  footerCards: "Visa, Master Card, American Express",
  conditionsTitle: "Condition",
  termsText: [
    "Project includes 10 packaging/bottle sticker designs.",
    "Completion deadline: 31 July 2026.",
    "Up to 3 free revision rounds per design.",
    "50% advance before work; 50% before final file delivery.",
    "Final files: AI, Print-ready PDF, PNG (or agreed formats).",
    "Client provides all text, logo, barcode and product information.",
    "Extra work outside scope will be billed separately.",
    "Copyright transfers after full payment.",
    "Designer may showcase completed work in portfolio after public release.",
    "Advance payment confirms acceptance of these terms.",
  ].join("\n"),
  thanksMsg: "THANKS FOR BUSINESS WITH US!",
};

export const DEFAULT_SETTINGS: InvoiceSettings = {
  accentColor: "#e8176c",
  defaultCurrency: "USD",
  defaultTax: 15,
  defaultDiscount: 15,
  invPrefix: "INV-",
  invStart: 1,
  invPad: 5,
};

export const DEFAULT_ITEMS: InvoiceItem[] = [
  { id: 1, desc: "Web Template Design", notes: "Lorem ipsum dolor sit amet, consectetur adipiscing eros ut curou.", price: 550, qty: 1 },
  { id: 2, desc: "Web Template Design", notes: "", price: 550, qty: 1 },
  { id: 3, desc: "Web Template Design", notes: "Lorem ipsum dolor sit amet, consectetur adipiscing eros ut curou.", price: 550, qty: 1 },
  { id: 4, desc: "Web Template Design", notes: "", price: 550, qty: 1 },
  { id: 5, desc: "Web Template Design", notes: "Lorem ipsum dolor sit amet, consectetur adipiscing eros ut curou.", price: 550, qty: 1 },
  { id: 6, desc: "Web Template Design", notes: "Lorem ipsum dolor sit amet, consectetur adipiscing eros ut curou.", price: 550, qty: 1 },
];

export const CURRENCIES: Record<string, { symbol: string; label: string }> = {
  USD: { symbol: "$", label: "USD ($)" },
  EUR: { symbol: "€", label: "EUR (€)" },
  GBP: { symbol: "£", label: "GBP (£)" },
  BDT: { symbol: "৳", label: "BDT (৳)" },
  INR: { symbol: "₹", label: "INR (₹)" },
  CAD: { symbol: "CA$", label: "CAD (CA$)" },
  AUD: { symbol: "A$", label: "AUD (A$)" },
};

export function getCurrencySymbol(currencyCode: string = "USD"): string {
  return CURRENCIES[currencyCode]?.symbol || "$";
}

export function fmt(num: number | string, currencyCode: string = "USD"): string {
  const sym = getCurrencySymbol(currencyCode);
  const n = parseFloat(String(num)) || 0;
  return sym + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function numberToWords(rawNum: number): string {
  const num = Math.round(rawNum * 100) / 100;
  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);

  const ones = [
    "", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE",
    "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN",
  ];
  const tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];

  function chunk(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    return ones[Math.floor(n / 100)] + " HUNDRED" + (n % 100 ? " " + chunk(n % 100) : "");
  }

  function convert(n: number): string {
    if (n === 0) return "ZERO";
    let r = "";
    if (n >= 1e9) {
      r += chunk(Math.floor(n / 1e9)) + " BILLION ";
      n %= 1e9;
    }
    if (n >= 1e6) {
      r += chunk(Math.floor(n / 1e6)) + " MILLION ";
      n %= 1e6;
    }
    if (n >= 1e3) {
      r += chunk(Math.floor(n / 1e3)) + " THOUSAND ";
      n %= 1e3;
    }
    if (n > 0) r += chunk(n);
    return r.trim();
  }

  let result = convert(intPart);
  if (decPart > 0) result += " AND " + convert(decPart) + " CENTS";
  return result + " ONLY";
}

export function calcTotals(
  items?: InvoiceItem[] | null,
  taxRateInput: number | string = 15,
  discountRateInput: number | string = 15
): Totals {
  const safeItems = Array.isArray(items) ? items : [];
  const subtotal =
    Math.round(
      safeItems.reduce((s, it) => {
        if (!it) return s;
        const q = Number(it.qty) || 0;
        const p = Number(it.price) || 0;
        return s + q * p;
      }, 0) * 100
    ) / 100;
  const taxRate = Math.max(0, parseFloat(String(taxRateInput)) || 0) / 100;
  const discRate = Math.max(0, parseFloat(String(discountRateInput)) || 0) / 100;
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  const discount = Math.round(subtotal * discRate * 100) / 100;
  const total = Math.round((subtotal + tax - discount) * 100) / 100;
  return { subtotal, tax, discount, total };
}

export function getTodayDateStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) dateStr = getTodayDateStr();
  try {
    const [y, m, d] = dateStr.split("-");
    if (y && m && d) return `${d}-${m}-${y}`;
    return dateStr;
  } catch {
    return dateStr;
  }
}

export function shadeColor(hex: string, pct: number): string {
  const cleanHex = hex.replace("#", "");
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) return hex;
  const r = Math.min(255, Math.max(0, (num >> 16) + pct * 2.55));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + pct * 2.55));
  const b = Math.min(255, Math.max(0, (num & 0xff) + pct * 2.55));
  return "#" + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, "0")).join("");
}

export function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace("#", "");
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) return `rgba(232, 23, 108, ${alpha})`;
  return `rgba(${(num >> 16) & 0xff}, ${(num >> 8) & 0xff}, ${num & 0xff}, ${alpha})`;
}

export function getFormattedInvNumber(invNum: number | string = 1, prefix: string = "INV-", pad: number = 5): string {
  const raw = String(invNum || "1").trim();
  const num = parseInt(raw.replace(/\D/g, ""));
  if (isNaN(num)) return prefix + String(1).padStart(pad, "0");
  return prefix + String(num).padStart(pad, "0");
}

export function generateNextInvNumber(savedInvoices: Array<{ invNumber: string | number }>, invStart: number = 1): number {
  let maxNum = (invStart || 1) - 1;
  savedInvoices.forEach((inv) => {
    const n = parseInt(String(inv.invNumber || "").replace(/\D/g, ""));
    if (!isNaN(n) && n > maxNum) maxNum = n;
  });
  return maxNum + 1;
}

export function escHtml(str?: string | number): string {
  if (!str && str !== 0) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
