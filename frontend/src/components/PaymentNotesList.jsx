import React, { useState } from 'react';
import { 
  FileText, 
  ArrowRight, 
  Printer, 
  ShieldCheck, 
  Building2, 
  Phone, 
  Mail, 
  Coins, 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  ClipboardCheck 
} from 'lucide-react';
import { useLanguage } from '../i18n';

export default function PaymentNotesList({ 
  booths = [], 
  onSelectBooth, 
  onAddPayment,
  onOpenInvoice, 
  onOpenHandover,
  onVerifyPayment, 
  onRejectPayment,
  user, 
  currentEvent 
}) {
  const { lang, t } = useLanguage();
  const [filterStatus, setFilterStatus] = useState('all');

  const formatUSD = (num) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(num || 0);
  };

  const bookedBooths = booths.filter(b => b.active_booking);
  const pendingCount = bookedBooths.filter(b => 
    b.active_booking.payment_notes?.some(p => p.verification_status === 'pending')
  ).length;
  const handedOverCount = bookedBooths.filter(b => b.handover).length;

  // Financial KPI totals for the event
  const totalAgreed = bookedBooths.reduce((sum, b) => sum + Number(b.active_booking?.total_agreed_price || 0), 0);
  const totalPaid = bookedBooths.reduce((sum, b) => sum + Number(b.active_booking?.total_paid || 0), 0);
  const totalDue = bookedBooths.reduce((sum, b) => sum + Number(b.active_booking?.remaining_due || 0), 0);
  const unpaidCount = bookedBooths.filter(b => Number(b.active_booking?.remaining_due || 0) > 0).length;

  const isFinance = user?.role === 'admin' || user?.role === 'accountant';

  const filtered = bookedBooths.filter(b => {
    const bk = b.active_booking;
    
    if (filterStatus === 'pending_verification') {
      const hasPending = bk.payment_notes?.some(p => p.verification_status === 'pending');
      if (!hasPending) return false;
    } else if (filterStatus === 'paid' && bk.booking_status !== 'fully_paid') return false;
    else if (filterStatus === 'deposit' && bk.booking_status !== 'deposit_paid') return false;
    else if (filterStatus === 'confirmed' && bk.booking_status !== 'confirmed') return false;
    else if (filterStatus === 'hold' && bk.booking_status !== 'hold') return false;
    else if (filterStatus === 'handed_over' && !b.handover) return false;
    else if (filterStatus === 'pending_handover' && b.handover) return false;

    return true;
  });

  return (
    <div className="space-y-4">
      {/* Event Financial Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Total Agreed */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between transition-all hover:shadow-xs">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-bold block leading-relaxed">
              {lang === 'kh' ? 'តម្លៃកិច្ចសន្យាសរុប' : 'Total Contract Value'}
            </span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono block leading-tight">
              {formatUSD(totalAgreed)}
            </span>
            <span className="text-[11px] text-purple-700 font-medium block">
              {bookedBooths.length} {lang === 'kh' ? 'ស្តង់បានកក់' : 'booked booths'}
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100 shadow-2xs">
            <Coins className="w-5 h-5" />
          </div>
        </div>

        {/* Total Paid */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between transition-all hover:shadow-xs">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-bold block leading-relaxed">
              {lang === 'kh' ? 'ប្រាក់ទទួលបានជាក់ស្ដែង' : 'Total Paid / Collected'}
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-600 font-mono block leading-tight">
              {formatUSD(totalPaid)}
            </span>
            <span className="text-[11px] text-emerald-700 font-medium block">
              {totalAgreed > 0 ? Math.round((totalPaid / totalAgreed) * 100) : 0}% {lang === 'kh' ? 'នៃតម្លៃសរុប' : 'of total value'}
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 shadow-2xs">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Total Due */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between transition-all hover:shadow-xs">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-bold block leading-relaxed">
              {lang === 'kh' ? 'ប្រាក់នៅខ្វះ / ជំពាក់សរុប' : 'Total Outstanding Balance'}
            </span>
            <span className="text-xl sm:text-2xl font-black text-rose-600 font-mono block leading-tight">
              {formatUSD(totalDue)}
            </span>
            <span className="text-[11px] text-rose-700 font-medium block">
              {unpaidCount} {lang === 'kh' ? 'ស្តង់មិនទាន់បង់ដាច់' : 'booths with balance'}
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100 shadow-2xs">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Header & Filter Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 leading-normal overflow-visible">
            <Building2 className="w-5 h-5 text-purple-600 shrink-0" />
            <span className="leading-normal pt-0.5">
              {lang === 'kh' ? 'បញ្ជីកក់ស្តង់ និងក្រុមហ៊ុនពិព័រណ៍' : 'Bookings & Exhibitors Directory'}
            </span>
          </h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-slate-500 font-medium">
              {lang === 'kh' 
                ? `សរុប ${bookedBooths.length} ស្តង់ • បានប្រគល់ស្តង់ ${handedOverCount}/${bookedBooths.length}` 
                : `${bookedBooths.length} booths • Handed over ${handedOverCount}/${bookedBooths.length}`}
            </span>
            {pendingCount > 0 && (
              <span className="whitespace-nowrap font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full text-xs inline-flex items-center gap-1">
                ⚠️ {pendingCount} {lang === 'kh' ? 'រង់ចាំផ្ទៀងផ្ទាត់' : 'pending review'}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap justify-end">
          {/* Status filter pills */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold flex-wrap">
            {[
              { id: 'all', label: lang === 'kh' ? `ទាំងអស់ (${bookedBooths.length})` : `All (${bookedBooths.length})` },
              { 
                id: 'pending_verification', 
                label: lang === 'kh' ? `រង់ចាំផ្ទៀងផ្ទាត់ (${pendingCount})` : `Pending (${pendingCount})`,
                highlight: pendingCount > 0
              },
              { id: 'paid', label: lang === 'kh' ? 'បានបង់ដាច់' : t('status_fully_paid') },
              { id: 'deposit', label: lang === 'kh' ? 'បានបង់កក់' : t('status_deposit_paid') },
              { id: 'handed_over', label: lang === 'kh' ? `✓ បានប្រគល់ស្តង់ (${handedOverCount})` : `Handed Over (${handedOverCount})` },
              { id: 'hold', label: lang === 'kh' ? 'កំពុងកក់ទុក' : t('status_hold') }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  filterStatus === tab.id 
                    ? 'bg-white text-slate-900 shadow-xs font-bold' 
                    : tab.highlight
                      ? 'text-amber-700 font-bold hover:bg-amber-100/50'
                      : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Unified Directory Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-extrabold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">{t('boothCol')}</th>
                <th className="py-3.5 px-4">{t('exhibitorCol')}</th>
                <th className="py-3.5 px-4">{t('contactSellerCol')}</th>
                <th className="py-3.5 px-4 text-right">{t('agreedPriceCol')}</th>
                <th className="py-3.5 px-4 text-right">{t('paidCol')}</th>
                <th className="py-3.5 px-4 text-right">{t('dueCol')}</th>
                <th className="py-3.5 px-4 text-center">{lang === 'kh' ? 'ការប្រគល់ស្តង់' : 'Handover'}</th>
                <th className="py-3.5 px-4 text-center">{t('statusCol')}</th>
                <th className="py-3.5 px-4 text-center">{t('actionsCol')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((b) => {
                const bk = b.active_booking;
                const addonsCount = bk.addons?.length || 0;
                return (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-black text-slate-900">
                      <button 
                        type="button"
                        onClick={() => onSelectBooth(b)}
                        className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 font-mono text-xs font-black shadow-2xs cursor-pointer transition-all active:scale-95"
                        title={lang === 'kh' ? `មើលព័ត៌មានស្តង់ ${b.booth_code}` : `View booth ${b.booth_code}`}
                      >
                        {b.booth_code}
                      </button>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-slate-900 text-xs">{bk.exhibitor_name}</div>
                      {bk.fascia_name && (
                        <div className="text-[11px] text-purple-700 font-semibold">
                          {t('fasciaLabel')}: "{bk.fascia_name}"
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 font-bold">
                        {bk.contact_person}
                        <small className="block text-purple-700 font-medium pt-0.5">
                          {t('sellerLabel')}: {bk.staff_name?.replace(/\s*\(បុគ្គលិកលក់\)/g, '').replace(/\s*\(Sales staff\)/g, '')}
                        </small>
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium flex items-center gap-2 mt-0.5">
                        <span>{bk.phone}</span>
                        {bk.email && <span>• {bk.email}</span>}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono">
                      {formatUSD(bk.total_agreed_price)}
                      {addonsCount > 0 && (
                        <span className="block text-[10px] text-purple-700 font-medium">
                          +{addonsCount} {lang === 'kh' ? 'សម្ភារៈ' : 'add-ons'}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-600 font-mono">
                      {formatUSD(bk.total_paid)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-rose-500 font-mono">
                      {formatUSD(bk.remaining_due)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => onOpenHandover && onOpenHandover(b)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap transition-transform active:scale-95 cursor-pointer ${
                          b.handover 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100' 
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200'
                        }`}
                        title={lang === 'kh' ? 'ពិនិត្យ ឬកត់ត្រាការប្រគល់ស្តង់' : 'Inspect or record booth handover'}
                      >
                        {b.handover ? (
                          <>
                            <span>✓</span>
                            <span>{lang === 'kh' ? 'បានប្រគល់' : 'Handed Over'}</span>
                          </>
                        ) : (
                          <>
                            <span>⏳</span>
                            <span>{lang === 'kh' ? 'រង់ចាំ' : 'Pending'}</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {bk.booking_status === 'fully_paid' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 whitespace-nowrap">
                          ✓ {lang === 'kh' ? 'បានបង់ដាច់' : t('status_fully_paid')}
                        </span>
                      ) : bk.booking_status === 'deposit_paid' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                          ⏳ {lang === 'kh' ? 'បានបង់កក់' : t('status_deposit_paid')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                          {bk.booking_status === 'confirmed' ? (lang === 'kh' ? 'មិនទាន់បង់' : t('status_sold_unpaid')) : `⏱️ ${lang === 'kh' ? 'កំពុងកក់ទុក' : t('status_hold')}`}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Quick Record Payment button if balance remains */}
                        {onAddPayment && Number(bk.remaining_due || 0) > 0 && (
                          <button
                            type="button"
                            onClick={() => onAddPayment(b)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 shadow-xs transition-all cursor-pointer whitespace-nowrap active:scale-95"
                            title={lang === 'kh' ? 'កត់ត្រាការបង់ប្រាក់រហ័ស' : 'Record payment'}
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>{lang === 'kh' ? 'បង់ប្រាក់' : 'Pay'}</span>
                          </button>
                        )}

                        {/* If pending payment and user is finance/admin */}
                        {isFinance && bk.payment_notes?.some(p => p.verification_status === 'pending') && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                const pending = bk.payment_notes.find(p => p.verification_status === 'pending');
                                if (pending) onVerifyPayment(pending.id);
                              }}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 shadow-xs transition-colors cursor-pointer whitespace-nowrap active:scale-95"
                              title={lang === 'kh' ? 'ផ្ទៀងផ្ទាត់ការបង់ប្រាក់' : 'Verify payment'}
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>{lang === 'kh' ? 'ផ្ទៀងផ្ទាត់' : 'Verify'}</span>
                            </button>
                            {onRejectPayment && (
                              <button
                                type="button"
                                onClick={() => {
                                  const pending = bk.payment_notes.find(p => p.verification_status === 'pending');
                                  if (pending) onRejectPayment(pending.id);
                                }}
                                className="px-2 py-1 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 shadow-xs transition-colors cursor-pointer whitespace-nowrap active:scale-95"
                                title={lang === 'kh' ? 'បដិសេធការបង់ប្រាក់' : 'Reject payment'}
                              >
                                <span>✕</span>
                              </button>
                            )}
                          </div>
                        )}

                        {/* Handover action button */}
                        {onOpenHandover && (
                          <button
                            type="button"
                            onClick={() => onOpenHandover(b)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer active:scale-95 ${
                              b.handover 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-purple-50 hover:text-purple-600'
                            }`}
                            title={lang === 'kh' ? 'លិខិតប្រគល់ស្តង់ (Handover)' : 'Booth Handover Protocol'}
                            aria-label={lang === 'kh' ? 'លិខិតប្រគល់ស្តង់' : 'Booth Handover'}
                          >
                            <ClipboardCheck className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Invoice & Receipt generator */}
                        {onOpenInvoice && (
                          <>
                            <button
                              type="button"
                              onClick={() => onOpenInvoice(b, 'invoice')}
                              className="p-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-slate-600 border border-slate-200 transition-colors cursor-pointer active:scale-95"
                              title={lang === 'kh' ? 'ចេញវិក្កយបត្រ (Invoice)' : 'Issue Invoice'}
                              aria-label={lang === 'kh' ? 'ចេញវិក្កយបត្រ' : 'Issue Invoice'}
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenInvoice(b, 'receipt')}
                              className="p-1.5 rounded-lg bg-slate-50 hover:bg-emerald-50 hover:text-emerald-600 text-slate-600 border border-slate-200 transition-colors cursor-pointer active:scale-95"
                              title={lang === 'kh' ? 'ចេញបង្កាន់ដៃបង់ប្រាក់ (Receipt)' : 'Print Receipt'}
                              aria-label={lang === 'kh' ? 'ចេញបង្កាន់ដៃបង់ប្រាក់' : 'Print Receipt'}
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => onSelectBooth(b)}
                          className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white text-xs font-bold transition-all flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
                          title={lang === 'kh' ? 'មើលព័ត៌មានលម្អិតស្តង់' : 'View booth details'}
                          aria-label={lang === 'kh' ? 'មើលព័ត៌មានលម្អិតស្តង់' : 'View booth details'}
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400 text-xs">
                    {t('noBookingsMatch')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
