import React, { useState, useEffect, useRef, useContext, createContext } from "react";
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Printer, 
  RotateCcw, 
  Save, 
  Upload, 
  FileText, 
  HelpCircle,
  FolderOpen,
  MapPin,
  Phone,
  Mail,
  Check,
  Percent,
  Settings,
  Download
} from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

// Helper to convert oklch and oklab colors to a high-quality RGB grayscale or color fallback matching their lightness
function convertOklchToRgb(value: string): string {
  if (!value) return value;
  if (typeof value !== "string") return value;
  
  // Quick pre-check to speed up common cases
  if (!value.includes("oklch") && !value.includes("oklab")) {
    return value;
  }
  
  // General match for any oklch(...) or oklab(...) block, regardless of format
  const oklchOrOklabRegex = /(oklch|oklab)\(([^)]+)\)/gi;
  
  let updatedValue = value.replace(oklchOrOklabRegex, (match, type, content) => {
    // content will look like "0.584 0.231 4.75" or "0.584 0.231 4.75 / 0.5" or "0.902 0.015 124 / none"
    const parts = content.trim().split(/\s*[\/\s]\s*/); // Split by spaces or slashes
    const lStr = parts[0] || "0";
    const cStr = parts[1] || "0";
    const hStr = parts[2] || "0";
    const aStr = parts[3];
    
    let L = parseFloat(lStr);
    if (lStr.endsWith("%")) L = parseFloat(lStr) / 100;
    
    let alpha = 1;
    if (aStr) {
      if (aStr.trim() === "none") {
        alpha = 1;
      } else if (aStr.endsWith("%")) {
        alpha = parseFloat(aStr) / 100;
      } else {
        alpha = parseFloat(aStr);
      }
    }
    if (isNaN(alpha)) alpha = 1;
    
    const gray = Math.round(L * 255);
    
    if (type.toLowerCase() === "oklch") {
      const C = parseFloat(cStr);
      const H = parseFloat(hStr);
      if (C > 0.04) {
        if (H < 60 || H > 300) {
          // Brand Pink/Red
          return `rgba(226, 27, 90, ${alpha})`;
        } else if (H >= 110 && H <= 170) {
          // Brand Green
          return `rgba(5, 150, 105, ${alpha})`;
        }
      }
    } else {
      // oklab
      const a = parseFloat(cStr);
      if (a > 0.04) {
        return `rgba(226, 27, 90, ${alpha})`;
      } else if (a < -0.04) {
        return `rgba(5, 150, 105, ${alpha})`;
      }
    }
    
    return `rgba(${gray}, ${gray}, ${gray}, ${alpha})`;
  });

  // Handle color(oklab ...)
  const colorRegex = /color\(\s*oklab\s+([^)]+)\)/gi;
  updatedValue = updatedValue.replace(colorRegex, (match, content) => {
    const parts = content.trim().split(/\s*[\/\s]\s*/);
    const lStr = parts[0] || "0";
    const aStrVal = parts[1] || "0";
    const aStr = parts[3];
    
    let L = parseFloat(lStr);
    if (lStr.endsWith("%")) L = parseFloat(lStr) / 100;
    
    let alpha = 1;
    if (aStr) {
      if (aStr.trim() === "none") {
        alpha = 1;
      } else if (aStr.endsWith("%")) {
        alpha = parseFloat(aStr) / 100;
      } else {
        alpha = parseFloat(aStr);
      }
    }
    if (isNaN(alpha)) alpha = 1;
    
    const a = parseFloat(aStrVal);
    const gray = Math.round(L * 255);
    if (a > 0.04) {
      return `rgba(226, 27, 90, ${alpha})`;
    } else if (a < -0.04) {
      return `rgba(5, 150, 105, ${alpha})`;
    }
    return `rgba(${gray}, ${gray}, ${gray}, ${alpha})`;
  });

  // Ultimate fallback to ensure absolutely zero oklch/oklab slips through to html2canvas
  if (updatedValue.includes("oklch") || updatedValue.includes("oklab") || updatedValue.includes("color(")) {
    return "rgba(0, 0, 0, 0)";
  }
  
  return updatedValue;
}

interface InvoiceItem {
  id: string;
  description: string;
  subDescription: string;
  unitPrice: number;
  quantity: number;
}

interface InvoiceData {
  companyName: string;
  companySlogan: string;
  invoiceNumber: string;
  invoiceDate: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  clientEmail: string;
  paymentCompany: string;
  paymentBank: string;
  conditions: string[];
  signatureName: string;
  signatureRole: string;
  footerCards: string;
  footerAddress: string;
  footerPhones: string;
  footerEmails: string;
  taxRate: number;
  discount: number;
  advancePayment: number;
  showTax: boolean;
  currency: string;
  items: InvoiceItem[];
}

const DEFAULT_INVOICE_DATA: InvoiceData = {
  companyName: "RASHED PERVEJ",
  companySlogan: "360° Design Solution",
  invoiceNumber: "DX-24589",
  invoiceDate: "10-08-2023",
  clientName: "MAIKEL SMITH",
  clientPhone: "01 248 579 623",
  clientAddress: "Sun francisco, CA1 00",
  clientEmail: "malgoompany.com",
  paymentCompany: "Cash Paid",
  paymentBank: "A/C NO - 6024 5879 6687",
  conditions: [
    "Project includes 10 packaging/bottle sticker designs.",
    "Completion deadline: 31 July 2026.",
    "Up to 3 free revision rounds per design.",
    "50% advance before work; 50% before final file delivery.",
    "Final files: AI, Print-ready PDF, PNG (or agreed formats).",
    "Client provides all text, logo, barcode and product information.",
    "Extra work outside scope will be billed separately.",
    "Copyright transfers after full payment.",
    "Designer may showcase completed work in portfolio after public release.",
    "Advance payment confirms acceptance of these terms."
  ],
  signatureName: "RASHED PERVEJ",
  signatureRole: "Visualizer",
  footerCards: "Card : Visa, Master Card, American Express",
  footerAddress: "Jashore IT Park\nNajir Shangkarpur, Sadar\nJashore, bangladesh",
  footerPhones: "+88 01932623969\n+88 01960132424",
  footerEmails: "rashedpervej2011@gmail.com\nwww.pervej.pro.bd",
  taxRate: 15,
  discount: 15,
  advancePayment: 0,
  showTax: true,
  currency: "$",
  items: [
    {
      id: "item-1",
      description: "Web Template Design",
      subDescription: "Lorem ipsum dolor sit amet, consecteur adipiscing eras ut curou.",
      unitPrice: 550.00,
      quantity: 1
    },
    {
      id: "item-2",
      description: "Web Template Design",
      subDescription: "",
      unitPrice: 550.00,
      quantity: 1
    },
    {
      id: "item-3",
      description: "Web Template Design",
      subDescription: "",
      unitPrice: 550.00,
      quantity: 1
    },
    {
      id: "item-4",
      description: "Web Template Design",
      subDescription: "",
      unitPrice: 550.00,
      quantity: 1
    },
    {
      id: "item-5",
      description: "Web Template Design",
      subDescription: "Lorem ipsum dolor sit amet, consecteur adipiscing eras ut curou.",
      unitPrice: 550.00,
      quantity: 1
    },
    {
      id: "item-6",
      description: "Web Template Design",
      subDescription: "Lorem ipsum dolor sit amet, consecteur adipiscing eras ut curou.",
      unitPrice: 550.00,
      quantity: 1
    }
  ]
};

// Convert numeric total into English Words
function convertNumberToWords(amount: number, symbol: string = "$"): string {
  const words = [
    "", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN",
    "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"
  ];
  const tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];
  const scales = ["", "THOUSAND", "MILLION", "BILLION"];

  const currencyUnit = symbol === "৳" ? "TAKA" : "DOLLARS";

  if (amount === 0) return `ZERO ${currencyUnit} ONLY`;

  const numString = Math.floor(amount).toString();
  if (numString.length > 12) return "AMOUNT TOO LARGE";

  function parseGroup(num: number): string {
    let groupWords = "";
    const hundreds = Math.floor(num / 100);
    const remainder = num % 100;

    if (hundreds > 0) {
      groupWords += words[hundreds] + " HUNDRED ";
    }

    if (remainder > 0) {
      if (remainder < 20) {
        groupWords += words[remainder] + " ";
      } else {
        const tensDigit = Math.floor(remainder / 10);
        const onesDigit = remainder % 10;
        groupWords += tens[tensDigit] + " " + (onesDigit > 0 ? words[onesDigit] + " " : "");
      }
    }

    return groupWords.trim();
  }

  let result = "";
  let groupIndex = 0;
  let remainingNum = Math.floor(amount);

  while (remainingNum > 0) {
    const group = remainingNum % 1000;
    if (group > 0) {
      const groupWord = parseGroup(group);
      result = groupWord + " " + (scales[groupIndex] ? scales[groupIndex] + " " : "") + result;
    }
    remainingNum = Math.floor(remainingNum / 1000);
    groupIndex++;
  }

  return (result.trim() + ` ${currencyUnit} ONLY`).toUpperCase();
}

// Export context to disable inputs and hide placeholders during PDF export
const ExportContext = React.createContext(false);

// Custom Premium Inline Editable Component
interface EditableProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  type?: "text" | "textarea" | "number";
  placeholder?: string;
  uppercase?: boolean;
}

function Editable({ value, onChange, className = "", type = "text", placeholder = "", uppercase = false }: EditableProps) {
  const isExporting = useContext(ExportContext);
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  const handleBlur = () => {
    setIsEditing(false);
    onChange(uppercase ? tempValue.toUpperCase() : tempValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && type !== "textarea") {
      setIsEditing(false);
      onChange(uppercase ? tempValue.toUpperCase() : tempValue);
    }
    if (e.key === "Escape") {
      setTempValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing && !isExporting) {
    if (type === "textarea") {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          className="w-full bg-white text-zinc-950 p-1 border-2 border-[#e21b5a] rounded outline-none transition-all resize-none text-[inherit] font-[inherit]"
          rows={3}
          placeholder={placeholder}
        />
      );
    }
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={type}
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoFocus
        className="w-full bg-white text-zinc-950 px-1 py-0.5 border-2 border-[#e21b5a] rounded outline-none transition-all text-[inherit] font-[inherit]"
        placeholder={placeholder}
      />
    );
  }

  const isPlaceholder = !value;
  const displayValue = value || (isExporting ? "" : placeholder);

  // If we are exporting and there is no value, don't render anything to avoid placeholders in the final PDF
  if (isExporting && isPlaceholder) {
    return null;
  }

  return (
    <span
      onClick={() => {
        if (!isExporting) setIsEditing(true);
      }}
      className={`transition-all inline-block min-w-[20px] ${
        !isExporting ? "cursor-pointer hover:bg-[#e21b5a]/10 hover:text-black rounded px-0.5 -mx-0.5" : ""
      } ${isPlaceholder ? "text-zinc-400 italic" : ""} ${className}`}
    >
      {uppercase ? displayValue.toUpperCase() : displayValue}
    </span>
  );
}

export default function InvoiceMaker() {
  const [invoice, setInvoice] = useState<InvoiceData>(() => {
    const saved = localStorage.getItem("rashed_invoice_data_rebuilt");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.showTax === undefined) parsed.showTax = true;
        if (parsed.advancePayment === undefined) parsed.advancePayment = 0;
        if (parsed.currency === undefined) parsed.currency = "$";
        return parsed;
      } catch (e) {
        return DEFAULT_INVOICE_DATA;
      }
    }
    return DEFAULT_INVOICE_DATA;
  });

  const [notification, setNotification] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const saveToLocalStorage = () => {
    localStorage.setItem("rashed_invoice_data_rebuilt", JSON.stringify(invoice));
    showToast("Invoice saved successfully!");
  };

  const showToast = (message: string) => {
    setNotification(message);
  };

  const resetInvoice = () => {
    if (window.confirm("Are you sure you want to reset to default template?")) {
      setInvoice(DEFAULT_INVOICE_DATA);
      localStorage.removeItem("rashed_invoice_data_rebuilt");
      showToast("Invoice reset to reference standards!");
    }
  };

  const triggerPrint = () => {
    window.print();
  };

  const exportPDF = async () => {
    const element = document.getElementById("printable-invoice");
    if (!element) return;

    setIsExporting(true);
    showToast("Generating high-quality A4 PDF...");

    // Temporarily intercept getComputedStyle and CSSStyleDeclaration prototype to convert unsupported oklch/oklab color functions
    const originalGetComputedStyle = window.getComputedStyle;
    const originalGetPropertyValue = CSSStyleDeclaration.prototype.getPropertyValue;

    window.getComputedStyle = (elt, pseudoElt) => {
      const style = originalGetComputedStyle(elt, pseudoElt);
      return new Proxy(style, {
        get(target, prop) {
          if (prop === "getPropertyValue") {
            return function (propertyName: string) {
              const originalValue = target.getPropertyValue(propertyName);
              return convertOklchToRgb(originalValue);
            };
          }
          const val = target[prop as any] as any;
          if (typeof val === "function") {
            return val.bind(target);
          }
          if (typeof val === "string") {
            return convertOklchToRgb(val);
          }
          return val;
        }
      }) as CSSStyleDeclaration;
    };

    CSSStyleDeclaration.prototype.getPropertyValue = function (propertyName: string) {
      const originalValue = originalGetPropertyValue.call(this, propertyName);
      return convertOklchToRgb(originalValue);
    };

    try {
      // Wait to ensure state has propagated and elements have re-rendered with empty-descriptions collapsed
      await new Promise(resolve => setTimeout(resolve, 350));

      const canvas = await html2canvas(element, {
        scale: 2.5, // Ultra-sharp print-ready output
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 800, // Standard desktop width for exact reference proportions
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Ensure the PDF uses true A4 dimensions or matches the container height exactly if it overflows
      // If content fits within one A4 page, force exact true A4 page dimensions (210mm x 297mm)
      const useExactA4 = imgHeight <= 305;
      const pdfHeight = useExactA4 ? 297 : imgHeight;

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: useExactA4 ? "a4" : [imgWidth, pdfHeight]
      });

      // Add the image exactly covering the entire page with zero print margins and no overflow
      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, pdfHeight, undefined, 'FAST');

      pdf.save(`invoice-${invoice.invoiceNumber || "draft"}.pdf`);
      showToast("PDF downloaded successfully!");
    } catch (error) {
      console.error("PDF generation failed:", error);
      showToast("PDF export failed. Try again.");
    } finally {
      // Restore original standard behaviors
      window.getComputedStyle = originalGetComputedStyle;
      CSSStyleDeclaration.prototype.getPropertyValue = originalGetPropertyValue;
      setIsExporting(false);
    }
  };

  const updateField = (key: keyof InvoiceData, value: any) => {
    setInvoice(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const updateItemField = (itemId: string, field: keyof InvoiceItem, value: any) => {
    setInvoice(prev => {
      const updatedItems = prev.items.map(item => {
        if (item.id === itemId) {
          let parsedVal = value;
          if (field === "unitPrice") {
            parsedVal = parseFloat(value) || 0;
          } else if (field === "quantity") {
            parsedVal = parseInt(value) || 0;
          }
          return { ...item, [field]: parsedVal };
        }
        return item;
      });
      return { ...prev, items: updatedItems };
    });
  };

  const addRow = () => {
    const newId = `item-${Date.now()}`;
    const newItem: InvoiceItem = {
      id: newId,
      description: "Your Product/Service Name Here",
      subDescription: "Short description here",
      unitPrice: 0,
      quantity: 1
    };
    setInvoice(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
    showToast("New row added!");
  };

  const removeRow = (id: string) => {
    if (invoice.items.length <= 1) {
      showToast("At least one item is required.");
      return;
    }
    setInvoice(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
    showToast("Row deleted.");
  };

  const updateCondition = (index: number, value: string) => {
    setInvoice(prev => {
      const updatedConditions = [...prev.conditions];
      updatedConditions[index] = value;
      return { ...prev, conditions: updatedConditions };
    });
  };

  const addCondition = () => {
    setInvoice(prev => ({
      ...prev,
      conditions: [...prev.conditions, "New custom business condition or terms."]
    }));
  };

  const removeCondition = (index: number) => {
    setInvoice(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index)
    }));
  };

  // Math Calculations
  const currencySymbol = invoice.currency || "$";
  const calculatedSubtotal = invoice.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const calculatedTax = invoice.showTax ? ((calculatedSubtotal * invoice.taxRate) / 100) : 0;
  const calculatedDiscount = (calculatedSubtotal * invoice.discount) / 100;
  const calculatedAdvance = invoice.advancePayment || 0;
  const calculatedDue = Math.max(0, calculatedSubtotal + calculatedTax - calculatedDiscount - calculatedAdvance);
  const calculatedWords = convertNumberToWords(calculatedDue, currencySymbol);

  // Formatting displays
  const displaySubtotal = `${currencySymbol}${calculatedSubtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const displayTax = `${currencySymbol}${calculatedTax.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const displayDiscount = `${currencySymbol}${calculatedDiscount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const displayAdvance = `${currencySymbol}${calculatedAdvance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const displayGrandTotal = `${currencySymbol}${calculatedDue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const displayAmountInWords = calculatedWords;
  const isFullyPaid = calculatedDue <= 0.005;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans antialiased selection:bg-[#e21b5a]/30 selection:text-white relative">
      
      {/* Dynamic Toast System */}
      {notification && (
        <div className="fixed bottom-6 right-6 bg-[#18181b] border-2 border-[#e21b5a] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="w-2.5 h-2.5 rounded-full bg-[#e21b5a] animate-ping" />
          <span className="text-xs font-black tracking-wider uppercase">{notification}</span>
        </div>
      )}

      {/* Editor Main Toolbar (Hidden in Print) */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 px-6 py-4 print:hidden shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                window.history.pushState({}, "", "/");
                window.dispatchEvent(new Event("popstate"));
              }}
              className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              title="Back to Portfolio"
            >
              <ArrowLeft className="w-4 h-4 text-[#e21b5a]" />
              <span className="text-xs font-bold pr-1 hidden sm:inline">Back to Portfolio</span>
            </button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#c2144a] to-[#e21b5a] flex items-center justify-center shadow-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black text-white flex items-center gap-1.5 uppercase tracking-wider">
                Professional Invoice Maker
              </h1>
              
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={saveToLocalStorage}
              className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              Save Layout
            </button>
            <button
              onClick={resetInvoice}
              className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
              Reset Reference
            </button>
            <button
              onClick={exportPDF}
              disabled={isExporting}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-[#e21b5a] hover:from-purple-700 hover:to-[#c2144a] text-white rounded-lg text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-[#e21b5a]/10 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Download className={`w-4 h-4 ${isExporting ? "animate-bounce" : ""}`} />
              {isExporting ? "Exporting..." : "Download PDF"}
            </button>
            <button
              onClick={triggerPrint}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white rounded-lg text-xs font-black transition-all flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Browser Print
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Sidebar Controls (Hidden in Print) */}
        <aside className="w-full lg:w-80 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 space-y-6 print:hidden shrink-0 shadow-xl">
          <div>
            <h2 className="text-xs font-black text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <Settings className="w-4 h-4 text-[#e21b5a]" />
              Calculator Settings
            </h2>
            
          </div>

          {/* Tax Section Toggle */}
          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Show Tax Section</span>
              <button
                onClick={() => updateField("showTax", !invoice.showTax)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  invoice.showTax ? "bg-[#e21b5a]" : "bg-zinc-800"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    invoice.showTax ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            
            {invoice.showTax && (
              <div className="space-y-1.5 pt-2 border-t border-zinc-800/40">
                <label className="block text-[9px] font-bold text-zinc-500 uppercase">Tax Rate (%)</label>
                <input
                  type="number"
                  value={invoice.taxRate}
                  onChange={(e) => updateField("taxRate", parseFloat(e.target.value) || 0)}
                  className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-300 outline-none focus:border-[#e21b5a]/50"
                />
              </div>
            )}
          </div>

          {/* Other Parameters */}
          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 space-y-4">
            <div className="space-y-2">
              <label className="block text-[9px] font-bold text-zinc-500 uppercase">Currency</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateField("currency", "$")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    (invoice.currency || "$") === "$"
                      ? "bg-[#e21b5a] border-[#e21b5a] text-white cursor-pointer"
                      : "bg-zinc-900 border-zinc-850 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  }`}
                >
                  $ Dollar
                </button>
                <button
                  type="button"
                  onClick={() => updateField("currency", "৳")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    invoice.currency === "৳"
                      ? "bg-[#e21b5a] border-[#e21b5a] text-white cursor-pointer"
                      : "bg-zinc-900 border-zinc-850 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  }`}
                >
                  ৳ Taka
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[9px] font-bold text-zinc-500 uppercase">Discount (%)</label>
              <input
                type="number"
                value={invoice.discount}
                onChange={(e) => updateField("discount", parseFloat(e.target.value) || 0)}
                className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-300 outline-none focus:border-[#e21b5a]/50"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[9px] font-bold text-zinc-500 uppercase">Advance Payment ({currencySymbol})</label>
              <input
                type="number"
                value={invoice.advancePayment}
                onChange={(e) => updateField("advancePayment", parseFloat(e.target.value) || 0)}
                className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-300 outline-none focus:border-[#e21b5a]/50"
              />
            </div>
          </div>

          {/* Help Tips */}
          <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl space-y-2 text-[10px] text-zinc-500 leading-relaxed font-medium">
            <span className="font-bold text-zinc-400 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-[#e21b5a]" />
              Some Guide
            </span>
            <p>1. Hover over descriptions, prices, quantities, and addresses to click-and-edit.</p>
            <p>2. Delete table items easily using the red trash button that appears on row hover.</p>
            <p>3. Add new rows using the button below the items table.</p>
          </div>
        </aside>

        {/* INVOICE CANVAS STAGE */}
        <div className="flex-1 w-full flex flex-col items-center">
          
          {/* Printable A4 Page container wrapped in ExportContext */}
          <ExportContext.Provider value={isExporting}>
            <div 
              id="printable-invoice"
              className={`w-full max-w-[800px] bg-white text-[#18181b] shadow-2xl rounded-none border border-zinc-200/60 print:border-none print:shadow-none print:p-0 print:rounded-none relative flex flex-col justify-between print-area ${
                isExporting ? "p-12" : "p-6 sm:p-12"
              }`}
              style={{ 
                minHeight: "1131.428px",
                width: isExporting ? "800px" : undefined,
                maxWidth: isExporting ? "800px" : undefined,
              }}
            >
            {/* Top Pink Edge Banner */}
            <div className="absolute top-0 right-0 w-[240px] h-6 bg-[#e21b5a]" />

            <div>
              {/* HEADER SECTION */}
              <div className="flex flex-row justify-between items-start pt-4 pb-2">
                
                {/* Brand / Logo details */}
                <div className="flex items-center gap-4">
                  {/* Abstract Folded Hexagon Ribbon Logo */}
                  <div className="w-16 h-16 shrink-0 select-none">
                    <svg viewBox="0 0 100 100" className="w-16 h-16">
                      <path d="M20 32 L45 18 L45 82 L20 68 Z" fill="#c2144a" />
                      <path d="M45 18 L70 25 L70 75 L45 82 Z" fill="#e21b5a" />
                      <path d="M70 25 L92 13 L92 87 L70 75 Z" fill="#18181b" />
                    </svg>
                  </div>
                  
                  <div className="flex flex-col justify-center">
                    <span className="text-2xl font-black text-[#18181b] tracking-tight leading-none uppercase">
                      <Editable 
                        value={invoice.companyName} 
                        onChange={(v) => updateField("companyName", v)} 
                        uppercase 
                      />
                    </span>
                    <span className="text-xs font-semibold text-[#e21b5a] tracking-wider mt-1 uppercase">
                      <Editable 
                        value={invoice.companySlogan} 
                        onChange={(v) => updateField("companySlogan", v)} 
                      />
                    </span>
                  </div>
                </div>

                {/* Invoice Meta right aligned column */}
                <div className="space-y-1.5 text-right flex flex-col items-end pt-1">
                  <div className="flex items-center justify-end gap-1 text-sm font-sans">
                    <span className="font-extrabold text-[#e21b5a] tracking-wider text-xs">INVOICE#</span>
                    <span className="font-bold text-[#18181b] ml-1">
                      <Editable 
                        value={invoice.invoiceNumber} 
                        onChange={(v) => updateField("invoiceNumber", v)} 
                        uppercase 
                      />
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-1 text-sm font-sans">
                    <span className="font-extrabold text-[#e21b5a] tracking-wider text-xs">DATE :</span>
                    <span className="font-bold text-[#18181b] ml-1">
                      <Editable 
                        value={invoice.invoiceDate} 
                        onChange={(v) => updateField("invoiceDate", v)} 
                      />
                    </span>
                  </div>
                </div>

              </div>

              {/* Massive Full Width Pink Separator Bar */}
              <div className="h-1 bg-[#e21b5a] w-full mt-5 mb-8" />

              {/* CLIENT BILLING & DESIGNER DETAILS INFO GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-2 items-start">
                
                {/* Client / Invoice To column */}
                <div className="space-y-3.5">
                  <span className="block text-xs font-black tracking-wider leading-none">
                    <span className="text-[#e21b5a]">INVOICE</span>{" "}
                    <span className="text-zinc-600">TO:</span>
                  </span>
                  
                  <div className="text-lg font-black text-[#18181b] uppercase tracking-tight">
                    <Editable 
                      value={invoice.clientName} 
                      onChange={(v) => updateField("clientName", v)} 
                      uppercase 
                    />
                  </div>
                  
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-1 text-zinc-600 font-medium">
                      <span className="font-extrabold text-[#e21b5a] text-[10px] w-16 shrink-0 uppercase tracking-wider">PHONE</span>
                      <span className="text-zinc-400 font-bold">:</span>
                      <span className="ml-1 text-zinc-700">
                        <Editable 
                          value={invoice.clientPhone} 
                          onChange={(v) => updateField("clientPhone", v)} 
                        />
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-zinc-600 font-medium">
                      <span className="font-extrabold text-[#e21b5a] text-[10px] w-16 shrink-0 uppercase tracking-wider">ADDRESS</span>
                      <span className="text-zinc-400 font-bold">:</span>
                      <span className="ml-1 text-zinc-700">
                        <Editable 
                          value={invoice.clientAddress} 
                          onChange={(v) => updateField("clientAddress", v)} 
                        />
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-zinc-600 font-medium">
                      <span className="font-extrabold text-[#e21b5a] text-[10px] w-16 shrink-0 uppercase tracking-wider">EMAIL</span>
                      <span className="text-zinc-400 font-bold">:</span>
                      <span className="ml-1 text-zinc-700">
                        <Editable 
                          value={invoice.clientEmail} 
                          onChange={(v) => updateField("clientEmail", v)} 
                        />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Big INVOICE banner + solid pink total badge */}
                <div className="flex flex-col items-end justify-between h-full space-y-4">
                  <span className="text-5xl font-black text-zinc-900 tracking-tight leading-none uppercase select-none">
                    INVOICE
                  </span>
                  
                  {/* Rounded total due box */}
                  {isFullyPaid ? (
                    <div className="bg-emerald-600 text-white px-8 py-5 rounded-none w-[260px] text-right shadow-lg flex flex-col justify-between transition-all duration-300">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/80 leading-none">
                        Invoice Total
                      </span>
                      <span className="text-lg font-black tracking-tight mt-2.5 leading-none block uppercase">
                        Fully Paid
                      </span>
                    </div>
                  ) : (
                    <div className="bg-[#e21b5a] text-white px-8 py-5 rounded-none w-[260px] text-right shadow-lg flex flex-col justify-between transition-all duration-300">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/80 leading-none">
                        Invoice Total
                      </span>
                      <span className="text-lg font-black tracking-tight mt-2.5 leading-none block">
                        DUE - {displayGrandTotal}
                      </span>
                    </div>
                  )}
                </div>

              </div>

              {/* PRODUCTS AND SERVICES DYNAMIC TABLE */}
              <div className="mt-8">
                
                {/* Table Column Titles */}
                <div className="grid grid-cols-12 gap-3 pb-2 px-1 text-left select-none">
                  <div className="col-span-6 font-extrabold text-[#e21b5a] text-[11px] uppercase tracking-wider">
                    Item Description
                  </div>
                  <div className="col-span-2 font-extrabold text-[#e21b5a] text-[11px] uppercase tracking-wider text-center">
                    Unit
                  </div>
                  <div className="col-span-2 font-extrabold text-[#e21b5a] text-[11px] uppercase tracking-wider text-center">
                    Quantity
                  </div>
                  <div className="col-span-2 font-extrabold text-[#e21b5a] text-[11px] uppercase tracking-wider text-right">
                    Total
                  </div>
                </div>

                {/* Items rows */}
                <div className="mt-2 space-y-2">
                  {invoice.items.map((item) => {
                    const hasSub = isExporting ? (item.subDescription && item.subDescription.trim() !== "") : true;
                    const minHeightClass = hasSub ? "min-h-[58px]" : "min-h-[30px]";
                    const paddingClass = hasSub ? "py-3" : "py-2";

                    return (
                      <div 
                        key={item.id} 
                        className="grid grid-cols-12 gap-1 items-stretch group relative transition-all"
                      >
                        {/* Description Capsule Block */}
                        <div className={`col-span-6 bg-[#f4f4f6] rounded-none px-4 ${paddingClass} ${minHeightClass} flex flex-col justify-center`}>
                          <span className="font-bold text-zinc-800 text-xs">
                            <Editable 
                              value={item.description} 
                              onChange={(v) => updateItemField(item.id, "description", v)} 
                            />
                          </span>
                          {/* Subdescription (optional) */}
                          {hasSub && (
                            <span className="text-[10px] text-zinc-500 leading-normal block mt-0.5">
                              <Editable 
                                value={item.subDescription} 
                                onChange={(v) => updateItemField(item.id, "subDescription", v)} 
                                placeholder="Add item details..."
                              />
                            </span>
                          )}
                        </div>

                        {/* Unit Price Capsule Block */}
                        <div className={`col-span-2 bg-[#f4f4f6] rounded-none ${paddingClass} ${minHeightClass} flex items-center justify-center text-center`}>
                          <span className="text-xs font-bold text-zinc-800">
                            {currencySymbol}<Editable 
                              value={item.unitPrice.toFixed(2)} 
                              onChange={(v) => updateItemField(item.id, "unitPrice", v)} 
                            />
                          </span>
                        </div>

                        {/* Quantity Capsule Block */}
                        <div className={`col-span-2 bg-[#f4f4f6] rounded-none ${paddingClass} ${minHeightClass} flex items-center justify-center text-center`}>
                          <span className="text-xs font-bold text-zinc-800">
                            <Editable 
                              value={item.quantity.toString()} 
                              onChange={(v) => updateItemField(item.id, "quantity", v)} 
                            />
                          </span>
                        </div>

                        {/* Total Capsule Block */}
                        <div className={`col-span-2 bg-[#f4f4f6] rounded-none ${paddingClass} ${minHeightClass} flex items-center justify-end text-right px-4`}>
                          <span className="text-xs font-bold text-zinc-800">
                            {currencySymbol}{(item.unitPrice * item.quantity).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>

                        {/* Trash Button for deletion (Hidden in Print / Export) */}
                        {!isExporting && (
                          <button
                            onClick={() => removeRow(item.id)}
                            className="absolute -left-10 top-1/2 -translate-y-1/2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 print:hidden z-10 cursor-pointer"
                            title="Delete Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Add Row Button (Hidden in Print / Export) */}
                {!isExporting && (
                  <div className="mt-3.5 flex justify-start print:hidden">
                    <button
                      onClick={addRow}
                      className="px-3.5 py-2 border-2 border-dashed border-[#e21b5a] hover:bg-[#e21b5a]/5 text-[#e21b5a] rounded-xl text-[10px] font-black transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                    >
                      <Plus className="w-4 h-4" />
                      Add Product / Service Row
                    </button>
                  </div>
                )}

              </div>

              {/* PAYMENT & MATHEMATICAL FINANCIAL OVERVIEW GRID */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mt-6 pt-5 border-t border-zinc-200/80 items-start">
                
                {/* Left Column: Payment terms / Bank */}
                <div className="md:col-span-7 space-y-3.5">
                  <div>
                    <h4 className="text-xs font-black text-[#e21b5a] uppercase tracking-wider mb-2.5">
                      Payment
                    </h4>
                    
                    <div className="space-y-1.5 text-xs text-zinc-600 font-medium">
                      <div className="flex items-center gap-1">
                        <span className="font-extrabold text-[#e21b5a] text-[10px] w-16 uppercase tracking-wider">Company</span>
                        <span className="text-zinc-400 font-bold">:</span>
                        <span className="ml-1 text-zinc-700">
                          <Editable 
                            value={invoice.paymentCompany} 
                            onChange={(v) => updateField("paymentCompany", v)} 
                          />
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-extrabold text-[#e21b5a] text-[10px] w-16 uppercase tracking-wider">Bank</span>
                        <span className="text-zinc-400 font-bold">:</span>
                        <span className="ml-1 text-zinc-700">
                          <Editable 
                            value={invoice.paymentBank} 
                            onChange={(v) => updateField("paymentBank", v)} 
                          />
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Appreciation slogan exactly like the reference */}
                  <div className="pt-3">
                    <span className="block text-[#e21b5a] font-black text-xs tracking-wider uppercase select-none leading-none">
                      THANKS FOR BUSINESS WITH US !
                    </span>
                  </div>
                </div>

                {/* Right Column: Calculations matching Table Alignment */}
                <div className="md:col-span-5 space-y-2 select-none">
                  
                  {/* Subtotal */}
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <div className="col-span-8 bg-[#f4f4f6] rounded-none px-4 py-2 text-right">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Sub Total -</span>
                    </div>
                    <div className="col-span-4 bg-[#f4f4f6] rounded-none px-3 py-2 text-right">
                      <span className="text-xs font-bold text-zinc-800">
                        {displaySubtotal}
                      </span>
                    </div>
                  </div>

                  {/* Dynamic Tax */}
                  {invoice.showTax && (
                    <div className="grid grid-cols-12 gap-1 items-center">
                      <div className="col-span-8 bg-[#f4f4f6] rounded-none px-4 py-2 text-right">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Tax ({invoice.taxRate}%) -</span>
                      </div>
                      <div className="col-span-4 bg-[#f4f4f6] rounded-none px-3 py-2 text-right">
                        <span className="text-xs font-bold text-zinc-800">
                          {displayTax}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Discount */}
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <div className="col-span-8 bg-[#f4f4f6] rounded-none px-4 py-2 text-right">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Discount ({invoice.discount}%) -</span>
                    </div>
                    <div className="col-span-4 bg-[#f4f4f6] rounded-none px-3 py-2 text-right">
                      <span className="text-xs font-bold text-zinc-800">
                        {displayDiscount}
                      </span>
                    </div>
                  </div>

                  {/* Advance Payment */}
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <div className="col-span-8 bg-[#f4f4f6] rounded-none px-4 py-2 text-right">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Advance Paid -</span>
                    </div>
                    <div className="col-span-4 bg-[#f4f4f6] rounded-none px-3 py-2 text-right text-zinc-800 font-bold text-xs">
                      <span>
                        {currencySymbol}<Editable 
                          value={invoice.advancePayment.toString()} 
                          onChange={(v) => updateField("advancePayment", parseFloat(v) || 0)} 
                        />
                      </span>
                    </div>
                  </div>

                  {/* Total Due SOLID COLOR BAR exactly like reference */}
                  <div className="grid grid-cols-12 gap-3 items-center">
                    <div className="col-span-8 bg-[#e21b5a] text-white rounded-none px-4 py-2.5 text-right">
                      <span className="text-[10px] font-black uppercase tracking-wider">Total Due -</span>
                    </div>
                    <div className="col-span-4 bg-[#e21b5a] text-white rounded-none px-3 py-2.5 text-right">
                      <span className="text-xs font-black tracking-tight">
                        {displayGrandTotal}
                      </span>
                    </div>
                  </div>

                </div>

              </div>

              {/* Amount in words Block right beneath the sums */}
              <div className="mt-4 text-right flex flex-col items-end w-full">
                <span className="block text-[10px] font-black text-[#e21b5a] uppercase tracking-wider mb-1 leading-none">
                  Amount in words:
                </span>
                <p className="text-[10px] font-black text-zinc-900 uppercase leading-relaxed tracking-wider max-w-lg">
                  {displayAmountInWords}
                </p>
              </div>

              {/* CONDITIONS & SIGNATURE ROW BLOCKS */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mt-5 pt-4 border-t border-zinc-200/80 items-end">
                
                {/* Condition terms and list (7 cols) */}
                <div className="md:col-span-7 space-y-3">
                  <h4 className="text-xs font-black text-[#e21b5a] uppercase tracking-wider leading-none">
                    Condition
                  </h4>
                  
                  <ol className="space-y-1 text-[10px] text-zinc-500 font-bold leading-relaxed list-none">
                    {invoice.conditions.map((cond, idx) => (
                      <li key={idx} className="group relative flex gap-1 items-start">
                        <span className="text-[#e21b5a] shrink-0 font-extrabold">{idx + 1}.</span>
                        <span className="text-zinc-600">
                          <Editable 
                            value={cond} 
                            onChange={(v) => updateCondition(idx, v)} 
                          />
                        </span>

                        {/* Interactive remove condition button */}
                        {!isExporting && (
                          <button
                            onClick={() => removeCondition(idx)}
                            className="absolute -right-6 top-1/2 -translate-y-1/2 text-red-500 opacity-0 group-hover:opacity-100 transition-all scale-75 print:hidden cursor-pointer"
                            title="Remove condition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ol>

                  {/* Add condition button */}
                  {!isExporting && (
                    <div className="pt-1 print:hidden">
                      <button
                        onClick={addCondition}
                        className="px-2.5 py-1 border border-dashed border-zinc-300 hover:border-zinc-400 text-zinc-500 rounded-lg text-[9px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        Add Condition Line
                      </button>
                    </div>
                  )}
                </div>

                {/* Designer Signature block (5 cols) */}
                <div className="md:col-span-5 flex flex-col items-end text-right pb-1">
                  
                  {/* Signature display */}
                  <div className="font-serif italic text-2xl text-[#e21b5a] font-black pr-4 leading-none select-none select-none tracking-wide mb-1 select-none">
                    <Editable 
                      value={invoice.signatureName} 
                      onChange={(v) => updateField("signatureName", v)} 
                      className="font-serif italic"
                    />
                  </div>
                  
                  {/* Horizontal dividing line */}
                  <div className="w-48 h-[1px] bg-zinc-300 mb-2" />
                  
                  <div className="text-[10px] font-black text-zinc-900 uppercase tracking-wider">
                    <Editable 
                      value={invoice.signatureName} 
                      onChange={(v) => updateField("signatureName", v)} 
                      uppercase 
                    />
                  </div>
                  
                  <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">
                    <Editable 
                      value={invoice.signatureRole} 
                      onChange={(v) => updateField("signatureRole", v)} 
                    />
                  </div>

                </div>

              </div>

            </div>

            {/* FIXED FOOTER WITH SEPARATORS */}
            <div className="mt-8 pt-5 border-t-2 border-[#e21b5a] print:border-t-2 select-none">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start text-[10px] text-zinc-600 font-bold leading-normal">
                
                {/* Column 1: Card Acceptance */}
                <div className="md:col-span-3 space-y-1">
                  <span className="block font-black text-[#e21b5a] text-[10px] uppercase tracking-wider leading-none">
                    We Accept
                  </span>
                  <span className="text-zinc-500 block leading-relaxed">
                    <Editable 
                      value={invoice.footerCards} 
                      onChange={(v) => updateField("footerCards", v)} 
                    />
                  </span>
                </div>

                {/* Column 2: Address */}
                <div className="md:col-span-3 flex gap-2.5 items-start">
                  <MapPin className="w-4 h-4 text-[#e21b5a] mt-0.5 shrink-0" />
                  <div className="space-y-0.5 w-full text-zinc-500">
                    <Editable 
                      value={invoice.footerAddress} 
                      onChange={(v) => updateField("footerAddress", v)} 
                      type="textarea"
                    />
                  </div>
                </div>

                {/* Column 3: Contact Phones */}
                <div className="md:col-span-3 flex gap-2.5 items-start">
                  <Phone className="w-4 h-4 text-[#e21b5a] mt-0.5 shrink-0" />
                  <div className="space-y-0.5 w-full text-zinc-500">
                    <Editable 
                      value={invoice.footerPhones} 
                      onChange={(v) => updateField("footerPhones", v)} 
                      type="textarea"
                    />
                  </div>
                </div>

                {/* Column 4: Emails / Web */}
                <div className="md:col-span-3 flex gap-2.5 items-start">
                  <Mail className="w-4 h-4 text-[#e21b5a] mt-0.5 shrink-0" />
                  <div className="space-y-0.5 w-full text-zinc-500">
                    <Editable 
                      value={invoice.footerEmails} 
                      onChange={(v) => updateField("footerEmails", v)} 
                      type="textarea"
                    />
                  </div>
                </div>

              </div>
            </div>

          </div>
          </ExportContext.Provider>

        </div>

      </div>

      {/* Embedded print formatting style tag */}
      <style>{`
        /* Override Tailwind v4 oklch/oklab colors with safe RGB/Hex colors for html2canvas parsing */
        #printable-invoice, #printable-invoice * {
          color-scheme: light !important;
        }
        #printable-invoice .text-zinc-400 { color: #a1a1aa !important; }
        #printable-invoice .text-zinc-500 { color: #71717a !important; }
        #printable-invoice .text-zinc-600 { color: #52525b !important; }
        #printable-invoice .text-zinc-700 { color: #3f3f46 !important; }
        #printable-invoice .text-zinc-800 { color: #27272a !important; }
        #printable-invoice .text-zinc-900 { color: #18181b !important; }
        #printable-invoice .text-zinc-950 { color: #09090b !important; }
        
        #printable-invoice .border-zinc-200 { border-color: #e4e4e7 !important; }
        #printable-invoice .border-zinc-300 { border-color: #d4d4d8 !important; }
        #printable-invoice .border-zinc-200\/80 { border-color: rgba(228, 228, 231, 0.8) !important; }
        #printable-invoice .border-zinc-200\/60 { border-color: rgba(228, 228, 231, 0.6) !important; }
        #printable-invoice .bg-zinc-300 { background-color: #d4d4d8 !important; }
        #printable-invoice .bg-emerald-600 { background-color: #059669 !important; }

        @media print {
          /* Force page margins */
          @page {
            size: A4 portrait;
            margin: 0 !important;
          }

          body {
            background-color: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Hide UI headers, tools, sidebars */
          header, aside, button, .print-hidden {
            display: none !important;
          }

          /* Match container dimensions for pixel-perfect standard A4 layout */
          #printable-invoice {
            width: 100% !important;
            max-width: 100% !important;
            height: 100% !important;
            min-height: 100vh !important;
            border: none !important;
            box-shadow: none !important;
            padding: 40px !important;
            margin: 0 !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            background-color: white !important;
          }

          /* High exact color details */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
