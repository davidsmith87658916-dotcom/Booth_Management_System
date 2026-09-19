import ModalFrame from './ModalFrame';
import React, { useState } from 'react';
import { X, CreditCard, CheckCircle2, Smartphone, Building, Banknote, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../i18n';

export default function PaymentRecordModal({ 
  booth, 
  onClose, 
  onSavePayment,
  lang: propLang
}) {
  const { lang: ctxLang, t } = useLanguage();
  const lang = propLang || ctxLang || 'kh';
  const booking = booth?.active_booking;

  const [saving, setSaving] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('ABA Bank');
  const [amount, setAmount] = useState(booking?.remaining_due ?? 0);
  const [referenceSlip, setReferenceSlip] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState(lang === 'kh' ? 'ប្រាក់បង់កក់ស្តង់' : 'Deposit payment');

  if (!booth || !booking) return null;

  const formatUSD = (num) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(num || 0);
  };

  const paymentMethods = [
    { id: 'ABA Bank', nameEn: 'ABA Bank', nameKh: 'ធនាគារ ABA', icon: Smartphone, color: 'text-sky-600 bg-sky-50 border-sky-200' },
    { id: 'Bank Transfer', nameEn: 'Bank Transfer', nameKh: 'ផ្ទេរតាមធនាគារ', icon: ShieldCheck, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
    { id: 'Wing', nameEn: 'Wing', nameKh: 'វីង ម៉ាន់នី', icon: Smartphone, color: 'text-lime-600 bg-lime-50 border-lime-200' },
    { id: 'Canadia', nameEn: 'Canadia', nameKh: 'កាណាឌីយ៉ា', icon: Building, color: 'text-red-600 bg-red-50 border-red-200' },
    { id: 'Cash', nameEn: 'Cash', nameKh: 'សាច់ប្រាក់', icon: Banknote, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { id: 'Check', nameEn: 'Check', nameKh: 'មូលប្បទានប័ត្រ', icon: CreditCard, color: 'text-blue-600 bg-blue-50 border-blue-200' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!amount || Number(amount) <= 0 || Number(amount) > booking.remaining_due) {
      alert(t('enterValidAmountAlert', 'Please enter a valid payment amount'));
      return;
    }

    const payload = {
      paid_amount: Number(amount),
      remaining_balance: Math.max(0, booking.remaining_due - Number(amount)),
      payment_method: paymentMethod,
      reference_slip_no: referenceSlip || `REF-${Date.now().toString().slice(-6)}`,
      payment_date: paymentDate + "T00:00:00",
      note_text: notes
    };

    setSaving(true);
    try { await onSavePayment(booking.id, payload); } finally { setSaving(false); }
  };

  return (
    <ModalFrame onClose={onClose} label={t('paymentRecordModalTitle', 'Payment record')}>
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col modal-enter">
        
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="text-base font-black text-slate-900">
              {t('paymentRecordModalTitle', 'Payment Record')}
            </h3>
          </div>
          <button 
            aria-label="Close dialog" onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Summary Ribbon */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200/80 grid grid-cols-4 gap-2 text-center text-xs">
          <div>
            <span className="text-slate-400 block text-[11px] font-semibold">{t('bookingNo', 'Booking No.')}</span>
            <span className="font-black text-slate-800">BK-{booking.id.toString().padStart(4, '0')}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] font-semibold">{t('boothCol', 'Booth')}</span>
            <span className="font-black text-blue-600">{booth.booth_code}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] font-semibold">{t('totalAmount', 'Total Amount')}</span>
            <span className="font-bold text-slate-800">{formatUSD(booking.total_agreed_price)}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] font-semibold">{t('paidAmount', 'Paid Amount')}</span>
            <span className="font-black text-emerald-600">{formatUSD(booking.total_paid)}</span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">
              {t('paymentMethodChoice', 'Payment Method')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {paymentMethods.map(method => {
                const isSelected = paymentMethod === method.id;
                const IconComp = method.icon;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                      isSelected 
                        ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-100 shadow-xs' 
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className={`p-1.5 rounded-lg ${method.color}`}>
                      <IconComp className="w-4 h-4" />
                    </span>
                    <span className={`text-[11px] font-bold ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                      {lang === 'kh' ? method.nameKh : method.nameEn}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('amountUSD', 'Amount (USD)')} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">$</span>
                <input 
                  type="number"
                  step="0.01" min="0.01" max={booking.remaining_due}
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:bg-white focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('refSlipNo', 'Reference / Slip No.')}
              </label>
              <input 
                type="text"
                placeholder={lang === 'kh' ? 'ឧ. ABA123456' : 'e.g. ABA123456'}
                value={referenceSlip}
                onChange={(e) => setReferenceSlip(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 transition-all font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('paymentDate', 'Payment Date')}
              </label>
              <div className="relative">
                <input 
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'kh' ? 'កំណត់សម្គាល់បន្ថែម' : 'Remarks'}
              </label>
              <input 
                type="text"
                placeholder={lang === 'kh' ? 'ឧ. ប្រាក់បង់កក់' : 'e.g. Deposit payment'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 transition-all font-medium"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all"
            >
              {t('cancel', 'Cancel')}
            </button>
            <button
              type="submit" disabled={saving || booking.remaining_due <= 0}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-500/20 transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? t('pleaseWait', 'Saving…') : t('savePayment', 'Save Payment')}</span>
            </button>
          </div>
        </form>

      </div>
    </ModalFrame>
  );
}
