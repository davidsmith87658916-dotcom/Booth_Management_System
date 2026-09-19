// ==========================================================================
// EXPOHUB LUXURY EXECUTIVE SPREADSHEET & DATA EXPORT ENGINE
// រចនាឡើងដើម្បី Export ទិន្នន័យជា Executive Excel (.xls) & CSV ដ៏ប្រណីត
// បំពាក់ពុម្ពអក្សរ Khmer OS Battambang, Leelawadee UI, Colgroup Widths, 2-Row KPI Cards
// ==========================================================================

const KHMER_FONT_STACK = "'Khmer OS Battambang', 'Leelawadee UI', 'Khmer OS Siemreap', 'Khmer OS', 'Segoe UI', Arial, sans-serif";

/**
 * Trigger download of styled Excel HTML/XML Spreadsheet (.xls)
 * Compatible with Microsoft Excel, Google Sheets, LibreOffice, and Apple Numbers
 */
function downloadExcel(htmlContent, filename) {
  const fullDocument = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>ExpoHub</x:Name>
          <x:WorksheetOptions>
            <x:DisplayGridlines/>
            <x:DefaultRowHeight>520</x:DefaultRowHeight>
            <x:Print>
              <x:ValidPrinterInfo/>
              <x:HorizontalResolution>600</x:HorizontalResolution>
              <x:VerticalResolution>600</x:VerticalResolution>
            </x:Print>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    body, table, td, th {
      font-family: ${KHMER_FONT_STACK};
      font-size: 11pt;
      color: #1e293b;
      mso-font-charset: 0;
    }
    table {
      border-collapse: collapse;
      table-layout: fixed;
    }
    th {
      vertical-align: middle;
      text-align: center;
      font-family: ${KHMER_FONT_STACK};
    }
    td {
      vertical-align: middle;
      font-family: ${KHMER_FONT_STACK};
    }
    .num {
      mso-number-format: "\\$\\#,\\#\\#0\\.00";
      text-align: right;
      font-family: 'Segoe UI', 'Khmer OS Battambang', Arial, sans-serif;
    }
    .num-plain {
      mso-number-format: "\\#,\\#\\#0";
      text-align: right;
      font-family: 'Segoe UI', 'Khmer OS Battambang', Arial, sans-serif;
    }
    .text {
      mso-number-format: "\\@";
    }
    .date {
      mso-number-format: "yyyy\\-mm\\-dd";
      text-align: center;
      font-family: 'Segoe UI', 'Khmer OS Battambang', Arial, sans-serif;
    }
  </style>
</head>
<body style="padding: 12px; background-color: #ffffff; font-family: ${KHMER_FONT_STACK};">
  ${htmlContent}
</body>
</html>`;

  const blob = new Blob(["\uFEFF" + fullDocument], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.xls') ? filename : `${filename}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format currency number to standard string
 */
function fmtUSD(val) {
  const n = Number(val) || 0;
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeXML(val) {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ==========================================================================
// 1. EXHIBITORS & BOOKINGS MASTER LEDGER EXPORT
// ==========================================================================
export function exportExhibitorsToExcel(booths = [], eventName = 'Event') {
  const booked = booths.filter(b => b.active_booking);
  const dateStr = new Date().toISOString().slice(0, 10);
  const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  // Calculate High-level Financial & Operational KPIs
  const totalBooked = booked.length;
  const totalContractValue = booked.reduce((s, b) => s + (Number(b.active_booking?.total_agreed_price) || 0), 0);
  const totalPaid = booked.reduce((s, b) => s + (Number(b.active_booking?.total_paid) || 0), 0);
  const totalRemaining = booked.reduce((s, b) => s + (Number(b.active_booking?.remaining_due) || 0), 0);
  const collectionRate = totalContractValue > 0 ? ((totalPaid / totalContractValue) * 100).toFixed(1) : '0.0';

  const fullyPaidCount = booked.filter(b => b.active_booking?.booking_status === 'fully_paid').length;
  const depositPaidCount = booked.filter(b => b.active_booking?.booking_status === 'deposit_paid').length;
  const confirmedCount = booked.filter(b => b.active_booking?.booking_status === 'confirmed').length;
  const holdCount = booked.filter(b => b.active_booking?.booking_status === 'hold').length;

  const html = `
  <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; font-family: ${KHMER_FONT_STACK};">
    <!-- Colgroup Column Widths Specification for Microsoft Excel -->
    <colgroup>
      <col width="50" style="width: 50pt;">    <!-- 1: No -->
      <col width="110" style="width: 110pt;">  <!-- 2: Booth Code -->
      <col width="260" style="width: 260pt;">  <!-- 3: Exhibitor Name -->
      <col width="200" style="width: 200pt;">  <!-- 4: Fascia Name -->
      <col width="160" style="width: 160pt;">  <!-- 5: Contact Person -->
      <col width="140" style="width: 140pt;">  <!-- 6: Phone -->
      <col width="130" style="width: 130pt;">  <!-- 7: Telegram -->
      <col width="220" style="width: 220pt;">  <!-- 8: Email -->
      <col width="180" style="width: 180pt;">  <!-- 9: Business Type -->
      <col width="110" style="width: 110pt;">  <!-- 10: Zone -->
      <col width="120" style="width: 120pt;">  <!-- 11: Dimensions -->
      <col width="130" style="width: 130pt;">  <!-- 12: Agreed Price -->
      <col width="130" style="width: 130pt;">  <!-- 13: Paid -->
      <col width="130" style="width: 130pt;">  <!-- 14: Remaining -->
      <col width="160" style="width: 160pt;">  <!-- 15: Status -->
      <col width="150" style="width: 150pt;">  <!-- 16: Sales Staff -->
      <col width="120" style="width: 120pt;">  <!-- 17: Date -->
    </colgroup>

    <!-- Top System Branding Bar -->
    <tr height="28" style="height: 28pt;">
      <td colspan="17" style="background-color: #0F172A; color: #94A3B8; font-size: 9.5pt; font-weight: bold; padding: 6px 14px; letter-spacing: 1px; vertical-align: middle; font-family: ${KHMER_FONT_STACK};">
        EXPOHUB MANAGEMENT SYSTEM &middot; ប្រព័ន្ធគ្រប់គ្រងការលក់ស្តង់ពិព័រណ៍
      </td>
    </tr>

    <!-- Master Report Title Banner -->
    <tr height="44" style="height: 44pt;">
      <td colspan="17" style="background-color: #1E1B4B; color: #FCD34D; font-size: 16pt; font-weight: bold; padding: 10px 14px; border-bottom: 3px solid #818CF8; vertical-align: middle; font-family: ${KHMER_FONT_STACK};">
        របាយការណ៍បញ្ជីកក់ស្តង់ និងក្រុមហ៊ុនតាំងពិព័រណ៍ (EXHIBITORS &amp; BOOKINGS MASTER LEDGER)
      </td>
    </tr>

    <!-- Event & Metadata Ribbon -->
    <tr height="28" style="height: 28pt;">
      <td colspan="17" style="background-color: #F8FAFC; color: #334155; font-size: 10.5pt; padding: 6px 14px; border-bottom: 1px solid #CBD5E1; vertical-align: middle; font-family: ${KHMER_FONT_STACK};">
        <strong>ព្រឹត្តិការណ៍ (Event):</strong> ${escapeXML(eventName)} &nbsp;&nbsp;|&nbsp;&nbsp;
        <strong>កាលបរិច្ឆេទនាំចេញ:</strong> ${dateStr} ${timeStr} &nbsp;&nbsp;|&nbsp;&nbsp;
        <strong>ទិន្នន័យសរុប:</strong> ${totalBooked} ស្តង់ &nbsp;&nbsp;|&nbsp;&nbsp;
        <strong>ស្ថានភាពបង់ដាច់:</strong> ${fullyPaidCount} &middot; <strong>បង់កក់:</strong> ${depositPaidCount} &middot; <strong>បញ្ជាក់:</strong> ${confirmedCount} &middot; <strong>Hold:</strong> ${holdCount}
      </td>
    </tr>

    <!-- Spacer -->
    <tr height="10" style="height: 10pt;"><td colspan="17" style="background-color: #FFFFFF;"></td></tr>

    <!-- KPI Cards - Row 1: Header / Label -->
    <tr height="24" style="height: 24pt;">
      <!-- Card 1 -->
      <td colspan="3" style="background-color: #EFF6FF; border-top: 2px solid #3B82F6; border-left: 2px solid #3B82F6; border-right: 2px solid #3B82F6; text-align: center; vertical-align: middle; font-size: 9pt; font-weight: bold; color: #1E40AF; font-family: ${KHMER_FONT_STACK};">
        ស្តង់បានកក់សរុប (BOOKED BOOTHS)
      </td>
      <td style="width: 12pt; background-color: #FFFFFF;"></td>
      <!-- Card 2 -->
      <td colspan="3" style="background-color: #FAF5FF; border-top: 2px solid #8B5CF6; border-left: 2px solid #8B5CF6; border-right: 2px solid #8B5CF6; text-align: center; vertical-align: middle; font-size: 9pt; font-weight: bold; color: #6B21A8; font-family: ${KHMER_FONT_STACK};">
        តម្លៃកិច្ចសន្យាសរុប (CONTRACT VALUE)
      </td>
      <td style="width: 12pt; background-color: #FFFFFF;"></td>
      <!-- Card 3 -->
      <td colspan="3" style="background-color: #ECFDF5; border-top: 2px solid #10B981; border-left: 2px solid #10B981; border-right: 2px solid #10B981; text-align: center; vertical-align: middle; font-size: 9pt; font-weight: bold; color: #065F46; font-family: ${KHMER_FONT_STACK};">
        ប្រាក់ទទួលបានជាក់ស្តែង (COLLECTED)
      </td>
      <td style="width: 12pt; background-color: #FFFFFF;"></td>
      <!-- Card 4 -->
      <td colspan="2" style="background-color: #FFF1F2; border-top: 2px solid #F43F5E; border-left: 2px solid #F43F5E; border-right: 2px solid #F43F5E; text-align: center; vertical-align: middle; font-size: 9pt; font-weight: bold; color: #9F1239; font-family: ${KHMER_FONT_STACK};">
        ប្រាក់នៅជំពាក់សរុប (REMAINING)
      </td>
      <td style="width: 12pt; background-color: #FFFFFF;"></td>
      <!-- Card 5 -->
      <td colspan="2" style="background-color: #FEFCE8; border-top: 2px solid #EAB308; border-left: 2px solid #EAB308; border-right: 2px solid #EAB308; text-align: center; vertical-align: middle; font-size: 9pt; font-weight: bold; color: #854D0E; font-family: ${KHMER_FONT_STACK};">
        អត្រាប្រមូលប្រាក់ (RATE)
      </td>
    </tr>

    <!-- KPI Cards - Row 2: Metric Value (Clean & Big) -->
    <tr height="36" style="height: 36pt;">
      <!-- Card 1 Value -->
      <td colspan="3" style="background-color: #EFF6FF; border-bottom: 2px solid #3B82F6; border-left: 2px solid #3B82F6; border-right: 2px solid #3B82F6; text-align: center; vertical-align: middle; font-size: 16pt; font-weight: bold; color: #1E3A8A; font-family: ${KHMER_FONT_STACK};">
        ${totalBooked} ស្តង់
      </td>
      <td style="width: 12pt; background-color: #FFFFFF;"></td>
      <!-- Card 2 Value -->
      <td colspan="3" style="background-color: #FAF5FF; border-bottom: 2px solid #8B5CF6; border-left: 2px solid #8B5CF6; border-right: 2px solid #8B5CF6; text-align: center; vertical-align: middle; font-size: 16pt; font-weight: bold; color: #581C87; font-family: 'Segoe UI', 'Khmer OS Battambang', sans-serif;">
        ${fmtUSD(totalContractValue)}
      </td>
      <td style="width: 12pt; background-color: #FFFFFF;"></td>
      <!-- Card 3 Value -->
      <td colspan="3" style="background-color: #ECFDF5; border-bottom: 2px solid #10B981; border-left: 2px solid #10B981; border-right: 2px solid #10B981; text-align: center; vertical-align: middle; font-size: 16pt; font-weight: bold; color: #064E3B; font-family: 'Segoe UI', 'Khmer OS Battambang', sans-serif;">
        ${fmtUSD(totalPaid)}
      </td>
      <td style="width: 12pt; background-color: #FFFFFF;"></td>
      <!-- Card 4 Value -->
      <td colspan="2" style="background-color: #FFF1F2; border-bottom: 2px solid #F43F5E; border-left: 2px solid #F43F5E; border-right: 2px solid #F43F5E; text-align: center; vertical-align: middle; font-size: 16pt; font-weight: bold; color: #881337; font-family: 'Segoe UI', 'Khmer OS Battambang', sans-serif;">
        ${fmtUSD(totalRemaining)}
      </td>
      <td style="width: 12pt; background-color: #FFFFFF;"></td>
      <!-- Card 5 Value -->
      <td colspan="2" style="background-color: #FEFCE8; border-bottom: 2px solid #EAB308; border-left: 2px solid #EAB308; border-right: 2px solid #EAB308; text-align: center; vertical-align: middle; font-size: 16pt; font-weight: bold; color: #713F12; font-family: 'Segoe UI', 'Khmer OS Battambang', sans-serif;">
        ${collectionRate}%
      </td>
    </tr>

    <!-- Spacer -->
    <tr height="12" style="height: 12pt;"><td colspan="17" style="background-color: #FFFFFF;"></td></tr>

    <!-- Main Table Column Headers -->
    <tr height="38" style="background-color: #6D28D9; color: #FFFFFF; font-weight: bold; font-size: 10.5pt; text-align: center; height: 38pt; vertical-align: middle;">
      <th style="border: 1px solid #5B21B6; padding: 8px 4px; font-family: ${KHMER_FONT_STACK};">ល.រ</th>
      <th style="border: 1px solid #5B21B6; padding: 8px; font-family: ${KHMER_FONT_STACK};">លេខកូដស្តង់</th>
      <th style="border: 1px solid #5B21B6; padding: 8px 12px; text-align: left; font-family: ${KHMER_FONT_STACK};">ក្រុមហ៊ុនតាំងពិព័រណ៍ (Exhibitor)</th>
      <th style="border: 1px solid #5B21B6; padding: 8px 12px; text-align: left; font-family: ${KHMER_FONT_STACK};">ឈ្មោះលើស្លាកស្តង់ (Fascia)</th>
      <th style="border: 1px solid #5B21B6; padding: 8px 12px; text-align: left; font-family: ${KHMER_FONT_STACK};">អ្នកតំណាង</th>
      <th style="border: 1px solid #5B21B6; padding: 8px; font-family: ${KHMER_FONT_STACK};">លេខទូរស័ព្ទ</th>
      <th style="border: 1px solid #5B21B6; padding: 8px; font-family: ${KHMER_FONT_STACK};">Telegram</th>
      <th style="border: 1px solid #5B21B6; padding: 8px 12px; text-align: left; font-family: ${KHMER_FONT_STACK};">អ៊ីមែល</th>
      <th style="border: 1px solid #5B21B6; padding: 8px 12px; text-align: left; font-family: ${KHMER_FONT_STACK};">វិស័យអាជីវកម្ម</th>
      <th style="border: 1px solid #5B21B6; padding: 8px; font-family: ${KHMER_FONT_STACK};">តំបន់ (Zone)</th>
      <th style="border: 1px solid #5B21B6; padding: 8px; font-family: ${KHMER_FONT_STACK};">ទំហំស្តង់</th>
      <th style="border: 1px solid #5B21B6; padding: 8px 10px; text-align: right; font-family: ${KHMER_FONT_STACK};">តម្លៃព្រមព្រៀង</th>
      <th style="border: 1px solid #5B21B6; padding: 8px 10px; text-align: right; font-family: ${KHMER_FONT_STACK};">បានបង់</th>
      <th style="border: 1px solid #5B21B6; padding: 8px 10px; text-align: right; font-family: ${KHMER_FONT_STACK};">នៅសល់</th>
      <th style="border: 1px solid #5B21B6; padding: 8px; font-family: ${KHMER_FONT_STACK};">ស្ថានភាព</th>
      <th style="border: 1px solid #5B21B6; padding: 8px 12px; text-align: left; font-family: ${KHMER_FONT_STACK};">បុគ្គលិកលក់</th>
      <th style="border: 1px solid #5B21B6; padding: 8px; font-family: ${KHMER_FONT_STACK};">កាលបរិច្ឆេទកក់</th>
    </tr>

    <!-- Table Data Rows -->
    ${booked.map((b, idx) => {
      const bk = b.active_booking;
      const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';

      // Status Badge Style
      let statusBg = '#F1F5F9';
      let statusColor = '#475569';
      let statusLabel = 'កក់ទុក (Hold)';

      if (bk?.booking_status === 'fully_paid') {
        statusBg = '#DCFCE7';
        statusColor = '#15803D';
        statusLabel = 'បង់ដាច់ (Paid)';
      } else if (bk?.booking_status === 'deposit_paid') {
        statusBg = '#FEF3C7';
        statusColor = '#B45309';
        statusLabel = 'បង់កក់ (Deposit)';
      } else if (bk?.booking_status === 'confirmed') {
        statusBg = '#DBEAFE';
        statusColor = '#1D4ED8';
        statusLabel = 'បញ្ជាក់ (Confirmed)';
      }

      return `
      <tr height="32" style="background-color: ${bg}; height: 32pt; vertical-align: middle;">
        <td style="border: 1px solid #E2E8F0; text-align: center; color: #64748B; font-weight: bold; font-family: ${KHMER_FONT_STACK};">${idx + 1}</td>
        <td class="text" style="border: 1px solid #E2E8F0; text-align: center; font-weight: bold; color: #2563EB; background-color: #EFF6FF; font-family: ${KHMER_FONT_STACK};">${escapeXML(b.booth_code)}</td>
        <td style="border: 1px solid #E2E8F0; font-weight: bold; color: #0F172A; padding: 6px 10px; font-family: ${KHMER_FONT_STACK};">${escapeXML(bk?.exhibitor_name || '')}</td>
        <td style="border: 1px solid #E2E8F0; color: #475569; padding: 6px 10px; font-family: ${KHMER_FONT_STACK};">${escapeXML(bk?.fascia_name || bk?.exhibitor_name || '')}</td>
        <td style="border: 1px solid #E2E8F0; color: #1E293B; padding: 6px 10px; font-family: ${KHMER_FONT_STACK};">${escapeXML(bk?.contact_person || '')}</td>
        <td class="text" style="border: 1px solid #E2E8F0; text-align: center; color: #334155; font-family: 'Segoe UI', 'Khmer OS Battambang', sans-serif;">${escapeXML(bk?.phone || '')}</td>
        <td class="text" style="border: 1px solid #E2E8F0; text-align: center; color: #334155; font-family: 'Segoe UI', 'Khmer OS Battambang', sans-serif;">${escapeXML(bk?.telegram || '-')}</td>
        <td style="border: 1px solid #E2E8F0; color: #334155; padding: 6px 10px; font-family: 'Segoe UI', 'Khmer OS Battambang', sans-serif;">${escapeXML(bk?.email || '-')}</td>
        <td style="border: 1px solid #E2E8F0; color: #475569; padding: 6px 10px; font-family: ${KHMER_FONT_STACK};">${escapeXML(bk?.business_type || '-')}</td>
        <td style="border: 1px solid #E2E8F0; text-align: center; color: #475569; font-family: ${KHMER_FONT_STACK};">${escapeXML(b.zone || '-')}</td>
        <td style="border: 1px solid #E2E8F0; text-align: center; color: #475569; font-family: ${KHMER_FONT_STACK};">${escapeXML(b.dimensions || '3m x 3m')}</td>
        <td class="num" style="border: 1px solid #E2E8F0; font-weight: bold; color: #0F172A; padding: 6px 10px;">${fmtUSD(bk?.total_agreed_price)}</td>
        <td class="num" style="border: 1px solid #E2E8F0; font-weight: bold; color: #15803D; padding: 6px 10px; background-color: #F0FDF4;">${fmtUSD(bk?.total_paid)}</td>
        <td class="num" style="border: 1px solid #E2E8F0; font-weight: bold; color: ${(bk?.remaining_due || 0) > 0 ? '#B91C1C' : '#64748B'}; padding: 6px 10px;">${fmtUSD(bk?.remaining_due)}</td>
        <td style="border: 1px solid #CBD5E1; text-align: center; padding: 4px 8px; background-color: ${statusBg}; color: ${statusColor}; font-weight: bold; font-family: ${KHMER_FONT_STACK}; font-size: 10pt; white-space: nowrap;">
          ${statusLabel}
        </td>
        <td style="border: 1px solid #E2E8F0; color: #334155; padding: 6px 10px; font-family: ${KHMER_FONT_STACK};">${escapeXML(bk?.staff_name || 'Admin')}</td>
        <td class="date" style="border: 1px solid #E2E8F0; color: #64748B;">${bk?.created_at ? bk.created_at.split('T')[0] : '-'}</td>
      </tr>`;
    }).join('')}

    <!-- Accounting Grand Totals Row -->
    <tr height="36" style="background-color: #F1F5F9; font-weight: bold; height: 36pt; border-top: 2px solid #0F172A; border-bottom: 3px double #0F172A; vertical-align: middle;">
      <td colspan="11" style="border: 1px solid #CBD5E1; text-align: right; padding: 8px 14px; font-size: 11pt; color: #0F172A; font-family: ${KHMER_FONT_STACK};">
        ផលបូកសរុបរួម (GRAND TOTAL):
      </td>
      <td class="num" style="border: 1px solid #CBD5E1; font-size: 11.5pt; color: #4338CA; padding: 8px 10px; background-color: #EEF2FF;">
        ${fmtUSD(totalContractValue)}
      </td>
      <td class="num" style="border: 1px solid #CBD5E1; font-size: 11.5pt; color: #047857; padding: 8px 10px; background-color: #ECFDF5;">
        ${fmtUSD(totalPaid)}
      </td>
      <td class="num" style="border: 1px solid #CBD5E1; font-size: 11.5pt; color: #B91C1C; padding: 8px 10px; background-color: #FEF2F2;">
        ${fmtUSD(totalRemaining)}
      </td>
      <td colspan="3" style="border: 1px solid #CBD5E1; background-color: #F8FAFC; text-align: center; font-size: 9.5pt; color: #64748B; font-family: ${KHMER_FONT_STACK};">
        ${totalBooked} កំណត់ត្រាកក់ (Booked Records)
      </td>
    </tr>

    <!-- Footer System Stamp -->
    <tr height="10" style="height: 10pt;"><td colspan="17" style="background-color: #FFFFFF;"></td></tr>
    <tr height="24" style="height: 24pt;">
      <td colspan="17" style="color: #94A3B8; font-size: 9pt; font-style: italic; text-align: right; padding: 4px 14px; font-family: ${KHMER_FONT_STACK}; vertical-align: middle;">
        របាយការណ៍នេះបង្កើតដោយប្រព័ន្ធ ExpoHub Management System &middot; កាលបរិច្ឆេទ ${dateStr} ${timeStr} &middot; រក្សាសិទ្ធិគ្រប់យ៉ាង
      </td>
    </tr>
  </table>`;

  const safeEventName = eventName.replace(/[^a-zA-Z0-9_\u1780-\u17FF]/g, '_');
  downloadExcel(html, `Exhibitors_${safeEventName}_${dateStr}.xls`);
}

// ==========================================================================
// 2. FINANCIAL PAYMENT & TRANSACTION LEDGER EXPORT
// ==========================================================================
export function exportPaymentsToExcel(booths = [], eventName = 'Event') {
  const booked = booths.filter(b => b.active_booking);
  const payments = booked.flatMap(b => (b.active_booking?.payment_notes || []).map(p => ({
    ...p,
    booth: b,
    booking: b.active_booking
  })));

  const dateStr = new Date().toISOString().slice(0, 10);
  const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  // Calculate Financial KPIs
  const totalTxCount = payments.length;
  const totalPaidAmount = payments.reduce((s, p) => s + (Number(p.paid_amount) || 0), 0);
  const verifiedPayments = payments.filter(p => (p.verification_status || 'verified') === 'verified');
  const verifiedAmount = verifiedPayments.reduce((s, p) => s + (Number(p.paid_amount) || 0), 0);
  const pendingCount = payments.filter(p => p.verification_status === 'pending').length;
  const rejectedCount = payments.filter(p => p.verification_status === 'rejected').length;

  const html = `
  <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; font-family: ${KHMER_FONT_STACK};">
    <!-- Colgroup Column Widths Specification for Microsoft Excel -->
    <colgroup>
      <col width="160" style="width: 160pt;">  <!-- 1: Ref Slip -->
      <col width="110" style="width: 110pt;">  <!-- 2: Date -->
      <col width="100" style="width: 100pt;">  <!-- 3: Booth Code -->
      <col width="260" style="width: 260pt;">  <!-- 4: Exhibitor Name -->
      <col width="150" style="width: 150pt;">  <!-- 5: Payment Method -->
      <col width="140" style="width: 140pt;">  <!-- 6: Paid Amount -->
      <col width="140" style="width: 140pt;">  <!-- 7: Remaining Balance -->
      <col width="150" style="width: 150pt;">  <!-- 8: Status -->
      <col width="160" style="width: 160pt;">  <!-- 9: Verifier -->
      <col width="110" style="width: 110pt;">  <!-- 10: Verified Date -->
      <col width="160" style="width: 160pt;">  <!-- 11: Recorder -->
      <col width="240" style="width: 240pt;">  <!-- 12: Notes -->
    </colgroup>

    <!-- Top System Branding Bar -->
    <tr height="28" style="height: 28pt;">
      <td colspan="12" style="background-color: #0F172A; color: #94A3B8; font-size: 9.5pt; font-weight: bold; padding: 6px 14px; letter-spacing: 1px; vertical-align: middle; font-family: ${KHMER_FONT_STACK};">
        EXPOHUB FINANCIAL REVENUE SUITE &middot; ប្រព័ន្ធគ្រប់គ្រងហិរញ្ញវត្ថុ និងបង្កាន់ដៃ
      </td>
    </tr>

    <!-- Master Report Title Banner -->
    <tr height="44" style="height: 44pt;">
      <td colspan="12" style="background-color: #064E3B; color: #A7F3D0; font-size: 16pt; font-weight: bold; padding: 10px 14px; border-bottom: 3px solid #34D399; vertical-align: middle; font-family: ${KHMER_FONT_STACK};">
        របាយការណ៍សវនកម្មទូទាត់ប្រាក់ និងបង្កាន់ដៃ (FINANCIAL PAYMENT &amp; TRANSACTION LEDGER)
      </td>
    </tr>

    <!-- Event & Metadata Ribbon -->
    <tr height="28" style="height: 28pt;">
      <td colspan="12" style="background-color: #F8FAFC; color: #334155; font-size: 10.5pt; padding: 6px 14px; border-bottom: 1px solid #CBD5E1; vertical-align: middle; font-family: ${KHMER_FONT_STACK};">
        <strong>ព្រឹត្តិការណ៍ (Event):</strong> ${escapeXML(eventName)} &nbsp;&nbsp;|&nbsp;&nbsp;
        <strong>កាលបរិច្ឆេទនាំចេញ:</strong> ${dateStr} ${timeStr} &nbsp;&nbsp;|&nbsp;&nbsp;
        <strong>ប្រតិបត្តិការសរុប:</strong> ${totalTxCount} ប្រតិបត្តិការ &nbsp;&nbsp;|&nbsp;&nbsp;
        <strong>ផ្ទៀងផ្ទាត់ជោគជ័យ:</strong> ${verifiedPayments.length} &middot; <strong>រង់ចាំពិនិត្យ (Pending):</strong> ${pendingCount} &middot; <strong>បដិសេធ:</strong> ${rejectedCount}
      </td>
    </tr>

    <!-- Spacer -->
    <tr height="10" style="height: 10pt;"><td colspan="12" style="background-color: #FFFFFF;"></td></tr>

    <!-- KPI Cards - Row 1: Header / Label -->
    <tr height="24" style="height: 24pt;">
      <!-- Card 1 -->
      <td colspan="2" style="background-color: #ECFDF5; border-top: 2px solid #10B981; border-left: 2px solid #10B981; border-right: 2px solid #10B981; text-align: center; vertical-align: middle; font-size: 9pt; font-weight: bold; color: #065F46; font-family: ${KHMER_FONT_STACK};">
        ចំណូលប្រមូលបានសរុប (TOTAL COLLECTED)
      </td>
      <td style="width: 12pt; background-color: #FFFFFF;"></td>
      <!-- Card 2 -->
      <td colspan="2" style="background-color: #EFF6FF; border-top: 2px solid #3B82F6; border-left: 2px solid #3B82F6; border-right: 2px solid #3B82F6; text-align: center; vertical-align: middle; font-size: 9pt; font-weight: bold; color: #1E40AF; font-family: ${KHMER_FONT_STACK};">
        ទឹកប្រាក់ផ្ទៀងផ្ទាត់រួច (VERIFIED CASH)
      </td>
      <td style="width: 12pt; background-color: #FFFFFF;"></td>
      <!-- Card 3 -->
      <td colspan="2" style="background-color: #FEF3C7; border-top: 2px solid #F59E0B; border-left: 2px solid #F59E0B; border-right: 2px solid #F59E0B; text-align: center; vertical-align: middle; font-size: 9pt; font-weight: bold; color: #92400E; font-family: ${KHMER_FONT_STACK};">
        រង់ចាំការពិនិត្យ (PENDING)
      </td>
      <td style="width: 12pt; background-color: #FFFFFF;"></td>
      <!-- Card 4 -->
      <td colspan="3" style="background-color: #F1F5F9; border-top: 2px solid #64748B; border-left: 2px solid #64748B; border-right: 2px solid #64748B; text-align: center; vertical-align: middle; font-size: 9pt; font-weight: bold; color: #334155; font-family: ${KHMER_FONT_STACK};">
        ប្រតិបត្តិការសរុប (COUNT)
      </td>
    </tr>

    <!-- KPI Cards - Row 2: Metric Value -->
    <tr height="36" style="height: 36pt;">
      <!-- Card 1 Value -->
      <td colspan="2" style="background-color: #ECFDF5; border-bottom: 2px solid #10B981; border-left: 2px solid #10B981; border-right: 2px solid #10B981; text-align: center; vertical-align: middle; font-size: 16pt; font-weight: bold; color: #064E3B; font-family: 'Segoe UI', 'Khmer OS Battambang', sans-serif;">
        ${fmtUSD(totalPaidAmount)}
      </td>
      <td style="width: 12pt; background-color: #FFFFFF;"></td>
      <!-- Card 2 Value -->
      <td colspan="2" style="background-color: #EFF6FF; border-bottom: 2px solid #3B82F6; border-left: 2px solid #3B82F6; border-right: 2px solid #3B82F6; text-align: center; vertical-align: middle; font-size: 16pt; font-weight: bold; color: #1E3A8A; font-family: 'Segoe UI', 'Khmer OS Battambang', sans-serif;">
        ${fmtUSD(verifiedAmount)}
      </td>
      <td style="width: 12pt; background-color: #FFFFFF;"></td>
      <!-- Card 3 Value -->
      <td colspan="2" style="background-color: #FEF3C7; border-bottom: 2px solid #F59E0B; border-left: 2px solid #F59E0B; border-right: 2px solid #F59E0B; text-align: center; vertical-align: middle; font-size: 16pt; font-weight: bold; color: #78350F; font-family: ${KHMER_FONT_STACK};">
        ${pendingCount} វិក្កយបត្រ
      </td>
      <td style="width: 12pt; background-color: #FFFFFF;"></td>
      <!-- Card 4 Value -->
      <td colspan="3" style="background-color: #F1F5F9; border-bottom: 2px solid #64748B; border-left: 2px solid #64748B; border-right: 2px solid #64748B; text-align: center; vertical-align: middle; font-size: 16pt; font-weight: bold; color: #0F172A; font-family: ${KHMER_FONT_STACK};">
        ${totalTxCount} ប្រតិបត្តិការ
      </td>
    </tr>

    <!-- Spacer -->
    <tr height="12" style="height: 12pt;"><td colspan="12" style="background-color: #FFFFFF;"></td></tr>

    <!-- Main Table Column Headers -->
    <tr height="38" style="background-color: #047857; color: #FFFFFF; font-weight: bold; font-size: 10.5pt; text-align: center; height: 38pt; vertical-align: middle;">
      <th style="border: 1px solid #065F46; padding: 8px 10px; font-family: ${KHMER_FONT_STACK};">លេខវិក្កយបត្រ / បង្កាន់ដៃ</th>
      <th style="border: 1px solid #065F46; padding: 8px; font-family: ${KHMER_FONT_STACK};">កាលបរិច្ឆេទ</th>
      <th style="border: 1px solid #065F46; padding: 8px; font-family: ${KHMER_FONT_STACK};">លេខស្តង់</th>
      <th style="border: 1px solid #065F46; padding: 8px 12px; text-align: left; font-family: ${KHMER_FONT_STACK};">ក្រុមហ៊ុនតាំងពិព័រណ៍ (Exhibitor)</th>
      <th style="border: 1px solid #065F46; padding: 8px; font-family: ${KHMER_FONT_STACK};">វិធីសាស្ត្រទូទាត់</th>
      <th style="border: 1px solid #065F46; padding: 8px 10px; text-align: right; font-family: ${KHMER_FONT_STACK};">ទឹកប្រាក់បានបង់ ($)</th>
      <th style="border: 1px solid #065F46; padding: 8px 10px; text-align: right; font-family: ${KHMER_FONT_STACK};">សមតុល្យនៅសល់ ($)</th>
      <th style="border: 1px solid #065F46; padding: 8px; font-family: ${KHMER_FONT_STACK};">ស្ថានភាព</th>
      <th style="border: 1px solid #065F46; padding: 8px 12px; text-align: left; font-family: ${KHMER_FONT_STACK};">អ្នកផ្ទៀងផ្ទាត់</th>
      <th style="border: 1px solid #065F46; padding: 8px; font-family: ${KHMER_FONT_STACK};">ថ្ងៃផ្ទៀងផ្ទាត់</th>
      <th style="border: 1px solid #065F46; padding: 8px 12px; text-align: left; font-family: ${KHMER_FONT_STACK};">អ្នកកត់ត្រា</th>
      <th style="border: 1px solid #065F46; padding: 8px 12px; text-align: left; font-family: ${KHMER_FONT_STACK};">កំណត់សម្គាល់</th>
    </tr>

    <!-- Table Data Rows -->
    ${payments.map((p, idx) => {
      const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
      const status = p.verification_status || 'verified';

      let statusBg = '#DCFCE7';
      let statusColor = '#15803D';
      let statusLabel = 'បានផ្ទៀងផ្ទាត់';

      if (status === 'pending') {
        statusBg = '#FEF3C7';
        statusColor = '#B45309';
        statusLabel = 'រង់ចាំពិនិត្យ';
      } else if (status === 'rejected') {
        statusBg = '#FEE2E2';
        statusColor = '#B91C1C';
        statusLabel = 'បានបដិសេធ';
      }

      return `
      <tr height="32" style="background-color: ${bg}; height: 32pt; vertical-align: middle;">
        <td class="text" style="border: 1px solid #E2E8F0; text-align: center; font-weight: bold; color: #0F172A; font-family: 'Segoe UI', 'Khmer OS Battambang', sans-serif;">${escapeXML(p.reference_slip_no || `REC-${p.id}`)}</td>
        <td class="date" style="border: 1px solid #E2E8F0; color: #64748B;">${p.payment_date ? p.payment_date.split('T')[0] : '-'}</td>
        <td class="text" style="border: 1px solid #E2E8F0; text-align: center; font-weight: bold; color: #2563EB; background-color: #EFF6FF; font-family: ${KHMER_FONT_STACK};">${escapeXML(p.booth?.booth_code || '-')}</td>
        <td style="border: 1px solid #E2E8F0; font-weight: bold; color: #0F172A; padding: 6px 10px; font-family: ${KHMER_FONT_STACK};">${escapeXML(p.booking?.exhibitor_name || '-')}</td>
        <td style="border: 1px solid #E2E8F0; text-align: center; color: #334155; font-weight: 500; font-family: ${KHMER_FONT_STACK};">${escapeXML(p.payment_method || '-')}</td>
        <td class="num" style="border: 1px solid #E2E8F0; font-weight: bold; color: #047857; padding: 6px 10px; background-color: #F0FDF4;">${fmtUSD(p.paid_amount)}</td>
        <td class="num" style="border: 1px solid #E2E8F0; font-weight: bold; color: ${(p.remaining_balance || 0) > 0 ? '#B91C1C' : '#64748B'}; padding: 6px 10px;">${fmtUSD(p.remaining_balance)}</td>
        <td style="border: 1px solid #CBD5E1; text-align: center; padding: 4px 8px; background-color: ${statusBg}; color: ${statusColor}; font-weight: bold; font-family: ${KHMER_FONT_STACK}; font-size: 10pt; white-space: nowrap;">
          ${statusLabel}
        </td>
        <td style="border: 1px solid #E2E8F0; color: #334155; padding: 6px 10px; font-family: ${KHMER_FONT_STACK};">${escapeXML(p.verified_by_name || '-')}</td>
        <td class="date" style="border: 1px solid #E2E8F0; color: #64748B;">${p.verified_at ? p.verified_at.split('T')[0] : '-'}</td>
        <td style="border: 1px solid #E2E8F0; color: #334155; padding: 6px 10px; font-family: ${KHMER_FONT_STACK};">${escapeXML(p.recorder_name || '-')}</td>
        <td style="border: 1px solid #E2E8F0; color: #64748B; font-style: italic; padding: 6px 10px; font-family: ${KHMER_FONT_STACK};">${escapeXML(p.note_text || '-')}</td>
      </tr>`;
    }).join('')}

    <!-- Accounting Grand Totals Row -->
    <tr height="36" style="background-color: #F1F5F9; font-weight: bold; height: 36pt; border-top: 2px solid #064E3B; border-bottom: 3px double #064E3B; vertical-align: middle;">
      <td colspan="5" style="border: 1px solid #CBD5E1; text-align: right; padding: 8px 14px; font-size: 11pt; color: #0F172A; font-family: ${KHMER_FONT_STACK};">
        ចំណូលប្រមូលបានសរុបរួម (GRAND TOTAL):
      </td>
      <td class="num" style="border: 1px solid #CBD5E1; font-size: 11.5pt; color: #047857; padding: 8px 10px; background-color: #ECFDF5;">
        ${fmtUSD(totalPaidAmount)}
      </td>
      <td colspan="6" style="border: 1px solid #CBD5E1; background-color: #F8FAFC; text-align: left; padding: 8px 14px; font-size: 9.5pt; color: #64748B; font-family: ${KHMER_FONT_STACK};">
        ផ្ទៀងផ្ទាត់ត្រឹមត្រូវ ${verifiedPayments.length} នៃ ${totalTxCount} ប្រតិបត្តិការ
      </td>
    </tr>

    <!-- Footer System Stamp -->
    <tr height="10" style="height: 10pt;"><td colspan="12" style="background-color: #FFFFFF;"></td></tr>
    <tr height="24" style="height: 24pt;">
      <td colspan="12" style="color: #94A3B8; font-size: 9pt; font-style: italic; text-align: right; padding: 4px 14px; font-family: ${KHMER_FONT_STACK}; vertical-align: middle;">
        របាយការណ៍ហិរញ្ញវត្ថុនេះបង្កើតដោយ ExpoHub Finance Module &middot; កាលបរិច្ឆេទ ${dateStr} ${timeStr}
      </td>
    </tr>
  </table>`;

  const safeEventName = eventName.replace(/[^a-zA-Z0-9_\u1780-\u17FF]/g, '_');
  downloadExcel(html, `Payment_Ledger_${safeEventName}_${dateStr}.xls`);
}

// ==========================================================================
// 3. BOOTHS INVENTORY & HALL MASTER PLAN EXPORT
// ==========================================================================
export function exportBoothsInventoryToExcel(booths = [], eventName = 'Event') {
  const dateStr = new Date().toISOString().slice(0, 10);
  const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const totalBooths = booths.length;
  const availCount = booths.filter(b => b.status === 'available').length;
  const holdCount = booths.filter(b => b.status === 'hold').length;
  const soldCount = booths.filter(b => b.status === 'sold').length;
  const blockedCount = booths.filter(b => b.status === 'blocked').length;
  const totalCapacity = booths.reduce((s, b) => s + (Number(b.price) || 0), 0);
  const occupancyRate = totalBooths > 0 ? ((soldCount / totalBooths) * 100).toFixed(1) : '0.0';

  const html = `
  <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; font-family: ${KHMER_FONT_STACK};">
    <!-- Colgroup Column Widths Specification for Microsoft Excel -->
    <colgroup>
      <col width="110" style="width: 110pt;">  <!-- 1: Booth Code -->
      <col width="120" style="width: 120pt;">  <!-- 2: Zone -->
      <col width="220" style="width: 220pt;">  <!-- 3: Category -->
      <col width="120" style="width: 120pt;">  <!-- 4: Dimensions -->
      <col width="130" style="width: 130pt;">  <!-- 5: Power Supply -->
      <col width="130" style="width: 130pt;">  <!-- 6: Price -->
      <col width="140" style="width: 140pt;">  <!-- 7: Status -->
      <col width="260" style="width: 260pt;">  <!-- 8: Client/Exhibitor -->
      <col width="160" style="width: 160pt;">  <!-- 9: Contact Person -->
      <col width="140" style="width: 140pt;">  <!-- 10: Phone -->
      <col width="160" style="width: 160pt;">  <!-- 11: Seller/Staff -->
    </colgroup>

    <!-- Top System Branding Bar -->
    <tr height="28" style="height: 28pt;">
      <td colspan="11" style="background-color: #0F172A; color: #94A3B8; font-size: 9.5pt; font-weight: bold; padding: 6px 14px; letter-spacing: 1px; vertical-align: middle; font-family: ${KHMER_FONT_STACK};">
        EXPOHUB INVENTORY STUDIO &middot; ប្រព័ន្ធគ្រប់គ្រងស្តុកស្តង់ និងប្លង់សាលពិព័រណ៍
      </td>
    </tr>

    <!-- Master Report Title Banner -->
    <tr height="44" style="height: 44pt;">
      <td colspan="11" style="background-color: #1E3A8A; color: #93C5FD; font-size: 16pt; font-weight: bold; padding: 10px 14px; border-bottom: 3px solid #60A5FA; vertical-align: middle; font-family: ${KHMER_FONT_STACK};">
        របាយការណ៍បញ្ជីគ្រប់គ្រងស្តុកស្តង់ពិព័រណ៍ (BOOTHS INVENTORY &amp; MASTER HALL PLAN)
      </td>
    </tr>

    <!-- Event & Metadata Ribbon -->
    <tr height="28" style="height: 28pt;">
      <td colspan="11" style="background-color: #F8FAFC; color: #334155; font-size: 10.5pt; padding: 6px 14px; border-bottom: 1px solid #CBD5E1; vertical-align: middle; font-family: ${KHMER_FONT_STACK};">
        <strong>ព្រឹត្តិការណ៍ (Event):</strong> ${escapeXML(eventName)} &nbsp;&nbsp;|&nbsp;&nbsp;
        <strong>កាលបរិច្ឆេទនាំចេញ:</strong> ${dateStr} ${timeStr} &nbsp;&nbsp;|&nbsp;&nbsp;
        <strong>ស្តង់សរុប:</strong> ${totalBooths} &middot; <strong>នៅទំនេរ:</strong> ${availCount} &middot; <strong>កំពុង Hold:</strong> ${holdCount} &middot; <strong>បានលក់:</strong> ${soldCount} &middot; <strong>បិទ:</strong> ${blockedCount}
      </td>
    </tr>

    <!-- Spacer -->
    <tr height="10" style="height: 10pt;"><td colspan="11" style="background-color: #FFFFFF;"></td></tr>

    <!-- Inventory KPI Cards - Row 1: Header / Label -->
    <tr height="24" style="height: 24pt;">
      <!-- Card 1 -->
      <td colspan="2" style="background-color: #F8FAFC; border-top: 2px solid #64748B; border-left: 2px solid #64748B; border-right: 2px solid #64748B; text-align: center; vertical-align: middle; font-size: 9pt; font-weight: bold; color: #334155; font-family: ${KHMER_FONT_STACK};">
        ស្តង់សរុប (TOTAL BOOTHS)
      </td>
      <td style="width: 12pt; background-color: #FFFFFF;"></td>
      <!-- Card 2 -->
      <td colspan="2" style="background-color: #ECFDF5; border-top: 2px solid #10B981; border-left: 2px solid #10B981; border-right: 2px solid #10B981; text-align: center; vertical-align: middle; font-size: 9pt; font-weight: bold; color: #065F46; font-family: ${KHMER_FONT_STACK};">
        នៅទំនេរ (AVAILABLE)
      </td>
      <td style="width: 12pt; background-color: #FFFFFF;"></td>
      <!-- Card 3 -->
      <td colspan="2" style="background-color: #EFF6FF; border-top: 2px solid #3B82F6; border-left: 2px solid #3B82F6; border-right: 2px solid #3B82F6; text-align: center; vertical-align: middle; font-size: 9pt; font-weight: bold; color: #1E40AF; font-family: ${KHMER_FONT_STACK};">
        បានលក់ដាច់ (SOLD)
      </td>
      <td style="width: 12pt; background-color: #FFFFFF;"></td>
      <!-- Card 4 -->
      <td colspan="2" style="background-color: #FAF5FF; border-top: 2px solid #8B5CF6; border-left: 2px solid #8B5CF6; border-right: 2px solid #8B5CF6; text-align: center; vertical-align: middle; font-size: 9pt; font-weight: bold; color: #6B21A8; font-family: ${KHMER_FONT_STACK};">
        តម្លៃសរុបសាល (TOTAL VALUE)
      </td>
    </tr>

    <!-- Inventory KPI Cards - Row 2: Metric Value -->
    <tr height="36" style="height: 36pt;">
      <!-- Card 1 Value -->
      <td colspan="2" style="background-color: #F8FAFC; border-bottom: 2px solid #64748B; border-left: 2px solid #64748B; border-right: 2px solid #64748B; text-align: center; vertical-align: middle; font-size: 16pt; font-weight: bold; color: #0F172A; font-family: ${KHMER_FONT_STACK};">
        ${totalBooths} ស្តង់
      </td>
      <td style="width: 12pt; background-color: #FFFFFF;"></td>
      <!-- Card 2 Value -->
      <td colspan="2" style="background-color: #ECFDF5; border-bottom: 2px solid #10B981; border-left: 2px solid #10B981; border-right: 2px solid #10B981; text-align: center; vertical-align: middle; font-size: 16pt; font-weight: bold; color: #047857; font-family: ${KHMER_FONT_STACK};">
        ${availCount}
      </td>
      <td style="width: 12pt; background-color: #FFFFFF;"></td>
      <!-- Card 3 Value -->
      <td colspan="2" style="background-color: #EFF6FF; border-bottom: 2px solid #3B82F6; border-left: 2px solid #3B82F6; border-right: 2px solid #3B82F6; text-align: center; vertical-align: middle; font-size: 16pt; font-weight: bold; color: #1D4ED8; font-family: ${KHMER_FONT_STACK};">
        ${soldCount} (${occupancyRate}%)
      </td>
      <td style="width: 12pt; background-color: #FFFFFF;"></td>
      <!-- Card 4 Value -->
      <td colspan="2" style="background-color: #FAF5FF; border-bottom: 2px solid #8B5CF6; border-left: 2px solid #8B5CF6; border-right: 2px solid #8B5CF6; text-align: center; vertical-align: middle; font-size: 16pt; font-weight: bold; color: #581C87; font-family: 'Segoe UI', 'Khmer OS Battambang', sans-serif;">
        ${fmtUSD(totalCapacity)}
      </td>
    </tr>

    <!-- Spacer -->
    <tr height="12" style="height: 12pt;"><td colspan="11" style="background-color: #FFFFFF;"></td></tr>

    <!-- Main Table Column Headers -->
    <tr height="38" style="background-color: #1D4ED8; color: #FFFFFF; font-weight: bold; font-size: 10.5pt; text-align: center; height: 38pt; vertical-align: middle;">
      <th style="border: 1px solid #1E40AF; padding: 8px; font-family: ${KHMER_FONT_STACK};">លេខកូដស្តង់</th>
      <th style="border: 1px solid #1E40AF; padding: 8px; font-family: ${KHMER_FONT_STACK};">តំបន់ (Zone)</th>
      <th style="border: 1px solid #1E40AF; padding: 8px 12px; text-align: left; font-family: ${KHMER_FONT_STACK};">ប្រភេទស្តង់ (Category)</th>
      <th style="border: 1px solid #1E40AF; padding: 8px; font-family: ${KHMER_FONT_STACK};">ទំហំ (m²)</th>
      <th style="border: 1px solid #1E40AF; padding: 8px; font-family: ${KHMER_FONT_STACK};">ប្រព័ន្ធភ្លើង</th>
      <th style="border: 1px solid #1E40AF; padding: 8px 10px; text-align: right; font-family: ${KHMER_FONT_STACK};">តម្លៃលក់ ($)</th>
      <th style="border: 1px solid #1E40AF; padding: 8px; font-family: ${KHMER_FONT_STACK};">ស្ថានភាព</th>
      <th style="border: 1px solid #1E40AF; padding: 8px 12px; text-align: left; font-family: ${KHMER_FONT_STACK};">ក្រុមហ៊ុនដែលបានកក់/ទិញ</th>
      <th style="border: 1px solid #1E40AF; padding: 8px 12px; text-align: left; font-family: ${KHMER_FONT_STACK};">អ្នកតំណាង</th>
      <th style="border: 1px solid #1E40AF; padding: 8px; font-family: ${KHMER_FONT_STACK};">លេខទូរស័ព្ទ</th>
      <th style="border: 1px solid #1E40AF; padding: 8px 12px; text-align: left; font-family: ${KHMER_FONT_STACK};">អ្នកទទួលបន្ទុកលក់</th>
    </tr>

    <!-- Table Data Rows -->
    ${booths.map((b, idx) => {
      const bk = b.active_booking;
      const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';

      let statusBg = '#ECFDF5';
      let statusColor = '#047857';
      let statusLabel = 'នៅទំនេរ (Available)';

      if (b.status === 'sold') {
        statusBg = '#EFF6FF';
        statusColor = '#1D4ED8';
        statusLabel = 'បានលក់ដាច់ (Sold)';
      } else if (b.status === 'hold') {
        statusBg = '#FEF3C7';
        statusColor = '#B45309';
        statusLabel = 'កំពុងកក់ (Hold)';
      } else if (b.status === 'blocked') {
        statusBg = '#F1F5F9';
        statusColor = '#64748B';
        statusLabel = 'បិទ (Blocked)';
      }

      return `
      <tr height="32" style="background-color: ${bg}; height: 32pt; vertical-align: middle;">
        <td class="text" style="border: 1px solid #E2E8F0; text-align: center; font-weight: bold; color: #2563EB; background-color: #EFF6FF; font-family: ${KHMER_FONT_STACK};">${escapeXML(b.booth_code)}</td>
        <td style="border: 1px solid #E2E8F0; text-align: center; color: #475569; font-family: ${KHMER_FONT_STACK};">${escapeXML(b.zone || 'Hall A')}</td>
        <td style="border: 1px solid #E2E8F0; color: #0F172A; padding: 6px 10px; font-family: ${KHMER_FONT_STACK};">${escapeXML(b.category_name_kh || b.category_name || b.category?.name || 'Standard')}</td>
        <td style="border: 1px solid #E2E8F0; text-align: center; color: #475569; font-family: ${KHMER_FONT_STACK};">${escapeXML(b.dimensions || '3m x 3m')}</td>
        <td style="border: 1px solid #E2E8F0; text-align: center; color: #64748B; font-family: ${KHMER_FONT_STACK};">${escapeXML(b.power_supply || '5A / 220V')}</td>
        <td class="num" style="border: 1px solid #E2E8F0; font-weight: bold; color: #0F172A; padding: 6px 10px;">${fmtUSD(b.price)}</td>
        <td style="border: 1px solid #CBD5E1; text-align: center; padding: 4px 8px; background-color: ${statusBg}; color: ${statusColor}; font-weight: bold; font-family: ${KHMER_FONT_STACK}; font-size: 10pt; white-space: nowrap;">
          ${statusLabel}
        </td>
        <td style="border: 1px solid #E2E8F0; font-weight: ${bk ? 'bold' : 'normal'}; color: ${bk ? '#0F172A' : '#94A3B8'}; padding: 6px 10px; font-family: ${KHMER_FONT_STACK};">${escapeXML(bk?.exhibitor_name || '-')}</td>
        <td style="border: 1px solid #E2E8F0; color: #334155; padding: 6px 10px; font-family: ${KHMER_FONT_STACK};">${escapeXML(bk?.contact_person || '-')}</td>
        <td class="text" style="border: 1px solid #E2E8F0; text-align: center; color: #334155; font-family: 'Segoe UI', 'Khmer OS Battambang', sans-serif;">${escapeXML(bk?.phone || '-')}</td>
        <td style="border: 1px solid #E2E8F0; color: #64748B; padding: 6px 10px; font-family: ${KHMER_FONT_STACK};">${escapeXML(bk?.staff_name || '-')}</td>
      </tr>`;
    }).join('')}

    <!-- Accounting Grand Totals Row -->
    <tr height="36" style="background-color: #F1F5F9; font-weight: bold; height: 36pt; border-top: 2px solid #1E3A8A; border-bottom: 3px double #1E3A8A; vertical-align: middle;">
      <td colspan="5" style="border: 1px solid #CBD5E1; text-align: right; padding: 8px 14px; font-size: 11pt; color: #0F172A; font-family: ${KHMER_FONT_STACK};">
        តម្លៃសមត្ថភាពសរុបសាលពិព័រណ៍ (TOTAL HALL CAPACITY):
      </td>
      <td class="num" style="border: 1px solid #CBD5E1; font-size: 11.5pt; color: #1E3A8A; padding: 8px 10px; background-color: #EFF6FF;">
        ${fmtUSD(totalCapacity)}
      </td>
      <td colspan="5" style="border: 1px solid #CBD5E1; background-color: #F8FAFC; text-align: left; padding: 8px 14px; font-size: 9.5pt; color: #64748B; font-family: ${KHMER_FONT_STACK};">
        ស្តង់សរុប ${totalBooths} &middot; អត្រាលក់ ${occupancyRate}% (${soldCount} ស្តង់)
      </td>
    </tr>

    <!-- Footer System Stamp -->
    <tr height="10" style="height: 10pt;"><td colspan="11" style="background-color: #FFFFFF;"></td></tr>
    <tr height="24" style="height: 24pt;">
      <td colspan="11" style="color: #94A3B8; font-size: 9pt; font-style: italic; text-align: right; padding: 4px 14px; font-family: ${KHMER_FONT_STACK}; vertical-align: middle;">
        របាយការណ៍ប្លង់សាល និងស្តុកស្តង់បង្កើតដោយ ExpoHub Floor Studio &middot; កាលបរិច្ឆេទ ${dateStr} ${timeStr}
      </td>
    </tr>
  </table>`;

  const safeEventName = eventName.replace(/[^a-zA-Z0-9_\u1780-\u17FF]/g, '_');
  downloadExcel(html, `Booths_Inventory_${safeEventName}_${dateStr}.xls`);
}

// Retain CSV compatibility aliases so existing buttons continue working seamlessly
export const exportExhibitorsToCSV = exportExhibitorsToExcel;
export const exportPaymentsToCSV = exportPaymentsToExcel;
export const exportBoothsInventoryToCSV = exportBoothsInventoryToExcel;
