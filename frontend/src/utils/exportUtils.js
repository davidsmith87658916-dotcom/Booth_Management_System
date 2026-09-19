// Utility to format and export data as CSV/Excel with UTF-8 BOM for perfect Khmer & English rendering

function downloadCSV(csvContent, filename) {
  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCSV(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export function exportExhibitorsToCSV(booths = [], eventName = 'Event') {
  const booked = booths.filter(b => b.active_booking);
  const headers = [
    'No',
    'Booth Code',
    'Exhibitor / Company',
    'Fascia Name (ស្លាកឈ្មោះ)',
    'Contact Person',
    'Phone',
    'Telegram',
    'Email',
    'Industry',
    'Zone',
    'Dimensions',
    'Agreed Price ($)',
    'Total Paid ($)',
    'Remaining Due ($)',
    'Booking Status',
    'Sales Rep',
    'Booking Date'
  ];

  const rows = booked.map((b, idx) => {
    const bk = b.active_booking;
    return [
      idx + 1,
      b.booth_code,
      bk.exhibitor_name,
      bk.fascia_name || bk.exhibitor_name,
      bk.contact_person,
      bk.phone,
      bk.telegram || '',
      bk.email || '',
      bk.business_type || '',
      b.zone,
      b.dimensions || '',
      bk.total_agreed_price,
      bk.total_paid,
      bk.remaining_due,
      bk.booking_status,
      bk.staff_name,
      bk.created_at ? bk.created_at.split('T')[0] : ''
    ].map(escapeCSV).join(',');
  });

  const csv = [headers.map(escapeCSV).join(','), ...rows].join('\r\n');
  const dateStr = new Date().toISOString().slice(0, 10);
  const safeEventName = eventName.replace(/[^a-zA-Z0-9_\u1780-\u17FF]/g, '_');
  downloadCSV(csv, `Exhibitors_${safeEventName}_${dateStr}.csv`);
}

export function exportPaymentsToCSV(booths = [], eventName = 'Event') {
  const booked = booths.filter(b => b.active_booking);
  const payments = booked.flatMap(b => (b.active_booking.payment_notes || []).map(p => ({ ...p, booth: b, booking: b.active_booking })));
  
  const headers = [
    'Receipt/Slip No',
    'Payment Date',
    'Booth Code',
    'Exhibitor Name',
    'Payment Method',
    'Paid Amount ($)',
    'Balance After ($)',
    'Verification Status',
    'Verified By',
    'Verified At',
    'Recorded By',
    'Notes'
  ];

  const rows = payments.map((p) => {
    return [
      p.reference_slip_no || `REC-${p.id}`,
      p.payment_date ? p.payment_date.split('T')[0] : '',
      p.booth.booth_code,
      p.booking.exhibitor_name,
      p.payment_method,
      p.paid_amount,
      p.remaining_balance,
      p.verification_status || 'verified',
      p.verified_by_name || (p.verification_status === 'verified' ? 'Admin' : 'Pending'),
      p.verified_at ? p.verified_at.split('T')[0] : '',
      p.recorder_name || p.booking.staff_name || '',
      p.note_text || ''
    ].map(escapeCSV).join(',');
  });

  const csv = [headers.map(escapeCSV).join(','), ...rows].join('\r\n');
  const dateStr = new Date().toISOString().slice(0, 10);
  const safeEventName = eventName.replace(/[^a-zA-Z0-9_\u1780-\u17FF]/g, '_');
  downloadCSV(csv, `Payment_Ledger_${safeEventName}_${dateStr}.csv`);
}

export function exportBoothsInventoryToCSV(booths = [], eventName = 'Event') {
  const headers = [
    'Booth Code',
    'Zone',
    'Category',
    'Dimensions',
    'Price ($)',
    'Status',
    'Exhibitor',
    'Seller'
  ];

  const rows = booths.map(b => [
    b.booth_code,
    b.zone,
    b.category_name,
    b.dimensions || '',
    b.price,
    b.status,
    b.active_booking?.exhibitor_name || '',
    b.active_booking?.staff_name || ''
  ].map(escapeCSV).join(','));

  const csv = [headers.map(escapeCSV).join(','), ...rows].join('\r\n');
  const dateStr = new Date().toISOString().slice(0, 10);
  const safeEventName = eventName.replace(/[^a-zA-Z0-9_\u1780-\u17FF]/g, '_');
  downloadCSV(csv, `Booths_Inventory_${safeEventName}_${dateStr}.csv`);
}
