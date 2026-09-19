import { useState } from 'react';
import { 
  Map, 
  ShieldCheck, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  Globe, 
  AlertCircle, 
  Loader2, 
  ArrowRight 
} from 'lucide-react';
import { write } from '../api';
import { useLanguage } from '../i18n';

export default function AuthScreen({ setup, onSignedIn }) {
  const { lang, toggleLang, t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Form values start clean and empty (strictly NO notes, hints, or demo credentials)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    const f = new FormData(e.currentTarget);
    try {
      onSignedIn(await write(setup ? '/auth/setup' : '/auth/login', Object.fromEntries(f)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen w-full flex flex-col justify-start items-center pt-6 sm:pt-8 pb-8 px-4 bg-[#E6EBF5] select-none relative">
      
      {/* Neumorphic / Soft UI Login Card (Exact ICT Lab Management Style) */}
      <div className="w-full max-w-[480px] bg-[#E6EBF5] neu-card p-7 sm:p-9 relative z-10 mt-2 sm:mt-4 overflow-visible">
        
        {/* TOP-RIGHT LANGUAGE SWITCHER INSIDE CARD */}
        <div className="absolute top-5 right-5 z-20">
          <button
            type="button"
            onClick={toggleLang}
            className="h-8 px-3 rounded-full bg-[#E6EBF5] neu-pill flex items-center gap-1.5 text-xs font-bold text-slate-700 transition-all cursor-pointer hover:brightness-105 active:scale-95"
            title={lang === 'kh' ? 'Switch to English' : 'ប្តូរទៅភាសាខ្មែរ'}
          >
            <Globe className="w-3.5 h-3.5 text-[#0044CC]" />
            <span className={lang === 'en' ? 'text-[#0044CC] font-extrabold' : 'text-slate-400'}>EN</span>
            <span className="text-slate-300 text-[10px]">|</span>
            <span className={lang === 'kh' ? 'text-[#0044CC] font-extrabold' : 'text-slate-400'}>KH</span>
          </button>
        </div>
        
        {/* =========================================================================
            LOGO PLACEHOLDER SLOT
            លោកអ្នកអាចដាក់រូបភាព Logo ជំនួសនៅត្រង់នេះបានយ៉ាងងាយស្រួល:
            ឧទាហរណ៍៖ <img src="/logo.png" alt="Logo" className="w-20 h-20 object-contain" />
            ========================================================================= */}
        <div className="w-24 h-24 sm:w-26 sm:h-26 rounded-3xl bg-[#E6EBF5] neu-logo flex items-center justify-center mx-auto mb-4 p-2.5 transition-transform hover:scale-105">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-[#0044CC] to-indigo-600 flex items-center justify-center text-white shadow-md">
            <Map className="w-9 h-9 stroke-[2.2]" />
          </div>
        </div>

        {/* Title & Hierarchy with ample headroom for Khmer vowels */}
        <div className="text-center mb-6 overflow-visible">
          <h1 className="text-2xl sm:text-[26px] font-bold text-[#1E3C72] leading-normal pt-1.5 pb-1 overflow-visible">
            {setup 
              ? (lang === 'kh' ? 'រៀបចំប្រព័ន្ធគ្រប់គ្រងថ្មី' : 'WORKSPACE SETUP') 
              : (lang === 'kh' ? 'ប្រព័ន្ធគ្រប់គ្រងការលក់ស្តង់ពិព័រណ៍' : 'Expo Booth Management System')}
          </h1>
          
          {/* Subtle Blue Dash Accent under Title */}
          <div className="w-9 h-1 rounded-full bg-[#0044CC] mx-auto my-3.5" />

          <h2 className="text-base font-bold text-slate-700 leading-normal pt-1 overflow-visible">
            {setup 
              ? (lang === 'kh' ? 'បង្កើតគណនី Admin ដំបូង' : 'Create Initial Admin Account') 
              : (lang === 'kh' ? 'សូមស្វាគមន៍ការត្រឡប់មកវិញ' : 'Welcome Back')}
          </h2>

          <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed pt-0.5">
            {lang === 'kh' ? 'សូមចូលគណនីដើម្បីបន្ត' : 'Please sign in to continue'}
          </p>
        </div>

        {/* Neumorphic Form */}
        <form onSubmit={submit} className="space-y-4">
          
          {/* Setup Mode: Admin Name */}
          {setup && (
            <div className="relative flex items-center">
              <ShieldCheck className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
              <input
                name="name"
                type="text"
                autoComplete="name"
                required
                maxLength={100}
                placeholder={lang === 'kh' ? 'ឈ្មោះ Admin' : 'Admin Name'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-14 pl-12 pr-4 rounded-2xl bg-[#E6EBF5] neu-input text-sm font-medium text-slate-800 placeholder:text-slate-400"
              />
            </div>
          )}

          {/* Email / Username Input (Neumorphic Inset) */}
          <div className="relative flex items-center">
            <User className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
            <input
              name="email"
              type="email"
              autoComplete="username"
              required
              placeholder={lang === 'kh' ? 'អ៊ីមែលគណនី (Gmail ឬ Email)' : 'Email address (Gmail or Email)'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-14 pl-12 pr-4 rounded-2xl bg-[#E6EBF5] neu-input text-sm font-medium text-slate-800 placeholder:text-slate-400"
            />
          </div>

          {/* Password Input (Neumorphic Inset with Eye Toggle) */}
          <div className="relative flex items-center">
            <Lock className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={setup ? 'new-password' : 'current-password'}
              required
              maxLength={128}
              placeholder={lang === 'kh' ? 'ពាក្យសម្ងាត់' : 'Password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-14 pl-12 pr-12 rounded-2xl bg-[#E6EBF5] neu-input text-sm font-medium text-slate-800 placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
            </button>
          </div>

          {/* Remember Me & Forgot Password Row */}
          <div className="flex items-center justify-between text-xs px-1 pt-1 pb-2">
            <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-medium">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#0044CC] focus:ring-[#0044CC]/20 cursor-pointer"
              />
              <span>{lang === 'kh' ? 'ចងចាំខ្ញុំ' : 'Remember me'}</span>
            </label>

            <span className="text-[#0044CC] font-semibold hover:underline cursor-pointer">
              {lang === 'kh' ? 'ភ្លេចពាក្យសម្ងាត់?' : 'Forgot password?'}
            </span>
          </div>

          {/* Error Message */}
          {error && (
            <div role="alert" className="p-3 bg-rose-50/90 border border-rose-200 text-rose-700 rounded-2xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Primary Action Button (Solid Royal Blue with Right Arrow) */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={busy}
              className="w-full h-14 rounded-2xl neu-button-primary text-base font-bold flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {busy ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span>{t('pleaseWait', 'Please wait…')}</span>
                </>
              ) : (
                <>
                  <span>{setup ? t('createAdminBtn', 'Create Administrator') : (lang === 'kh' ? 'ចូលគណនី' : 'Sign in')}</span>
                  <ArrowRight className="w-4.5 h-4.5 stroke-[2.5]" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Divider with 'ឬ' / 'or' */}
        <div className="flex items-center my-6">
          <div className="flex-1 h-[1px] bg-[#C4C8D1]/70" />
          <span className="px-3 text-xs text-slate-400 font-medium">
            {lang === 'kh' ? 'ឬ' : 'or'}
          </span>
          <div className="flex-1 h-[1px] bg-[#C4C8D1]/70" />
        </div>

        {/* Support Link */}
        <div className="text-center text-xs text-slate-500 font-medium">
          {lang === 'kh' ? (
            <span>ត្រូវការជំនួយ ឬ ស្នើសុំគណនី? <span className="text-[#0044CC] font-bold hover:underline cursor-pointer">ទាក់ទង Admin</span></span>
          ) : (
            <span>Need access or assistance? <span className="text-[#0044CC] font-bold hover:underline cursor-pointer">Contact Administrator</span></span>
          )}
        </div>

      </div>

      {/* FOOTER */}
      <footer className="w-full max-w-[480px] text-center text-[11px] text-slate-400 font-medium mt-4">
        © 2026 ExpoHub Technologies • Enterprise Management System
      </footer>

    </main>
  );
}

export function PasswordScreen({ onDone, onLogout, required = false }) {
  const { lang, toggleLang, t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  async function submitPassword(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const data = Object.fromEntries(new FormData(e.currentTarget));
    if (data.new_password !== data.confirm) {
      setError(t('passwordsDoNotMatch'));
      setBusy(false);
      return;
    }
    try {
      onDone(await write('/auth/password', data));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen w-full flex flex-col justify-center items-center py-8 px-4 bg-[#E6EBF5] select-none font-sans">
      <div className="w-full max-w-[480px] bg-[#E6EBF5] neu-card p-8 sm:p-11 relative z-10">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#C4C8D1]/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#0044CC] flex items-center justify-center text-white font-bold text-xs">
              <Map className="w-4 h-4" />
            </div>
            <span className="font-black text-sm text-[#1E3C72] font-mono tracking-tight">
              {t('appName', 'ExpoHub')}
            </span>
          </div>

          <button
            type="button"
            onClick={toggleLang}
            className="h-8 px-3 rounded-full bg-[#E6EBF5] neu-pill text-xs font-bold text-slate-700 flex items-center gap-1"
          >
            <Globe className="w-3.5 h-3.5 text-[#0044CC]" />
            <span>{lang.toUpperCase()}</span>
          </button>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-black text-[#1E3C72] tracking-tight">
            {required ? t('chooseOwnPassword') : t('changePassword')}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {t('tempPasswordNotice')}
          </p>
        </div>

        <form onSubmit={submitPassword} className="space-y-4">
          <div className="relative flex items-center">
            <Lock className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
            <input
              name="current_password"
              type={showCurrent ? 'text' : 'password'}
              autoComplete="current-password"
              required
              placeholder={t('currentPasswordLabel')}
              className="w-full h-14 pl-12 pr-12 rounded-2xl bg-[#E6EBF5] neu-input text-sm font-medium text-slate-800 placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-4 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showCurrent ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
            </button>
          </div>

          <div className="relative flex items-center">
            <Lock className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
            <input
              name="new_password"
              type={showNew ? 'text' : 'password'}
              autoComplete="new-password"
              required
              maxLength={128}
              placeholder={t('newPasswordLabel')}
              className="w-full h-14 pl-12 pr-12 rounded-2xl bg-[#E6EBF5] neu-input text-sm font-medium text-slate-800 placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-4 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showNew ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
            </button>
          </div>

          <div className="relative flex items-center">
            <Lock className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
            <input
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
              placeholder={t('confirmNewPasswordLabel')}
              className="w-full h-14 pl-12 pr-4 rounded-2xl bg-[#E6EBF5] neu-input text-sm font-medium text-slate-800 placeholder:text-slate-400"
            />
          </div>

          {error && (
            <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="pt-2 flex flex-col gap-2.5">
            <button
              type="submit"
              disabled={busy}
              className="w-full h-14 rounded-2xl neu-button-primary text-base font-bold flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              {busy ? t('pleaseWait') : t('savePasswordBtn')}
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="w-full h-10 text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer"
            >
              {t('signOut')}
            </button>
          </div>
        </form>

      </div>
    </main>
  );
}
