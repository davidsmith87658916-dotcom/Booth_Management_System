import React, { useState } from 'react';
import { X, Printer, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../i18n';

export default function InvoiceReceiptModal({
  booth,
  currentEvent,
  onClose,
  initialDocType = 'invoice', // 'invoice' or 'receipt'
  selectedPaymentNote = null
}) {
  const { lang } = useLanguage();
  const [docType, setDocType] = useState(initialDocType);

  if (!booth || !booth.active_booking) return null;

  const booking = booth.active_booking;
  const payments = booking.payment_notes || [];
  const payment = selectedPaymentNote || payments[payments.length - 1];

  const formatUSD = (num) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(num || 0);
  };

  const invoiceNo = `INV-${currentEvent?.id || '101'}-${String(booking.id).padStart(4, '0')}`;
  const receiptNo = payment?.reference_slip_no || `REC-${currentEvent?.id || '101'}-${payment?.id ? String(payment.id).padStart(4, '0') : '0001'}`;

  const todayStr = new Date().toLocaleDateString(lang === 'kh' ? 'km-KH' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const eventTitle = lang === 'kh' && currentEvent?.name_kh ? currentEvent.name_kh : (currentEvent?.name || 'Expo Exhibition');
  const addonsTotal = (booking.addons || []).reduce((sum, a) => sum + (a.total_price || (a.unit_price * a.quantity)), 0);
  const baseBoothPrice = Math.max(0, (booking.total_agreed_price || 0) - addonsTotal);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:static print:h-auto animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Header Toolbar (Hidden during Print) */}
        <div className="p-4 px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0 print:hidden">
          {/* Doc Type Selector */}
          <div className="flex items-center bg-slate-200/80 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setDocType('invoice')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                docType === 'invoice'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'kh' ? 'វិក្កយបត្រ (Invoice)' : 'Invoice'}
            </button>
            <button
              type="button"
              onClick={() => setDocType('receipt')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                docType === 'receipt'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'kh' ? 'បង្កាន់ដៃទទួលប្រាក់ (Official Receipt)' : 'Official Receipt'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>{lang === 'kh' ? 'បោះពុម្ព / PDF' : 'Print / Save PDF'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Area */}
        <div className="flex-1 overflow-y-auto p-8 sm:p-10 bg-white text-slate-800 print:p-8 print:overflow-visible text-xs">
          
          {/* Document Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-base">
                  EH
                </div>
                <span className="text-xl font-black text-slate-900 tracking-tight">EXPOHUB</span>
              </div>
              <p className="font-bold text-slate-700">{eventTitle}</p>
              {currentEvent?.venue && <p className="text-slate-500">{currentEvent.venue}</p>}
              <p className="text-slate-500">
                {booking.staff_name ? `${lang === 'kh' ? 'តំណាងលក់៖ ' : 'Sales Rep: '}${booking.staff_name}` : 'ExpoHub Management'}
                {booking.staff_phone ? ` | Tel: ${booking.staff_phone}` : ''}
              </p>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-slate-900 text-white font-black text-sm uppercase rounded-lg tracking-wider mb-2">
                {docType === 'invoice' ? (lang === 'kh' ? 'វិក្កយបត្រ / INVOICE' : 'INVOICE') : (lang === 'kh' ? 'បង្កាន់ដៃទទួលប្រាក់ / OFFICIAL RECEIPT' : 'OFFICIAL RECEIPT')}
              </span>
              <p className="font-mono font-bold text-slate-900 text-sm">{docType === 'invoice' ? invoiceNo : receiptNo}</p>
              <p className="text-slate-500 mt-1">{lang === 'kh' ? 'កាលបរិច្ឆេទ' : 'Date'}: {todayStr}</p>
              {docType === 'receipt' && (
                <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{payment?.verification_status === 'verified' ? (lang === 'kh' ? 'បានផ្ទៀងផ្ទាត់ដោយគណនេយ្យ' : 'Verified by Finance') : (lang === 'kh' ? 'រង់ចាំការផ្ទៀងផ្ទាត់' : 'Pending Verification')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Billed To / Exhibitor Information */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-6">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                {lang === 'kh' ? 'ព័ត៌មានអតិថិជន (BILL TO / EXHIBITOR)' : 'BILL TO / EXHIBITOR'}
              </span>
              <h4 className="font-black text-slate-900 text-sm">{booking.exhibitor_name}</h4>
              <p className="font-bold text-blue-700 text-[11px] mt-0.5">
                {lang === 'kh' ? 'ស្លាកឈ្មោះស្តង់ (Fascia)' : 'Fascia'}: {booking.fascia_name || booking.exhibitor_name}
              </p>
              <p className="text-slate-600 mt-1">{lang === 'kh' ? 'អ្នកតំណាង' : 'Contact'}: {booking.contact_person}</p>
              <p className="text-slate-600">Tel: {booking.phone} {booking.email ? `| ${booking.email}` : ''}</p>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                {lang === 'kh' ? 'ព័ត៌មានស្តង់ពិព័រណ៍ (BOOTH DETAILS)' : 'BOOTH DETAILS'}
              </span>
              <p className="font-black text-slate-900 text-sm">{lang === 'kh' ? 'ស្តង់លេខ' : 'Booth No'}: <span className="font-mono text-blue-700">{booth.booth_code}</span></p>
              <p className="text-slate-600">{booth.category_name || 'Standard Shell Scheme'}</p>
              <p className="text-slate-600">{lang === 'kh' ? 'ទំហំ' : 'Dimensions'}: {booth.dimensions || '3m x 3m (9m²)'}</p>
              <p className="text-slate-600">{lang === 'kh' ? 'តំបន់' : 'Zone'}: {booth.zone || 'Hall A'}</p>
            </div>
          </div>

          {/* Table Items */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden mb-6">
            <table className="w-full text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">{lang === 'kh' ? 'បរិយាយ (Description)' : 'Description'}</th>
                  <th className="py-2.5 px-4 text-center">{lang === 'kh' ? 'ចំនួន' : 'Qty'}</th>
                  <th className="py-2.5 px-4 text-right">{lang === 'kh' ? 'តម្លៃឯកតា' : 'Unit Price'}</th>
                  <th className="py-2.5 px-4 text-right">{lang === 'kh' ? 'សរុប' : 'Amount'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Booth Space Rental Row */}
                <tr>
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-900">
                      {lang === 'kh' ? `ការជួលស្តង់ពិព័រណ៍ ${booth.booth_code}` : `Exhibition Booth Space ${booth.booth_code}`}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {booth.category_name} ({booth.dimensions || '3m x 3m'}) - {eventTitle}
                    </p>
                  </td>
                  <td className="py-3 px-4 text-center font-bold">1</td>
                  <td className="py-3 px-4 text-right font-mono">
                    {formatUSD(baseBoothPrice)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    {formatUSD(baseBoothPrice)}
                  </td>
                </tr>

                {/* Itemized Add-on Services Rows */}
                {booking.addons && booking.addons.map((addon) => (
                  <tr key={addon.id} className="bg-purple-50/20">
                    <td className="py-2.5 px-4">
                      <p className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="text-purple-600 font-bold">•</span>
                        <span>{lang === 'kh' && addon.name_kh ? addon.name_kh : addon.name}</span>
                      </p>
                      <p className="text-[10px] text-slate-400 pl-3">
                        {addon.name} ({addon.category})
                      </p>
                    </td>
                    <td className="py-2.5 px-4 text-center font-bold font-mono text-slate-700">{addon.quantity}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-600">{formatUSD(addon.unit_price)}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-purple-900">
                      {formatUSD(addon.total_price || (addon.unit_price * addon.quantity))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Summary Calculation */}
          <div className="flex justify-end mb-8">
            <div className="w-72 space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between py-1 border-b border-slate-200/80">
                <span className="text-slate-600 font-medium">{lang === 'kh' ? 'តម្លៃសរុប (Agreed Total)' : 'Agreed Total'}:</span>
                <span className="font-bold font-mono text-slate-900">{formatUSD(booking.total_agreed_price)}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-200/80">
                <span className="text-slate-600 font-medium">{lang === 'kh' ? 'បានទូទាត់សរុប (Total Paid)' : 'Total Paid'}:</span>
                <span className="font-bold font-mono text-emerald-600">{formatUSD(booking.total_paid)}</span>
              </div>

              {docType === 'receipt' && payment && (
                <div className="flex justify-between py-1 border-b border-slate-200/80 bg-blue-50/50 p-1.5 rounded-lg">
                  <span className="text-blue-900 font-bold">{lang === 'kh' ? 'ទឹកប្រាក់បង្កាន់ដៃនេះ' : 'Receipt Amount'}:</span>
                  <span className="font-black font-mono text-blue-700 text-sm">{formatUSD(payment.paid_amount)}</span>
                </div>
              )}

              <div className="flex justify-between py-1 pt-2 font-black text-sm">
                <span className="text-slate-900">{lang === 'kh' ? 'ប្រាក់នៅសល់ (Remaining Due)' : 'Remaining Due'}:</span>
                <span className="font-mono text-rose-600">{formatUSD(booking.remaining_due)}</span>
              </div>
            </div>
          </div>

          {payments.length > 0 && (
            <div className="mb-8">
              <h5 className="font-black text-slate-900 mb-2">{lang === 'kh' ? 'ប្រវត្តិប្រតិបត្តិការបង់ប្រាក់ (Payment Transactions)' : 'Payment Transactions'}</h5>
              <div className="border border-slate-200 rounded-xl overflow-hidden text-[11px]">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-600 font-bold">
                    <tr>
                      <th className="py-2 px-3">{lang === 'kh' ? 'កាលបរិច្ឆេទ' : 'Date'}</th>
                      <th className="py-2 px-3">{lang === 'kh' ? 'វិធីសាស្ត្រ' : 'Method'}</th>
                      <th className="py-2 px-3">{lang === 'kh' ? 'លេខយោង Slip' : 'Ref/Slip'}</th>
                      <th className="py-2 px-3">{lang === 'kh' ? 'ស្ថានភាព' : 'Status'}</th>
                      <th className="py-2 px-3 text-right">{lang === 'kh' ? 'ទឹកប្រាក់' : 'Amount'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map(p => (
                      <tr key={p.id}>
                        <td className="py-2 px-3">{p.payment_date ? p.payment_date.split('T')[0] : '—'}</td>
                        <td className="py-2 px-3">{p.payment_method}</td>
                        <td className="py-2 px-3 font-mono">{p.reference_slip_no || '—'}</td>
                        <td className="py-2 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.verification_status === 'verified' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {p.verification_status === 'verified' ? (lang === 'kh' ? 'បានផ្ទៀងផ្ទាត់' : 'Verified') : (lang === 'kh' ? 'រង់ចាំផ្ទៀងផ្ទាត់' : 'Pending')}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatUSD(p.paid_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Terms & Signatures */}
          <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-10 mt-6">
            <div>
              <p className="font-bold text-slate-800 mb-1">{lang === 'kh' ? 'លក្ខខណ្ឌទូទៅ' : 'Terms & Conditions'}:</p>
              <ul className="list-disc pl-4 space-y-1 text-[10px] text-slate-500">
                <li>{lang === 'kh' ? 'ប្រាក់កក់មិនអាចដកវិញបានទេក្នុងករណីបោះបង់ការជួល។' : 'Deposits are non-refundable in the event of cancellation.'}</li>
                <li>{lang === 'kh' ? 'ទឹកប្រាក់ដែលនៅសល់ត្រូវទូទាត់មុនថ្ងៃបើកពិព័រណ៍ ៧ ថ្ងៃ។' : 'All remaining balance must be paid 7 days before event opening.'}</li>
                <li>{lang === 'kh' ? 'ឯកសារនេះមានសុពលភាពជាផ្លូវការជាមួយហត្ថលេខា ឬត្រា។' : 'This document is valid upon authorized signature or official company stamp.'}</li>
              </ul>
            </div>

            <div className="flex justify-between gap-6 pt-4 text-center">
              <div className="flex-1">
                <div className="h-14 border-b border-dashed border-slate-300"></div>
                <p className="font-bold text-slate-900 mt-2">{booking.contact_person}</p>
                <p className="text-[10px] text-slate-500">{lang === 'kh' ? 'អ្នកតំណាងអតិថិជន (Exhibitor)' : 'Exhibitor Representative'}</p>
              </div>

              <div className="flex-1">
                <div className="h-14 border-b border-dashed border-slate-300 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    ✓ EXPOHUB FINANCE STAMP
                  </span>
                </div>
                <p className="font-bold text-slate-900 mt-2">{payment?.verified_by_name || booking.staff_name || 'Accountant'}</p>
                <p className="text-[10px] text-slate-500">{lang === 'kh' ? 'គណនេយ្យ / អ្នកអនុម័ត (Authorized)' : 'Authorized Signatory'}</p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
