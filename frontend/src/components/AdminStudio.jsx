import ModalFrame from './ModalFrame';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Download, 
  Store, 
  CheckCircle2, 
  Clock, 
  BadgeCheck, 
  DollarSign, 
  RotateCcw
} from 'lucide-react';
import { useLanguage } from '../i18n';
import { exportBoothsInventoryToExcel } from '../utils/exportUtils';

export default function AdminStudio({ 
  currentEvent, 
  booths = [], 
  categories = [], 
  user,
  onCreateBooth, 
  onUpdateBooth, 
  onDeleteBooth, 
  lang: propLang,
  searchQuery = '',
  triggerNewBooth = 0
}) {
  const { lang: ctxLang, t } = useLanguage();
  const lang = propLang || ctxLang || 'kh';
  const isAdmin = user?.role === 'admin';
  
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBooth, setEditingBooth] = useState(null);
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [zoneFilter, setZoneFilter] = useState('all');

  useEffect(() => {
    if (searchQuery !== undefined) {
      setLocalSearch(searchQuery);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (triggerNewBooth > 0 && isAdmin) {
      setShowCreateModal(true);
    }
  }, [triggerNewBooth, isAdmin]);

  const defaultCategory = categories[0] || null;
  const [newBooth, setNewBooth] = useState({
    booth_code: '',
    zone: 'Aisle A',
    category_id: defaultCategory?.id || '',
    price: defaultCategory?.base_price || 1200,
    dimensions: defaultCategory?.dimensions || '3m x 3m',
    has_3d_view: true,
    model_3d_url: '/assets/booth_standard_3d.jpg',
    status: 'available'
  });

  const handleCategoryChangeForNew = (catId) => {
    const selected = categories.find(c => String(c.id) === String(catId));
    setNewBooth(prev => ({
      ...prev,
      category_id: catId,
      price: selected?.base_price || prev.price,
      dimensions: selected?.dimensions || prev.dimensions
    }));
  };

  const handleCreateBooth = async (e) => {
    e.preventDefault();
    if (!newBooth.booth_code.trim()) {
      alert(lang === 'kh' ? 'សូមបញ្ចូលលេខកូដស្តង់ (ឧ. A-08)' : 'Please enter a booth code (e.g. A-08)');
      return;
    }

    if (!currentEvent) {
      alert(lang === 'kh' ? 'សូមបង្កើត ឬជ្រើសរើសព្រឹត្តិការណ៍ជាមុនសិន' : 'Please select or create an event first.');
      return;
    }

    setSaving(true);
    try {
      const ok = await onCreateBooth({
        event_id: currentEvent.id,
        booth_code: newBooth.booth_code.trim().toUpperCase(),
        zone: newBooth.zone,
        category_id: newBooth.category_id ? Number(newBooth.category_id) : null,
        price: Number(newBooth.price),
        status: 'available',
        has_3d_view: true,
        model_3d_url: '/assets/booth_standard_3d.jpg'
      });

      if (ok) {
        setShowCreateModal(false);
        setNewBooth({
          booth_code: '',
          zone: 'Aisle A',
          category_id: defaultCategory?.id || '',
          price: defaultCategory?.base_price || 1200,
          dimensions: defaultCategory?.dimensions || '3m x 3m',
          has_3d_view: true,
          model_3d_url: '/assets/booth_standard_3d.jpg',
          status: 'available'
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const zones = useMemo(() => {
    const defaultZones = [
      { value: 'Aisle A', labelEn: 'Aisle A', labelKh: 'ជួរ A (Aisle A)' },
      { value: 'Aisle B', labelEn: 'Aisle B', labelKh: 'ជួរ B (Aisle B)' },
      { value: 'Aisle C', labelEn: 'Aisle C', labelKh: 'ជួរ C (Aisle C)' },
      { value: 'Central Plaza', labelEn: 'Central Plaza', labelKh: 'ទីលានកណ្តាល (Central)' },
      { value: 'Food & Beverage', labelEn: 'Food & Beverage', labelKh: 'តំបន់អាហារ និងភេសជ្ជៈ' },
      { value: 'Conference Hall', labelEn: 'Conference Hall', labelKh: 'សាលសន្និសីទ' }
    ];
    const boothZones = Array.from(new Set(booths.map(b => b.zone).filter(Boolean)));
    boothZones.forEach(z => {
      if (!defaultZones.some(d => d.value === z)) {
        defaultZones.push({ value: z, labelEn: z, labelKh: z });
      }
    });
    return defaultZones;
  }, [booths]);

  const metrics = useMemo(() => {
    const total = booths.length;
    const available = booths.filter(b => b.status === 'available').length;
    const hold = booths.filter(b => b.status === 'hold').length;
    const sold = booths.filter(b => b.status === 'sold').length;
    const blocked = booths.filter(b => b.status === 'blocked').length;
    const totalValue = booths.reduce((sum, b) => sum + (Number(b.price) || 0), 0);
    const soldValue = booths.filter(b => b.status === 'sold').reduce((sum, b) => sum + (Number(b.price) || 0), 0);
    return { total, available, hold, sold, blocked, totalValue, soldValue };
  }, [booths]);

  const filteredBooths = useMemo(() => {
    return booths.filter(b => {
      const q = localSearch.trim().toLowerCase();
      if (q) {
        const exhibitor = b.active_booking?.exhibitor_name?.toLowerCase() || '';
        const staff = b.active_booking?.staff_name?.toLowerCase() || '';
        const code = b.booth_code?.toLowerCase() || '';
        const zone = b.zone?.toLowerCase() || '';
        const catName = (b.category_name || b.category?.name || '').toLowerCase();
        const catNameKh = (b.category_name_kh || b.category?.name_kh || '').toLowerCase();
        const match = code.includes(q) || exhibitor.includes(q) || staff.includes(q) || zone.includes(q) || catName.includes(q) || catNameKh.includes(q);
        if (!match) return false;
      }

      if (statusFilter !== 'all' && b.status !== statusFilter) {
        return false;
      }

      if (categoryFilter !== 'all') {
        const bCatId = b.category_id || b.category?.id;
        if (String(bCatId) !== String(categoryFilter)) return false;
      }

      if (zoneFilter !== 'all' && b.zone !== zoneFilter) {
        return false;
      }

      return true;
    });
  }, [booths, localSearch, statusFilter, categoryFilter, zoneFilter]);

  const formatUSD = (num) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(num || 0);
  };

  const handleExportCSV = () => {
    exportBoothsInventoryToExcel(filteredBooths, currentEvent?.name || 'Expo');
  };

  const resetFilters = () => {
    setLocalSearch('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setZoneFilter('all');
  };

  const hasActiveFilters = localSearch || statusFilter !== 'all' || categoryFilter !== 'all' || zoneFilter !== 'all';

  return (
    <div className="space-y-5 pb-10">
      
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
              {lang === 'kh' ? 'ស្តង់សរុប' : 'Total Booths'}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900 tracking-tight">{metrics.total}</span>
              <span className="text-xs text-slate-400 font-semibold">{lang === 'kh' ? 'ស្តង់' : 'units'}</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <Store size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block mb-0.5">
              {lang === 'kh' ? 'ទំនេរលក់' : 'Available'}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-emerald-600 tracking-tight">{metrics.available}</span>
              <span className="text-xs text-slate-400 font-semibold">
                ({metrics.total > 0 ? Math.round((metrics.available / metrics.total) * 100) : 0}%)
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block mb-0.5">
              {lang === 'kh' ? 'កក់ទុក' : 'On Hold'}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-amber-600 tracking-tight">{metrics.hold}</span>
              <span className="text-xs text-slate-400 font-semibold">{lang === 'kh' ? 'ស្តង់' : 'units'}</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block mb-0.5">
              {lang === 'kh' ? 'លក់ដាច់' : 'Sold Out'}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-blue-600 tracking-tight">{metrics.sold}</span>
              <span className="text-xs text-slate-400 font-semibold">
                ({metrics.total > 0 ? Math.round((metrics.sold / metrics.total) * 100) : 0}%)
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <BadgeCheck size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between col-span-2 lg:col-span-1">
          <div>
            <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block mb-0.5">
              {lang === 'kh' ? 'តម្លៃស្តង់សរុប' : 'Total Inventory'}
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-indigo-600 tracking-tight">{formatUSD(metrics.totalValue)}</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <DollarSign size={20} />
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', labelKh: 'ទាំងអស់', labelEn: 'All Booths', count: metrics.total },
              { id: 'available', labelKh: 'ទំនេរលក់', labelEn: 'Available', count: metrics.available, color: 'text-emerald-600' },
              { id: 'hold', labelKh: 'កំពុងកក់', labelEn: 'Hold', count: metrics.hold, color: 'text-amber-600' },
              { id: 'sold', labelKh: 'លក់ដាច់', labelEn: 'Sold', count: metrics.sold, color: 'text-blue-600' },
              { id: 'blocked', labelKh: 'បិទដំណើរការ', labelEn: 'Blocked', count: metrics.blocked, color: 'text-slate-500' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                }`}
              >
                <span>{lang === 'kh' ? tab.labelKh : tab.labelEn}</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${
                  statusFilter === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-white text-slate-600 border border-slate-200'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <Download size={14} />
              <span className="hidden sm:inline">{lang === 'kh' ? 'ទាញយក Excel' : 'Export Excel'}</span>
            </button>
            {isAdmin && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-sm shadow-blue-500/25 active:scale-95 cursor-pointer"
              >
                <Plus size={16} />
                <span>{lang === 'kh' ? 'បន្ថែមស្តង់ថ្មី' : 'Add New Booth'}</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t border-slate-100">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={lang === 'kh' ? 'ស្វែងរកតាមលេខកូដស្តង់, ឈ្មោះក្រុមហ៊ុន, ឬតំបន់...' : 'Search by code, company, or zone...'}
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:outline-hidden transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative min-w-[140px]">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:border-blue-500 transition-all cursor-pointer"
              >
                <option value="all">{lang === 'kh' ? 'គ្រប់ប្រភេទទាំងអស់' : 'All Categories'}</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {(lang === 'kh' && c.name_kh) ? c.name_kh : c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative min-w-[130px]">
              <select
                value={zoneFilter}
                onChange={e => setZoneFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:border-blue-500 transition-all cursor-pointer"
              >
                <option value="all">{lang === 'kh' ? 'គ្រប់តំបន់ទាំងអស់' : 'All Zones'}</option>
                {zones.map(z => (
                  <option key={z.value} value={z.value}>
                    {lang === 'kh' ? z.labelKh : z.labelEn}
                  </option>
                ))}
              </select>
            </div>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                title={lang === 'kh' ? 'សម្អាតការស្វែងរក' : 'Reset Filters'}
              >
                <RotateCcw size={15} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 sm:px-5">{lang === 'kh' ? 'លេខកូដស្តង់' : 'Booth Code'}</th>
                <th className="py-3 px-3">{lang === 'kh' ? 'ប្រភេទ' : 'Category'}</th>
                <th className="py-3 px-3">{lang === 'kh' ? 'តំបន់' : 'Zone'}</th>
                <th className="py-3 px-3">{lang === 'kh' ? 'ទំហំ' : 'Dimensions'}</th>
                <th className="py-3 px-3">{lang === 'kh' ? 'តម្លៃលក់' : 'Price'}</th>
                <th className="py-3 px-3">{lang === 'kh' ? 'ស្ថានភាព' : 'Status'}</th>
                <th className="py-3 px-3">{lang === 'kh' ? 'អតិថិជន / ក្រុមហ៊ុន' : 'Exhibitor / Client'}</th>
                {isAdmin && <th className="py-3 px-4 text-right">{lang === 'kh' ? 'សកម្មភាព' : 'Actions'}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium">
              {filteredBooths.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="py-14 text-center">
                    <div className="max-w-xs mx-auto space-y-2">
                      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                        <Store size={24} />
                      </div>
                      <p className="text-sm font-bold text-slate-700">
                        {lang === 'kh' ? 'មិនមានស្តង់ត្រូវនឹងលក្ខខណ្ឌស្វែងរកទេ' : 'No booths found matching your filters'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {lang === 'kh' ? 'សូមសាកល្បងផ្លាស់ប្តូរពាក្យស្វែងរក ឬសម្អាតតម្រង' : 'Try adjusting your search terms or filters'}
                      </p>
                      {hasActiveFilters && (
                        <button
                          onClick={resetFilters}
                          className="mt-2 px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                        >
                          {lang === 'kh' ? 'សម្អាតការស្វែងរកទាំងអស់' : 'Clear all filters'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBooths.map(b => {
                  const catName = (lang === 'kh' && (b.category_name_kh || b.category?.name_kh)) 
                    ? (b.category_name_kh || b.category?.name_kh) 
                    : (b.category_name || b.category?.name || 'Standard');
                  const catColor = b.category_color || b.category?.color_code || '#3b82f6';
                  const exhibitor = b.active_booking?.exhibitor_name;
                  const contactPerson = b.active_booking?.contact_person;

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="py-3.5 px-4 sm:px-5">
                        <div className="flex items-center gap-2.5">
                          <span 
                            className="w-1.5 h-6 rounded-full" 
                            style={{ backgroundColor: catColor }}
                          />
                          <span className="font-mono font-black text-sm text-slate-900 tracking-tight">
                            {b.booth_code}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span 
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold"
                          style={{ backgroundColor: `${catColor}15`, color: catColor }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: catColor }} />
                          {catName}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 font-semibold">
                        {b.zone || '—'}
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 font-semibold font-mono">
                        {b.dimensions || (b.size_w ? `${b.size_w / 40}m x ${b.size_h / 40}m` : '3m x 3m')}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="font-black text-slate-900 font-mono">
                          {formatUSD(b.price)}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        {b.status === 'available' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {lang === 'kh' ? 'ទំនេរ' : 'Available'}
                          </span>
                        )}
                        {b.status === 'hold' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            {lang === 'kh' ? 'កំពុងកក់' : 'On Hold'}
                          </span>
                        )}
                        {b.status === 'sold' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            {lang === 'kh' ? 'លក់ដាច់' : 'Sold Out'}
                          </span>
                        )}
                        {b.status === 'blocked' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            {lang === 'kh' ? 'បិទដំណើរការ' : 'Blocked'}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        {exhibitor ? (
                          <div>
                            <span className="font-bold text-slate-900 block leading-tight">{exhibitor}</span>
                            {contactPerson && (
                              <span className="text-[11px] text-slate-400 block">{contactPerson}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 font-semibold">—</span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditingBooth({ ...b })}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              title={lang === 'kh' ? 'កែសម្រួលស្តង់' : 'Edit Booth'}
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(t('deleteBoothConfirm', 'Delete this booth? Booking history is protected.'))) {
                                  onDeleteBooth(b.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title={lang === 'kh' ? 'លុបស្តង់' : 'Delete Booth'}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-3 px-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            {lang === 'kh' 
              ? `បង្ហាញស្តង់ចំនួន ${filteredBooths.length} ក្នុងចំណោម ${booths.length} សរុប` 
              : `Showing ${filteredBooths.length} of ${booths.length} booths`}
          </span>
          <span className="font-semibold text-slate-600">
            {lang === 'kh' ? 'ព្រឹត្តិការណ៍៖ ' : 'Event: '}
            <strong className="text-slate-900 font-bold">
              {(lang === 'kh' && currentEvent?.name_kh) ? currentEvent.name_kh : currentEvent?.name}
            </strong>
          </span>
        </div>
      </div>

      {showCreateModal && (
        <ModalFrame label={lang === 'kh' ? 'បន្ថែមស្តង់ថ្មី' : 'Add New Booth'} onClose={() => setShowCreateModal(false)}>
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col modal-enter">
            <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <Plus className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black text-slate-900">
                  {lang === 'kh' ? 'បង្កើតស្តង់ថ្មីក្នុងប្រព័ន្ធ' : 'Create New Booth'}
                </h3>
              </div>
            </div>

            <form onSubmit={handleCreateBooth} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  {lang === 'kh' ? 'លេខកូដស្តង់ (Booth Code) *' : 'Booth Code *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={lang === 'kh' ? 'ឧ. A-08, B-12, VIP-01' : 'e.g. A-08, B-12, VIP-01'}
                  value={newBooth.booth_code}
                  onChange={e => setNewBooth({ ...newBooth, booth_code: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-sm text-slate-900 focus:bg-white focus:border-blue-500 transition-all uppercase"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    {lang === 'kh' ? 'ប្រភេទស្តង់' : 'Category'}
                  </label>
                  <select
                    value={newBooth.category_id}
                    onChange={e => handleCategoryChangeForNew(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 transition-all cursor-pointer"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {(lang === 'kh' && c.name_kh) ? c.name_kh : c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    {lang === 'kh' ? 'តំបន់ (Zone)' : 'Zone'}
                  </label>
                  <select
                    value={newBooth.zone}
                    onChange={e => setNewBooth({ ...newBooth, zone: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 transition-all cursor-pointer"
                  >
                    {zones.map(z => (
                      <option key={z.value} value={z.value}>
                        {lang === 'kh' ? z.labelKh : z.labelEn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    {lang === 'kh' ? 'តម្លៃលក់ (ដុល្លារ) *' : 'Selling Price (USD) *'}
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="0.01"
                    value={newBooth.price}
                    onChange={e => setNewBooth({ ...newBooth, price: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-sm text-blue-600 focus:bg-white focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    {lang === 'kh' ? 'វិមាត្រ / ទំហំ' : 'Dimensions'}
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={newBooth.dimensions}
                    className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl font-mono font-bold text-xs text-slate-600 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-sm shadow-blue-500/25 transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={15} />
                  <span>{saving ? t('pleaseWait', 'Saving…') : (lang === 'kh' ? 'បង្កើតស្តង់' : 'Create Booth')}</span>
                </button>
              </div>
            </form>
          </div>
        </ModalFrame>
      )}

      {editingBooth && (
        <ModalFrame label={t('editBooth', 'Edit booth')} onClose={() => setEditingBooth(null)}>
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col modal-enter">
            <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <Edit3 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black text-slate-900">
                  {lang === 'kh' ? `កែសម្រួលស្តង់ ${editingBooth.booth_code}` : `Edit Booth ${editingBooth.booth_code}`}
                </h3>
              </div>
            </div>

            <form 
              onSubmit={async e => { 
                e.preventDefault(); 
                if (saving) return; 
                setSaving(true); 
                try { 
                  const b = editingBooth; 
                  const ok = await onUpdateBooth(b.id, {
                    booth_code: b.booth_code.trim().toUpperCase(),
                    zone: b.zone,
                    price: Number(b.price),
                    category_id: b.category_id ? Number(b.category_id) : null
                  });
                  if (ok) setEditingBooth(null); 
                } finally { 
                  setSaving(false); 
                } 
              }}
              className="p-6 space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  {lang === 'kh' ? 'លេខកូដស្តង់' : 'Booth Code'}
                </label>
                <input 
                  required 
                  type="text" 
                  value={editingBooth.booth_code} 
                  onChange={e => setEditingBooth({ ...editingBooth, booth_code: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-sm text-slate-900 focus:bg-white focus:border-blue-500 transition-all uppercase" 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    {lang === 'kh' ? 'តំបន់ (Zone)' : 'Zone'}
                  </label>
                  <select 
                    value={editingBooth.zone || 'Aisle A'}
                    onChange={e => setEditingBooth({ ...editingBooth, zone: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 transition-all cursor-pointer"
                  >
                    {zones.map(z => (
                      <option key={z.value} value={z.value}>
                        {lang === 'kh' ? z.labelKh : z.labelEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    {lang === 'kh' ? 'ប្រភេទស្តង់' : 'Category'}
                  </label>
                  <select 
                    value={editingBooth.category_id || ''} 
                    onChange={e => {
                      const catId = e.target.value;
                      const selected = categories.find(c => String(c.id) === String(catId));
                      setEditingBooth({ 
                        ...editingBooth, 
                        category_id: catId,
                        price: selected ? selected.base_price : editingBooth.price
                      });
                    }}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 transition-all cursor-pointer" 
                  >
                    <option value="">{lang === 'kh' ? 'មិនទាន់កំណត់' : 'Unassigned'}</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {(lang === 'kh' && c.name_kh) ? c.name_kh : c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  {lang === 'kh' ? 'តម្លៃលក់ (ដុល្លារ)' : 'Price (USD)'}
                </label>
                <input 
                  required 
                  type="number" 
                  min={0} 
                  step="0.01" 
                  value={editingBooth.price} 
                  onChange={e => setEditingBooth({ ...editingBooth, price: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-sm text-blue-600 focus:bg-white focus:border-blue-500 transition-all" 
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button 
                  type="button" 
                  onClick={() => setEditingBooth(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button 
                  disabled={saving} 
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-sm shadow-blue-500/25 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {saving ? t('pleaseWait', 'Saving…') : t('saveChanges', 'Save changes')}
                </button>
              </div>
            </form>
          </div>
        </ModalFrame>
      )}

    </div>
  );
}
