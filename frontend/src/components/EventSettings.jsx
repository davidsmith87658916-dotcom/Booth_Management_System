import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  Calendar, 
  MapPin, 
  Maximize2, 
  Plus, 
  Edit3, 
  CheckCircle2, 
  Clock, 
  Store, 
  DollarSign, 
  RotateCw, 
  Check, 
  Layers, 
  AlertCircle,
  FileText,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import ModalFrame from './ModalFrame';
import { useLanguage } from '../i18n';

const usd = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

export default function EventSettings({ 
  currentEvent, 
  events = [], 
  selectedEventId, 
  onSelectEvent, 
  onRefreshEvents, 
  searchQuery = '', 
  onSave, 
  onCreate, 
  triggerNewEvent 
}) {
  const { lang, t } = useLanguage();
  const [modal, setModal] = useState(null); // null | { kind: 'create' } | { kind: 'edit', event: ev }
  const [statusFilter, setStatusFilter] = useState('all');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Handle header + trigger
  useEffect(() => {
    if (triggerNewEvent) {
      setError('');
      setMessage('');
      setModal({ kind: 'create' });
    }
  }, [triggerNewEvent]);

  // Overall KPI statistics
  const totalEvents = events.length;
  const activeEventsCount = events.filter(e => e.status === 'active').length;
  const totalBoothsAcrossEvents = events.reduce((sum, e) => sum + (e.total_booths || 0), 0);
  const totalRevenueAcrossEvents = events.reduce((sum, e) => sum + (e.collected_revenue || 0), 0);

  // Filter and search
  const filteredEvents = useMemo(() => {
    return events.filter(ev => {
      if (statusFilter !== 'all' && ev.status !== statusFilter) return false;
      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (ev.name || '').toLowerCase().includes(q);
        const matchKh = (ev.name_kh || '').toLowerCase().includes(q);
        const matchVenue = (ev.venue || '').toLowerCase().includes(q);
        if (!matchName && !matchKh && !matchVenue) return false;
      }
      return true;
    });
  }, [events, statusFilter, searchQuery]);

  // Handle form submission
  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    const form = e.currentTarget;
    const f = Object.fromEntries(new FormData(form));
    if (f.canvas_width) f.canvas_width = Number(f.canvas_width);
    if (f.canvas_height) f.canvas_height = Number(f.canvas_height);

    try {
      if (modal.kind === 'create') {
        await onCreate(f);
        setMessage(lang === 'kh' ? 'បានបង្កើតព្រឹត្តិការណ៍ថ្មីដោយជោគជ័យ' : 'New event created successfully.');
      } else {
        await onSave(modal.event.id, f);
        setMessage(lang === 'kh' ? 'បានរក្សាទុកការកែប្រែព្រឹត្តិការណ៍ដោយជោគជ័យ' : 'Event settings saved successfully.');
      }
      setModal(null);
      if (onRefreshEvents) await onRefreshEvents();
    } catch (err) {
      setError(err.message || 'Error saving event');
    } finally {
      setBusy(false);
    }
  }

  const getStatusBadge = (status) => {
    if (status === 'active') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{lang === 'kh' ? 'កំពុងដំណើរការ' : 'Active'}</span>
        </span>
      );
    }
    if (status === 'upcoming') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span>{lang === 'kh' ? 'នឹងមកដល់' : 'Upcoming'}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
        <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
        <span>{lang === 'kh' ? 'បានបញ្ចប់' : 'Completed'}</span>
      </span>
    );
  };

  return (
    <div className="w-full space-y-6">
      
      {/* Top 4 KPI Metric Summary Cards (Matches DashboardView & RecordsView Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* Total Events */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs flex items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 block leading-tight">
              {lang === 'kh' ? 'ព្រឹត្តិការណ៍សរុប' : 'Total Events'}
            </span>
            <span className="text-2xl font-black text-slate-900 block tracking-tight">
              {totalEvents}
            </span>
            <span className="text-[11px] text-slate-400 font-medium block">
              {lang === 'kh' ? 'កម្មវិធីពិព័រណ៍ក្នុងប្រព័ន្ធ' : 'Exhibitions in system'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0 shadow-2xs">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Active Events */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs flex items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 block leading-tight">
              {lang === 'kh' ? 'កំពុងដំណើរការ' : 'Active Events'}
            </span>
            <span className="text-2xl font-black text-emerald-600 block tracking-tight">
              {activeEventsCount}
            </span>
            <span className="text-[11px] text-slate-400 font-medium block">
              {lang === 'kh' ? 'បើកដំណើរការលក់បច្ចុប្បន្ន' : 'Currently open for sales'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0 shadow-2xs">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Total Booths across events */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs flex items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 block leading-tight">
              {lang === 'kh' ? 'ស្តង់សរុបទាំងអស់' : 'Total Booths'}
            </span>
            <span className="text-2xl font-black text-purple-600 block tracking-tight">
              {totalBoothsAcrossEvents}
            </span>
            <span className="text-[11px] text-slate-400 font-medium block">
              {lang === 'kh' ? 'ស្តង់គ្រប់ព្រឹត្តិការណ៍' : 'Booths across all events'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0 shadow-2xs">
            <Store className="w-6 h-6" />
          </div>
        </div>

        {/* Total Revenue across events */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs flex items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 block leading-tight">
              {lang === 'kh' ? 'ចំណូលប្រមូលបាន' : 'Total Collected'}
            </span>
            <span className="text-2xl font-black text-amber-600 block tracking-tight">
              {usd(totalRevenueAcrossEvents)}
            </span>
            <span className="text-[11px] text-slate-400 font-medium block">
              {lang === 'kh' ? 'ចំណូលជាក់ស្តែងទទួលបាន' : 'Actual received revenue'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0 shadow-2xs">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Notifications */}
      {message && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2.5 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}
      {error && !modal && (
        <div role="alert" className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2.5 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Events Table Panel (Matches TeamPanel and RecordsView Table Structure) */}
      <section className="panel space-y-4 w-full">
        
        {/* Table Header & Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 leading-relaxed overflow-visible pt-0.5">
              <Building2 className="w-5 h-5 text-blue-600" />
              <span>{lang === 'kh' ? 'បញ្ជីព្រឹត្តិការណ៍ និងការកំណត់' : 'Event Directory & Settings'}</span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed overflow-visible">
              {lang === 'kh' 
                ? 'គ្រប់គ្រងព្រឹត្តិការណ៍ពិព័រណ៍ទាំងអស់ ជ្រើសរើសដំណើរការ និងកែប្រែព័ត៌មានលម្អិត' 
                : 'Manage all exhibition events, switch the active event, and configure floor canvas.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'all' 
                    ? 'bg-white text-blue-700 shadow-2xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {lang === 'kh' ? 'ទាំងអស់' : 'All'} ({totalEvents})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'active' 
                    ? 'bg-white text-emerald-700 shadow-2xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {lang === 'kh' ? 'កំពុងដំណើរការ' : 'Active'} ({activeEventsCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('upcoming')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'upcoming' 
                    ? 'bg-white text-amber-700 shadow-2xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {lang === 'kh' ? 'នឹងមកដល់' : 'Upcoming'}
              </button>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={async () => {
                if (onRefreshEvents) await onRefreshEvents();
              }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-slate-200 shadow-2xs transition-all active:scale-95 cursor-pointer"
              title={lang === 'kh' ? 'ផ្ទុកទិន្នន័យឡើងវិញ' : 'Refresh events'}
            >
              <RotateCw className="w-3.5 h-3.5 text-slate-600" />
              <span>{lang === 'kh' ? 'ផ្ទុកឡើងវិញ' : 'Refresh'}</span>
            </button>

            {/* Add Event Button */}
            <button
              type="button"
              onClick={() => {
                setError('');
                setMessage('');
                setModal({ kind: 'create' });
              }}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm shadow-blue-500/25 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'kh' ? 'បង្កើតព្រឹត្តិការណ៍' : 'New Event'}</span>
            </button>
          </div>
        </div>

        {/* Master Events Table */}
        <div className="table-scroll border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-2xs">
          <table className="data-table">
            <thead>
              <tr>
                <th className="min-w-[240px]">{lang === 'kh' ? 'ព្រឹត្តិការណ៍' : 'Event'}</th>
                <th className="min-w-[180px]">{lang === 'kh' ? 'ទីតាំងរៀបចំ' : 'Venue'}</th>
                <th className="whitespace-nowrap">{lang === 'kh' ? 'កាលបរិច្ឆេទ' : 'Schedule'}</th>
                <th className="whitespace-nowrap">{lang === 'kh' ? 'ស្តង់ & អត្រាលក់' : 'Booths & Occupancy'}</th>
                <th className="whitespace-nowrap">{lang === 'kh' ? 'ចំណូលប្រមូលបាន' : 'Revenue'}</th>
                <th className="whitespace-nowrap">{lang === 'kh' ? 'ទំហំប្លង់ 2D' : 'Canvas Size'}</th>
                <th className="text-center whitespace-nowrap">{lang === 'kh' ? 'ស្ថានភាព' : 'Status'}</th>
                <th className="text-center whitespace-nowrap">{lang === 'kh' ? 'សកម្មភាព' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map(ev => {
                const isSelected = ev.id === selectedEventId;
                const displayNameKh = ev.name_kh || ev.name;
                const soldBooths = ev.sold_booths || 0;
                const totalBooths = ev.total_booths || 0;
                const occupancyRate = ev.occupancy_rate || 0;

                return (
                  <tr 
                    key={ev.id} 
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isSelected ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    {/* Event Name */}
                    <td className="min-w-[240px]">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <strong className="text-xs font-bold text-slate-900 leading-normal">
                            {displayNameKh}
                          </strong>
                          {isSelected && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-extrabold border border-blue-200 shadow-2xs whitespace-nowrap shrink-0">
                              <Sparkles className="w-3 h-3 text-blue-600 shrink-0" />
                              <span>{lang === 'kh' ? 'កំពុងជ្រើសរើស' : 'Selected'}</span>
                            </span>
                          )}
                        </div>
                        {ev.name_kh && (
                          <span className="text-[11px] text-slate-500 font-medium block">
                            {ev.name}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Venue */}
                    <td className="text-xs text-slate-700 font-medium min-w-[180px]">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="leading-normal">{ev.venue}</span>
                      </div>
                    </td>

                    {/* Schedule Dates */}
                    <td className="text-xs text-slate-600 font-medium whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{ev.start_date} ~ {ev.end_date}</span>
                      </div>
                    </td>

                    {/* Booths & Occupancy */}
                    <td className="text-xs whitespace-nowrap">
                      <div className="space-y-1 w-32">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                          <span>{soldBooths}/{totalBooths} ស្តង់</span>
                          <span className="text-blue-600">{occupancyRate}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                          <div 
                            className="h-full bg-blue-600 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(occupancyRate, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Collected Revenue */}
                    <td className="text-xs font-bold text-slate-800 whitespace-nowrap font-mono">
                      {usd(ev.collected_revenue)}
                    </td>

                    {/* Canvas Size */}
                    <td className="text-xs text-slate-600 font-mono whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Maximize2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{ev.canvas_width || 1600} × {ev.canvas_height || 1000} px</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="text-center whitespace-nowrap">
                      {getStatusBadge(ev.status)}
                    </td>

                    {/* Actions */}
                    <td className="text-center whitespace-nowrap">
                      <div className="inline-flex items-center justify-center gap-2 whitespace-nowrap">
                        {!isSelected ? (
                          <button
                            type="button"
                            onClick={() => onSelectEvent && onSelectEvent(ev.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 shadow-2xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                            title={lang === 'kh' ? 'ជ្រើសរើសព្រឹត្តិការណ៍នេះសម្រាប់ដំណើរការ' : 'Set as current active event'}
                          >
                            <ArrowRight className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>{lang === 'kh' ? 'ជ្រើសរើស' : 'Select'}</span>
                          </button>
                        ) : (
                          <span className="px-3 py-1 rounded-lg text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap shrink-0 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>{lang === 'kh' ? 'សកម្ម' : 'Active'}</span>
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setError('');
                            setMessage('');
                            setModal({ kind: 'edit', event: ev });
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 shadow-2xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                          title={lang === 'kh' ? 'កែប្រែព័ត៌មាន និងទំហំប្លង់' : 'Edit Event Settings'}
                        >
                          <Edit3 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{lang === 'kh' ? 'កែប្រែ' : 'Edit'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredEvents.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 text-xs">
                    {lang === 'kh' ? 'រកមិនឃើញព្រឹត្តិការណ៍ពិព័រណ៍ដែលត្រូវគ្នានឹងការស្វែងរកឡើយ' : 'No matching exhibition events found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Event Create / Edit Modal Dialog (Matches TeamPanel Modal Frame standard) */}
      {modal && (
        <ModalFrame
          label={modal.kind === 'create' ? (lang === 'kh' ? 'បង្កើតព្រឹត្តិការណ៍ពិព័រណ៍ថ្មី' : 'Create New Event') : (lang === 'kh' ? 'កែប្រែព័ត៌មានព្រឹត្តិការណ៍' : 'Edit Event')}
          onClose={() => !busy && setModal(null)}
        >
          <form className="panel space-y-5 max-w-2xl w-full" onSubmit={handleSubmit}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 leading-relaxed overflow-visible">
                {modal.kind === 'create' ? <Plus className="w-5 h-5 text-blue-600" /> : <Edit3 className="w-5 h-5 text-blue-600" />}
                <span>
                  {modal.kind === 'create' 
                    ? (lang === 'kh' ? 'បង្កើតព្រឹត្តិការណ៍ពិព័រណ៍ថ្មី' : 'Create New Event')
                    : (lang === 'kh' ? `កែប្រែព្រឹត្តិការណ៍៖ ${modal.event?.name_kh || modal.event?.name}` : `Edit Event: ${modal.event?.name}`)}
                </span>
              </h3>
            </div>

            {error && (
              <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Form Fields: Clean 2-Column Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* English Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  {lang === 'kh' ? 'ឈ្មោះព្រឹត្តិការណ៍ (អង់គ្លេស) *' : 'Event Name (English) *'}
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. ShopFest 2026"
                  defaultValue={modal.kind === 'edit' ? modal.event.name : ''}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-500 transition-all shadow-2xs"
                />
              </div>

              {/* Khmer Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  {lang === 'kh' ? 'ឈ្មោះព្រឹត្តិការណ៍ (ភាសាខ្មែរ)' : 'Event Name (Khmer)'}
                </label>
                <input
                  name="name_kh"
                  type="text"
                  placeholder="ឧ. ពិព័រណ៍ពាណិជ្ជកម្ម ShopFest ២០២៦"
                  defaultValue={modal.kind === 'edit' ? modal.event.name_kh || '' : ''}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-500 transition-all shadow-2xs"
                />
              </div>

              {/* Venue */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{lang === 'kh' ? 'ទីកន្លែងរៀបចំ *' : 'Venue *'}</span>
                </label>
                <input
                  name="venue"
                  type="text"
                  required
                  placeholder="e.g. AEON Sen Sok Hall"
                  defaultValue={modal.kind === 'edit' ? modal.event.venue : ''}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-500 transition-all shadow-2xs"
                />
              </div>

              {/* Start Date */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{lang === 'kh' ? 'ថ្ងៃចាប់ផ្តើម *' : 'Start Date *'}</span>
                </label>
                <input
                  name="start_date"
                  type="date"
                  required
                  defaultValue={modal.kind === 'edit' ? modal.event.start_date : ''}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-500 transition-all shadow-2xs"
                />
              </div>

              {/* End Date */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{lang === 'kh' ? 'ថ្ងៃបញ្ចប់ *' : 'End Date *'}</span>
                </label>
                <input
                  name="end_date"
                  type="date"
                  required
                  defaultValue={modal.kind === 'edit' ? modal.event.end_date : ''}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-500 transition-all shadow-2xs"
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  {lang === 'kh' ? 'ស្ថានភាពព្រឹត្តិការណ៍' : 'Event Status'}
                </label>
                <select
                  name="status"
                  defaultValue={modal.kind === 'edit' ? modal.event.status || 'active' : 'active'}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-500 transition-all shadow-2xs"
                >
                  <option value="active">{lang === 'kh' ? 'កំពុងដំណើរការ (Active)' : 'Active'}</option>
                  <option value="upcoming">{lang === 'kh' ? 'នឹងមកដល់ (Upcoming)' : 'Upcoming'}</option>
                  <option value="completed">{lang === 'kh' ? 'បានបញ្ចប់ (Completed)' : 'Completed'}</option>
                </select>
              </div>

              {/* Canvas Dimensions Section */}
              <div className="sm:col-span-2 pt-2 border-t border-slate-100 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Maximize2 className="w-4 h-4 text-purple-600" />
                  <span>{lang === 'kh' ? 'ទំហំផ្ទៃប្លង់ 2D (Floor Canvas Dimensions)' : 'Floor Canvas Dimensions'}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-600">
                      {lang === 'kh' ? 'ទទឹងប្លង់សាល (px)' : 'Canvas Width (px)'}
                    </label>
                    <input
                      name="canvas_width"
                      type="number"
                      min="400"
                      max="5000"
                      step="50"
                      defaultValue={modal.kind === 'edit' ? modal.event.canvas_width || 1600 : 1600}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-800 focus:bg-white focus:border-blue-500 transition-all shadow-2xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-600">
                      {lang === 'kh' ? 'កម្ពស់ប្លង់សាល (px)' : 'Canvas Height (px)'}
                    </label>
                    <input
                      name="canvas_height"
                      type="number"
                      min="300"
                      max="5000"
                      step="50"
                      defaultValue={modal.kind === 'edit' ? modal.event.canvas_height || 1000 : 1000}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-800 focus:bg-white focus:border-blue-500 transition-all shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>{lang === 'kh' ? 'សេចក្តីពិពណ៌នាបន្ថែម' : 'Description'}</span>
                </label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder={lang === 'kh' ? 'ព័ត៌មានលម្អិតបន្ថែម ឬការកត់សម្គាល់អំពីព្រឹត្តិការណ៍...' : 'Additional details or summary...'}
                  defaultValue={modal.kind === 'edit' ? modal.event.description || '' : ''}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-500 transition-all shadow-2xs"
                />
              </div>

            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setModal(null)}
                disabled={busy}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-all"
              >
                {lang === 'kh' ? 'បោះបង់' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/25 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                {busy ? (
                  <span>{lang === 'kh' ? 'កំពុងរក្សាទុក...' : 'Saving…'}</span>
                ) : modal.kind === 'create' ? (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>{lang === 'kh' ? 'បង្កើតព្រឹត្តិការណ៍' : 'Create Event'}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{lang === 'kh' ? 'រក្សាទុកការកែប្រែ' : 'Save Changes'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </ModalFrame>
      )}

    </div>
  );
}
