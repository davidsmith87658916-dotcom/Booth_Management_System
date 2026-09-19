import React, { useState } from 'react';
import { 
  User, 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  Sparkles, 
  Palette, 
  Globe,
  Clock,
  Shield,
  Check
} from 'lucide-react';
import { write } from '../api';
import { useLanguage } from '../i18n';

export default function AccountSettings({ user, onUserChanged, onLogout }) {
  const { lang, t, toggleLang } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Clean staff name (remove duplicate bracket roles if present)
  const cleanName = (user?.name || '').replace(/\s*\([^)]*\)/g, '').trim();
  const initials = cleanName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  async function handleSubmitPassword(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');

    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));

    if (data.new_password !== data.confirm_password) {
      setError(lang === 'kh' ? 'ពាក្យសម្ងាត់ថ្មី និងការបញ្ជាក់មិនត្រូវគ្នាឡើយ' : 'New password and confirmation do not match.');
      setBusy(false);
      return;
    }

    try {
      const updatedUser = await write('/auth/password', {
        current_password: data.current_password,
        new_password: data.new_password
      });
      setMessage(lang === 'kh' ? 'បានផ្លាស់ប្តូរពាក្យសម្ងាត់ដោយជោគជ័យ' : 'Password changed successfully.');
      form.reset();
      if (onUserChanged) onUserChanged(updatedUser);
    } catch (err) {
      setError(err.message || (lang === 'kh' ? 'ពាក្យសម្ងាត់បច្ចុប្បន្នមិនត្រឹមត្រូវ' : 'Incorrect current password.'));
    } finally {
      setBusy(false);
    }
  }

  const getRoleBadge = (role) => {
    if (role === 'admin') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs">
          <span>👑</span>
          <span>{lang === 'kh' ? 'អ្នកគ្រប់គ្រងប្រព័ន្ធ (Administrator)' : 'Administrator'}</span>
        </span>
      );
    }
    if (role === 'accountant') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
          <span>🪙</span>
          <span>{lang === 'kh' ? 'បុគ្គលិកគណនេយ្យ (Finance)' : 'Finance'}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
        <span>💼</span>
        <span>{lang === 'kh' ? 'បុគ្គលិកផ្នែកលក់ (Sales Staff)' : 'Sales Staff'}</span>
      </span>
    );
  };

  return (
    <div className="w-full space-y-6">
      
      {/* Top Profile Hero Card (Full Width) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4 sm:gap-5 overflow-visible">
            {/* Avatar with Initials */}
            <div className="relative">
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white font-black text-xl sm:text-2xl flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0">
                {initials || 'U'}
              </div>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white text-[10px]" title="Active now">
                ✓
              </span>
            </div>

            {/* Profile Info */}
            <div className="space-y-1.5 overflow-visible">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-normal overflow-visible">
                  {cleanName}
                </h2>
                {getRoleBadge(user?.role)}
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{lang === 'kh' ? 'កំពុងដំណើរការ' : 'Active'}</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                <span className="text-slate-700 font-mono">
                  {user?.email}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                  <span>{user?.role === 'admin' ? (lang === 'kh' ? 'សិទ្ធិពេញលេញលើគ្រប់មុខងារ' : 'Full system privileges') : (lang === 'kh' ? 'សិទ្ធិកម្រិតផ្នែកលក់' : 'Sales staff privileges')}</span>
                </span>
                <span>•</span>
                <span className="font-mono text-slate-400">
                  ID: #{user?.id}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Sign Out Action */}
          <button
            type="button"
            onClick={onLogout}
            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span>{lang === 'kh' ? 'ចាកចេញពីគណនី' : 'Sign Out'}</span>
          </button>
        </div>
      </div>

      {/* 2-Column Balanced Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Security & Password Policy */}
        <section className="panel space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-normal overflow-visible">
                {user?.role === 'admin'
                  ? (lang === 'kh' ? 'ផ្លាស់ប្តូរពាក្យសម្ងាត់ Admin' : 'Change Administrator Password')
                  : (lang === 'kh' ? 'គោលការណ៍សុវត្ថិភាពគណនី' : 'Account Security Policy')}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed overflow-visible">
                {user?.role === 'admin'
                  ? (lang === 'kh' ? 'ធ្វើបច្ចុប្បន្នភាពពាក្យសម្ងាត់ដើម្បីការពារសុវត្ថិភាពគណនី Admin' : 'Update your administrator credentials.')
                  : (lang === 'kh' ? 'ព័ត៌មានស្តីពីសិទ្ធិ និងការគ្រប់គ្រងគណនីបុគ្គលិក' : 'Information regarding employee account privileges.')}
              </p>
            </div>
          </div>

          {user?.role === 'admin' ? (
            <>
              {/* Feedback Messages */}
              {message && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2.5 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{message}</span>
                </div>
              )}
              {error && (
                <div role="alert" className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2.5 shadow-2xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmitPassword} className="space-y-4">
                {/* Current Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    {lang === 'kh' ? 'ពាក្យសម្ងាត់បច្ចុប្បន្ន *' : 'Current Password *'}
                  </label>
                  <div className="relative">
                    <input
                      name="current_password"
                      type={showCurrent ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      placeholder="••••••••••••"
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-purple-500 transition-all shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                      title={showCurrent ? 'Hide password' : 'Show password'}
                    >
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    {lang === 'kh' ? 'ពាក្យសម្ងាត់ថ្មី *' : 'New Password *'}
                  </label>
                  <div className="relative">
                    <input
                      name="new_password"
                      type={showNew ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      maxLength={128}
                      placeholder="••••••••••••"
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-purple-500 transition-all shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                      title={showNew ? 'Hide password' : 'Show password'}
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    {lang === 'kh' ? 'បញ្ជាក់ពាក្យសម្ងាត់ថ្មី *' : 'Confirm New Password *'}
                  </label>
                  <div className="relative">
                    <input
                      name="confirm_password"
                      type={showConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      maxLength={128}
                      placeholder="••••••••••••"
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-purple-500 transition-all shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                      title={showConfirm ? 'Hide password' : 'Show password'}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm shadow-purple-500/25 transition-all active:scale-95 cursor-pointer"
                >
                  {busy ? (
                    <span>{lang === 'kh' ? 'កំពុងរក្សាទុក...' : 'Saving…'}</span>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>{lang === 'kh' ? 'រក្សាទុកពាក្យសម្ងាត់ថ្មី' : 'Update Password'}</span>
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="p-5 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-3.5">
              <div className="flex items-center gap-2.5 text-purple-700 font-bold text-xs">
                <Shield className="w-4 h-4" />
                <span>{lang === 'kh' ? 'គណនីគ្រប់គ្រងដោយ Admin' : 'Administer-Managed Account'}</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {lang === 'kh'
                  ? 'គណនីរបស់អ្នកត្រូវបានគ្រប់គ្រងដោយផ្ទាល់ពីអ្នកគ្រប់គ្រងប្រព័ន្ធ (Administrator) នៃក្រុមហ៊ុន។ បុគ្គលិកមិនមានសិទ្ធិកែប្រែ ឬផ្លាស់ប្តូរលេខសម្ងាត់ដោយខ្លួនឯងឡើយ។'
                  : 'Your account credentials and access permissions are managed directly by the company administrator. Self-service password changes are restricted for your role.'}
              </p>
              <div className="pt-2 border-t border-slate-200/70 text-[11px] text-slate-500 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>{lang === 'kh' ? 'បើត្រូវការជំនួយ ឬភ្លេចលេខសម្ងាត់ សូមទាក់ទង Admin' : 'Contact your administrator for password assistance.'}</span>
              </div>
            </div>
          )}
        </section>

        {/* Right Column: System Preferences, Role Privileges & Language */}
        <div className="space-y-6">
          
          {/* Card 1: Official System Theme (Royal Purple) */}
          <section className="panel space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-normal overflow-visible">
                  {lang === 'kh' ? 'រចនាប័ទ្មពណ៌គោលប្រព័ន្ធ' : 'Official System Theme'}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed overflow-visible">
                  {lang === 'kh' 
                    ? 'កំណត់រចនាប័ទ្មពណ៌ស្វាយជាគោលទូទាំងប្រព័ន្ធ' 
                    : 'System primary color palette.'}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 via-indigo-50/50 to-slate-50 border border-purple-200/80 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm shadow-purple-500/30">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-purple-900 block leading-normal">
                    {lang === 'kh' ? 'ពណ៌ស្វាយរាជសីហ៍ (Royal Purple)' : 'Royal Purple'}
                  </span>
                  <span className="text-[11px] text-purple-700/80 font-medium block">
                    {lang === 'kh' ? 'ពណ៌ផ្លូវការរបស់ប្រព័ន្ធ ExpoHub' : 'Official theme color for ExpoHub'}
                  </span>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-purple-600 text-white shadow-2xs">
                {lang === 'kh' ? 'សកម្ម' : 'Active'}
              </span>
            </div>
          </section>

          {/* Card 2: Role Privileges & Permissions */}
          <section className="panel space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-normal overflow-visible">
                  {lang === 'kh' ? 'សិទ្ធិ និងតួនាទីរបស់អ្នក' : 'Role Privileges'}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed overflow-visible">
                  {lang === 'kh' 
                    ? 'មុខងារដែលគណនីរបស់អ្នកមានសិទ្ធិប្រើប្រាស់' 
                    : 'Features available to your account.'}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-700">
              {user?.role === 'admin' ? (
                <>
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/60">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{lang === 'kh' ? 'គ្រប់គ្រងព្រឹត្តិការណ៍ និងកែប្រែទំហំផ្ទៃប្លង់ 2D' : 'Manage events and edit 2D floor plan canvas'}</span>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/60">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{lang === 'kh' ? 'គ្រប់គ្រងគណនីក្រុមការងារ និងកំណត់សិទ្ធិចូលប្រើ' : 'Manage staff accounts and login access'}</span>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/60">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{lang === 'kh' ? 'ផ្ទៀងផ្ទាត់កំណត់ត្រាទូទាត់ និងចេញវិក្កយបត្រ' : 'Verify payment records and issue invoices'}</span>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/60">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{lang === 'kh' ? 'តាមដានរបាយការណ៍វិភាគ និងស្ថិតិលក់ជាក់ស្តែង' : 'Monitor sales analytics and revenue metrics'}</span>
                  </div>
                </>
              ) : user?.role === 'accountant' ? (
                <>
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/60">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{lang === 'kh' ? 'ផ្ទៀងផ្ទាត់ការទូទាត់ប្រាក់ និងគ្រប់គ្រងកំណត់ត្រាហិរញ្ញវត្ថុ' : 'Verify payments and manage financial records'}</span>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/60">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{lang === 'kh' ? 'ចេញវិក្កយបត្រ និងបង្កាន់ដៃទទួលប្រាក់' : 'Issue invoices and receipts'}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/60">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{lang === 'kh' ? 'មើលប្លង់ 2D និងកក់ស្តង់ជូនអតិថិជន' : 'View 2D floor plan and book booths'}</span>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/60">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{lang === 'kh' ? 'កត់ត្រាការទូទាត់ប្រាក់ និងភ្ជាប់ទំនាក់ទំនងក្រុមហ៊ុន' : 'Record payments and link exhibitors'}</span>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Card 3: Language Switcher */}
          <section className="panel space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200">
                <Globe className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-normal overflow-visible">
                  {lang === 'kh' ? 'ភាសាប្រព័ន្ធ (Language)' : 'System Language'}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed overflow-visible">
                  {lang === 'kh' ? 'ជ្រើសរើសភាសាសម្រាប់បង្ហាញទិន្នន័យលើប្រព័ន្ធ' : 'Choose your preferred language for the interface.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => lang !== 'kh' && toggleLang()}
                className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                  lang === 'kh' 
                    ? 'bg-purple-50 text-purple-800 border-purple-300 ring-2 ring-purple-500/20 shadow-2xs' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>🇰🇭 ភាសាខ្មែរ (Khmer)</span>
                {lang === 'kh' && <Check className="w-4 h-4 text-purple-600" />}
              </button>

              <button
                type="button"
                onClick={() => lang !== 'en' && toggleLang()}
                className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                  lang === 'en' 
                    ? 'bg-purple-50 text-purple-800 border-purple-300 ring-2 ring-purple-500/20 shadow-2xs' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>🇬🇧 English (អង់គ្លេស)</span>
                {lang === 'en' && <Check className="w-4 h-4 text-purple-600" />}
              </button>
            </div>
          </section>

        </div>

      </div>

    </div>
  );
}
