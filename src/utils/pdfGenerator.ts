import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';

export interface PDFExportOptions {
  filename: string;
  onProgress?: (progress: number) => void;
  orientation?: 'portrait' | 'landscape';
  marginMm?: number;
}

export async function exportElementToPDF(
  elementId: string,
  filename: string,
  onProgress?: (progress: number) => void
): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element #${elementId} not found`);
    return false;
  }

  try {
    if (onProgress) onProgress(10);

    // Create an off-screen, high-fidelity printable clone container
    // This ensures that regardless of user's active Dark/Light mode or viewport width,
    // the resulting PDF is ALWAYS an ultra-sharp, professional, official white-paper document (300 DPI+).
    const cloneWrapper = document.createElement('div');
    cloneWrapper.setAttribute('id', 'pdf-render-sandbox');
    cloneWrapper.style.position = 'fixed';
    cloneWrapper.style.left = '-9999px';
    cloneWrapper.style.top = '0';
    cloneWrapper.style.width = '900px'; // Fixed optimal A4 desktop render width
    cloneWrapper.style.zIndex = '-9999';
    cloneWrapper.style.backgroundColor = '#ffffff';
    cloneWrapper.style.color = '#0f172a';
    cloneWrapper.style.overflow = 'visible';

    // Deep clone the source element
    const clonedElement = element.cloneNode(true) as HTMLElement;
    clonedElement.style.width = '100%';
    clonedElement.style.maxWidth = '900px';
    clonedElement.style.margin = '0';
    clonedElement.style.boxShadow = 'none';
    clonedElement.style.borderRadius = '0px';
    clonedElement.style.border = 'none';
    clonedElement.style.backgroundColor = '#ffffff';
    clonedElement.style.color = '#0f172a';
    clonedElement.style.fontFamily = "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

    // Strip dark-mode class overrides from cloned subtree to guarantee crisp white-paper rendering
    const removeDarkClasses = (el: HTMLElement) => {
      el.classList.remove('dark');
      // If element has dark bg or dark border classes, clean them
      const classNames = Array.from(el.classList);
      classNames.forEach((cls) => {
        if (cls.startsWith('dark:')) {
          el.classList.remove(cls);
        }
      });

      // Ensure explicit high-contrast inline overrides for key sections if needed
      if (el.tagName === 'TABLE' || el.tagName === 'DIV' || el.tagName === 'SECTION') {
        const bg = window.getComputedStyle(el).backgroundColor;
        if (bg.includes('rgb(24, 24, 27)') || bg.includes('rgb(9, 9, 11)') || bg.includes('rgb(39, 39, 42)')) {
          el.style.backgroundColor = '#ffffff';
          el.style.color = '#0f172a';
        }
      }

      Array.from(el.children).forEach((child) => {
        if (child instanceof HTMLElement) removeDarkClasses(child);
      });
    };

    removeDarkClasses(clonedElement);
    cloneWrapper.appendChild(clonedElement);
    document.body.appendChild(cloneWrapper);

    if (onProgress) onProgress(30);

    // Wait for all web fonts and document layout to settle
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    await new Promise((r) => setTimeout(r, 150));

    if (onProgress) onProgress(50);

    // Render DOM directly to PNG at ultra-high resolution (3x scale for crystal clear 300DPI print quality)
    const imgData = await toPng(clonedElement, {
      quality: 1,
      pixelRatio: 3,
      backgroundColor: '#ffffff',
      cacheBust: true,
      style: {
        borderRadius: '0px',
        boxShadow: 'none',
        border: 'none',
        transform: 'none',
        backgroundColor: '#ffffff',
        color: '#0f172a',
      },
    });

    // Cleanup sandbox clone immediately
    document.body.removeChild(cloneWrapper);

    if (onProgress) onProgress(75);

    // Load image to determine exact dimensions
    const img = new Image();
    img.src = imgData;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfPageWidth = 210; // A4 standard width in mm
    const pdfPageHeight = 297; // A4 standard height in mm
    const imgWidth = img.width;
    const imgHeight = img.height;

    // Standard 8mm margin for clean printable document bounds
    const margin = 8;
    const contentWidth = pdfPageWidth - margin * 2;
    const contentHeight = (imgHeight * contentWidth) / imgWidth;

    if (contentHeight <= pdfPageHeight - margin * 2) {
      // Single page document: fit cleanly with even top margin
      const yOffset = margin;
      pdf.addImage(imgData, 'PNG', margin, yOffset, contentWidth, contentHeight, undefined, 'SLOW');
    } else {
      // Multi-page document handling
      let heightLeft = contentHeight;
      let position = margin;

      pdf.addImage(imgData, 'PNG', margin, position, contentWidth, contentHeight, undefined, 'SLOW');
      heightLeft -= (pdfPageHeight - margin * 2);

      while (heightLeft > 0) {
        pdf.addPage();
        position = margin - (contentHeight - heightLeft);
        pdf.addImage(imgData, 'PNG', margin, position, contentWidth, contentHeight, undefined, 'SLOW');
        heightLeft -= (pdfPageHeight - margin * 2);
      }
    }

    if (onProgress) onProgress(90);

    const finalFilename = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(finalFilename);

    if (onProgress) onProgress(100);
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    // Cleanup in case of error
    const sandbox = document.getElementById('pdf-render-sandbox');
    if (sandbox) document.body.removeChild(sandbox);
    window.print();
    return false;
  }
}

export function triggerPrint() {
  window.print();
}

export function formatCurrency(amount: number, symbol = '৳'): string {
  return `${symbol} ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function numberToWords(amount: number): string {
  const num = Math.floor(amount);
  if (num === 0) return 'Zero Taka Only';

  const single = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertHundreds(n: number): string {
    let str = '';
    if (n >= 100) {
      str += single[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += single[n] + ' ';
    }
    return str.trim();
  }

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remaining = num % 1000;

  let result = '';
  if (crore > 0) result += convertHundreds(crore) + ' Crore ';
  if (lakh > 0) result += convertHundreds(lakh) + ' Lakh ';
  if (thousand > 0) result += convertHundreds(thousand) + ' Thousand ';
  if (remaining > 0) result += convertHundreds(remaining) + ' ';

  return result.trim() + ' Taka Only';
}
