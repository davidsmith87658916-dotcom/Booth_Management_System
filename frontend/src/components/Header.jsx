import React, { useState, useRef, useEffect } from 'react';
import { Search, Globe, Plus, ChevronDown, Check, Store } from 'lucide-react';
import { useLanguage } from '../i18n';

export default function Header({ 
  title, 
  subtitle,
  events = [], 
  selectedEventId, 
  onSelectEvent, 
  showEventSelector = true,
  searchQuery, 
  onSearchChange,
  searchPlaceholder,
  showSearch = true,
  actionButton = null,
  viewModeControl = null,
  onAddBoothClick
}) {
  const { lang, toggleLang, t } = useLanguage();
  const [eventDropdownOpen, setEventDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setEventDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentSelectedEvent = events.find(ev => ev.id === selectedEventId) || events[0];
  const currentEventName = lang === 'kh' && currentSelectedEvent?.name_kh 
    ? currentSelectedEvent.name_kh 
    : currentSelectedEvent?.name || '';

  const displayTitle = title || t('title_floorplan');
  const displaySubtitle = subtitle || t('subtitle_floorplan');

  return (
    <header className="app-header min-h-[72px] lg:min-h-[78px] py-2 bg-white border-b border-slate-200/90 px-5 lg:px-7 flex items-center justify-between gap-4 shrink-0 shadow-xs z-20 overflow-visible">
      
      {/* Title & Subtitle (Left) with proper headroom for Khmer vowels */}
      <div className="min-w-0 shrink py-1 overflow-visible">
        <h2 className="text-lg lg:text-xl font-bold text-slate-900 leading-normal pt-1 pb-0.5 overflow-visible">
          {displayTitle}
        </h2>
        <p className="text-[11px] lg:text-xs text-slate-500 font-medium leading-relaxed pt-0.5 overflow-visible">
          {displaySubtitle}
        </p>
      </div>

      {/* Right Action Tools */}
      <div className="flex items-center gap-2.5 sm:gap-3 lg:gap-3.5 shrink-0 overflow-visible">
        
        {/* View Mode Switcher (2D Floor vs Booth Table) */}
        {viewModeControl && (
          <div className="shrink-0 hidden sm:flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => viewModeControl.onChange('canvas')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewModeControl.mode === 'canvas'
                  ? 'bg-white text-purple-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🗺️</span>
              <span className="leading-normal pt-0.5">{lang === 'kh' ? 'ប្លង់ 2D' : '2D Floor Plan'}</span>
            </button>
            <button
              type="button"
              onClick={() => viewModeControl.onChange('table')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewModeControl.mode === 'table'
                  ? 'bg-white text-purple-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>📋</span>
              <span className="leading-normal pt-0.5">{lang === 'kh' ? 'តារាងបញ្ជីស្តង់' : 'Booth Table'}</span>
            </button>
          </div>
        )}

        {/* Premium Executive Event Selector Dropdown */}
        {showEventSelector && events.length > 0 && (
          <div className="relative shrink-0 w-64 sm:w-72 md:w-80 lg:w-96 max-w-[420px]" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setEventDropdownOpen(!eventDropdownOpen)}
              className={`w-full flex items-center justify-between gap-3 px-3.5 py-1.5 min-h-[44px] rounded-2xl text-xs font-semibold cursor-pointer transition-all duration-200 text-left shadow-2xs group ${
                eventDropdownOpen
                  ? 'bg-white border-2 border-purple-600 ring-4 ring-purple-500/15 text-slate-900 shadow-md'
                  : 'bg-white hover:bg-slate-50/80 border border-slate-200/90 hover:border-purple-300 text-slate-800'
              }`}
              aria-expanded={eventDropdownOpen}
              aria-label={t('currentEvent')}
              title={currentEventName}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  eventDropdownOpen 
                    ? 'bg-purple-600 text-white shadow-xs' 
                    : 'bg-purple-50 text-purple-600 border border-purple-100 group-hover:bg-purple-100'
                }`}>
                  <Store className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1 py-0.5">
                  <span className="block truncate text-xs font-bold text-slate-800 leading-snug">
                    {currentEventName}
                  </span>
                </div>
              </div>
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 ${
                eventDropdownOpen ? 'bg-purple-50 text-purple-600' : 'text-slate-400 group-hover:text-slate-600'
              }`}>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${eventDropdownOpen ? 'rotate-180 text-purple-600' : ''}`} />
              </div>
            </button>

            {/* Floating Dropdown Menu */}
            {eventDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[92vw] bg-white border border-slate-200/90 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
                  <span>{lang === 'kh' ? 'ជ្រើសរើសព្រឹត្តិការណ៍' : 'Switch Event'}</span>
                  <span className="text-[10px] text-purple-700 font-bold bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full font-mono">
                    {events.length} {lang === 'kh' ? 'ព្រឹត្តិការណ៍' : 'events'}
                  </span>
                </div>
                <div className="max-h-72 overflow-y-auto py-1 divide-y divide-slate-50">
                  {events.map((ev) => {
                    const isSelected = ev.id === selectedEventId;
                    const evName = lang === 'kh' && ev.name_kh ? ev.name_kh : ev.name;
                    return (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => {
                          onSelectEvent(ev.id);
                          setEventDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-purple-50/80 text-purple-900 font-bold' 
                            : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium'
                        }`}
                        title={evName}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-purple-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500'
                          }`}>
                            <Store className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className={`block text-xs leading-snug truncate ${isSelected ? 'font-bold text-purple-900' : 'font-semibold text-slate-800'}`}>
                              {evName}
                            </span>
                            {ev.venue && (
                              <span className="block text-[11px] text-slate-400 font-normal truncate mt-0.5">
                                📍 {ev.venue}
                              </span>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 shadow-2xs">
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Contextual Search Bar (only shown when showSearch is true) */}
        {showSearch && (
          <div className="global-search relative hidden md:block w-40 lg:w-48 xl:w-56 shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              aria-label={searchPlaceholder || t('searchBoothOrExhibitor')} 
              type="text"
              placeholder={searchPlaceholder || t('searchBoothOrExhibitor')}
              value={searchQuery || ''}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              className="w-full pl-8 pr-3 py-2 min-h-[44px] bg-slate-50 hover:bg-white border border-slate-200/90 rounded-2xl text-xs font-medium text-slate-800 focus:bg-white focus:border-purple-500 transition-all placeholder:text-slate-400 shadow-2xs"
            />
          </div>
        )}

        {/* Language Switcher (EN | KH) */}
        <button
          type="button"
          onClick={toggleLang}
          className="px-3 py-2 min-h-[44px] bg-white hover:bg-slate-50 border border-slate-200/90 rounded-2xl text-xs font-extrabold text-slate-700 flex items-center gap-1.5 shadow-2xs transition-colors shrink-0 cursor-pointer"
          title={lang === 'kh' ? 'ប្តូរទៅភាសាអង់គ្លេស (Switch to English)' : 'Switch to Khmer (ប្តូរទៅភាសាខ្មែរ)'}
          aria-label="Toggle language"
        >
          <Globe className="w-3.5 h-3.5 text-purple-600" />
          <span className={lang === 'en' ? 'text-purple-600 font-bold' : 'text-slate-400 font-medium'}>EN</span>
          <span className="text-slate-300">|</span>
          <span className={lang === 'kh' ? 'text-purple-600 font-bold' : 'text-slate-400 font-medium'}>KH</span>
        </button>

        {/* Contextual Primary Action Button */}
        {actionButton ? (
          React.isValidElement(actionButton) ? actionButton : (
            <button
              type="button"
              onClick={actionButton.onClick}
              className={actionButton.className || "px-3 sm:px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm shadow-purple-500/25 transition-all active:scale-95 cursor-pointer shrink-0"}
              title={actionButton.label}
            >
              {actionButton.icon && <actionButton.icon className="w-4 h-4" />}
              <span className="hidden sm:inline">{actionButton.label}</span>
              <span className="sm:hidden">{actionButton.shortLabel || actionButton.label}</span>
            </button>
          )
        ) : onAddBoothClick ? (
          <button
            type="button"
            onClick={onAddBoothClick}
            className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm shadow-blue-500/25 transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t('addBooth')}</span>
            <span className="sm:hidden">{t('add')}</span>
          </button>
        ) : null}

      </div>

    </header>
  );
}
