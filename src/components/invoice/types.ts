export interface InvoiceItem {
  id: number | string;
  desc: string;
  notes?: string;
  price: number;
  qty: number;
}

export interface UserProfile {
  bizName1: string;
  bizName2: string;
  bizTagline: string;
  payCompany: string;
  payBank: string;
  sigName: string;
  sigTitle: string;
  footerAddr1: string;
  footerAddr2: string;
  footerAddr3: string;
  footerPhone1: string;
  footerPhone2: string;
  footerEmail: string;
  footerWebsite: string;
  footerCards: string;
  conditionsTitle: string;
  termsText: string;
  thanksMsg: string;
}

export interface InvoiceSettings {
  accentColor: string;
  defaultCurrency: string;
  defaultTax: number;
  defaultDiscount: number;
  invPrefix: string;
  invStart: number;
  invPad: number;
}

export interface InvoiceFormData {
  logoDataUrl?: string | null;
  bizName1: string;
  bizName2: string;
  bizTagline: string;
  invNumber: number | string;
  invDate: string;
  invTitle: string;
  invCurrency: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  clientEmail: string;
  taxRate: number;
  discountRate: number;
  payCompany: string;
  payBank: string;
  conditionsTitle: string;
  termsText: string;
  thanksMsg: string;
  sigName: string;
  sigTitle: string;
  footerAddr1: string;
  footerAddr2: string;
  footerAddr3: string;
  footerPhone1: string;
  footerPhone2: string;
  footerEmail: string;
  footerWebsite: string;
  footerCards: string;
  items: InvoiceItem[];
}

export interface SavedInvoiceRecord extends InvoiceFormData {
  id?: string;
  user_id?: string;
  total: number;
  date: string;
  currency: string;
  savedAt: number;
  _origIndex?: number;
}

export interface ClientRecord {
  id?: string;
  name: string;
  phone?: string;
  address?: string;
  email?: string;
  updated_at?: string;
}

export interface DbConfig {
  provider: "local" | "rest_api" | "supabase";
  apiUrl?: string;
  apiKey?: string;
}

export interface Totals {
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
}

export interface ToastMessage {
  id: string;
  text: string;
  type: "success" | "error" | "info";
}

