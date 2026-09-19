import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  IdCard, 
  Printer, 
  UserCheck, 
  QrCode, 
  Building2, 
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { write } from '../api';
import { useLanguage } from '../i18n';

export default function ExhibitorBadgesModal({ booth, currentEvent, onClose, onBadgesUpdated, canEdit = true }) {
  const { lang, t } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [activePreviewBadge, setActivePreviewBadge] = useState(null);
  const [formName, setFormName] = useState('');
  const [formPosition, setFormPosition] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formType, setFormType] = useState('exhibitor');
  const [feedback, setFeedback] = useState('');

  const booking = booth?.active_booking;
  const badges = booking?.badges || [];

  if (!booth || !booking) return null;

  const currentPreview = activePreviewBadge || badges[0] || null;

  const handleCreateBadge = async (e) => {
    e.preventDefault();
    if (!formName.trim() || submitting) return;

    try {
      setSubmitting(true);
      const newBadge = await write(`/bookings/${booking.id}/badges`, {
        full_name: formName.trim(),
        position: formPosition.trim() || (lang === 'kh' ? 'បុគ្គលិកប្រចាំស្តង់' : 'Booth Staff'),
        phone: formPhone.trim() || booking.phone,
        badge_type: formType
      });
      setFormName('');
      setFormPosition('');
      setFormPhone('');
      setActivePreviewBadge(newBadge);
      setFeedback(lang === 'kh' ? 'បានបង្កើតប័ណ្ណសម្គាល់ជោគជ័យ' : 'Badge created successfully');
      setTimeout(() => setFeedback(''), 3000);
      if (onBadgesUpdated) await onBadgesUpdated();
    } catch (err) {
      alert(err.message || 'Failed to create badge');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBadge = async (badgeId) => {
    if (submitting) return;
    try {
      setSubmitting(true);
      await write(`/bookings/${booking.id}/badges/${badgeId}`, {}, 'DELETE');
      if (activePreviewBadge?.id === badgeId) {
        setActivePreviewBadge(null);
      }
      if (onBadgesUpdated) await onBadgesUpdated();
    } catch (err) {
      alert(err.message || 'Failed to delete badge');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getBadgeTypeBadge = (type) => {
    if (type === 'vip') {
      return (
        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-600 text-white shadow-2xs">
          ★ {lang === 'kh' ? 'ភ្ញៀវពិសេស VIP' : 'VIP PASS'}
        </span>
      );
    }
    if (type === 'contractor') {
      return (
        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-2xs">
          🔧 {lang === 'kh' ? 'អ្នកម៉ៅការ' : 'CONTRACTOR'}
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-2xs">
        💼 {lang === 'kh' ? 'អ្នកតាំងពិព័រណ៍' : 'EXHIBITOR'}
      </span>
    );
  };

  const eventTitle = lang === 'kh' && currentEvent?.name_kh ? currentEvent.name_kh : (currentEvent?.name || 'Expo 2026');

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto print:p-0 print:bg-white animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col max-h-[90vh] overflow-hidden my-auto print:max-h-none print:shadow-none print:border-none print:rounded-none animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Toolbar (Hidden during Print) */}
        <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 print:hidden">
          <div className="flex items-center gap-3 overflow-visible">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 shadow-2xs">
              <IdCard className="w-5 h-5" />
            </div>
            <div className="overflow-visible">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 leading-normal overflow-visible">
                  {lang === 'kh' ? 'ប័ណ្ណសម្គាល់អ្នកតាំងពិព័រណ៍ (Badges & Passes)' : 'Exhibitor Passes & Badges'}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                  {booth.booth_code}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed overflow-visible">
                {booking.exhibitor_name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentPreview && (
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-purple-500/25 transition-all cursor-pointer active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>{lang === 'kh' ? 'បោះពុម្ពប័ណ្ណ' : 'Print Badge'}</span>
              </button>
            )}

            <button 
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xs animate-in fade-in print:hidden">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Modal Body: 2-Columns */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 print:p-0 print:overflow-visible">
          
          {/* Left: Add Attendant Form & Existing Badges List (7 Cols) */}
          <div className="lg:col-span-7 space-y-6 print:hidden">
            
            {/* Create Badge Form */}
            {canEdit ? (
              <form onSubmit={handleCreateBadge} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3.5">
                <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-purple-600" />
                  <span>{lang === 'kh' ? 'ចុះឈ្មោះបុគ្គលិកថ្មីសម្រាប់ស្តង់នេះ' : 'Register New Attendant'}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      {lang === 'kh' ? 'ឈ្មោះពេញ *' : 'Full Name *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder={lang === 'kh' ? 'ឧ. សុខ ចាន់' : 'e.g. Sok Chan'}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:border-purple-500 shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      {lang === 'kh' ? 'តួនាទី / មុខតំណែង' : 'Position / Title'}
                    </label>
                    <input
                      type="text"
                      value={formPosition}
                      onChange={(e) => setFormPosition(e.target.value)}
                      placeholder={lang === 'kh' ? 'ឧ. អ្នកគ្រប់គ្រងផ្នែកលក់' : 'e.g. Sales Manager'}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:border-purple-500 shadow-2xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      {lang === 'kh' ? 'លេខទូរស័ព្ទ' : 'Phone Number'}
                    </label>
                    <input
                      type="text"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="012 345 678"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:border-purple-500 shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      {lang === 'kh' ? 'ប្រភេទប័ណ្ណ' : 'Pass Type'}
                    </label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-purple-500 shadow-2xs"
                    >
                      <option value="exhibitor">{lang === 'kh' ? '💼 អ្នកតាំងពិព័រណ៍ (Exhibitor)' : 'Exhibitor'}</option>
                      <option value="contractor">{lang === 'kh' ? '🔧 អ្នកម៉ៅការដំឡើង (Contractor)' : 'Contractor'}</option>
                      <option value="vip">{lang === 'kh' ? '★ ភ្ញៀវពិសេស (VIP Guest)' : 'VIP Guest'}</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !formName.trim()}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-purple-500/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{lang === 'kh' ? 'បង្កើតប័ណ្ណសម្គាល់' : 'Generate Badge'}</span>
                </button>
              </form>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs text-slate-500 font-medium">
                {lang === 'kh' ? 'មានតែម្ចាស់ការកក់ ឬអ្នកគ្រប់គ្រងប៉ុណ្ណោះដែលអាចចេញ ឬលុបប័ណ្ណសម្គាល់បាន។' : 'Only the booking owner or an administrator can add or remove badges.'}
              </div>
            )}

            {/* List of Registered Badges */}
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1">
                <h4 className="text-xs font-black text-slate-900">
                  {lang === 'kh' ? 'បញ្ជីប័ណ្ណដែលបានចុះឈ្មោះ' : 'Registered Passes'} ({badges.length})
                </h4>
              </div>

              {badges.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 font-medium">
                  {lang === 'kh' ? 'មិនទាន់មានប័ណ្ណបុគ្គលិកនៅឡើយទេ' : 'No badges generated yet.'}
                </div>
              ) : (
                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {badges.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => setActivePreviewBadge(b)}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 text-xs cursor-pointer ${
                        currentPreview?.id === b.id
                          ? 'bg-purple-50/70 border-purple-300 ring-1 ring-purple-400/40 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 truncate">{b.full_name}</span>
                          {getBadgeTypeBadge(b.badge_type)}
                        </div>
                        <span className="text-[11px] text-slate-500 block truncate">
                          {b.position || 'Staff'} {b.phone ? `• ${b.phone}` : ''}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-[10px] text-slate-400">
                          {b.qr_token || 'TOKEN'}
                        </span>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteBadge(b.id);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title={lang === 'kh' ? 'លុបប័ណ្ណ' : 'Delete badge'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right: Printable Badge Card Preview (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 print:p-0 print:col-span-12">
            
            {currentPreview ? (
              <div className="w-[280px] sm:w-[300px] rounded-3xl overflow-hidden bg-white border-2 border-slate-300 shadow-xl print:shadow-none print:border print:w-[320px] print:mx-auto">
                {/* Lanyard Hole Mockup */}
                <div className="h-5 bg-slate-100 border-b border-slate-200 flex items-center justify-center">
                  <div className="w-12 h-2 rounded-full bg-slate-300 border border-slate-400"></div>
                </div>

                {/* Badge Top Banner (Royal Purple) */}
                <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 text-white p-4 text-center">
                  <div className="text-[11px] font-black tracking-widest uppercase opacity-90">
                    EXPOHUB OFFICIAL PASS
                  </div>
                  <h4 className="text-sm font-black leading-tight mt-0.5 truncate">
                    {eventTitle}
                  </h4>
                  <span className="text-[10px] opacity-80 block truncate">
                    {currentEvent?.venue || 'Phnom Penh Exhibition Center'}
                  </span>
                </div>

                {/* Badge Body */}
                <div className="p-5 text-center space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-700 font-black text-2xl mx-auto flex items-center justify-center shadow-xs">
                    {currentPreview.full_name.slice(0, 2).toUpperCase()}
                  </div>

                  <div>
                    <h3 className="text-base font-black text-slate-900 leading-tight">
                      {currentPreview.full_name}
                    </h3>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">
                      {currentPreview.position || 'Exhibitor Staff'}
                    </p>
                  </div>

                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">
                      {lang === 'kh' ? 'ក្រុមហ៊ុនតាំងពិព័រណ៍' : 'Exhibiting Company'}
                    </div>
                    <div className="font-bold text-slate-800 text-xs truncate">
                      {booking.fascia_name || booking.exhibitor_name}
                    </div>
                    <div className="font-mono font-black text-purple-700 text-xs mt-0.5">
                      {lang === 'kh' ? 'ស្តង់លេខ' : 'Booth'}: {booth.booth_code}
                    </div>
                  </div>

                  {/* QR Code Graphic Mockup */}
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 inline-block shadow-2xs">
                    <div className="w-24 h-24 bg-slate-900 text-white rounded-lg flex flex-col items-center justify-center p-2 text-center">
                      <QrCode className="w-14 h-14 text-white" />
                      <span className="font-mono text-[8px] tracking-wider text-slate-300 mt-0.5 truncate max-w-full">
                        {currentPreview.qr_token || 'TOKEN'}
                      </span>
                    </div>
                  </div>

                  <div>
                    {getBadgeTypeBadge(currentPreview.badge_type)}
                  </div>
                </div>

                {/* Badge Bottom Footer */}
                <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center text-[9px] text-slate-400 font-medium">
                  Please wear this badge at all times on the exhibition floor.
                </div>
              </div>
            ) : (
              <div className="text-center text-xs text-slate-400 font-medium py-12">
                <IdCard className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p>{lang === 'kh' ? 'ជ្រើសរើស ឬបង្កើតប័ណ្ណដើម្បីមើលគំរូ' : 'Select or create a badge to preview'}</p>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
