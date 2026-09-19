import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  ClipboardCheck, 
  UserCheck, 
  Phone, 
  Sparkles, 
  Zap, 
  LayoutGrid, 
  PackageCheck, 
  Tag, 
  Clock
} from 'lucide-react';
import { write } from '../api';
import { useLanguage } from '../i18n';

export default function BoothHandoverModal({ booth, currentEvent, user, onClose, onHandoverSaved }) {
  const { lang } = useLanguage();
  const booking = booth?.active_booking;
  const existingHandover = booth?.handover || booking?.handover;

  let initialChecklist = {
    structure_ok: true,
    fascia_name_ok: true,
    carpet_ok: true,
    power_sockets_ok: true,
    furniture_delivered: true,
    cleaning_done: true
  };

  if (existingHandover?.checklist_data) {
    try {
      initialChecklist = { ...initialChecklist, ...JSON.parse(existingHandover.checklist_data) };
    } catch {
      // fallback to initial
    }
  }

  const [checklist, setChecklist] = useState(initialChecklist);
  const [recipientName, setRecipientName] = useState(existingHandover?.recipient_name || booking?.contact_person || '');
  const [recipientPhone, setRecipientPhone] = useState(existingHandover?.recipient_phone || booking?.phone || '');
  const [remarks, setRemarks] = useState(existingHandover?.remarks || '');
  const [status, setStatus] = useState(existingHandover?.status || 'passed');
  const [confirmed, setConfirmed] = useState(existingHandover ? existingHandover.signoff_confirmed : true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');

  if (!booth) return null;

  const toggleCheck = (key) => {
    setChecklist(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const allPassed = Object.values(checklist).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!recipientName.trim() || submitting) return;

    try {
      setSubmitting(true);
      await write(`/booths/${booth.id}/handover`, {
        recipient_name: recipientName.trim(),
        recipient_phone: recipientPhone.trim(),
        checklist_data: JSON.stringify(checklist),
        status: status,
        remarks: remarks.trim() || null,
        signoff_confirmed: confirmed
      });

      setFeedback(lang === 'kh' ? 'បានកត់ត្រាការប្រគល់ស្តង់ដោយជោគជ័យ' : 'Booth handover recorded successfully');
      setTimeout(() => {
        setFeedback('');
        if (onHandoverSaved) onHandoverSaved();
        onClose();
      }, 1000);
    } catch (err) {
      alert(err.message || 'Failed to record handover');
    } finally {
      setSubmitting(false);
    }
  };

  const checklistItems = [
    {
      key: 'structure_ok',
      icon: ShieldCheck,
      titleKh: 'គ្រោងស្តង់ និងជញ្ជាំងរឹងមាំត្រឹមត្រូវ',
      titleEn: 'Structure & Wall Partitions Solid & Secure',
      descKh: 'ជញ្ជាំងអាលុយមីញ៉ូមរឹងមាំ មិនរង្គើ និងគ្មានស្នាមខូចខាត'
    },
    {
      key: 'fascia_name_ok',
      icon: Tag,
      titleKh: 'ផ្លាកឈ្មោះក្រុមហ៊ុន Fascia Name សរសេរត្រឹមត្រូវ',
      titleEn: 'Fascia Board Name & Booth Code Correctly Printed',
      descKh: `ផ្ទៀងផ្ទាត់ឈ្មោះ៖ "${booking?.fascia_name || booking?.exhibitor_name || booth.booth_code}"`
    },
    {
      key: 'carpet_ok',
      icon: LayoutGrid,
      titleKh: 'កម្រាលព្រំស្អាត បិទស្កុតជាប់ល្អ',
      titleEn: 'Carpet Flooring Installed & Clean',
      descKh: 'កម្រាលព្រំស្អាត គ្មានស្នាមប្រឡាក់ និងស្កុតបិទគែមរាបស្មើ'
    },
    {
      key: 'power_sockets_ok',
      icon: Zap,
      titleKh: 'ប្រព័ន្ធភ្លើង និងរន្ធដោតដំណើរការ',
      titleEn: 'Lighting & Power Sockets Fully Operational',
      descKh: 'អំពូលភ្លើងភ្លឺ និងរន្ធដោត 220V មានចរន្តអគ្គិសនី'
    },
    {
      key: 'furniture_delivered',
      icon: PackageCheck,
      titleKh: 'សម្ភារៈតុ កៅអី ប្រគល់គ្រប់ចំនួន',
      titleEn: 'Furniture & Add-on Equipment Delivered',
      descKh: 'តុ កៅអី និងសម្ភារៈកុម្ម៉ង់បន្ថែមបានដាក់ក្នុងស្តង់គ្រប់'
    },
    {
      key: 'cleaning_done',
      icon: Sparkles,
      titleKh: 'ស្តង់បានបោសសម្អាតរួចរាល់',
      titleEn: 'Booth Cleaned & Move-in Ready',
      descKh: 'គ្មានកាកសំណល់ ឬធូលី ត្រៀមរួចរាល់សម្រាប់តាំងទំនិញ'
    }
  ];

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3 overflow-visible">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 shadow-2xs">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div className="overflow-visible">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 leading-normal overflow-visible">
                  {lang === 'kh' ? 'ការចុះឈ្មោះ Check-in និងប្រគល់ស្តង់' : 'Move-in Check-in & Handover Protocol'}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                  {booth.booth_code}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed overflow-visible">
                {booking?.exhibitor_name || (lang === 'kh' ? 'គ្មានទិន្នន័យកក់' : 'No booking')}
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xs animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Existing Handover Verified Banner if already handed over */}
        {existingHandover && (
          <div className="mx-6 mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold">
                ✓
              </div>
              <div>
                <span className="font-bold text-emerald-900 block leading-tight">
                  {lang === 'kh' ? 'បានប្រគល់ស្តង់រួចរាល់ (Handover Completed)' : 'Handover Completed & Verified'}
                </span>
                <span className="text-[11px] text-emerald-700/90 block mt-0.5">
                  {lang === 'kh' ? 'ទទួលដោយ' : 'Received by'}: <strong>{existingHandover.recipient_name}</strong> {existingHandover.recipient_phone ? `(${existingHandover.recipient_phone})` : ''} • {lang === 'kh' ? 'ប្រគល់ដោយ' : 'Staff'}: {existingHandover.staff_name || 'Staff'}
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white text-emerald-800 border border-emerald-200 shadow-2xs shrink-0">
              {existingHandover.checked_in_at ? new Date(existingHandover.checked_in_at).toLocaleDateString() : 'Done'}
            </span>
          </div>
        )}

        {/* Modal Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          
          {/* Section 1: Inspection Checklist (6 Items) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <span>📋</span>
                <span>{lang === 'kh' ? 'បញ្ជីផ្ទៀងផ្ទាត់គុណភាពស្តង់ (Inspection Checklist)' : 'Booth Quality Inspection Checklist'}</span>
              </h4>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${allPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {allPassed ? (lang === 'kh' ? '✓ គ្រប់លក្ខខណ្ឌ' : 'All Checked') : (lang === 'kh' ? 'កំពុងត្រួតពិនិត្យ' : 'Checking')}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {checklistItems.map((item) => {
                const checked = !!checklist[item.key];
                const IconComp = item.icon;
                return (
                  <div
                    key={item.key}
                    onClick={() => toggleCheck(item.key)}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      checked 
                        ? 'bg-purple-50/50 border-purple-200 shadow-2xs' 
                        : 'bg-slate-50/80 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        checked ? 'bg-purple-600 text-white shadow-2xs' : 'bg-slate-200 text-slate-500'
                      }`}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className={`font-bold block leading-snug truncate ${
                          checked ? 'text-purple-950' : 'text-slate-700'
                        }`}>
                          {lang === 'kh' ? item.titleKh : item.titleEn}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {lang === 'kh' ? item.descKh : item.titleKh}
                        </span>
                      </div>
                    </div>

                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
                      checked 
                        ? 'bg-purple-600 border-purple-600 text-white font-bold text-xs' 
                        : 'border-slate-300 bg-white'
                    }`}>
                      {checked && '✓'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Recipient Details */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
            <h4 className="font-black text-slate-900 text-xs flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-purple-600" />
              <span>{lang === 'kh' ? 'ព័ត៌មានតំណាងក្រុមហ៊ុនដែលទទួលស្តង់' : 'Exhibitor Recipient Details'}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  {lang === 'kh' ? 'ឈ្មោះអ្នកទទួលស្តង់ *' : 'Recipient Full Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder={lang === 'kh' ? 'ឧ. សុខ ចាន់' : 'e.g. Sok Chan'}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:border-purple-500 shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  {lang === 'kh' ? 'លេខទូរស័ព្ទអ្នកទទួល' : 'Recipient Phone'}
                </label>
                <input
                  type="text"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="012 999 888"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:border-purple-500 shadow-2xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700">
                {lang === 'kh' ? 'មតិយោបល់ ឬស្ថានភាពត្រួតពិនិត្យបន្ថែម' : 'Handover Remarks / Observations'}
              </label>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder={lang === 'kh' ? 'ឧ. អតិថិជនបានពិនិត្យ និងទទួលយកស្តង់ដោយពេញចិត្ត' : 'e.g. Exhibitor inspected and accepted the booth in good condition'}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:border-purple-500 shadow-2xs resize-none"
              />
            </div>
          </div>

          {/* Section 3: Status & Confirmation Toggle */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStatus('passed')}
                className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                  status === 'passed'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-500/20 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>✓ {lang === 'kh' ? 'ប្រគល់ត្រឹមត្រូវ (Passed)' : 'Passed Protocol'}</span>
                {status === 'passed' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              </button>

              <button
                type="button"
                onClick={() => setStatus('issues_reported')}
                className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                  status === 'issues_reported'
                    ? 'bg-amber-50 text-amber-800 border-amber-300 ring-2 ring-amber-500/20 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>⚠️ {lang === 'kh' ? 'មានបញ្ហាបច្ចេកទេស' : 'Issues Reported'}</span>
                {status === 'issues_reported' && <AlertTriangle className="w-4 h-4 text-amber-600" />}
              </button>
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-purple-50/50 border border-purple-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
              />
              <span className="text-xs font-bold text-purple-950 leading-relaxed">
                {lang === 'kh' 
                  ? 'ខ្ញុំសូមបញ្ជាក់ថាបានចុះត្រួតពិនិត្យ និងប្រគល់ស្តង់ជូនតំណាងក្រុមហ៊ុនរួចរាល់' 
                  : 'I confirm that this booth has been officially inspected and handed over to the exhibitor.'}
              </span>
            </label>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={submitting || !recipientName.trim()}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm shadow-purple-500/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {submitting 
                ? (lang === 'kh' ? 'កំពុងរក្សាទុក...' : 'Saving…') 
                : (lang === 'kh' ? '💾 រក្សាទុកការប្រគល់ស្តង់' : 'Save Handover Protocol')}
            </span>
          </button>
        </form>

      </div>
    </div>
  );
}
