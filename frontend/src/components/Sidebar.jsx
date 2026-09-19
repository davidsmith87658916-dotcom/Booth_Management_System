import React from 'react';
import { LayoutGrid, Map, CalendarCheck, CreditCard, Users, Settings, LogOut, UserRound } from 'lucide-react';
import { useLanguage } from '../i18n';

export default function Sidebar({ activeTab, setActiveTab, currentEvent, user, onLogout }) {
  const { lang, t } = useLanguage();
  const admin = user.role === 'admin';

  const items = [
    ['dashboard', t('tab_dashboard'), LayoutGrid],
    ['floorplan', t('tab_floorplan'), Map],
    ['bookings', t('tab_bookings'), CalendarCheck],
    ['payments', t('tab_payments'), CreditCard],
    ...(admin ? [
      ['staff', t('tab_staff'), Users],
      ['settings', t('tab_settings'), Settings]
    ] : []),
    ['account', t('tab_account'), UserRound]
  ];

  const displayedEventName = lang === 'kh' && currentEvent?.name_kh 
    ? currentEvent.name_kh 
    : (currentEvent?.name || t('noEventSelected'));

  return (
    <aside className="app-sidebar flex flex-col shrink-0 text-slate-300">
      <div className="sidebar-brand">
        <div className="brand-symbol">
          <Map size={21} />
        </div>
        <div>
          <h1 className="leading-relaxed pt-0.5">{t('appName')}</h1>
          <small className="leading-relaxed">{t('teamWorkspace')}</small>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1.5 overflow-auto">
        {items.map(([key, label, Icon]) => (
          <button
            key={key}
            aria-label={label}
            title={label}
            aria-current={activeTab === key ? 'page' : undefined}
            onClick={() => setActiveTab(key)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === key ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/25' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <Icon size={17} className={activeTab === key ? 'text-white' : 'text-slate-400'} />
            <span className="leading-relaxed pt-0.5 overflow-visible">{label}</span>
          </button>
        ))}

        <button
          className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold hover:bg-slate-800/80 rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer mt-3"
          aria-label={t('signOut')}
          title={t('signOut')}
          onClick={onLogout}
        >
          <LogOut size={17} />
          <span className="leading-relaxed pt-0.5">{t('signOut')}</span>
        </button>
      </nav>

      <div className="sidebar-profile">
        <small className="leading-relaxed">{t('currentEvent')}</small>
        <strong className="leading-relaxed truncate block">{displayedEventName}</strong>
        <div>
          <span className="avatar">{user.name.slice(0, 2).toUpperCase()}</span>
          <div className="min-w-0">
            <strong className="truncate block leading-normal">{user.name}</strong>
            <small className="leading-normal">{admin ? t('administrator') : user.role === 'accountant' ? t('accountant') : t('salesStaff')}</small>
          </div>
        </div>
      </div>
    </aside>
  );
}
