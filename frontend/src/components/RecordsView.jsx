import React, { useState } from 'react';
import { 
  Printer, 
  FileText, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  Coins, 
  Building2 
} from 'lucide-react';
import { useLanguage } from '../i18n';

const usd = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

export default function RecordsView({ 
  mode, 
  booths, 
  onSelectBooth, 
  onOpenInvoice, 
  onVerifyPayment, 
  onRejectPayment,
  user, 
  currentEvent 
}) {
  const { lang, t } = useLanguage();
  const [statusFilter, setStatusFilter] = useState('all');

  const booked = booths.filter(b => b.active_booking);
  const payments = booked.flatMap(b => (b.active_booking.payment_notes || []).map(p => ({ 
    ...p, 
    booth: b, 
    booking: b.active_booking 
  })));
  
  const isFinance = user?.role === 'admin' || user?.role === 'accountant';

  // KPI Calculations
  const validPayments = payments.filter(p => p.verification_status !== 'rejected');
  const totalPaid = validPayments.reduce((sum, p) => sum + (p.paid_amount || 0), 0);
  const pendingList = payments.filter(p => p.verification_status === 'pending');
  const pendingAmount = pendingList.reduce((sum, p) => sum + (p.paid_amount || 0), 0);
  const verifiedList = payments.filter(p => p.verification_status === 'verified');
  const verifiedAmount = verifiedList.reduce((sum, p) => sum + (p.paid_amount || 0), 0);
  const rejectedList = payments.filter(p => p.verification_status === 'rejected');

  // Filtered Payments
  const displayedPayments = payments.filter(p => {
    if (statusFilter === 'pending') return p.verification_status === 'pending';
    if (statusFilter === 'verified') return p.verification_status === 'verified';
    if (statusFilter === 'rejected') return p.verification_status === 'rejected';
    return true;
  });

  return (
    <section className="panel space-y-4">
      {/* Top Header & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-800 leading-relaxed overflow-visible pt-0.5">
            {mode === 'payments' ? t('paymentRecordsTitle') : t('exhibitorDirectoryTitle')}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            {mode === 'payments'
              ? (lang === 'kh' 
                  ? `ទូទាត់សរុប ${payments.length} លើក · ទឹកប្រាក់ ${usd(totalPaid)}`
                  : t('paymentRecordsSummary', { count: payments.length, total: usd(totalPaid) }))
              : (lang === 'kh' 
                  ? `ក្រុមហ៊ុនកក់សរុប ${booked.length} ស្តង់` 
                  : t('exhibitorBookingsSummary', { count: booked.length }))}
          </p>
        </div>

        {/* Filter Tabs for Payments */}
        {mode === 'payments' && (
          <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl border border-slate-200/70 shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              {lang === 'kh' ? 'ទាំងអស់' : 'All'} ({payments.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                statusFilter === 'pending'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-amber-700 hover:bg-amber-100/60'
              }`}
            >
              <span>⚠️ {lang === 'kh' ? 'រង់ចាំផ្ទៀងផ្ទាត់' : 'Pending'}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                statusFilter === 'pending' ? 'bg-amber-600 text-white' : 'bg-amber-200/80 text-amber-900'
              }`}>
                {pendingList.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('verified')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                statusFilter === 'verified'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 hover:bg-emerald-100/60'
              }`}
            >
              <span>✓ {lang === 'kh' ? 'បានផ្ទៀងផ្ទាត់' : 'Verified'}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                statusFilter === 'verified' ? 'bg-emerald-700 text-white' : 'bg-emerald-200/80 text-emerald-900'
              }`}>
                {verifiedList.length}
              </span>
            </button>
            {rejectedList.length > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter('rejected')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  statusFilter === 'rejected'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-rose-700 hover:bg-rose-100/60'
                }`}
              >
                <span>✕ {lang === 'kh' ? 'បានបដិសេធ' : 'Rejected'}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  statusFilter === 'rejected' ? 'bg-rose-700 text-white' : 'bg-rose-200 text-rose-900'
                }`}>
                  {rejectedList.length}
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Mini KPI Cards for Financial Clarity (Payments Mode) */}
      {mode === 'payments' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Card 1: Total Received */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3 flex items-center gap-3 shadow-2xs">
            <div className="w-9 h-9 rounded-lg bg-blue-100/80 text-blue-700 flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-slate-500 leading-tight">
                {lang === 'kh' ? 'ទឹកប្រាក់ទទួលបានសរុប' : 'Total Collected'}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-base font-black text-slate-800 font-mono tracking-tight">{usd(totalPaid)}</span>
                <span className="text-[10px] text-slate-400 font-medium">({payments.length} {lang === 'kh' ? 'លើក' : 'records'})</span>
              </div>
            </div>
          </div>

          {/* Card 2: Pending Verification */}
          <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-3 flex items-center gap-3 shadow-2xs">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-amber-700 leading-tight">
                {lang === 'kh' ? 'រង់ចាំផ្ទៀងផ្ទាត់' : 'Pending Verification'}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-base font-black text-amber-900 font-mono tracking-tight">{usd(pendingAmount)}</span>
                <span className="text-[10px] text-amber-700 font-bold">({pendingList.length} {lang === 'kh' ? 'ប្រតិបត្តិការ' : 'txns'})</span>
              </div>
            </div>
          </div>

          {/* Card 3: Verified */}
          <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-xl p-3 flex items-center gap-3 shadow-2xs">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-emerald-700 leading-tight">
                {lang === 'kh' ? 'បានផ្ទៀងផ្ទាត់រួចរាល់' : 'Fully Verified'}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-base font-black text-emerald-900 font-mono tracking-tight">{usd(verifiedAmount)}</span>
                <span className="text-[10px] text-emerald-700 font-bold">({verifiedList.length} {lang === 'kh' ? 'ប្រតិបត្តិការ' : 'txns'})</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Data Table */}
      <div className="table-scroll border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-2xs">
        <table className="data-table">
          {mode === 'payments' ? (
            <>
              <thead>
                <tr>
                  <th>{t('dateCol')}</th>
                  <th>{t('boothCol')}</th>
                  <th>{t('exhibitorCol')}</th>
                  <th>{t('methodCol')}</th>
                  <th>{t('referenceCol')}</th>
                  <th className="text-right">{t('amountCol')}</th>
                  <th className="text-center">{lang === 'kh' ? 'ស្ថានភាពផ្ទៀងផ្ទាត់' : 'Verification'}</th>
                  <th className="text-center">{t('actionsCol', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {displayedPayments.map(p => {
                  const isPending = p.verification_status === 'pending';
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="text-slate-600 text-xs font-medium whitespace-nowrap">
                        {p.payment_date?.split('T')[0]}
                      </td>
                      <td>
                        <button 
                          type="button"
                          className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 shadow-2xs cursor-pointer transition-all active:scale-95" 
                          onClick={() => onSelectBooth(p.booth)}
                          title={lang === 'kh' ? `មើលព័ត៌មានស្តង់ ${p.booth.booth_code}` : `View booth ${p.booth.booth_code}`}
                        >
                          {p.booth.booth_code}
                        </button>
                      </td>
                      <td>
                        <strong className="text-slate-800 text-xs font-bold block">{p.booking.exhibitor_name}</strong>
                        {p.booking.fascia_name && (
                          <span className="text-[11px] text-slate-500 font-medium">{p.booking.fascia_name}</span>
                        )}
                      </td>
                      <td className="text-xs text-slate-700 font-medium">
                        {p.payment_method}
                      </td>
                      <td className="font-mono text-xs text-slate-500">
                        {p.reference_slip_no || '—'}
                      </td>
                      <td className="text-right">
                        <span className="font-bold text-emerald-600 font-mono text-xs">
                          {usd(p.paid_amount)}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${
                          p.verification_status === 'pending'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200/70'
                            : p.verification_status === 'rejected'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200/70'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200/70'
                        }`}>
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>
                            {p.verification_status === 'pending'
                              ? (lang === 'kh' ? 'រង់ចាំផ្ទៀងផ្ទាត់' : 'Pending')
                              : p.verification_status === 'rejected'
                                ? (lang === 'kh' ? 'បានបដិសេធ' : 'Rejected')
                                : (lang === 'kh' ? 'បានផ្ទៀងផ្ទាត់' : 'Verified')}
                          </span>
                        </span>
                      </td>
                      <td className="text-center">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          {isFinance && isPending && onVerifyPayment && (
                            <button
                              type="button"
                              onClick={() => onVerifyPayment(p.id)}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-2xs cursor-pointer transition-all whitespace-nowrap"
                              title={lang === 'kh' ? 'ផ្ទៀងផ្ទាត់ការបង់ប្រាក់នេះ' : 'Verify this payment'}
                            >
                              <span>✓</span>
                              <span>{lang === 'kh' ? 'ផ្ទៀងផ្ទាត់' : 'Verify'}</span>
                            </button>
                          )}
                          {isFinance && isPending && onRejectPayment && (
                            <button
                              type="button"
                              onClick={() => onRejectPayment(p.id)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 active:scale-95 font-bold rounded-lg text-xs flex items-center gap-1 shadow-2xs cursor-pointer transition-all whitespace-nowrap"
                              title={lang === 'kh' ? 'បដិសេធការបង់ប្រាក់នេះ' : 'Reject this payment'}
                            >
                              <span>✕</span>
                              <span>{lang === 'kh' ? 'បដិសេធ' : 'Reject'}</span>
                            </button>
                          )}
                          {onOpenInvoice && (
                            <button
                              type="button"
                              onClick={() => onOpenInvoice(p.booth, 'receipt', p)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 border border-slate-200/80 shadow-2xs cursor-pointer transition-all flex items-center justify-center"
                              title={lang === 'kh' ? 'ចេញបង្កាន់ដៃបង់ប្រាក់ (Receipt)' : 'Receipt'}
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-600" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </>
          ) : (
            <>
              <thead>
                <tr>
                  <th>{t('companyCol')}</th>
                  <th>{t('contactCol')}</th>
                  <th>{t('phoneEmailCol')}</th>
                  <th>{t('boothCol')}</th>
                  <th>{t('sellerLabel')}</th>
                  <th>{t('salesNotesCol')}</th>
                  <th className="text-center">{t('actionsCol', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {booked.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td>
                      <strong className="text-slate-800 text-xs font-bold block">{b.active_booking.exhibitor_name}</strong>
                      {b.active_booking.fascia_name && (
                        <small className="block text-blue-600 font-semibold">{b.active_booking.fascia_name}</small>
                      )}
                    </td>
                    <td className="text-xs text-slate-700 font-medium">{b.active_booking.contact_person}</td>
                    <td>
                      <span className="text-xs text-slate-700 font-medium">{b.active_booking.phone}</span>
                      {b.active_booking.email && <br />}
                      <span className="text-slate-500 text-[11px]">{b.active_booking.email}</span>
                    </td>
                    <td>
                      <button 
                        type="button"
                        className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 shadow-2xs cursor-pointer transition-all active:scale-95" 
                        onClick={() => onSelectBooth(b)}
                        title={lang === 'kh' ? `មើលព័ត៌មានស្តង់ ${b.booth_code}` : `View booth ${b.booth_code}`}
                      >
                        {b.booth_code}
                      </button>
                    </td>
                    <td className="text-xs text-slate-700 font-medium">{b.active_booking.staff_name}</td>
                    <td className="text-xs text-slate-500">{b.active_booking.sales_notes || '—'}</td>
                    <td className="text-center">
                      {onOpenInvoice && (
                        <div className="inline-flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenInvoice(b, 'invoice')}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 border border-slate-200/80 shadow-2xs cursor-pointer transition-all flex items-center justify-center"
                            title={lang === 'kh' ? 'ចេញវិក្កយបត្រ (Invoice)' : 'Invoice'}
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenInvoice(b, 'receipt')}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 border border-slate-200/80 shadow-2xs cursor-pointer transition-all flex items-center justify-center"
                            title={lang === 'kh' ? 'ចេញបង្កាន់ដៃបង់ប្រាក់ (Receipt)' : 'Receipt'}
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-600" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </>
          )}
        </table>
        {(mode === 'payments' ? !displayedPayments.length : !booked.length) && (
          <div className="p-8 text-center text-slate-400 text-xs">
            {t('noRecordsMatch')}
          </div>
        )}
      </div>
    </section>
  );
}
