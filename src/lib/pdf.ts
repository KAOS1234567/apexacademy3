"use client";

import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

export async function exportElementAsPDF(elementId: string, filename: string) {
  const el = document.getElementById(elementId);
  if (!el) { alert("لا يوجد محتوى للتصدير"); return; }

  // نحفظ الأنماط الأصلية
  const originalStyles = {
    background: el.style.background,
    color: el.style.color,
  };

  // نستنسخ العنصر
  const clone = el.cloneNode(true) as HTMLElement;
  clone.id = "pdf-clone-temp";
  clone.style.position = "fixed";
  clone.style.left = "-9999px";
  clone.style.top = "0";
  clone.style.width = "800px";
  clone.style.background = "#ffffff";
  clone.style.color = "#1a1a1a";
  clone.style.padding = "20px";
  document.body.appendChild(clone);

  // استبدل ألوان Tailwind داخل clone
  const allNodes = clone.querySelectorAll("*");
  allNodes.forEach((node) => {
    const n = node as HTMLElement;
    n.style.color = n.style.color || "#1a1a1a";
    n.style.background = n.style.background || "transparent";
  });
  clone.querySelectorAll("[class*='bg-card'], [class*='bg-background']").forEach((n) => {
    (n as HTMLElement).style.background = "#ffffff";
    (n as HTMLElement).style.border = "1px solid #e5e5e5";
  });
  clone.querySelectorAll("[class*='text-muted-foreground']").forEach((n) => {
    (n as HTMLElement).style.color = "#6b7280";
  });
  clone.querySelectorAll("[class*='text-accent']").forEach((n) => {
    (n as HTMLElement).style.color = "#2563eb";
  });
  clone.querySelectorAll("[class*='text-primary']").forEach((n) => {
    (n as HTMLElement).style.color = "#1d4ed8";
  });
  clone.querySelectorAll("[class*='bg-primary']").forEach((n) => {
    (n as HTMLElement).style.background = "#dbeafe";
  });

  const canvas = await html2canvas(clone, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
  });

  document.body.removeChild(clone);

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  const imgW = pageW - 20;
  const imgH = (canvas.height * imgW) / canvas.width;

  let heightLeft = imgH;
  let position = 10;

  pdf.addImage(imgData, "PNG", 10, position, imgW, imgH);
  heightLeft -= pageH - 20;

  while (heightLeft > 0) {
    position = heightLeft - imgH + 10;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 10, position, imgW, imgH);
    heightLeft -= pageH - 20;
  }

  pdf.save(filename);
}
