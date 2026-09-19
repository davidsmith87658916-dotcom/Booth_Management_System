import React, { useState, useEffect } from 'react';
import { 
  X, 
  Clock, 
  CheckCircle2, 
  CreditCard, 
  Trash2, 
  Edit3, 
  ShoppingBag, 
  History, 
  FileText, 
  Printer,
  IdCard,
  ClipboardCheck,
  Package
} from 'lucide-react';
import { useLanguage } from '../i18n';
import AddonServicesModal from './AddonServicesModal';
import ExhibitorBadgesModal from './ExhibitorBadgesModal';
import BoothHandoverModal from './BoothHandoverModal';

export default function BoothDrawer({ 
  booth, 
  onClose, 
  onConvertSold, 
  onAddPayment,
  onConfirmSale, 
  onReleaseBooth, 
  user, 
  currentEvent,
  onReload,
  onOpenInvoice, 
  onVerifyPayment, 
  onRejectPayment,
  onExtendHold 
}) {
  const { lang, t } = useLanguage();
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [activeSubModal, setActiveSubModal] = useState(null); // 'addons' | 'badges' | 'handover'

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  if (!booth) return null;

  const booking = booth.active_booking;
  const canEdit = user?.role === 'admin' || !booking || booking.staff_id === user?.id;
  const isHold = booth.status === 'hold';
  const isSold = booth.status === 'sold';
  const isAvailable = booth.status === 'available';
  const isBlocked = booth.status === 'blocked';

  const formatUSD = (num) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(num || 0);
  };

  const statusLabel = isAvailable 
    ? (lang === 'kh' ? 'នៅទំនេរ' : 'Available')
    : isHold 
      ? (lang === 'kh' ? 'កំពុងកក់ទុក' : 'On hold')
      : isSold 
        ? (lang === 'kh' ? 'បានលក់ដាច់' : 'Sold')
        : (lang === 'kh' ? 'បិទដំណើរការ' : 'Blocked');

  const categoryName = lang === 'kh' && (booth.category_name_kh || booth.category_name)
    ? (booth.category_name_kh || booth.category_name)
    : (booth.category_name || 'Standard Shell Scheme');

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">{booth.booth_code}</h2>
            
            {/* Status Badge */}
            {isAvailable && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                {statusLabel}
              </span>
            )}
            {isHold && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                {statusLabel}
              </span>
            )}
            {isSold && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                {statusLabel}
              </span>
            )}
            {isBlocked && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
                {statusLabel}
              </span>
            )}
          </div>

          <button 
            aria-label="Close booth details" 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          
          {/* 3D Booth Preview Card */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-xs bg-slate-100">
            <img 
              src={booth.model_3d_url || "/assets/booth_standard_3d.jpg"} 
              alt={booth.booth_code} 
              className="w-full h-44 object-cover hover:scale-105 transition-transform duration-500"
            />
          </div>

          {/* Booth Information Section */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4">
            <h4 className="font-black text-slate-900 text-sm mb-3">
              {lang === 'kh' ? 'ព័ត៌មានស្តង់' : 'Booth Information'}
            </h4>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">{lang === 'kh' ? 'លេខកូដស្តង់' : 'Booth Number'}</span>
                <span className="font-bold text-slate-900">{booth.booth_code}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">{lang === 'kh' ? 'ទំហំ' : 'Size'}</span>
                <span className="font-bold text-slate-900">{booth.dimensions || '3 m x 3 m (9 m²)'}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">{lang === 'kh' ? 'តំបន់' : 'Area'}</span>
                <span className="font-bold text-slate-900">{booth.zone || 'Hall A'} - {categoryName}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">{lang === 'kh' ? 'ស្ថានភាព' : 'Status'}</span>
                <span className="font-bold flex items-center gap-1.5 text-slate-900">
                  <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-emerald-500' : isHold ? 'bg-amber-500' : isSold ? 'bg-blue-600' : 'bg-slate-400'}`}></span>
                  <span>{statusLabel}</span>
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">{lang === 'kh' ? 'តម្លៃ' : 'Price'}</span>
                <span className="font-black text-blue-700 text-sm font-mono">{formatUSD(booth.price || 650)}</span>
              </div>

              <div className="py-1">
                <span className="text-slate-500 font-medium block mb-1">{lang === 'kh' ? 'សេចក្តីពិពណ៌នា' : 'Description'}</span>
                <p className="text-slate-700 leading-relaxed font-normal">
                  {booth.notes || (lang === 'kh' ? 'ស្តង់ស្ដង់ដារ រួមមានតុ ១ កៅអី ២ អំពូលភ្លើង និងព្រីភ្លើង។' : 'Standard booth with table, 2 chairs, lighting, and power outlet.')}
                </p>
              </div>
            </div>
          </div>

          {/* Hold Countdown Banner */}
          {isHold && booking?.hold_expires_at && (() => {
            let countdown = null;
            try {
              const exp = new Date(booking.hold_expires_at.replace(' ', 'T') + 'Z').getTime();
              const diffMs = exp - currentTime;
              if (diffMs <= 0) {
                countdown = { text: lang === 'kh' ? 'ផុតកំណត់ហើយ' : 'Expired', expired: true };
              } else {
                const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
                const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                countdown = {
                  text: lang === 'kh' ? `នៅសល់ ${totalHours} ម៉ោង ${mins} នាទី` : `${totalHours}h ${mins}m left`,
                  expired: false
                };
              }
            } catch {
              // ignore
            }

            return (
              <div className={`p-3 rounded-2xl flex items-center justify-between gap-2 text-xs border ${
                countdown?.expired ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <div className="flex items-center gap-2 font-bold">
                  <Clock className={`w-4 h-4 shrink-0 ${countdown?.expired ? 'text-rose-600' : 'text-amber-600'}`} />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span>{lang === 'kh' ? 'កាលបរិច្ឆេទ Hold:' : 'Hold Expiry:'}</span>
                      <span className="font-mono">{booking.hold_expires_at}</span>
                    </div>
                    {countdown && (
                      <span className={`inline-block text-[11px] font-extrabold mt-0.5 px-2 py-0.2 rounded-md ${
                        countdown.expired ? 'bg-rose-200/80 text-rose-950' : 'bg-amber-200/80 text-amber-950'
                      }`}>
                        ⏳ {countdown.text}
                      </span>
                    )}
                  </div>
                </div>
                {onExtendHold && canEdit && (
                  <button
                    type="button"
                    onClick={() => onExtendHold(booking.id, 24)}
                    className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold rounded-lg text-[11px] transition-colors cursor-pointer active:scale-95 shrink-0"
                  >
                    {lang === 'kh' ? '+២៤ម៉ោង' : '+24h'}
                  </button>
                )}
              </div>
            );
          })()}

          {/* Exhibitor Dossier if Booked / Sold / Hold */}
          {booking && (
            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/80 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">
                    {t('exhibitorDossier', 'Exhibitor Dossier')}
                  </span>
                  {booth.handover ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      ✓ {lang === 'kh' ? 'បានប្រគល់ស្តង់' : 'Handed Over'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/80 text-slate-700">
                      ⏳ {lang === 'kh' ? 'រង់ចាំ Check-in' : 'Pending Check-in'}
                    </span>
                  )}
                </div>
                <span className="font-bold text-blue-700 text-[11px] uppercase bg-blue-100/70 px-2 py-0.5 rounded-md">
                  {booking.booking_status}
                </span>
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-sm">{booking.exhibitor_name}</h4>
                {booking.fascia_name && (
                  <p className="font-bold text-blue-700 text-[11px]">
                    {lang === 'kh' ? 'ស្លាកឈ្មោះ' : 'Fascia'}: "{booking.fascia_name}"
                  </p>
                )}
                <p className="text-slate-600 mt-0.5">{booking.contact_person} • {booking.phone}</p>
              </div>
              
              <div className="pt-2 border-t border-blue-200/60 flex justify-between font-bold text-xs">
                <span className="text-slate-700">{t('paidAmountLabel', 'Paid')}: {formatUSD(booking.total_paid)}</span>
                <span className="text-rose-600">{t('dueAmountLabel', 'Due')}: {formatUSD(booking.remaining_due)}</span>
              </div>

              {/* Operations Tool Buttons: Addons, Badges, Handover */}
              <div className="pt-2 border-t border-blue-200/60 grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveSubModal('addons')}
                  className="py-1.5 px-2 bg-white hover:bg-purple-50 text-purple-700 font-bold border border-purple-200 rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                  title={lang === 'kh' ? 'កុម្ម៉ង់សម្ភារៈបន្ថែម' : 'Addon Services'}
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span className="truncate">{lang === 'kh' ? 'សម្ភារៈបន្ថែម' : 'Add-ons'}</span>
                  {booking.addons?.length > 0 && (
                    <span className="text-[9px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded-full font-bold">
                      {booking.addons.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSubModal('badges')}
                  className="py-1.5 px-2 bg-white hover:bg-purple-50 text-purple-700 font-bold border border-purple-200 rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                  title={lang === 'kh' ? 'ប័ណ្ណសម្គាល់បុគ្គលិកស្តង់' : 'Exhibitor Badges'}
                >
                  <IdCard className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span className="truncate">{lang === 'kh' ? 'ប័ណ្ណបុគ្គលិក' : 'Badges'}</span>
                  {booking.badges?.length > 0 && (
                    <span className="text-[9px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded-full font-bold">
                      {booking.badges.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSubModal('handover')}
                  className={`py-1.5 px-2 bg-white font-bold border rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95 ${
                    booth.handover 
                      ? 'hover:bg-emerald-50 text-emerald-700 border-emerald-300' 
                      : 'hover:bg-purple-50 text-purple-700 border-purple-200'
                  }`}
                  title={lang === 'kh' ? 'ការត្រួតពិនិត្យ និងប្រគល់ស្តង់' : 'Handover Protocol'}
                >
                  <ClipboardCheck className={`w-3.5 h-3.5 shrink-0 ${booth.handover ? 'text-emerald-600' : 'text-purple-600'}`} />
                  <span className="truncate">{lang === 'kh' ? 'ប្រគល់ស្តង់' : 'Handover'}</span>
                  {booth.handover && (
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold">
                      ✓
                    </span>
                  )}
                </button>
              </div>

              {/* Payment Notes Verification List */}
              {booking.payment_notes && booking.payment_notes.length > 0 && (
                <div className="pt-2 border-t border-blue-200/60 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    {lang === 'kh' ? 'ប្រវត្តិទូទាត់ប្រាក់' : 'Payment History'}
                  </span>
                  {booking.payment_notes.map((pn) => {
                    const isPending = pn.verification_status === 'pending';
                    const isFinance = user?.role === 'admin' || user?.role === 'accountant';
                    return (
                      <div key={pn.id} className="p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 font-mono">{formatUSD(pn.paid_amount)}</span>
                          <span className="text-[11px] text-slate-500 ml-2">({pn.payment_method})</span>
                          {pn.reference_slip_no && <div className="text-[10px] font-mono text-slate-400">Ref: {pn.reference_slip_no}</div>}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isPending ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {isPending ? (lang === 'kh' ? 'រង់ចាំផ្ទៀងផ្ទាត់' : 'Pending') : (lang === 'kh' ? 'បានផ្ទៀងផ្ទាត់' : 'Verified')}
                          </span>
                          {isPending && isFinance && onVerifyPayment && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => onVerifyPayment(pn.id)}
                                className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded text-[10px] cursor-pointer"
                                title={lang === 'kh' ? 'ផ្ទៀងផ្ទាត់ការបង់ប្រាក់' : 'Verify payment'}
                              >
                                ✓ {lang === 'kh' ? 'Confirm' : 'Verify'}
                              </button>
                              {onRejectPayment && (
                                <button
                                  type="button"
                                  onClick={() => onRejectPayment(pn.id)}
                                  className="px-1.5 py-0.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded text-[10px] cursor-pointer"
                                  title={lang === 'kh' ? 'បដិសេធការបង់ប្រាក់' : 'Reject payment'}
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          )}
                          {onOpenInvoice && (
                            <button
                              type="button"
                              onClick={() => onOpenInvoice(booth, 'receipt', pn)}
                              className="p-1 rounded bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-500 cursor-pointer transition-colors"
                              title={lang === 'kh' ? 'បោះពុម្ពបង្កាន់ដៃនេះ' : 'Print receipt'}
                            >
                              <Printer className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Invoice & Receipt quick action bar */}
              {onOpenInvoice && (
                <div className="pt-2 border-t border-blue-200/60 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenInvoice(booth, 'invoice')}
                    className="flex-1 py-1.5 px-3 bg-white hover:bg-blue-50 text-blue-700 font-bold border border-blue-200 rounded-xl text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{lang === 'kh' ? 'វិក្កយបត្រ (Invoice)' : 'Invoice'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenInvoice(booth, 'receipt')}
                    className="flex-1 py-1.5 px-3 bg-white hover:bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 rounded-xl text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>{lang === 'kh' ? 'បង្កាន់ដៃ (Receipt)' : 'Receipt'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/80 space-y-2 shrink-0">
          
          {/* Primary Action Button: Book This Booth */}
          {isAvailable && (
            <button 
              type="button"
              onClick={() => onConvertSold(booth)}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer text-xs active:scale-98"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{lang === 'kh' ? 'កក់ស្តង់នេះ' : 'Book This Booth'}</span>
            </button>
          )}

          {isHold && canEdit && booking && (
            <button 
              type="button"
              onClick={() => onConfirmSale(booking.id)}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer text-xs active:scale-98"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{t('convertToSold', 'Convert to Sold')}</span>
            </button>
          )}

          {/* Secondary Action: Add Payment / Edit Details */}
          <div className="grid grid-cols-2 gap-2">
            {(isHold || isSold) ? (
              <button 
                type="button"
                disabled={!booking || booking.remaining_due <= 0} 
                onClick={() => onAddPayment(booth)}
                className="py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs disabled:opacity-40 active:scale-98"
              >
                <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                <span>{t('addPayment', 'Add Payment')}</span>
              </button>
            ) : (
              <button 
                type="button"
                onClick={onClose}
                className="py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs active:scale-98"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                <span>{lang === 'kh' ? 'បិទផ្ទាំង' : 'Close'}</span>
              </button>
            )}

            {isHold ? (
              <button 
                type="button"
                onClick={() => onReleaseBooth(booth.id)}
                className="py-2.5 px-3 bg-white hover:bg-rose-50 text-rose-600 font-bold rounded-xl border border-rose-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs active:scale-98"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('releaseBooth', 'Release')}</span>
              </button>
            ) : (
              <button 
                type="button"
                onClick={onClose}
                className="py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs active:scale-98"
              >
                <History className="w-3.5 h-3.5 text-slate-500" />
                <span>{lang === 'kh' ? 'រួចរាល់' : 'Done'}</span>
              </button>
            )}
          </div>

        </div>

      </div>

      {/* Operations Sub-Modals */}
      {activeSubModal === 'addons' && (
        <AddonServicesModal 
          booth={booth} 
          currentEvent={currentEvent} 
          canEdit={canEdit}
          onClose={() => setActiveSubModal(null)} 
          onAddonsUpdated={onReload}
        />
      )}
      {activeSubModal === 'badges' && (
        <ExhibitorBadgesModal 
          booth={booth} 
          currentEvent={currentEvent} 
          canEdit={canEdit}
          onClose={() => setActiveSubModal(null)} 
          onBadgesUpdated={onReload}
        />
      )}
      {activeSubModal === 'handover' && (
        <BoothHandoverModal 
          booth={booth} 
          currentEvent={currentEvent} 
          user={user} 
          onClose={() => setActiveSubModal(null)} 
          onHandoverSaved={onReload}
        />
      )}

    </div>
  );
}
