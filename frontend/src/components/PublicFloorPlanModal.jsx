import React from 'react';
import { X, Wrench, AlertCircle, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../i18n';

export default function PublicFloorPlanModal({ currentEvent, onClose }) {
  const { lang } = useLanguage();

  if (!currentEvent) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {lang === 'kh' ? 'ប្លង់ Public' : 'Public Floor Plan'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {currentEvent.name_kh || currentEvent.name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content - Under Development Notice */}
        <div className="p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
            <Wrench className="w-8 h-8 animate-pulse" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100/70 text-amber-800 border border-amber-300">
            <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
            <span>{lang === 'kh' ? 'មុខងារត្រូវបានបិទបណ្តោះអាសន្ន' : 'Feature Temporarily Disabled'}</span>
          </div>

          <div className="space-y-2">
            <h4 className="text-xl font-black text-slate-900 tracking-tight">
              {lang === 'kh' ? 'Developer កំពុងស្ថិតក្នុងការអភិវឌ្ឍន៏' : 'Developer Under Development'}
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
              {lang === 'kh' 
                ? 'មុខងារ «ប្លង់ Public» ត្រូវបានបិទដំណើរការជាបណ្តោះអាសន្ន។ ក្រុមការងារ Developer កំពុងស្ថិតក្នុងការអភិវឌ្ឍន៍ និងកែលម្អប្រព័ន្ធឡើងវិញ។' 
                : 'The Public Plan feature has been temporarily disabled. The developer is currently working on system enhancements.'}
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-center">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
            >
              {lang === 'kh' ? 'យល់ព្រម (បិទ)' : 'Close'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
