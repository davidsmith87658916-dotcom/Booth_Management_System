import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  MapPin, 
  Calendar, 
  Layers, 
  CheckCircle2, 
  Clock, 
  Search, 
  Send, 
  Eye, 
  Store, 
  ArrowLeft, 
  ShieldAlert, 
  Maximize2,
  Sparkles,
  Globe
} from 'lucide-react';
import { api, write } from '../api';
import { useLanguage } from '../i18n';

export default function PublicFloorPlanPage({ eventId, onExitToLogin }) {
  const { lang, toggleLang } = useLanguage();
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'available' | 'hold' | 'sold'
  const [selectedBooth, setSelectedBooth] = useState(null);
  const [preview3dBooth, setPreview3dBooth] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [inquirySent, setInquirySent] = useState(false);
  const [form, setForm] = useState({
    company_name: '',
    contact_person: '',
    phone: '',
    email: '',
    notes: ''
  });

  useEffect(() => {
    let isMounted = true;
    const fetchPublicData = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api(`/public/events/${eventId}/floorplan`);
        if (isMounted) {
          setEventData(res);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load public floor plan');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    fetchPublicData();
    return () => { isMounted = false; };
  }, [eventId]);

  const handleInquirySubmit = async (e) => {
    e.preventDefault();
    if (!form.company_name || !form.contact_person || !form.phone || !selectedBooth) {
      alert(lang === 'kh' ? 'សូមបំពេញព័ត៌មានដែលត្រូវការ (*)' : 'Please fill in all required fields (*)');
      return;
    }
    setSubmitting(true);
    try {
      await write(`/public/events/${eventId}/inquire`, {
        booth_code: selectedBooth.booth_code,
        company_name: form.company_name.trim(),
        contact_person: form.contact_person.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        notes: form.notes.trim()
      });
      setInquirySent(true);
    } catch (err) {
      alert(err.message || 'Failed to submit inquiry');
    } finally {
      setSubmitting(false);
    }
  };

  const booths = eventData?.booths || [];
  const event = eventData?.event;

  const counts = useMemo(() => {
    const avail = booths.filter(b => b.status === 'available').length;
    const hold = booths.filter(b => b.status === 'hold').length;
    const sold = booths.filter(b => b.status === 'sold').length;
    return { avail, hold, sold, total: booths.length };
  }, [booths]);

  const filteredBooths = useMemo(() => {
    return booths.filter(b => {
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchCode = b.booth_code.toLowerCase().includes(q);
        const matchZone = (b.zone || '').toLowerCase().includes(q);
        const matchCat = (b.category_name || '').toLowerCase().includes(q) || (b.category_name_kh || '').toLowerCase().includes(q);
        const matchEx = (b.exhibitor_name || '').toLowerCase().includes(q);
        if (!matchCode && !matchZone && !matchCat && !matchEx) return false;
      }
      return true;
    });
  }, [booths, statusFilter, search]);

  const formatUSD = (num) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(num || 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold">{lang === 'kh' ? 'កំពុងផ្ទុកប្លង់ពិព័រណ៍សាធារណៈ...' : 'Loading Public Floor Plan...'}</h2>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-3xl flex items-center justify-center mb-4 border border-rose-500/30">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black mb-2">{lang === 'kh' ? 'រកមិនឃើញព្រឹត្តិការណ៍នេះឡើយ' : 'Event Not Found'}</h2>
        <p className="text-slate-400 max-w-md text-sm mb-6">{error || 'The requested event floor plan is either unavailable or has expired.'}</p>
        <button
          onClick={onExitToLogin}
          className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg cursor-pointer transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{lang === 'kh' ? 'ត្រឡប់ទៅកាន់ទំព័រដើម' : 'Back to Home'}</span>
        </button>
      </div>
    );
  }

  const eventTitle = (lang === 'kh' && event.name_kh) ? event.name_kh : event.name;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-purple-500 selection:text-white">
      {/* Top Public Navigation Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-white leading-snug">{eventTitle}</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                ● {lang === 'kh' ? 'ផ្សាយផ្ទាល់' : 'LIVE'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5 flex-wrap">
              {event.venue && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-purple-400" />
                  <span>{event.venue}</span>
                </span>
              )}
              {event.start_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  <span>{event.start_date} {event.end_date ? `— ${event.end_date}` : ''}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <button
            onClick={toggleLang}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-all cursor-pointer flex items-center gap-1.5"
            title={lang === 'kh' ? 'Switch to English' : 'ប្តូរជាភាសាខ្មែរ'}
          >
            <Globe className="w-3.5 h-3.5 text-purple-400" />
            <span>{lang === 'kh' ? 'English' : 'ភាសាខ្មែរ'}</span>
          </button>

          <button
            onClick={onExitToLogin}
            className="px-4 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-bold transition-all cursor-pointer"
          >
            {lang === 'kh' ? 'ចូលប្រព័ន្ធ (Staff Login)' : 'Staff Login'}
          </button>
        </div>
      </header>

      {/* Main Public Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Live Inventory Status Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <button
            onClick={() => setStatusFilter('all')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              statusFilter === 'all' 
                ? 'bg-slate-800/90 border-purple-500/80 ring-2 ring-purple-500/40' 
                : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/50'
            }`}
          >
            <span className="text-xs text-slate-400 font-bold block">{lang === 'kh' ? 'ស្តង់សរុបទាំងអស់' : 'Total Booths'}</span>
            <span className="text-2xl font-black text-white font-mono">{counts.total}</span>
          </button>

          <button
            onClick={() => setStatusFilter('available')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              statusFilter === 'available' 
                ? 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/40' 
                : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/50'
            }`}
          >
            <span className="text-xs text-emerald-400 font-bold block">{lang === 'kh' ? 'ស្តង់នៅទំនេរ (Available)' : 'Available Booths'}</span>
            <span className="text-2xl font-black text-emerald-400 font-mono">{counts.avail}</span>
          </button>

          <button
            onClick={() => setStatusFilter('hold')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              statusFilter === 'hold' 
                ? 'bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/40' 
                : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/50'
            }`}
          >
            <span className="text-xs text-amber-400 font-bold block">{lang === 'kh' ? 'កំពុងកក់ទុក (Hold)' : 'On Hold'}</span>
            <span className="text-2xl font-black text-amber-400 font-mono">{counts.hold}</span>
          </button>

          <button
            onClick={() => setStatusFilter('sold')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              statusFilter === 'sold' 
                ? 'bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/40' 
                : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/50'
            }`}
          >
            <span className="text-xs text-blue-400 font-bold block">{lang === 'kh' ? 'បានលក់ដាច់ (Sold)' : 'Confirmed / Sold'}</span>
            <span className="text-2xl font-black text-blue-400 font-mono">{counts.sold}</span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={lang === 'kh' ? 'ស្វែងរកលេខស្តង់ ឬតំបន់...' : 'Search booth code or zone...'}
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 w-full sm:w-auto justify-between sm:justify-end">
            <span>{filteredBooths.length} {lang === 'kh' ? 'ស្តង់ត្រូវតាមលក្ខខណ្ឌ' : 'booths displayed'}</span>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> {lang === 'kh' ? 'ទំនេរ' : 'Avail'}</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> {lang === 'kh' ? 'កក់ទុក' : 'Hold'}</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> {lang === 'kh' ? 'លក់ហើយ' : 'Sold'}</span>
            </div>
          </div>
        </div>

        {/* Main Grid View */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Booths Directory Grid */}
          <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Store className="w-4 h-4 text-purple-400" />
                <span>{lang === 'kh' ? 'ជ្រើសរើសស្តង់ទំនេរដើម្បីស្នើសុំកក់' : 'Select an available booth to inquire'}</span>
              </h3>
              <span className="text-[11px] text-purple-400 font-medium">
                {lang === 'kh' ? 'ចុចលើស្តង់ពណ៌បៃតង' : 'Click any green booth'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[620px] overflow-y-auto pr-1">
              {filteredBooths.map(b => {
                const isAvail = b.status === 'available';
                const isHold = b.status === 'hold';
                const isSold = b.status === 'sold';
                const isSelected = selectedBooth?.id === b.id;

                let cardStyle = 'bg-slate-800/40 border-slate-800 text-slate-500 opacity-60 cursor-not-allowed';
                let badgeStyle = 'bg-slate-800 text-slate-400';
                let statusText = lang === 'kh' ? 'បិទ' : 'Blocked';

                if (isAvail) {
                  cardStyle = isSelected 
                    ? 'bg-emerald-950/80 border-emerald-400 ring-2 ring-emerald-400 text-white shadow-lg shadow-emerald-900/20 scale-[1.02] cursor-pointer' 
                    : 'bg-emerald-950/20 border-emerald-800/80 hover:border-emerald-500 text-white cursor-pointer hover:bg-emerald-950/40 transition-all';
                  badgeStyle = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
                  statusText = lang === 'kh' ? 'នៅទំនេរ' : 'Available';
                } else if (isHold) {
                  cardStyle = 'bg-amber-950/20 border-amber-800/60 text-amber-200/70 cursor-not-allowed';
                  badgeStyle = 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
                  statusText = lang === 'kh' ? 'កំពុងកក់ទុក' : 'Reserved';
                } else if (isSold) {
                  cardStyle = 'bg-blue-950/20 border-blue-900/60 text-blue-200/70 cursor-not-allowed';
                  badgeStyle = 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
                  statusText = lang === 'kh' ? 'បានលក់ដាច់' : 'Sold';
                }

                return (
                  <div
                    key={b.id}
                    onClick={() => {
                      if (isAvail) {
                        setSelectedBooth(b);
                        setInquirySent(false);
                      }
                    }}
                    className={`p-3.5 rounded-2xl border flex flex-col justify-between gap-2.5 transition-all ${cardStyle}`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-black text-sm font-mono tracking-tight">{b.booth_code}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeStyle}`}>
                        {statusText}
                      </span>
                    </div>

                    <div>
                      <div className="text-[11px] text-slate-400 font-medium truncate">
                        {lang === 'kh' ? b.category_name_kh || b.category_name : b.category_name}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {b.dimensions} {b.zone ? `• ${b.zone}` : ''}
                      </div>
                      {isSold && b.exhibitor_name && (
                        <div className="text-[10px] text-blue-300 font-bold truncate mt-1">
                          🏢 {b.exhibitor_name}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1">
                      <span className="font-mono font-black text-xs text-white">
                        {formatUSD(b.price)}
                      </span>
                      {b.has_3d_view && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreview3dBooth(b);
                          }}
                          className="px-2 py-0.5 bg-purple-600/30 hover:bg-purple-600 text-purple-200 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                          title={lang === 'kh' ? 'មើលគំរូ 3D' : '3D Preview'}
                        >
                          3D
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredBooths.length === 0 && (
                <div className="col-span-full py-16 text-center text-slate-500 text-xs">
                  {lang === 'kh' ? 'ពុំមានស្តង់ត្រូវតាមការស្វែងរកនេះឡើយ' : 'No booths found matching your filters.'}
                </div>
              )}
            </div>
          </div>

          {/* Inquiry / Details Sidebar */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 sm:p-6 flex flex-col justify-between">
            {selectedBooth ? (
              <div className="space-y-4">
                <div className="border-b border-slate-800 pb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {lang === 'kh' ? 'ស្តង់បានជ្រើសរើស' : 'Selected Booth'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {formatUSD(selectedBooth.price)}
                    </span>
                  </div>
                  <h4 className="text-xl font-black text-white">{selectedBooth.booth_code}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedBooth.dimensions} • {lang === 'kh' ? selectedBooth.category_name_kh || selectedBooth.category_name : selectedBooth.category_name}
                  </p>
                </div>

                {inquirySent ? (
                  <div className="py-8 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30 shadow-lg">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h5 className="font-bold text-white text-base">
                      {lang === 'kh' ? 'សំណើសុំកក់ត្រូវបានបញ្ជូនដោយជោគជ័យ!' : 'Inquiry Sent Successfully!'}
                    </h5>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                      {lang === 'kh' 
                        ? `អរគុណសម្រាប់ការចាប់អារម្មណ៍ស្តង់ ${selectedBooth.booth_code}។ ក្រុមការងារផ្នែកលក់នឹងទាក់ទងមកលោកអ្នកក្នុងពេលឆាប់ៗបំផុត!` 
                        : `Thank you for your interest in booth ${selectedBooth.booth_code}. Our sales team will get back to you shortly!`}
                    </p>
                    <button
                      type="button"
                      onClick={() => { setSelectedBooth(null); setInquirySent(false); }}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      {lang === 'kh' ? 'ជ្រើសរើសស្តង់ផ្សេងទៀត' : 'Browse Other Booths'}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleInquirySubmit} className="space-y-3 text-xs">
                    <h5 className="font-bold text-slate-200">
                      {lang === 'kh' ? 'បំពេញព័ត៌មានដើម្បីស្នើសុំកក់' : 'Submit Booking Inquiry'}
                    </h5>

                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">
                        {lang === 'kh' ? 'ឈ្មោះក្រុមហ៊ុន / អាជីវកម្ម *' : 'Company Name *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={form.company_name}
                        onChange={e => setForm({ ...form, company_name: e.target.value })}
                        placeholder={lang === 'kh' ? 'ឧ. ABC Technology Co., Ltd' : 'e.g. Acme Corp'}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">
                        {lang === 'kh' ? 'ឈ្មោះអ្នកតំណាង *' : 'Contact Person *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={form.contact_person}
                        onChange={e => setForm({ ...form, contact_person: e.target.value })}
                        placeholder={lang === 'kh' ? 'ឧ. លោក សុខា' : 'e.g. John Doe'}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">
                        {lang === 'kh' ? 'លេខទូរស័ព្ទ / Telegram *' : 'Phone / Telegram *'}
                      </label>
                      <input
                        type="tel"
                        required
                        value={form.phone}
                        onChange={e => setForm({ ...form, phone: e.target.value })}
                        placeholder="012 345 678"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">
                        {lang === 'kh' ? 'អ៊ីមែល (បើមាន)' : 'Email (Optional)'}
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        placeholder="contact@company.com"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">
                        {lang === 'kh' ? 'ចំណាំ / តម្រូវការបន្ថែម' : 'Notes / Special Requests'}
                      </label>
                      <textarea
                        rows="2"
                        value={form.notes}
                        onChange={e => setForm({ ...form, notes: e.target.value })}
                        placeholder={lang === 'kh' ? 'ឧ. ស្នើសុំកក់ទុក ២៤ ម៉ោង, ត្រូវការភ្លើង 3 Phase...' : 'e.g., Corner requirement, hold inquiry...'}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                        <span>{submitting ? (lang === 'kh' ? 'កំពុងផ្ញើ...' : 'Submitting...') : (lang === 'kh' ? 'ផ្ញើសំណើសុំកក់' : 'Submit Inquiry')}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <div className="py-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto border border-purple-500/20">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h5 className="font-bold text-white text-base">
                  {lang === 'kh' ? 'សូមជ្រើសរើសស្តង់មួយ' : 'No Booth Selected'}
                </h5>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                  {lang === 'kh' 
                    ? 'ចុចលើស្តង់ពណ៌បៃតង (Available) ក្នុងតារាងប្លង់ ដើម្បីពិនិត្យមើលព័ត៌មានលម្អិត និងដាក់ពាក្យស្នើសុំកក់។' 
                    : 'Click any available (green) booth on the left to review its specifications and send a direct inquiry.'}
                </p>
              </div>
            )}
          </div>
        </div>

      </main>

      {/* 3D Booth Preview Modal */}
      {preview3dBooth && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreview3dBooth(null)}
        >
          <div 
            className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <span>3D Booth Preview: {preview3dBooth.booth_code}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono">
                    {preview3dBooth.dimensions}
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {lang === 'kh' ? preview3dBooth.category_name_kh || preview3dBooth.category_name : preview3dBooth.category_name}
                </p>
              </div>
              <button
                onClick={() => setPreview3dBooth(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
              <img
                src={preview3dBooth.model_3d_url || '/assets/booth_standard_3d.jpg'}
                alt={`Booth ${preview3dBooth.booth_code} 3D Model`}
                className="w-full h-80 object-cover"
                onError={(e) => {
                  e.target.src = '/assets/booth_standard_3d.jpg';
                }}
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setPreview3dBooth(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                {lang === 'kh' ? 'បិទ' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 px-4 text-center text-xs text-slate-500">
        ExpoHub Booth Management System • {eventTitle}
      </footer>
    </div>
  );
}
