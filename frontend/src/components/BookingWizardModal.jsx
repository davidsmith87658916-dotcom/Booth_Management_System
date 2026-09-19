import ModalFrame from './ModalFrame';
import React, { useState } from 'react';
import { X, Check, Clock, ChevronRight, ChevronLeft, Sparkles, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../i18n';

export default function BookingWizardModal({ 
  booth, 
  onClose, 
  onSubmitBooking, 
  lang: propLang 
}) {
  const { lang: ctxLang, t } = useLanguage();
  const lang = propLang || ctxLang || 'kh';

  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Exhibitor Info
    companyName: '',
    contactPerson: '',
    phone: '',
    telegram: '',
    email: '',
    businessIndustry: 'Technology & IT Solutions',
    fasciaName: '',

    // Step 2: Pricing & Hold
    bookingType: 'confirmed', // 'hold' or 'deposit_paid' or 'fully_paid'
    holdHours: 48,
    agreedPrice: booth ? booth.price : 1200,

    // Step 3: Initial Payment Note (Optional if Hold)
    initialPaidAmount: 0,
    paymentMethod: 'ABA Bank Transfer',
    referenceSlipNo: '',
    paymentNotes: '',
    salesNotes: ''
  });

  if (!booth) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      // Auto fill fascia name if company name is entered and fascia is empty
      ...(field === 'companyName' && !prev.fasciaName ? { fasciaName: value.toUpperCase() } : {})
    }));
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.companyName || !formData.contactPerson || !formData.phone) {
        alert(t('fillRequiredFieldsAlert', 'Please fill in the required fields (*)'));
        return;
      }
    }
    if (currentStep === 2) {
      if (!formData.agreedPrice || Number(formData.agreedPrice) <= 0) {
        alert(t('validPriceAlert', 'Please enter valid agreed price'));
        return;
      }
    }
    if (currentStep === 3) {
      const paid = Number(formData.initialPaidAmount), price = Number(formData.agreedPrice);
      if (paid < 0 || paid > price || (!['hold','confirmed'].includes(formData.bookingType) && paid <= 0) || (formData.bookingType === 'fully_paid' && paid !== price)) {
        alert(t('validPaymentAlert', 'Enter a payment within the agreed price. Fully paid bookings require the full amount.'));
        return;
      }
    }
    if (currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (saving) return;
    const payload = {
      booth_id: booth.id,
      event_id: booth.event_id,

      exhibitor_name: formData.companyName,
      contact_person: formData.contactPerson,
      phone: formData.phone,
      telegram: formData.telegram,
      email: formData.email,
      business_type: formData.businessIndustry,
      fascia_name: formData.fasciaName || formData.companyName,
      booking_status: formData.bookingType,
      sales_notes: formData.salesNotes,
      hold_hours: Number(formData.holdHours) || 48,
      total_agreed_price: Number(formData.agreedPrice),
      initial_payment: formData.initialPaidAmount > 0 ? {
        paid_amount: Number(formData.initialPaidAmount),
        remaining_balance: Math.max(0, Number(formData.agreedPrice) - Number(formData.initialPaidAmount)),
        payment_method: formData.paymentMethod,
        reference_slip_no: formData.referenceSlipNo,
        note_text: formData.paymentNotes
      } : null
    };

    setSaving(true);
    try { await onSubmitBooking(booth.id, payload); } finally { setSaving(false); }
  };

  const steps = [
    { num: 1, title: t('stepExhibitorInfo', 'Exhibitor Info') },
    { num: 2, title: t('stepPricingHold', 'Pricing & Hold') },
    { num: 3, title: t('stepPayment', 'Payment') },
    { num: 4, title: t('stepReview', 'Review') }
  ];

  const industryOptions = [
    { value: 'Technology & IT Solutions', labelEn: 'Technology & IT Solutions', labelKh: 'ដំណោះស្រាយបច្ចេកវិទ្យា និងព័ត៌មានវិទ្យា' },
    { value: 'Fintech & Digital Banking', labelEn: 'Fintech & Digital Banking', labelKh: 'បច្ចេកវិទ្យាហិរញ្ញវត្ថុ និងធនាគារឌីជីថល' },
    { value: 'Telecommunications & 5G', labelEn: 'Telecommunications & 5G', labelKh: 'ទូរគមនាគមន៍ និងបណ្តាញ 5G' },
    { value: 'Food & Hospitality', labelEn: 'Food & Hospitality', labelKh: 'ម្ហូបអាហារ និងបដិសណ្ឋារកិច្ច' },
    { value: 'Retail & Consumer Goods', labelEn: 'Retail & Consumer Goods', labelKh: 'ទំនិញប្រើប្រាស់ និងលក់រាយ' },
    { value: 'Real Estate & Construction', labelEn: 'Real Estate & Construction', labelKh: 'អចលនទ្រព្យ និងសំណង់' },
    { value: 'Education & Training', labelEn: 'Education & Training', labelKh: 'ការអប់រំ និងការបណ្តុះបណ្តាល' },
    { value: 'Other Industry', labelEn: 'Other Industry', labelKh: 'វិស័យផ្សេងៗ' }
  ];

  const paymentMethodOptions = [
    { value: 'ABA Bank Transfer', labelEn: 'ABA Bank Transfer', labelKh: 'ផ្ទេរតាមធនាគារ ABA' },
    { value: 'Bank Transfer (Other)', labelEn: 'Other Bank Transfer', labelKh: 'ផ្ទេរតាមធនាគារផ្សេងៗ' },
    { value: 'Wing Money', labelEn: 'Wing Money', labelKh: 'វីង ម៉ាន់នី (Wing)' },
    { value: 'Canadia Bank', labelEn: 'Canadia Bank', labelKh: 'ធនាគារ កាណាឌីយ៉ា' },
    { value: 'Cash at Office', labelEn: 'Cash at Office', labelKh: 'សាច់ប្រាក់នៅការិយាល័យ' },
    { value: 'Check', labelEn: 'Corporate Check', labelKh: 'មូលប្បទានប័ត្រក្រុមហ៊ុន' }
  ];

  return (
    <ModalFrame onClose={onClose} label={t('newBookingModalTitle', 'New booking')}>
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col modal-enter max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                {t('newBookingModalTitle', 'Record sale or hold')}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {lang === 'kh' ? 'ស្តង់' : 'Booth'} {booth.booth_code} • {booth.category_name} ({booth.dimensions})
              </p>
            </div>
          </div>
          <button 
            aria-label="Close dialog" onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4-Step Stepper Bar */}
        <div className="px-8 py-4 bg-white border-b border-slate-100">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            {steps.map((step, idx) => {
              const isActive = currentStep === step.num;
              const isPassed = currentStep > step.num;
              return (
                <div key={step.num} className="flex items-center gap-2 relative">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isPassed 
                      ? 'bg-emerald-500 text-white shadow-sm' 
                      : isActive 
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-sm' 
                        : 'bg-slate-100 text-slate-500'
                  }`}>
                    {isPassed ? <Check className="w-4 h-4" /> : step.num}
                  </div>
                  <span className={`text-xs font-semibold hidden sm:inline ${
                    isActive ? 'text-blue-600 font-bold' : isPassed ? 'text-slate-700' : 'text-slate-400'
                  }`}>
                    {step.title}
                  </span>
                  {idx < steps.length - 1 && (
                    <div className="w-8 sm:w-12 h-0.5 bg-slate-200 mx-1"></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Body Form */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* STEP 1: EXHIBITOR INFO */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
                {lang === 'kh' ? 'ព័ត៌មានក្រុមហ៊ុន និងអ្នកទំនាក់ទំនង' : 'Company Information'}
              </h4>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('companyOrExhibitorName', 'Company Name *')}
                </label>
                <input 
                  type="text"
                  placeholder={lang === 'kh' ? 'ឧទាហរណ៍៖ ក្រុមហ៊ុន អេប៊ីស៊ី ថេកណូឡូជី' : 'e.g. ABC Technology Co., Ltd.'}
                  value={formData.companyName}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 transition-all font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('contactPersonName', 'Contact Person *')}
                  </label>
                  <input 
                    type="text"
                    placeholder={lang === 'kh' ? 'ឧទាហរណ៍៖ សុខ ចាន់ថា' : 'e.g. John Doe'}
                    value={formData.contactPerson}
                    onChange={(e) => handleChange('contactPerson', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('phoneNumber', 'Phone *')}
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. +855 12 345 678"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('telegramUsername', 'Telegram Username')}
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. @username"
                    value={formData.telegram}
                    onChange={(e) => handleChange('telegram', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('officialEmail', 'Email')}
                  </label>
                  <input 
                    type="email"
                    placeholder="e.g. info@company.com"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('industrySector', 'Business Industry')}
                </label>
                <select
                  value={formData.businessIndustry}
                  onChange={(e) => handleChange('businessIndustry', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 transition-all font-medium"
                >
                  {industryOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {lang === 'kh' ? opt.labelKh : opt.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('printedFasciaName', 'Fascia Name (for booth physical header board)')} <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text"
                  placeholder="e.g. ABC TECHNOLOGY"
                  value={formData.fasciaName}
                  onChange={(e) => handleChange('fasciaName', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 uppercase tracking-wider font-bold"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  {t('fasciaHelperText', 'This text will be printed in capital letters onto the aluminum top panel of the booth.')}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('salesNotesComments', 'Sales notes / Comments')}
                </label>
                <textarea 
                  aria-label="Sales notes" 
                  rows={3} 
                  maxLength={4000} 
                  value={formData.salesNotes} 
                  onChange={e => handleChange('salesNotes', e.target.value)} 
                  placeholder={lang === 'kh' ? 'សំណូមពររបស់អតិថិជន ឬកំណត់ចំណាំផ្ទៃក្នុង...' : 'Customer requests, follow-up details, or sale notes…'} 
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:bg-white focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* STEP 2: PRICING & HOLD */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
                {lang === 'kh' ? 'តម្លៃកិច្ចសន្យា និងលក្ខខណ្ឌកក់' : 'Contract Pricing & Reservation Terms'}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button 
                  type="button"
                  className={`p-4 rounded-xl border text-left transition-all ${
                    formData.bookingType === 'confirmed'
                      ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-200'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                  onClick={() => handleChange('bookingType', 'confirmed')}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-blue-900">
                      {lang === 'kh' ? 'បានលក់ / រង់ចាំទូទាត់' : 'Sold / Payment Pending'}
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-xs text-slate-500">
                    {lang === 'kh' ? 'កក់ស្តង់ភ្លាមៗ រួចកត់ត្រាការបង់ប្រាក់ពេលក្រោយ។' : 'Reserve the sale immediately. Record payment later.'}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleChange('bookingType', 'hold')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    formData.bookingType === 'hold'
                      ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-200'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-amber-900">
                      {lang === 'kh' ? 'កក់ទុកបណ្តោះអាសន្ន' : 'Soft Hold (Reservation)'}
                    </span>
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="text-xs text-slate-500">
                    {lang === 'kh' ? 'កក់ស្តង់ទុកបណ្តោះអាសន្ន ជាមួយពេលវេលារាប់ថយក្រោយ។' : 'Temporarily reserve booth with expiration countdown.'}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleChange('bookingType', 'deposit_paid')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    formData.bookingType === 'deposit_paid'
                      ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-200'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-emerald-900">
                      {lang === 'kh' ? 'ការលក់ដាច់ផ្ទាល់' : 'Direct Sale (Deposit/Full)'}
                    </span>
                    <Check className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-xs text-slate-500">
                    {lang === 'kh' ? 'ចាក់សោជាស្តង់បានលក់ភ្លាមៗ ជាមួយកំណត់ត្រាបង់ប្រាក់។' : 'Lock booth as Sold immediately with payment record.'}
                  </p>
                </button>
              </div>

              {formData.bookingType === 'hold' && (
                <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200">
                  <label className="block text-xs font-bold text-amber-900 mb-1.5">
                    {t('holdDurationLabel', 'Hold Expiration Duration')}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { hours: 24, labelEn: '24 Hours', labelKh: '២៤ ម៉ោង' },
                      { hours: 48, labelEn: '48 Hours', labelKh: '៤៨ ម៉ោង' },
                      { hours: 72, labelEn: '72 Hours', labelKh: '៧២ ម៉ោង' }
                    ].map(item => (
                      <button
                        key={item.hours}
                        type="button"
                        onClick={() => handleChange('holdHours', item.hours)}
                        className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                          formData.holdHours === item.hours
                            ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50'
                        }`}
                      >
                        {lang === 'kh' ? item.labelKh : item.labelEn}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('agreedPriceLabel', 'Total Agreed Contract Price (USD) *')}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">$</span>
                  <input 
                    type="number"
                    value={formData.agreedPrice}
                    onChange={(e) => handleChange('agreedPrice', e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-black text-blue-600 focus:bg-white focus:border-blue-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {lang === 'kh' ? `តម្លៃស្តង់ដារក្នុងបញ្ជី៖ $${Number(booth.price).toLocaleString()}` : `Standard list price: $${Number(booth.price).toLocaleString()}`}
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: PAYMENT DETAILS */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
                {t('step3InitialPayment', 'Initial Payment Record')}
              </h4>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('paymentAmountReceived', 'Initial Paid Amount (USD)')} {!['hold','confirmed'].includes(formData.bookingType) && <span className="text-rose-500">*</span>}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">$</span>
                  <input 
                    type="number"
                    placeholder="0.00"
                    value={formData.initialPaidAmount}
                    onChange={(e) => handleChange('initialPaidAmount', e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-black text-slate-900 focus:bg-white focus:border-blue-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {lang === 'kh' ? 'សមតុល្យនៅសល់នឹងត្រូវបានតាមដានដោយស្វ័យប្រវត្តិក្នងប្រវត្តិនៃការបង់ប្រាក់។' : 'Remaining balance will automatically be tracked in payment ledger.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('paymentMethod', 'Payment Method')}
                </label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => handleChange('paymentMethod', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 transition-all font-medium"
                >
                  {paymentMethodOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {lang === 'kh' ? opt.labelKh : opt.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('bankSlipReference', 'Reference / Slip Receipt No.')}
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. ABA-TXN-984021"
                    value={formData.referenceSlipNo}
                    onChange={(e) => handleChange('referenceSlipNo', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('notes', 'Payment Remarks')}
                  </label>
                  <input 
                    type="text"
                    placeholder={lang === 'kh' ? 'ឧ. បង់ប្រាក់កក់ដំណាក់កាលទី ១' : 'e.g. 50% deposit received'}
                    value={formData.paymentNotes}
                    onChange={(e) => handleChange('paymentNotes', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 transition-all font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & CONFIRM */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
                {t('step4ReviewSummary', 'Booking Summary Review')}
              </h4>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">{lang === 'kh' ? 'លេខកូដ និងប្រភេទស្តង់៖' : 'Booth Code & Category:'}</span>
                  <span className="font-bold text-slate-900">{booth.booth_code} ({booth.category_name})</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">{lang === 'kh' ? 'ឈ្មោះក្រុមហ៊ុនតាំងពិព័រណ៍៖' : 'Exhibitor Name:'}</span>
                  <span className="font-bold text-slate-900">{formData.companyName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">{lang === 'kh' ? 'អ្នកទំនាក់ទំនង៖' : 'Contact Person:'}</span>
                  <span className="font-bold text-slate-900">{formData.contactPerson} ({formData.phone})</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">{lang === 'kh' ? 'ឈ្មោះលើផ្លាកស្តង់៖' : 'Fascia Sign:'}</span>
                  <span className="font-black text-blue-700">{formData.fasciaName || formData.companyName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">{lang === 'kh' ? 'ប្រភេទនៃការកក់៖' : 'Contract Type:'}</span>
                  <span className="font-bold uppercase text-amber-600">
                    {formData.bookingType === 'confirmed' 
                      ? (lang === 'kh' ? 'បានលក់ / រង់ចាំទូទាត់' : 'Sold / Pending')
                      : formData.bookingType === 'hold' 
                        ? (lang === 'kh' ? 'កក់ទុកបណ្តោះអាសន្ន' : 'Soft Hold')
                        : (lang === 'kh' ? 'ការលក់ដាច់ផ្ទាល់' : 'Direct Sale')}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">{lang === 'kh' ? 'តម្លៃព្រមព្រៀងសរុប៖' : 'Total Agreed Price:'}</span>
                  <span className="font-black text-slate-900 text-sm">${Number(formData.agreedPrice).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">{lang === 'kh' ? 'ប្រាក់បង់ដំបូង៖' : 'Initial Paid Amount:'}</span>
                  <span className="font-black text-emerald-600 text-sm">${Number(formData.initialPaidAmount).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Buttons */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          {currentStep === 1 ? (
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all"
            >
              {t('cancel', 'Cancel')}
            </button>
          ) : (
            <button 
              type="button"
              onClick={handleBack}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold flex items-center gap-1 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>{t('previous', 'Back')}</span>
            </button>
          )}

          {currentStep < 4 ? (
            <button 
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition-all"
            >
              <span>{t('next', 'Next')}: {steps[currentStep].title}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button 
              type="button"
              disabled={saving} onClick={handleSubmit}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>{t('confirmAndSave', 'Confirm & Lock Booking')}</span>
            </button>
          )}
        </div>

      </div>
    </ModalFrame>
  );
}
