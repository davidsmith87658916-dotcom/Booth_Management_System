import React, { useState } from 'react';
import { X, Copy, Check, Send, Eye } from 'lucide-react';
import { useLanguage } from '../i18n';
import { write } from '../api';

export default function PublicFloorPlanModal({ currentEvent, booths = [], onClose }) {
  const { lang } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [selectedBooth, setSelectedBooth] = useState(null);
  const [inquirySent, setInquirySent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    company_name: '',
    contact_person: '',
    phone: '',
    email: '',
    notes: ''
  });

  if (!currentEvent) return null;

  const publicUrl = `${window.location.origin}/#public-view-${currentEvent.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleInquirySubmit = async (e) => {
    e.preventDefault();
    if (!form.company_name || !form.contact_person || !form.phone || !selectedBooth) {
      alert(lang === 'kh' ? 'សូមបំពេញព័ត៌មានដែលត្រូវការ (*)' : 'Please fill in required fields');
      return;
    }
    setSubmitting(true);
    try {
      await write(`/public/events/${currentEvent.id}/inquire`, {
        booth_code: selectedBooth.booth_code,
        ...form
      });
      setInquirySent(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const availableCount = booths.filter(b => b.status === 'available').length;
  const soldCount = booths.filter(b => b.status === 'sold').length;
  const holdCount = booths.filter(b => b.status === 'hold').length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              <span>{lang === 'kh' ? 'តំណភ្ជាប់ប្លង់ពិព័រណ៍សាធារណៈ (Public Live Floor Plan)' : 'Public Live Floor Plan'}</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {lang === 'kh' ? 'ចែករំលែក Link ទៅកាន់អតិថិជនដើម្បីមើលស្តង់ទំនេរ និងស្នើសុំកក់ផ្ទាល់' : 'Share this link with prospective exhibitors to view available booths.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          
          {/* Share Link Banner */}
          <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block mb-0.5">
                {lang === 'kh' ? 'តំណភ្ជាប់សាធារណៈសម្រាប់ភ្ញៀវ' : 'Public Exhibitor URL'}
              </span>
              <p className="font-mono text-xs text-blue-900 truncate max-w-md select-all">
                {publicUrl}
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopyLink}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-xs transition-colors shrink-0 cursor-pointer active:scale-95"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? (lang === 'kh' ? 'បានចម្លង Link!' : 'Copied Link!') : (lang === 'kh' ? 'ចម្លង Link (Copy)' : 'Copy Link')}</span>
            </button>
          </div>

          {/* Live Inventory Status Bar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl text-center">
              <span className="text-emerald-700 font-bold block">{lang === 'kh' ? 'ស្តង់នៅទំនេរ (Available)' : 'Available'}</span>
              <span className="text-xl font-black text-emerald-800">{availableCount}</span>
            </div>
            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl text-center">
              <span className="text-amber-700 font-bold block">{lang === 'kh' ? 'កំពុងកក់ទុក (Hold)' : 'Reserved'}</span>
              <span className="text-xl font-black text-amber-800">{holdCount}</span>
            </div>
            <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-2xl text-center">
              <span className="text-blue-700 font-bold block">{lang === 'kh' ? 'បានលក់ដាច់ (Sold)' : 'Sold'}</span>
              <span className="text-xl font-black text-blue-800">{soldCount}</span>
            </div>
          </div>

          {/* Interactive Public Preview Grid */}
          <div>
            <h4 className="font-black text-slate-900 text-sm mb-3">
              {lang === 'kh' ? 'ចុចលើស្តង់ទំនេរដើម្បីធ្វើតេស្តការស្នើសុំកក់ (Click an available booth)' : 'Click an available booth to test public inquiry:'}
            </h4>

            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 p-4 bg-slate-100 rounded-2xl border border-slate-200 max-h-56 overflow-y-auto">
              {booths.map(b => {
                const isAvail = b.status === 'available';
                const isSelected = selectedBooth?.id === b.id;
                let bgClass = 'bg-slate-200 text-slate-500 cursor-not-allowed';
                if (isAvail) bgClass = 'bg-emerald-100 border border-emerald-300 text-emerald-800 hover:bg-emerald-200 cursor-pointer shadow-2xs';
                else if (b.status === 'hold') bgClass = 'bg-amber-100 border border-amber-300 text-amber-800 opacity-60 cursor-not-allowed';
                else if (b.status === 'sold') bgClass = 'bg-blue-100 border border-blue-300 text-blue-800 opacity-60 cursor-not-allowed';

                return (
                  <button
                    key={b.id}
                    disabled={!isAvail}
                    onClick={() => { setSelectedBooth(b); setInquirySent(false); }}
                    className={`p-2 rounded-xl text-center flex flex-col items-center justify-center transition-all ${bgClass} ${
                      isSelected ? 'ring-2 ring-blue-600 scale-105 font-black z-10' : ''
                    }`}
                  >
                    <span className="font-black text-xs">{b.booth_code}</span>
                    <span className="text-[10px] font-medium">${b.price}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Inquiry Form for Selected Booth */}
          {selectedBooth && (
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 animate-in fade-in duration-200">
              {inquirySent ? (
                <div className="text-center py-4 space-y-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto font-bold">
                    ✓
                  </div>
                  <h4 className="font-black text-slate-900 text-sm">
                    {lang === 'kh' ? 'សំណើសុំកក់ត្រូវបានបញ្ជូនដោយជោគជ័យ!' : 'Inquiry Submitted Successfully!'}
                  </h4>
                  <p className="text-slate-500 text-xs">
                    {lang === 'kh' ? `ក្រុមការងារផ្នែកលក់នឹងទាក់ទងមកលោកអ្នកទាក់ទងនឹងស្តង់ ${selectedBooth.booth_code} ក្នុងពេលឆាប់ៗ។` : `Our sales team will contact you regarding booth ${selectedBooth.booth_code} shortly.`}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleInquirySubmit} className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h5 className="font-black text-slate-900 text-sm">
                      {lang === 'kh' ? `ទម្រង់ស្នើសុំកក់ស្តង់ ${selectedBooth.booth_code} ($${selectedBooth.price})` : `Inquire for Booth ${selectedBooth.booth_code} ($${selectedBooth.price})`}
                    </h5>
                    <span className="text-[11px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-md">
                      {selectedBooth.dimensions || '3m x 3m'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        {lang === 'kh' ? 'ឈ្មោះក្រុមហ៊ុន / អាជីវកម្ម *' : 'Company Name *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={form.company_name}
                        onChange={e => setForm({ ...form, company_name: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-xl bg-white focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        {lang === 'kh' ? 'ឈ្មោះអ្នកតំណាង *' : 'Contact Person *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={form.contact_person}
                        onChange={e => setForm({ ...form, contact_person: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-xl bg-white focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        {lang === 'kh' ? 'លេខទូរស័ព្ទ *' : 'Phone Number *'}
                      </label>
                      <input
                        type="tel"
                        required
                        value={form.phone}
                        onChange={e => setForm({ ...form, phone: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-xl bg-white focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Email / Telegram
                      </label>
                      <input
                        type="text"
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-xl bg-white focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {lang === 'kh' ? 'ចំណាំ / តម្រូវការបន្ថែម' : 'Special Notes'}
                    </label>
                    <textarea
                      rows="2"
                      value={form.notes}
                      onChange={e => setForm({ ...form, notes: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-xl bg-white focus:border-blue-500"
                      placeholder={lang === 'kh' ? 'ឧ. ចង់បានស្តង់កែង, ត្រូវការភ្លើងបន្ថែម...' : 'e.g., Corner requirement, extra power...'}
                    ></textarea>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedBooth(null)}
                      className="px-3.5 py-1.5 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-100"
                    >
                      {lang === 'kh' ? 'បោះបង់' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{submitting ? (lang === 'kh' ? 'កំពុងផ្ញើ...' : 'Sending...') : (lang === 'kh' ? 'ផ្ញើសំណើ' : 'Submit Inquiry')}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
