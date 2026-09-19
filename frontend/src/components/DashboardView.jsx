import React from 'react';
import { 
  Store, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  Map, 
  ExternalLink, 
  ShieldCheck, 
  CreditCard, 
  Calendar, 
  Sparkles,
  DollarSign,
  BarChart3,
  Wallet,
  ArrowUpRight,
  Bookmark,
  TrendingUp,
  FileText,
  Trophy,
  Target,
  Layers,
  PieChart
} from 'lucide-react';
import { useLanguage } from '../i18n';

export default function DashboardView({ 
  booths = [], 
  categories = [], 
  analytics = null,
  currentEvent = null, 
  user = null, 
  onNavigate, 
  onSelectBooth, 
  onOpenInvoice, 
  onVerifyPayment, 
  onRejectPayment,
  onOpenPublicModal 
}) {
  const { lang, t } = useLanguage();

  const formatUSD = (num, maxDigits = 0) => new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD', 
    maximumFractionDigits: maxDigits 
  }).format(num || 0);

  // Operational metrics
  const totalBooths = booths.length;
  const availableBooths = booths.filter(b => b.status === 'available');
  const holdBooths = booths.filter(b => b.status === 'hold');
  const soldBooths = booths.filter(b => b.status === 'sold');
  const blockedBooths = booths.filter(b => b.status === 'blocked');

  const occupancyRate = totalBooths > 0 ? Math.round((soldBooths.length / totalBooths) * 100) : 0;
  const availableValue = availableBooths.reduce((sum, b) => sum + (b.price || 0), 0);

  // Bookings and payment transactions
  const bookedBooths = booths.filter(b => b.active_booking);
  const allPayments = bookedBooths.flatMap(b => 
    (b.active_booking.payment_notes || []).map(p => ({
      ...p,
      booth: b,
      booking: b.active_booking
    }))
  );

  const pendingPayments = allPayments.filter(p => p.verification_status === 'pending');
  const recentPayments = [...allPayments]
    .sort((a, b) => new Date(b.payment_date || 0) - new Date(a.payment_date || 0))
    .slice(0, 5);

  const recentBookings = [...bookedBooths]
    .sort((a, b) => new Date(b.active_booking.created_at || 0) - new Date(a.active_booking.created_at || 0))
    .slice(0, 5);

  const isFinance = user?.role === 'admin' || user?.role === 'accountant';

  // Analytics data
  const data = analytics || {};
  const occupancy = data.occupancy_rate ?? occupancyRate;
  const percent = value => data.total_capacity_value ? Math.round(value / data.total_capacity_value * 100) : 0;

  // Donut multi-segment breakdown
  const total = totalBooths > 0 ? totalBooths : 1;
  const soldCount = soldBooths.length;
  const holdCount = holdBooths.length;
  const availCount = availableBooths.length;
  const blockedCount = blockedBooths.length;

  const C = 238.8; // Circumference for r=38
  const soldLen = (soldCount / total) * C;
  const holdLen = (holdCount / total) * C;
  const availLen = (availCount / total) * C;
  const blockedLen = (blockedCount / total) * C;

  // Cumulative offsets starting at 12 o'clock (-rotate-90 in SVG)
  const soldOffset = 0;
  const holdOffset = -soldLen;
  const availOffset = -(soldLen + holdLen);
  const blockedOffset = -(soldLen + holdLen + availLen);

  const categoryStats = (data.category_breakdown && data.category_breakdown.length > 0)
    ? data.category_breakdown.map(c => {
        const matchingCat = categories.find(cat => cat.id === c.category_id || cat.name === c.category_name);
        const catBooths = booths.filter(b => (b.category_id && b.category_id === c.category_id) || (b.category_name && b.category_name === c.category_name));
        const sampleBooth = catBooths[0];
        const catTotal = c.total_booths ?? catBooths.length ?? 0;
        const catSold = c.sold_booths ?? catBooths.filter(b => b.status === 'sold').length ?? 0;
        const catPercent = c.occupancy_rate ?? (catTotal > 0 ? Math.round((catSold / catTotal) * 100) : 0);
        return {
          name: lang === 'kh' && c.category_name_kh ? c.category_name_kh : (c.category_name || matchingCat?.name || 'Standard'),
          sold: catSold,
          total: catTotal,
          percent: catPercent,
          color: c.color_code || matchingCat?.color_code || '#3b82f6',
          price: matchingCat?.base_price || sampleBooth?.price || 0,
          dimensions: matchingCat?.dimensions || sampleBooth?.dimensions || '3m x 3m'
        };
      })
    : categories.map(cat => {
        const catBooths = booths.filter(b => b.category_id === cat.id || b.category_name === cat.name);
        const catSold = catBooths.filter(b => b.status === 'sold').length;
        const catTotal = catBooths.length;
        const catPercent = catTotal > 0 ? Math.round((catSold / catTotal) * 100) : 0;
        const sampleBooth = catBooths[0];
        return {
          name: lang === 'kh' && cat.name_kh ? cat.name_kh : (cat.name || 'Standard'),
          sold: catSold,
          total: catTotal,
          percent: catPercent,
          color: cat.color_code || '#3b82f6',
          price: cat.base_price || sampleBooth?.price || 0,
          dimensions: cat.dimensions || sampleBooth?.dimensions || '3m x 3m'
        };
      });

  const salesStaff = (data.leaderboard || []).map((u, i) => {
    const soldCount = u.booths_sold ?? u.sold_count ?? 0;
    const volAmount = u.total_volume ?? u.sales_volume ?? 0;
    return {
      rank: i + 1,
      name: u.name || 'Sales Staff',
      phone: u.phone || '',
      booths: `${soldCount} ${t('boothsUnit', 'ស្តង់')}`,
      boothsCount: soldCount,
      amount: volAmount,
      initials: u.name ? u.name.split(' ').map(w => w[0]).slice(0, 2).join('') : 'ST',
      gradient: i === 0 ? 'from-amber-500 to-yellow-400' : i === 1 ? 'from-slate-500 to-slate-400' : 'from-blue-600 to-cyan-500'
    };
  });

  // Revenue chart setup
  const rawMonths = (data.monthly_revenue && data.monthly_revenue.length > 0)
    ? data.monthly_revenue
    : (data.contracted_revenue > 0 || data.cash_collected > 0)
      ? [{ month: new Date().toISOString().slice(0, 7), contracted: data.contracted_revenue || 0, collected: data.cash_collected || 0 }]
      : [];

  const maxRawValue = Math.max(100, ...rawMonths.flatMap(m => [m.contracted || 0, m.collected || 0]));
  let yAxisMax = 1000;
  if (maxRawValue <= 500) yAxisMax = 500;
  else if (maxRawValue <= 1000) yAxisMax = 1000;
  else if (maxRawValue <= 1500) yAxisMax = 1500;
  else if (maxRawValue <= 2000) yAxisMax = 2000;
  else if (maxRawValue <= 3000) yAxisMax = 3000;
  else if (maxRawValue <= 5000) yAxisMax = 5000;
  else if (maxRawValue <= 10000) yAxisMax = 10000;
  else yAxisMax = Math.ceil(maxRawValue / 5000) * 5000;

  const yTicks = [
    yAxisMax,
    Math.round(yAxisMax * 0.66),
    Math.round(yAxisMax * 0.33),
    0
  ];

  const trendMonths = rawMonths.map(m => ({
    month: m.month,
    contracted: m.contracted,
    collected: m.collected,
    contractedHeight: Math.min(100, Math.max(8, Math.round((m.contracted / yAxisMax) * 100))),
    collectedHeight: Math.min(100, Math.max(8, Math.round((m.collected / yAxisMax) * 100))),
    valC: formatUSD(m.contracted),
    valP: formatUSD(m.collected)
  }));

  return (
    <div className="space-y-6 pb-8">
      
      {/* 1. Event Hero Banner & Live Status Bar */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-lg border border-slate-800">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-400/30">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>{lang === 'kh' ? 'ផ្ទាំងគ្រប់គ្រង និងវិភាគទូទៅ' : 'Unified Operations & Executive Dashboard'}</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-normal pt-1 pb-0.5 overflow-visible">
              {lang === 'kh' && currentEvent?.name_kh ? currentEvent.name_kh : currentEvent?.name || t('appName')}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-300 pt-1">
              <span className="flex items-center gap-1.5">
                <Map className="w-4 h-4 text-blue-400" />
                {currentEvent?.venue || t('venue')}
              </span>
              {currentEvent?.start_date && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  {new Date(currentEvent.start_date).toLocaleDateString(lang === 'kh' ? 'km-KH' : 'en-US')}
                  {' - '}
                  {currentEvent?.end_date ? new Date(currentEvent.end_date).toLocaleDateString(lang === 'kh' ? 'km-KH' : 'en-US') : ''}
                </span>
              )}
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase tracking-wider text-[10px]">
                {totalBooths} {t('boothsUnit', 'ស្តង់សរុប')}
              </span>
              {blockedBooths.length > 0 && (
                <span className="text-[11px] text-slate-400">
                  ({blockedBooths.length} {t('status_blocked')})
                </span>
              )}
            </div>
          </div>

          {/* Quick Action Shortcuts inside Hero */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => onNavigate('floorplan')}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Map className="w-4 h-4" />
              <span>{t('tab_floorplan')}</span>
            </button>
            <button
              onClick={onOpenPublicModal}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/15 text-white border border-white/15 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <ExternalLink className="w-4 h-4 text-blue-300" />
              <span>{t('publicLiveLink', 'ប្លង់ Public')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top 4 Executive Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
        {/* Card 1: Total Capacity Value */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-start justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block mb-1">{t('totalCapacityValue')}</span>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight font-mono">{formatUSD(data.total_capacity_value || availableValue)}</h3>
            <span className="text-[11px] font-semibold text-slate-400 mt-1 block">{totalBooths} {t('boothsUnit', 'ស្តង់សរុប')}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-xs">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Contracted Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-start justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block mb-1">{t('contractedRevenue')}</span>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight font-mono">{formatUSD(data.contracted_revenue)}</h3>
            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-blue-600 mt-1">
              <span>{percent(data.contracted_revenue)}% {t('ofCapacity')}</span>
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-xs">
            <BarChart3 className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Cash Collected */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-start justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block mb-1">{t('cashCollected')}</span>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight font-mono">{formatUSD(data.cash_collected)}</h3>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-1">
              <span>{percent(data.cash_collected)}% {t('ofCapacity')}</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-xs">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Outstanding Receivables */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-start justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block mb-1">{t('outstandingReceivables')}</span>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight font-mono">{formatUSD(data.receivables)}</h3>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 mt-1">
              <span>{percent(data.receivables)}% {t('ofCapacity')}</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shadow-xs">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Operational Quick Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
        {/* Card 1: Available Booths */}
        <div 
          onClick={() => onNavigate('floorplan')}
          className="group bg-white p-4.5 rounded-2xl border border-slate-200/90 hover:border-emerald-300 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 block mb-1">
                {t('status_available')} ({t('boothsUnit', 'ស្តង់')})
              </span>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                {availableBooths.length}
              </h3>
              <p className="text-xs font-bold text-emerald-600 mt-0.5 font-mono">
                {formatUSD(availableValue)} {lang === 'kh' ? 'សក្តានុពល' : 'value'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition-transform">
              <Store className="w-5 h-5" />
            </div>
          </div>
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-emerald-600 transition-colors">
            <span>{lang === 'kh' ? 'មើលលើប្លង់សាល' : 'View on floor plan'}</span>
            <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 2: Booths on Hold */}
        <div 
          onClick={() => onNavigate('bookings')}
          className="group bg-white p-4.5 rounded-2xl border border-slate-200/90 hover:border-amber-300 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 block mb-1">
                {t('status_hold')} ({t('boothsUnit', 'ស្តង់')})
              </span>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                {holdBooths.length}
              </h3>
              <p className="text-xs font-bold text-amber-600 mt-0.5">
                {lang === 'kh' ? 'រង់ចាំការទូទាត់ប្រាក់' : 'Awaiting payment'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-amber-600 transition-colors">
            <span>{lang === 'kh' ? 'ពិនិត្យបញ្ជីកក់' : 'Review reservations'}</span>
            <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 3: Booths Sold */}
        <div 
          onClick={() => onNavigate('bookings')}
          className="group bg-white p-4.5 rounded-2xl border border-slate-200/90 hover:border-blue-300 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 block mb-1">
                {t('status_sold')} ({t('boothsUnit', 'ស្តង់')})
              </span>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                {soldBooths.length}
              </h3>
              <p className="text-xs font-bold text-blue-600 mt-0.5">
                {occupancyRate}% {t('occupancyRate')}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-blue-600 transition-colors">
            <span>{t('tab_bookings')}</span>
            <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 4: Payments Pending Verification */}
        <div 
          onClick={() => onNavigate('payments')}
          className={`group bg-white p-4.5 rounded-2xl border shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between ${
            pendingPayments.length > 0 ? 'border-amber-200 hover:border-amber-400 bg-amber-50/20' : 'border-slate-200/90'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-xs font-bold text-slate-500 block">
                  {lang === 'kh' ? 'រង់ចាំផ្ទៀងផ្ទាត់' : 'Pending Verification'}
                </span>
                {pendingPayments.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                )}
              </div>
              <h3 className="text-2xl font-black text-amber-700 tracking-tight font-mono">
                {pendingPayments.length}
              </h3>
              <p className="text-xs font-bold text-amber-600 mt-0.5">
                {lang === 'kh' ? 'ត្រូវការផ្ទៀងផ្ទាត់ដោយគណនេយ្យ' : 'Requires accountant review'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="pt-2.5 border-t border-amber-100 flex items-center justify-between text-xs font-bold text-amber-700">
            <span>{isFinance ? (lang === 'kh' ? 'ចូលទៅផ្ទៀងផ្ទាត់' : 'Verify now') : (lang === 'kh' ? 'ពិនិត្យមើល' : 'View records')}</span>
            <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* 4. Visual Analytics: Multi-Segment Donut Chart + Enhanced Category Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* Multi-Segment Booth Occupancy Donut Chart */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-base font-black text-slate-900 leading-normal flex items-center gap-2">
                <PieChart className="w-4.5 h-4.5 text-blue-600" />
                <span>{t('boothOccupancy')}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{lang === 'kh' ? 'សមាមាត្រស្ថានភាពស្តង់ទូទាំងសាល' : 'Overall venue capacity distribution'}</p>
            </div>
            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200/80">
              {totalBooths} {t('boothsUnit', 'ស្តង់')}
            </span>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-6 justify-around py-4 my-auto">
            {/* Multi-Segment SVG Donut */}
            <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90 filter drop-shadow-xs" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="#f1f5f9"
                  strokeWidth="12"
                  fill="transparent"
                />
                {/* Available Segment (Emerald) */}
                {availLen > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#10b981"
                    strokeWidth="12"
                    strokeDasharray={`${availLen} ${C}`}
                    strokeDashoffset={availOffset}
                    strokeLinecap="butt"
                    fill="transparent"
                    className="transition-all duration-700"
                  />
                )}
                {/* Hold Segment (Amber) */}
                {holdLen > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#f59e0b"
                    strokeWidth="12"
                    strokeDasharray={`${holdLen} ${C}`}
                    strokeDashoffset={holdOffset}
                    strokeLinecap="butt"
                    fill="transparent"
                    className="transition-all duration-700"
                  />
                )}
                {/* Sold Segment (Blue) */}
                {soldLen > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#2563eb"
                    strokeWidth="12"
                    strokeDasharray={`${soldLen} ${C}`}
                    strokeDashoffset={soldOffset}
                    strokeLinecap="butt"
                    fill="transparent"
                    className="transition-all duration-700"
                  />
                )}
                {/* Blocked Segment (Slate) */}
                {blockedLen > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#64748b"
                    strokeWidth="12"
                    strokeDasharray={`${blockedLen} ${C}`}
                    strokeDashoffset={blockedOffset}
                    strokeLinecap="butt"
                    fill="transparent"
                    className="transition-all duration-700"
                  />
                )}
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-2xl font-black text-slate-900 leading-none font-mono">{occupancy}%</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{t('occupancyRate')}</span>
                <span className="text-[10px] font-bold text-blue-600 mt-0.5 font-mono">{soldBooths.length}/{totalBooths} {t('boothsUnit', 'ស្តង់')}</span>
              </div>
            </div>

            {/* Rich Legend with percentage pills */}
            <div className="space-y-2 text-xs font-semibold w-full sm:w-56">
              {/* Sold */}
              <div className="flex items-center justify-between gap-3 p-1.5 rounded-xl hover:bg-blue-50/50 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md bg-blue-600 shrink-0 shadow-2xs"></span>
                  <span className="text-slate-700 font-bold">{t('status_sold')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 font-mono">{soldBooths.length}</span>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-md w-12 text-right font-mono">
                    {Math.round((soldCount / total) * 100)}%
                  </span>
                </div>
              </div>

              {/* Hold */}
              <div className="flex items-center justify-between gap-3 p-1.5 rounded-xl hover:bg-amber-50/50 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md bg-amber-500 shrink-0 shadow-2xs"></span>
                  <span className="text-slate-700 font-bold">{t('status_hold')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 font-mono">{holdBooths.length}</span>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-md w-12 text-right font-mono">
                    {Math.round((holdCount / total) * 100)}%
                  </span>
                </div>
              </div>

              {/* Available */}
              <div className="flex items-center justify-between gap-3 p-1.5 rounded-xl hover:bg-emerald-50/50 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md bg-emerald-500 shrink-0 shadow-2xs"></span>
                  <span className="text-slate-700 font-bold">{t('status_available')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 font-mono">{availableBooths.length}</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md w-12 text-right font-mono">
                    {Math.round((availCount / total) * 100)}%
                  </span>
                </div>
              </div>

              {/* Blocked */}
              <div className="flex items-center justify-between gap-3 p-1.5 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md bg-slate-600 shrink-0 shadow-2xs"></span>
                  <span className="text-slate-700 font-bold">{t('status_blocked')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 font-mono">{blockedBooths.length}</span>
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md w-12 text-right font-mono">
                    {Math.round((blockedCount / total) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Continuous Ratio Strip */}
          <div className="pt-3 border-t border-slate-100 mt-auto">
            <div className="w-full bg-slate-100 rounded-full h-2 flex overflow-hidden">
              {soldLen > 0 && <div style={{ width: `${(soldCount/total)*100}%` }} className="bg-blue-600 h-full"></div>}
              {holdLen > 0 && <div style={{ width: `${(holdCount/total)*100}%` }} className="bg-amber-500 h-full"></div>}
              {availLen > 0 && <div style={{ width: `${(availCount/total)*100}%` }} className="bg-emerald-500 h-full"></div>}
              {blockedLen > 0 && <div style={{ width: `${(blockedCount/total)*100}%` }} className="bg-slate-600 h-full"></div>}
            </div>
          </div>
        </div>

        {/* Enhanced Performance by Category Card */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-base font-black text-slate-900 leading-normal flex items-center gap-2">
                <Layers className="w-4.5 h-4.5 text-purple-600" />
                <span>{t('performanceByCategory')}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{lang === 'kh' ? 'អត្រាកាន់កាប់ និងតម្លៃតាមប្រភេទស្តង់នីមួយៗ' : 'Breakdown by booth tier & pricing'}</p>
            </div>
            <span className="px-2.5 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded-xl border border-purple-100">
              {categoryStats.length} {lang === 'kh' ? 'ប្រភេទ' : 'categories'}
            </span>
          </div>

          <div className="space-y-3 py-2 my-auto">
            {categoryStats.map((cat, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-50/70 hover:bg-slate-50 border border-slate-100/90 transition-all">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-3 h-3 rounded-md shrink-0 shadow-xs" style={{ backgroundColor: cat.color }}></span>
                    <span className="font-bold text-slate-800 text-xs truncate">{cat.name}</span>
                    {cat.dimensions && (
                      <span className="text-[10px] font-medium text-slate-400 bg-white border border-slate-200/80 px-1.5 py-0.5 rounded-md shrink-0">
                        {cat.dimensions}
                      </span>
                    )}
                    {cat.price > 0 && (
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded-md shrink-0 font-mono">
                        {formatUSD(cat.price)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-slate-500 font-bold font-mono">
                      {cat.sold} / {cat.total} {lang === 'kh' ? 'ស្តង់' : 'booths'}
                    </span>
                    <span 
                      className="font-black text-xs px-2 py-0.5 rounded-md min-w-[42px] text-center font-mono"
                      style={{ 
                        backgroundColor: `${cat.color}15`, 
                        color: cat.color,
                        border: `1px solid ${cat.color}30` 
                      }}
                    >
                      {cat.percent}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200/70 rounded-full h-2.5 overflow-hidden p-0.5">
                  <div 
                    className="h-full rounded-full transition-all duration-700 shadow-2xs"
                    style={{ 
                      width: `${Math.max(cat.percent, cat.sold > 0 ? 5 : 0)}%`,
                      backgroundColor: cat.color 
                    }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                  <span>
                    {cat.sold === cat.total && cat.total > 0
                      ? (lang === 'kh' ? '✓ លក់អស់ទាំងស្រុង (Sold Out)' : '✓ Fully Sold')
                      : cat.sold > 0
                        ? (lang === 'kh' ? `លក់បាន ${cat.sold} ស្តង់ • នៅសល់ ${cat.total - cat.sold}` : `${cat.sold} sold • ${cat.total - cat.sold} remaining`)
                        : (lang === 'kh' ? `នៅទំនេរទាំងអស់ (${cat.total} ស្តង់)` : `All ${cat.total} booths available`)}
                  </span>
                  <span className="font-mono text-[10px] text-slate-500 font-semibold">
                    {lang === 'kh' ? 'សក្តានុពល' : 'Capacity'}: {formatUSD(cat.price * cat.total)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400">
            <span>{lang === 'kh' ? 'ស្តង់សរុបក្នុងសាល' : 'Total venue inventory'}: <strong className="text-slate-700 font-mono">{totalBooths} {t('boothsUnit', 'ស្តង់')}</strong></span>
            <button
              onClick={() => onNavigate('floorplan')}
              className="text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
            >
              <span>{lang === 'kh' ? 'មើលប្លង់លម្អិត' : 'View layout'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* 5. Sales Leaderboard & Monthly Revenue Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* Executive Sales Staff Leaderboard */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 leading-normal flex items-center gap-2">
                  <Trophy className="w-4.5 h-4.5 text-amber-500 fill-amber-500" />
                  <span>{t('salesLeaderboard')}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{lang === 'kh' ? 'ចំណាត់ថ្នាក់សមិទ្ធផលក្រុមការងារលក់' : 'Sales staff performance rankings'}</p>
              </div>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                {salesStaff.length} {lang === 'kh' ? 'អ្នកលក់' : 'reps'}
              </span>
            </div>

            {/* Team Summary KPI Mini-Boxes */}
            <div className="grid grid-cols-2 gap-2.5 mb-3.5">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 block">{lang === 'kh' ? 'ស្តង់លក់បានសរុប' : 'Booths Sold'}</span>
                <span className="text-lg font-black text-blue-700 font-mono mt-0.5 block">{soldBooths.length} {t('boothsUnit', 'ស្តង់')}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 block">{lang === 'kh' ? 'ទំហំកិច្ចសន្យា' : 'Contracted Vol.'}</span>
                <span className="text-lg font-black text-emerald-700 font-mono mt-0.5 block">{formatUSD(data.contracted_revenue || 0)}</span>
              </div>
            </div>

            {/* Staff List */}
            <div className="space-y-2">
              {salesStaff.length > 0 ? salesStaff.map((staff) => {
                const isTop1 = staff.rank === 1;
                const isTop2 = staff.rank === 2;
                const isTop3 = staff.rank === 3;
                return (
                  <div 
                    key={staff.rank} 
                    className={`p-2.5 flex items-center justify-between rounded-xl border transition-all ${
                      isTop1 ? 'bg-amber-50/40 border-amber-200/80 hover:bg-amber-50/70' : 'bg-white border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="shrink-0 w-6 text-center">
                        {isTop1 ? (
                          <span className="text-base" title="Top 1">🥇</span>
                        ) : isTop2 ? (
                          <span className="text-base" title="Top 2">🥈</span>
                        ) : isTop3 ? (
                          <span className="text-base" title="Top 3">🥉</span>
                        ) : (
                          <span className="text-xs font-bold text-slate-400 font-mono">#{staff.rank}</span>
                        )}
                      </div>
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${staff.gradient} text-white font-black text-xs flex items-center justify-center shadow-xs ring-2 ring-white shrink-0`}>
                        {staff.initials}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{staff.name}</h4>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                          <span>{staff.booths}</span>
                          {staff.phone && <span>• {staff.phone}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-slate-900 font-mono block">
                        {formatUSD(staff.amount)}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 font-mono">
                        {data.contracted_revenue > 0 ? Math.round((staff.amount / data.contracted_revenue) * 100) : 0}% {lang === 'kh' ? 'នៃចំណូល' : 'share'}
                      </span>
                    </div>
                  </div>
                );
              }) : (
                <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  {lang === 'kh' ? 'មិនទាន់មានទិន្នន័យការលក់' : 'No sales records yet'}
                </div>
              )}
            </div>
          </div>

          {/* Sales Velocity & Coaching Banner */}
          <div className="mt-3.5 p-3 rounded-xl bg-gradient-to-r from-blue-50/80 to-purple-50/80 border border-blue-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-800 block truncate">{lang === 'kh' ? 'សន្ទុះនៃការលក់ (Sales Velocity)' : 'Sales Momentum'}</span>
                <span className="text-[10px] text-slate-500 block truncate font-mono">
                  {lang === 'kh' 
                    ? `កិច្ចសន្យា ${formatUSD(data.contracted_revenue || 0)} លើស្តង់ ${soldBooths.length}` 
                    : `${formatUSD(data.contracted_revenue || 0)} contracted across ${soldBooths.length} booths`}
                </span>
              </div>
            </div>
            <button
              onClick={() => onNavigate('bookings')}
              className="text-xs font-bold text-blue-700 hover:text-blue-800 shrink-0 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-blue-200/80 shadow-2xs active:scale-95 transition-all"
            >
              {lang === 'kh' ? 'បញ្ជីកក់' : 'Bookings'}
            </button>
          </div>
        </div>

        {/* High-End Executive Revenue & Cash Flow Analytics */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between min-h-[380px]">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 leading-normal flex items-center gap-2">
                  <BarChart3 className="w-4.5 h-4.5 text-blue-600" />
                  <span>{lang === 'kh' ? 'វិភាគចំណូល និងលំហូរសាច់ប្រាក់' : 'Revenue & Cash Flow Analytics'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{lang === 'kh' ? 'ប្រៀបធៀបទំហំកិច្ចសន្យា និងប្រាក់ប្រមូលបានជាក់ស្តែង' : 'Contracted vs cash collection comparison'}</p>
              </div>
              <div className="flex items-center gap-3 text-xs font-bold">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                  <span className="w-2.5 h-2.5 rounded-xs bg-blue-600"></span>
                  <span>{t('contracted')}: <strong className="font-mono">{formatUSD(data.contracted_revenue || 0)}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500"></span>
                  <span>{t('collected')}: <strong className="font-mono">{formatUSD(data.cash_collected || 0)}</strong></span>
                </div>
              </div>
            </div>

            {/* Financial Health Snapshot Strip */}
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{lang === 'kh' ? 'អត្រាប្រមូលជាក់ស្តែង' : 'Collection Rate'}</span>
                <span className="text-base font-black text-emerald-600 font-mono mt-0.5 block">
                  {data.contracted_revenue > 0 ? Math.round((data.cash_collected / data.contracted_revenue) * 100) : 0}%
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{lang === 'kh' ? 'សមតុល្យនៅខ្វះ' : 'Pending Balance'}</span>
                <span className="text-base font-black text-amber-600 font-mono mt-0.5 block">
                  {formatUSD(data.receivables || 0)}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{lang === 'kh' ? 'សក្តានុពលសរុប' : 'Total Capacity'}</span>
                <span className="text-base font-black text-slate-900 font-mono mt-0.5 block">
                  {formatUSD(data.total_capacity_value || availableValue)}
                </span>
              </div>
            </div>

            {/* Chart Area with Real Y-Axis */}
            <div className="relative h-56 flex items-stretch gap-3 pt-4">
              {/* Y-Axis Column */}
              <div className="w-14 shrink-0 flex flex-col justify-between text-[11px] font-bold text-slate-400 font-mono pb-6 text-right pr-2 select-none">
                <span>{formatUSD(yTicks[0])}</span>
                <span>{formatUSD(yTicks[1])}</span>
                <span>{formatUSD(yTicks[2])}</span>
                <span>$0</span>
              </div>

              {/* Chart Grid & Bars */}
              <div className="flex-1 relative flex flex-col justify-between border-l border-b border-slate-200 pb-6">
                {/* Dashed Horizontal Gridlines */}
                <div className="absolute inset-x-0 top-0 border-b border-dashed border-slate-200/80 pointer-events-none"></div>
                <div className="absolute inset-x-0 top-1/3 border-b border-dashed border-slate-200/80 pointer-events-none"></div>
                <div className="absolute inset-x-0 top-2/3 border-b border-dashed border-slate-200/80 pointer-events-none"></div>

                {/* Bars Container */}
                <div className="w-full h-full flex items-end justify-around px-4 sm:px-8 z-10">
                  {trendMonths.map((m, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end group">
                      <div className="flex items-end justify-center gap-3 h-full">
                        {/* Contracted Bar */}
                        <div className="flex flex-col items-center justify-end h-full">
                          <span className="text-[10px] font-black text-blue-700 bg-blue-50 border border-blue-200/80 px-1.5 py-0.5 rounded-md mb-1 font-mono shadow-2xs whitespace-nowrap">
                            {m.valC}
                          </span>
                          <div 
                            className="w-10 sm:w-14 bg-gradient-to-t from-blue-700 via-blue-600 to-blue-500 rounded-t-xl transition-all group-hover:brightness-110 shadow-sm"
                            style={{ height: `${m.contractedHeight}%` }}
                            title={`${t('contracted')}: ${m.valC}`}
                          ></div>
                        </div>

                        {/* Collected Bar */}
                        <div className="flex flex-col items-center justify-end h-full">
                          <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded-md mb-1 font-mono shadow-2xs whitespace-nowrap">
                            {m.valP}
                          </span>
                          <div 
                            className="w-10 sm:w-14 bg-gradient-to-t from-emerald-600 via-emerald-500 to-teal-400 rounded-t-xl transition-all group-hover:brightness-110 shadow-sm"
                            style={{ height: `${m.collectedHeight}%` }}
                            title={`${t('collected')}: ${m.valP}`}
                          ></div>
                        </div>
                      </div>

                      {/* X-Axis Label */}
                      <span className="absolute -bottom-6 text-[11px] font-bold text-slate-600 group-hover:text-blue-700 transition-colors font-mono">
                        📅 {m.month}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>💡 {lang === 'kh' ? 'ការទូទាត់ត្រូវបានផ្ទៀងផ្ទាត់ដោយគណនេយ្យ ស្របតាមកិច្ចសន្យាជាក់ស្តែង' : 'Payments verified against active booth contracts'}</span>
            <button
              onClick={() => onNavigate('payments')}
              className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer shrink-0 ml-2"
            >
              <span>{lang === 'kh' ? 'កំណត់ត្រាហិរញ្ញវត្ថុ' : 'Finance'}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

      </div>

      {/* 6. Recent Activity Feeds (Bookings & Payments) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Recent Payment Transactions */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2 leading-normal">
                <CreditCard className="w-4.5 h-4.5 text-blue-600" />
                <span>{lang === 'kh' ? 'កំណត់ត្រាទទួលប្រាក់ចុងក្រោយ' : 'Recent Payment Transactions'}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {lang === 'kh' ? 'ប្រវត្តិនៃការបង់ប្រាក់កក់ និងបង់ផ្តាច់របស់អតិថិជន' : 'Latest payments recorded'}
              </p>
            </div>

            <button
              onClick={() => onNavigate('payments')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <span>{lang === 'kh' ? 'មើលទាំងអស់' : 'View all'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentPayments.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
              {lang === 'kh' ? 'មិនទាន់មានកំណត់ត្រាទូទាត់ប្រាក់នៅឡើយទេ' : 'No payments recorded yet.'}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentPayments.map(p => {
                const isPending = p.verification_status === 'pending';
                return (
                  <div key={p.id} className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 px-2.5 rounded-xl transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60 font-mono">
                          {p.booth.booth_code}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {p.booking.exhibitor_name}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium mt-1">
                        <span>{p.payment_method}</span>
                        <span>•</span>
                        <span>{p.payment_date ? new Date(p.payment_date).toLocaleDateString(lang === 'kh' ? 'km-KH' : 'en-US') : 'Recent'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="text-right">
                        <span className="text-xs font-black text-slate-900 block font-mono">
                          {formatUSD(p.paid_amount)}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                          isPending 
                            ? 'bg-amber-50 text-amber-700 border border-amber-200/80' 
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                        }`}>
                          {isPending ? (lang === 'kh' ? 'រង់ចាំផ្ទៀងផ្ទាត់' : 'Pending') : (lang === 'kh' ? 'បានផ្ទៀងផ្ទាត់' : 'Verified')}
                        </span>
                      </div>

                      {isFinance && isPending && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              await onVerifyPayment(p.id);
                            }}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer active:scale-95"
                            title={lang === 'kh' ? 'ផ្ទៀងផ្ទាត់ការបង់ប្រាក់' : 'Verify payment'}
                          >
                            <ShieldCheck className="w-3 h-3" />
                            <span>{lang === 'kh' ? 'ផ្ទៀងផ្ទាត់' : 'Verify'}</span>
                          </button>
                          {onRejectPayment && (
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                await onRejectPayment(p.id);
                              }}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer active:scale-95"
                              title={lang === 'kh' ? 'បដិសេធការបង់ប្រាក់' : 'Reject payment'}
                            >
                              <span>✕</span>
                              <span>{lang === 'kh' ? 'បដិសេធ' : 'Reject'}</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Bookings */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2 leading-normal">
                <FileText className="w-4.5 h-4.5 text-blue-600" />
                <span>{lang === 'kh' ? 'ការកក់ស្តង់ចុងក្រោយ' : 'Recent Booth Bookings'}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {lang === 'kh' ? 'ក្រុមហ៊ុនដែលទើបបានចុះឈ្មោះកក់ស្តង់ថ្មីៗ' : 'Latest registered exhibitors'}
              </p>
            </div>

            <button
              onClick={() => onNavigate('bookings')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <span>{lang === 'kh' ? 'មើលទាំងអស់' : 'View all'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentBookings.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
              {lang === 'kh' ? 'មិនទាន់មានការកក់ស្តង់នៅឡើយទេ' : 'No bookings recorded yet.'}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentBookings.map(b => {
                const bk = b.active_booking;
                return (
                  <div 
                    key={b.id} 
                    onClick={() => onSelectBooth(b)}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 px-2.5 rounded-xl transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60 font-mono">
                          {b.booth_code}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {bk.exhibitor_name}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium mt-1">
                        <span>{bk.contact_person}</span>
                        <span>•</span>
                        <span>{bk.phone}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-slate-900 block font-mono">
                        {formatUSD(bk.total_agreed_price)}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                        bk.booking_status === 'fully_paid'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : bk.booking_status === 'deposit_paid'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-50 text-slate-700 border border-slate-200'
                      }`}>
                        {bk.booking_status === 'fully_paid'
                          ? (lang === 'kh' ? 'បានបង់ដាច់' : 'Fully Paid')
                          : bk.booking_status === 'deposit_paid'
                            ? (lang === 'kh' ? 'បានបង់កក់' : 'Deposit Paid')
                            : (lang === 'kh' ? 'កំពុងកក់ទុក' : 'On Hold')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
