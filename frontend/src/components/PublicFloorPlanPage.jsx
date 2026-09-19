import React from 'react';
import { Wrench, AlertCircle, ArrowLeft, LogIn, Globe } from 'lucide-react';
import { useLanguage } from '../i18n';

export default function PublicFloorPlanPage({ eventId, onExitToLogin }) {
  const { lang, toggleLang } = useLanguage();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-md shadow-purple-600/30">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-white tracking-tight flex items-center gap-2">
              <span>ExpoHub</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {lang === 'kh' ? 'ប្លង់ Public' : 'Public Plan'}
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Language Toggle */}
          <button
            type="button"
            onClick={toggleLang}
            className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{lang === 'kh' ? 'English' : 'ភាសាខ្មែរ'}</span>
          </button>

          {/* Return / Staff Login */}
          <button
            type="button"
            onClick={onExitToLogin}
            className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-purple-600/25 transition-all cursor-pointer active:scale-95"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>{lang === 'kh' ? 'ចូលប្រព័ន្ធ (Staff Login)' : 'Staff Login'}</span>
          </button>
        </div>
      </header>

      {/* Main Center Notice Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg bg-slate-900/80 border border-slate-800 rounded-3xl p-8 sm:p-10 text-center space-y-6 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200">
          
          {/* Pulsing Icon */}
          <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
            <Wrench className="w-10 h-10 animate-pulse text-amber-400" />
          </div>

          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span>{lang === 'kh' ? 'ប្លង់ Public · ផ្អាកជាបណ្តោះអាសន្ន' : 'Public Plan · Temporarily Disabled'}</span>
          </div>

          {/* Heading and Message */}
          <div className="space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {lang === 'kh' ? 'Developer កំពុងស្ថិតក្នុងការអភិវឌ្ឍន៏' : 'Developer Under Development'}
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
              {lang === 'kh' 
                ? 'មុខងារ «ប្លង់ Public» សម្រាប់ព្រឹត្តិការណ៍នេះត្រូវបានបិទដំណើរការជាបណ្តោះអាសន្ន ដោយសារ Developer កំពុងស្ថិតក្នុងការអភិវឌ្ឍន៍ និងកែលម្អប្រព័ន្ធ។ សូមអភ័យទោសចំពោះការរង់ចាំ។' 
                : 'The Public Plan feature for this event has been temporarily disabled as the developer is currently actively working on system updates. Thank you for your patience.'}
            </p>
          </div>

          {/* Back Action */}
          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={onExitToLogin}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all cursor-pointer active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{lang === 'kh' ? 'ត្រឡប់ទៅផ្ទាំងចូលប្រព័ន្ធ' : 'Back to Login'}</span>
            </button>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-600">
        <p>ExpoHub Management System · {lang === 'kh' ? 'ប្លង់ Public' : 'Public Plan'}</p>
      </footer>
    </div>
  );
}
