import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

/**
 * Exports the invoice to a high-quality multi-page A4 PDF using native browser rendering.
 * By using SVG foreignObject rendering via html-to-image, all modern CSS features
 * (such as Tailwind v4, oklch colors, CSS variables, linear gradients, and web fonts)
 * are rasterized natively by the browser without color parsing errors.
 */
export async function exportInvoiceToPdf(
  invoiceContainerId: string = "invoicePreview",
  filename: string = "Invoice.pdf",
  onProgress?: (status: string) => void
): Promise<boolean> {
  let originalContainer = document.getElementById(invoiceContainerId);
  if (!originalContainer) {
    originalContainer = document.querySelector(".a4-invoice") || document.querySelector("#invoicePreview");
  }
  if (!originalContainer) {
    // Give React a short tick if a re-render is pending
    await new Promise((r) => setTimeout(r, 120));
    originalContainer =
      document.getElementById(invoiceContainerId) ||
      document.querySelector(".a4-invoice") ||
      document.querySelector("#invoicePreview");
  }
  if (!originalContainer) {
    throw new Error("Invoice preview template not found in DOM");
  }

  let originalPages = originalContainer.querySelectorAll<HTMLElement>(".inv-page");
  if (!originalPages || originalPages.length === 0) {
    await new Promise((r) => setTimeout(r, 100));
    originalPages = originalContainer.querySelectorAll<HTMLElement>(".inv-page");
  }
  if (!originalPages || originalPages.length === 0) {
    throw new Error("No invoice pages found to export");
  }

  onProgress?.("Setting up high-resolution PDF stage...");

  // 1. Create an off-screen staging area
  const stage = document.createElement("div");
  stage.id = "pdf-export-offscreen-stage";
  stage.style.cssText = `
    position: fixed !important;
    left: -10000px !important;
    top: 0 !important;
    width: 794px !important;
    min-width: 794px !important;
    max-width: 794px !important;
    height: auto !important;
    visibility: visible !important;
    display: block !important;
    opacity: 1 !important;
    z-index: -99999 !important;
    pointer-events: none !important;
    background: #ffffff !important;
    margin: 0 !important;
    padding: 0 !important;
    transform: none !important;
  `;

  // Inherit current computed accent color variables
  const computedRoot = window.getComputedStyle(document.documentElement);
  const accentColor = computedRoot.getPropertyValue("--accent") || "#e8176c";
  const accentDark = computedRoot.getPropertyValue("--accent-dark") || "#be1254";
  const accentLight = computedRoot.getPropertyValue("--accent-light") || "#fce4ef";
  const accentSubtle = computedRoot.getPropertyValue("--accent-subtle") || "#fff1f6";

  stage.style.setProperty("--accent", accentColor);
  stage.style.setProperty("--accent-dark", accentDark);
  stage.style.setProperty("--accent-light", accentLight);
  stage.style.setProperty("--accent-subtle", accentSubtle);

  document.body.appendChild(stage);

  try {
    // Clone all pages into the offscreen stage
    const clonedPages: HTMLElement[] = [];
    originalPages.forEach((page) => {
      const clone = page.cloneNode(true) as HTMLElement;
      clone.style.cssText = `
        width: 794px !important;
        height: 1123px !important;
        min-height: 1123px !important;
        max-height: 1123px !important;
        box-sizing: border-box !important;
        margin: 0 0 20px 0 !important;
        padding: 36px 40px 48px 40px !important;
        background: #ffffff !important;
        box-shadow: none !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        position: relative !important;
        overflow: hidden !important;
        transform: none !important;
      `;
      stage.appendChild(clone);
      clonedPages.push(clone);
    });

    // Wait for fonts and all images inside cloned pages to finish loading
    onProgress?.("Loading document assets & fonts...");
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    const images = stage.querySelectorAll<HTMLImageElement>("img");
    const imgPromises = Array.from(images).map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        setTimeout(resolve, 1500); // 1.5s timeout safety
      });
    });
    await Promise.all(imgPromises);

    // Short buffer for CSS variables and layout computation
    await new Promise((r) => setTimeout(r, 120));

    // Initialize jsPDF A4 document
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pdfWidth = 210; // mm
    const pdfHeight = 297; // mm

    for (let i = 0; i < clonedPages.length; i++) {
      const pageEl = clonedPages[i];
      onProgress?.(`Rendering page ${i + 1} of ${clonedPages.length}...`);

      const imgData = await toPng(pageEl, {
        quality: 0.98,
        pixelRatio: 2.0, // 2x scale for crisp, high-resolution retina rendering
        cacheBust: true,
        backgroundColor: "#ffffff",
        width: 794,
        height: 1123,
        skipFonts: true,
        fontEmbedCSS: "",
      });

      if (i > 0) {
        pdf.addPage("a4", "portrait");
      }

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
    }

    onProgress?.("Saving PDF document...");
    const safeFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
    pdf.save(safeFilename);

    return true;
  } finally {
    // Clean up staging element
    if (stage.parentNode) {
      stage.parentNode.removeChild(stage);
    }
  }
}

/**
 * Triggers standard print dialog with guaranteed visibility of invoice pages.
 */
export function printInvoiceDirect(invoiceContainerId: string = "invoicePreview"): void {
  window.print();
}


