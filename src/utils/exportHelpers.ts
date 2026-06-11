import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Transaction } from '../types';

const formatRupiahRaw = (val: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(val);
};

/**
 * Priority #10: EXCEL REPORT EXPORTER (XLSX)
 */
export function exportTransactionsToExcel(transactions: Transaction[]) {
  const data = transactions.map((t, idx) => ({
    'No': idx + 1,
    'Tanggal': t.date,
    'Keterangan / Keperluan': t.description,
    'Kategori': t.category,
    'Sumber Dompet / Kas': t.accountId || 'Kas Utama',
    'Pos Saku Alokasi': t.bucketId || 'Tanpa Alokasi / Saku Bebas',
    'Tipe': t.type === 'income' ? 'Pemasukan (+)' : 'Pengeluaran (-)',
    'Nominal (IDR)': t.amount
  }));

  // Create workspace worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Keuangan');

  // Adjust column widths automatically
  const max_cols = [
    { wch: 5 },  // No
    { wch: 12 }, // Tanggal
    { wch: 35 }, // Keterangan
    { wch: 15 }, // Kategori
    { wch: 20 }, // Sumber Dompet
    { wch: 25 }, // Saku Alokasi
    { wch: 15 }, // Tipe
    { wch: 15 }  // Nominal
  ];
  worksheet['!cols'] = max_cols;

  // Save the excel sheet pack
  const today = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `Laporan_Keuangan_Keluarga_${today}.xlsx`);
}

/**
 * Priority #10: PDF REPORT EXPORTER (jsPDF)
 */
export function exportTransactionsToPDF(transactions: Transaction[], balanceSpecs: {
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Draw modern decorative accent headbar
  doc.setFillColor(79, 70, 229); // indigo-600
  doc.rect(0, 0, pageWidth, 6, 'F');

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text('LAPORAN KEUANGAN BULANAN', 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  const buildTime = new Date().toLocaleString('id-ID');
  doc.text(`Dicetak pada: ${buildTime} WIB | Keuangan Bersama Keluarga`, 14, 23);

  // Set up brief metrics table card
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(14, 28, pageWidth - 28, 20, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500
  
  doc.text('TOTAL PEMASUKAN', 18, 34);
  doc.text('TOTAL PENGELUARAN', (pageWidth / 3) + 10, 34);
  doc.text('MUTASI SALDO BERSIH', (pageWidth * 2 / 3) + 2, 34);

  doc.setFontSize(13);
  doc.setTextColor(16, 185, 129); // emerald-500
  doc.text(formatRupiahRaw(balanceSpecs.totalIncome), 18, 42);

  doc.setTextColor(239, 68, 68); // rose-500
  doc.text(formatRupiahRaw(balanceSpecs.totalExpense), (pageWidth / 3) + 10, 42);

  doc.setTextColor(79, 70, 229); // indigo-600
  doc.text(formatRupiahRaw(balanceSpecs.netSavings), (pageWidth * 2 / 3) + 2, 42);

  // Table header rows
  const headers = [['No', 'Tanggal', 'Keterangan', 'Kategori', 'Dompet', 'Alokasi Saku', 'Tipe', 'Nominal']];
  const tableData = transactions.map((t, index) => [
    index + 1,
    t.date,
    t.description,
    t.category,
    t.accountId === 'acc-bca' ? 'BCA' : t.accountId === 'acc-cash' ? 'Cash' : t.accountId,
    t.bucketId ? t.bucketId.replace('b-', '') : 'Bebas',
    t.type === 'income' ? 'Masuk' : 'Keluar',
    formatRupiahRaw(t.amount)
  ]);

  // Render Table with custom styling
  (doc as any).autoTable({
    startY: 54,
    head: headers,
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [79, 70, 229], // Indigo Primary
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85]
    },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 18 },
      2: { cellWidth: 45 },
      3: { cellWidth: 20 },
      4: { cellWidth: 15 },
      5: { cellWidth: 25 },
      6: { cellWidth: 15 },
      7: { cellWidth: 32 }
    },
    margin: { left: 14, right: 14 }
  });

  doc.save('Laporan_Keuangan_Keluarga.pdf');
}
