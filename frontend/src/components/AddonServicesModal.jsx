import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Package, 
  Zap, 
  Plug, 
  BatteryCharging, 
  Square, 
  Armchair, 
  Tv, 
  Image, 
  CheckCircle2, 
  ShoppingBag,
  Sparkles
} from 'lucide-react';
import { read, write } from '../api';
import { useLanguage } from '../i18n';

export default function AddonServicesModal({ booth, currentEvent, onClose, onAddonsUpdated, canEdit = true }) {
  const { lang, t } = useLanguage();
  const [catalog, setCatalog] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [quantities, setQuantities] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const booking = booth?.active_booking;
  const orderedAddons = booking?.addons || [];

  useEffect(() => {
    let active = true;
    async function fetchCatalog() {
      try {
        setLoading(true);
        const eventId = currentEvent?.id || booth?.event_id;
        const data = await read(`/events/${eventId}/addons`);
        if (active) {
          setCatalog(data || []);
          const initialQty = {};
          (data || []).forEach(item => {
            initialQty[item.id] = 1;
          });
          setQuantities(initialQty);
        }
      } catch (err) {
        console.error('Failed to load addon catalog:', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchCatalog();
    return () => { active = false; };
  }, [currentEvent?.id, booth?.event_id]);

  if (!booth || !booking) return null;

  const formatUSD = (num) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(num || 0);
  };

  const categories = [
    { id: 'all', label: lang === 'kh' ? 'ទាំងអស់' : 'All Items' },
    { id: 'electrical', label: lang === 'kh' ? '⚡ ភ្លើង & អគ្គិសនី' : '⚡ Electrical' },
    { id: 'furniture', label: lang === 'kh' ? '🪑 តុ & កៅអី' : '🪑 Furniture' },
    { id: 'av', label: lang === 'kh' ? '📺 អេក្រង់ & សំឡេង' : '📺 AV & Displays' },
    { id: 'branding', label: lang === 'kh' ? '🏷️ ផ្លាកឈ្មោះ & ស្ទីកឃ័រ' : '🏷️ Branding & Utilities' }
  ];

  const filteredCatalog = catalog.filter(item => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'branding') return item.category === 'branding' || item.category === 'utilities';
    return item.category === selectedCategory;
  });

  const handleQtyChange = (itemId, delta) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(1, (prev[itemId] || 1) + delta)
    }));
  };

  const handleAddAddon = async (item) => {
    if (submitting) return;
    try {
      setSubmitting(true);
      const qty = quantities[item.id] || 1;
      await write(`/bookings/${booking.id}/addons`, {
        service_id: item.id,
        name: item.name,
        name_kh: item.name_kh,
        category: item.category,
        quantity: qty,
        unit_price: item.unit_price
      });
      setFeedbackMsg(lang === 'kh' ? `បានបន្ថែម ${item.name_kh || item.name} ចំនួន ${qty} ដោយជោគជ័យ` : `Added ${item.name} (${qty}) successfully`);
      setTimeout(() => setFeedbackMsg(''), 3000);
      if (onAddonsUpdated) await onAddonsUpdated();
    } catch (err) {
      alert(err.message || 'Failed to add addon');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAddon = async (addonId) => {
    if (submitting) return;
    try {
      setSubmitting(true);
      await write(`/bookings/${booking.id}/addons/${addonId}`, {}, 'DELETE');
      if (onAddonsUpdated) await onAddonsUpdated();
    } catch (err) {
      alert(err.message || 'Failed to remove addon');
    } finally {
      setSubmitting(false);
    }
  };

  const getItemIcon = (iconName) => {
    switch (iconName) {
      case 'Zap': return <Zap className="w-5 h-5 text-amber-500" />;
      case 'Plug': return <Plug className="w-5 h-5 text-amber-600" />;
      case 'BatteryCharging': return <BatteryCharging className="w-5 h-5 text-rose-500" />;
      case 'Square': return <Square className="w-5 h-5 text-blue-500" />;
      case 'Armchair': return <Armchair className="w-5 h-5 text-purple-600" />;
      case 'Tv': return <Tv className="w-5 h-5 text-indigo-600" />;
      case 'Image': return <Image className="w-5 h-5 text-emerald-600" />;
      default: return <Package className="w-5 h-5 text-purple-600" />;
    }
  };

  const totalAddonsPrice = orderedAddons.reduce((sum, a) => sum + (a.total_price || (a.unit_price * a.quantity)), 0);

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3 overflow-visible">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 shadow-2xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div className="overflow-visible">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 leading-normal overflow-visible">
                  {lang === 'kh' ? 'កុម្ម៉ង់សម្ភារៈ និងសេវាកម្មបន្ថែម' : 'Add-on Services & Extra Equipment'}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                  {booth.booth_code}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed overflow-visible">
                {booking.exhibitor_name} {booking.fascia_name ? `• ${booking.fascia_name}` : ''}
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
        {feedbackMsg && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xs animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Modal Body: 2-Columns (Left: Catalog, Right: Ordered Items Summary) */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left: Addon Catalog (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold">
              {categories.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap cursor-pointer ${
                    selectedCategory === c.id
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Catalog Grid */}
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400 font-bold">
                {lang === 'kh' ? 'កំពុងទាញយកទិន្នន័យសម្ភារៈ...' : 'Loading equipment catalog…'}
              </div>
            ) : filteredCatalog.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 font-bold">
                {lang === 'kh' ? 'មិនមានសម្ភារៈក្នុងប្រភេទនេះឡើយ' : 'No items in this category'}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredCatalog.map(item => {
                  const qty = quantities[item.id] || 1;
                  return (
                    <div 
                      key={item.id}
                      className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-purple-300 hover:shadow-xs transition-all flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                          {getItemIcon(item.icon)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 leading-normal overflow-visible truncate">
                            {lang === 'kh' && item.name_kh ? item.name_kh : item.name}
                          </h4>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {item.name}
                          </span>
                          <span className="text-xs font-black text-purple-700 mt-1 block">
                            {formatUSD(item.unit_price)} <span className="text-[10px] font-normal text-slate-400">/{item.unit_name}</span>
                          </span>
                        </div>
                      </div>

                      {/* Quantity & Add Action */}
                      {canEdit && (
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200/80">
                            <button
                              type="button"
                              onClick={() => handleQtyChange(item.id, -1)}
                              className="w-6 h-6 flex items-center justify-center rounded text-slate-600 hover:bg-white text-xs font-bold cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-7 text-center text-xs font-black text-slate-800">
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQtyChange(item.id, 1)}
                              className="w-6 h-6 flex items-center justify-center rounded text-slate-600 hover:bg-white text-xs font-bold cursor-pointer"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => handleAddAddon(item)}
                            className="px-3 py-1.5 bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white font-bold rounded-lg text-[11px] border border-purple-200 hover:border-purple-600 transition-all flex items-center gap-1 cursor-pointer active:scale-95 disabled:opacity-50"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{lang === 'kh' ? 'បញ្ចូល' : 'Add'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

          </div>

          {/* Right: Ordered Add-ons Summary (5 Cols) */}
          <div className="lg:col-span-5 bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 mb-3">
                <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>{lang === 'kh' ? 'សម្ភារៈបានកុម្ម៉ង់សម្រាប់ស្តង់នេះ' : 'Ordered Add-on Services'}</span>
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                  {orderedAddons.length} {lang === 'kh' ? 'មុខ' : 'items'}
                </span>
              </div>

              {orderedAddons.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 space-y-2">
                  <Package className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-medium">
                    {lang === 'kh' ? 'មិនទាន់មានកុម្ម៉ង់សម្ភារៈបន្ថែមនៅឡើយទេ' : 'No extra add-on items ordered yet.'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {lang === 'kh' ? 'ជ្រើសរើសសម្ភារៈពីបញ្ជីខាងឆ្វេងដើម្បីបន្ថែម' : 'Select items from the catalog on the left'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                  {orderedAddons.map((addon) => (
                    <div 
                      key={addon.id}
                      className="p-3 bg-white border border-slate-200/90 rounded-xl shadow-2xs flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 block truncate">
                          {lang === 'kh' && addon.name_kh ? addon.name_kh : addon.name}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {addon.quantity} × {formatUSD(addon.unit_price)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="font-black font-mono text-purple-700">
                          {formatUSD(addon.total_price || (addon.unit_price * addon.quantity))}
                        </span>
                        {canEdit && (
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => handleDeleteAddon(addon.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title={lang === 'kh' ? 'លុបសម្ភារៈនេះ' : 'Remove item'}
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

            {/* Total Summary Footer */}
            <div className="pt-4 border-t border-slate-200/90 mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">{lang === 'kh' ? 'តម្លៃជួលស្តង់គោល' : 'Base Booth Price'}:</span>
                <span className="font-bold font-mono text-slate-800">{formatUSD(booth.price)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-purple-700 font-bold">{lang === 'kh' ? 'សរុបសម្ភារៈបន្ថែម' : 'Total Add-on Services'}:</span>
                <span className="font-black font-mono text-purple-700">{formatUSD(totalAddonsPrice)}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-black pt-2 border-t border-slate-200">
                <span className="text-slate-900">{lang === 'kh' ? 'តម្លៃកិច្ចសន្យាសរុប' : 'Total Contract Value'}:</span>
                <span className="text-sm font-mono text-emerald-600">{formatUSD(booking.total_agreed_price)}</span>
              </div>
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-sm shadow-purple-500/25 transition-all cursor-pointer active:scale-95"
          >
            {lang === 'kh' ? 'រួចរាល់' : 'Done'}
          </button>
        </div>

      </div>
    </div>
  );
}
