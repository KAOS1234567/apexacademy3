"use client";

import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

export async function exportElementAsPDF(elementId: string, filename: string) {
  const el = document.getElementById(elementId);
  if (!el) { alert("لا يوجد محتوى للتصدير"); return; }

  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: "#0a0a14",
    useCORS: true,
    logging: false,
  });

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
