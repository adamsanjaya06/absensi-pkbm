import * as XLSX from 'xlsx';
import { AttendanceRecord } from '../types';

/**
 * Export attendance records to Excel (.xlsx) file
 */
export function exportAttendanceToExcel(records: AttendanceRecord[], filename: string = 'Rekap_Absensi_Karyawan') {
  const formattedData = records.map((rec, idx) => ({
    'No': idx + 1,
    'Tanggal': rec.date,
    'Waktu Server': rec.serverTime,
    'Nama Karyawan': rec.employeeName,
    'NIK': rec.nik,
    'Divisi': rec.divisionName,
    'Jabatan': rec.positionName,
    'Jenis Absen': rec.type === 'masuk' ? 'Absen Masuk' : 'Absen Pulang',
    'Status': rec.status.toUpperCase(),
    'Keterangan': rec.keterangan,
    'Jarak dari Kantor (m)': rec.distanceFromOfficeMeters,
    'Kecocokan Wajah (%)': `${rec.faceMatchScore}%`,
    'Alamat Lokasi': rec.address,
    'Latitude': rec.latitude,
    'Longitude': rec.longitude,
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Absensi');

  // Auto-fit column widths
  const max_cols = Object.keys(formattedData[0] || {}).length;
  const colWidths = Array(max_cols).fill({ wch: 18 });
  colWidths[12] = { wch: 40 }; // Alamat
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * Print / Export attendance records to cleanly formatted PDF printable view
 */
export function printAttendancePdfReport(
  records: AttendanceRecord[],
  title: string = 'Laporan Absensi Guru PKBM ASHAB',
  subtitle: string = 'Periode: ' + new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Harap izinkan popup browser untuk mengunduh/mencetak PDF.');
    return;
  }

  const tableRows = records
    .map(
      (rec, i) => `
      <tr>
        <td style="text-align: center; padding: 8px; border-bottom: 1px solid #e2e8f0;">${i + 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${rec.date} <br/><small style="color: #64748b;">${rec.serverTime}</small></td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">
          <strong>${rec.employeeName}</strong><br/>
          <small style="color: #64748b;">NIK: ${rec.nik}</small>
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${rec.divisionName} <br/><small style="color: #64748b;">${rec.positionName}</small></td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; background-color: ${
            rec.type === 'masuk' ? '#e0f2fe' : '#fef3c7'
          }; color: ${rec.type === 'masuk' ? '#0369a1' : '#b45309'};">
            ${rec.type === 'masuk' ? 'MASUK' : 'PULANG'}
          </span>
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; background-color: ${
            rec.status === 'berhasil' ? '#dcfce7' : '#fee2e2'
          }; color: ${rec.status === 'berhasil' ? '#15803d' : '#b91c1c'};">
            ${rec.status.toUpperCase()}
          </span>
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px;">${rec.keterangan}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; max-width: 200px; word-break: break-word;">${rec.address}</td>
      </tr>
    `
    )
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; padding: 24px; margin: 0; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px; }
        .brand { font-size: 20px; font-weight: 800; color: #2563eb; }
        .subbrand { font-size: 12px; color: #64748b; }
        .title { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
        .subtitle { font-size: 13px; color: #475569; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 12px; }
        th { background-color: #f8fafc; color: #334155; text-align: left; padding: 10px 8px; border-bottom: 2px solid #cbd5e1; font-weight: 600; }
        .footer { margin-top: 32px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 12px; }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 16px; text-align: right;">
        <button onclick="window.print()" style="background-color: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">Cetak / Simpan PDF</button>
      </div>

      <div class="header">
        <div>
          <div class="brand">PKBM ASHAB</div>
          <div class="subbrand">Laporan Absensi Guru & Tenaga Pendidik (AI Face Recognition & Geofencing)</div>
        </div>
        <div style="text-align: right; font-size: 12px; color: #64748b;">
          Dicetak pada: ${new Date().toLocaleString('id-ID')}
        </div>
      </div>

      <div class="title">${title}</div>
      <div class="subtitle">${subtitle} | Total Data: ${records.length} Absensi</div>

      <table>
        <thead>
          <tr>
            <th style="width: 30px; text-align: center;">No</th>
            <th>Tanggal / Jam</th>
            <th>Karyawan</th>
            <th>Divisi / Jabatan</th>
            <th style="text-align: center;">Jenis</th>
            <th style="text-align: center;">Status</th>
            <th>Keterangan</th>
            <th>Lokasi Alamat</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>

      <div class="footer">
        <div>Mengetahui, HRD & Management</div>
        <div>Dokumen Absensi Sah Diketahui Oleh Sistem Server</div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() { window.print(); }, 500);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
