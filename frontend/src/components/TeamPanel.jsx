import React, { useEffect, useState } from 'react';
import { 
  Users, 
  ShieldCheck, 
  CheckCircle2, 
  Lock, 
  Clock, 
  Ban, 
  Edit3, 
  KeyRound, 
  RotateCw,
  UserCheck
} from 'lucide-react';
import { api, write } from '../api';
import ModalFrame from './ModalFrame';
import { useLanguage } from '../i18n';

export default function TeamPanel({ currentUser, triggerNewUser }) {
  const { lang, t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [audit, setAudit] = useState([]);

  const load = async () => {
    try {
      const [u, a] = await Promise.all([api('/users'), api('/audit')]);
      setUsers(u);
      setAudit(a);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (triggerNewUser) {
      setError('');
      setModal({ kind: 'new' });
    }
  }, [triggerNewUser]);

  async function save(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      if (modal.kind === 'new') {
        await write('/users', data);
      } else if (modal.kind === 'reset') {
        await write(`/users/${modal.user.id}/password`, data);
      } else {
        await write(`/users/${modal.user.id}`, {
          name: data.name,
          role: data.role,
          is_active: data.is_active === 'true'
        }, 'PUT');
      }
      setMessage(lang === 'kh' ? 'បានរក្សាទុកព័ត៌មានបុគ្គលិកដោយជោគជ័យ' : t('userSavedSuccess', 'User account saved successfully.'));
      setModal(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const getModalTitle = (kind) => {
    if (kind === 'new') return lang === 'kh' ? 'បង្កើតគណនីបុគ្គលិកថ្មី' : t('createUserModalTitle', 'Create user');
    if (kind === 'reset') return lang === 'kh' ? 'កំណត់ពាក្យសម្ងាត់បណ្តោះអាសន្ន' : t('setTempPasswordModalTitle', 'Set temporary password');
    return lang === 'kh' ? 'កែប្រែសិទ្ធិចូលប្រើប្រាស់' : t('editUserAccessModalTitle', 'Edit user access');
  };

  const cleanStaffName = (name) => {
    return (name || '').replace(/\s*\([^)]*\)/g, '').trim();
  };

  const getRoleBadge = (role) => {
    if (role === 'admin') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs">
          <span>👑</span>
          <span>{lang === 'kh' ? 'អ្នកគ្រប់គ្រង' : 'Administrator'}</span>
        </span>
      );
    }
    if (role === 'accountant') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
          <span>🪙</span>
          <span>{lang === 'kh' ? 'បុគ្គលិកគណនេយ្យ' : 'Finance'}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
        <span>💼</span>
        <span>{lang === 'kh' ? 'បុគ្គលិកផ្នែកលក់' : 'Sales staff'}</span>
      </span>
    );
  };

  const getAccessBadge = (u) => {
    if (!u.is_active) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <Ban className="w-3.5 h-3.5" />
          <span>{lang === 'kh' ? 'បានបិទ' : 'Disabled'}</span>
        </span>
      );
    }
    if (!u.can_login) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
          <Lock className="w-3.5 h-3.5" />
          <span>{lang === 'kh' ? 'មិនទាន់កំណត់កូដ' : 'No password'}</span>
        </span>
      );
    }
    if (u.must_change_password) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3.5 h-3.5" />
          <span>{lang === 'kh' ? 'កូដបណ្តោះអាសន្ន' : 'Temp password'}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>{lang === 'kh' ? 'កំពុងដំណើរការ' : 'Active'}</span>
      </span>
    );
  };

  const formatActionLabel = (act) => {
    const a = (act || '').toLowerCase();
    if (a.includes('login')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200">
          <span>🔑</span>
          <span>{lang === 'kh' ? 'ចូលគណនី' : 'Sign in'}</span>
        </span>
      );
    }
    if (a.includes('logout')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200">
          <span>🚪</span>
          <span>{lang === 'kh' ? 'ចាកចេញពីគណនី' : 'Sign out'}</span>
        </span>
      );
    }
    if (a.includes('verify')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
          <span>🛡️</span>
          <span>{lang === 'kh' ? 'ផ្ទៀងផ្ទាត់ការបង់ប្រាក់' : 'Verify payment'}</span>
        </span>
      );
    }
    if (a.includes('book')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200">
          <span>📑</span>
          <span>{lang === 'kh' ? 'កក់ស្តង់' : 'Book booth'}</span>
        </span>
      );
    }
    if (a.includes('payment')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200">
          <span>🪙</span>
          <span>{lang === 'kh' ? 'កត់ត្រាការបង់ប្រាក់' : 'Record payment'}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200">
        <span>⚡</span>
        <span>{act.replaceAll('_', ' ').replaceAll('.', ' · ')}</span>
      </span>
    );
  };

  const formatTarget = (target, action) => {
    if (!target) return '—';
    if ((action || '').toLowerCase().includes('login')) {
      return <span className="font-mono text-xs text-slate-500">{lang === 'kh' ? 'គណនីផ្ទាល់ខ្លួន' : 'Personal session'}</span>;
    }
    if (/^[A-Z]-\d+$/.test(target)) {
      return <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono text-xs font-bold">{target}</span>;
    }
    return <span className="font-mono text-xs text-slate-600">{target}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Team accounts section */}
      <section className="panel space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 leading-relaxed overflow-visible">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="leading-relaxed pt-0.5">{lang === 'kh' ? 'គណនីក្រុមការងារ' : t('teamAccounts', 'Team accounts')}</span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {lang === 'kh' 
                ? 'គ្រប់គ្រងបញ្ជីបុគ្គលិក កំណត់តួនាទី និងតាមដានសកម្មភាពលក់នីមួយៗ' 
                : t('teamAccountsDesc', 'Create individual logins and review who recorded each sale.')}
            </p>
          </div>
        </div>

        {message && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{message}</span>
          </div>
        )}
        {error && !modal && (
          <p role="alert" className="form-error">{error}</p>
        )}

        <div className="table-scroll border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-2xs">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('nameCol', 'Name')}</th>
                <th>{t('emailCol', 'Email')}</th>
                <th className="text-center">{t('roleCol', 'Role')}</th>
                <th className="text-center">{t('accessCol', 'Access')}</th>
                <th className="text-center">{t('actionsCol', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const isMe = u.id === currentUser?.id;
                const cleanName = cleanStaffName(u.name);
                const initials = cleanName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

                return (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {initials || 'U'}
                        </div>
                        <div>
                          <strong className="text-xs font-bold text-slate-900 block">{cleanName}</strong>
                          {isMe && (
                            <span className="inline-block mt-0.5 px-2 py-0.2 rounded-full bg-blue-100 text-blue-700 text-[10px] font-extrabold border border-blue-200">
                              {lang === 'kh' ? 'គណនីអ្នក' : 'You'}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="text-xs text-slate-600 font-medium">
                      {u.email}
                    </td>
                    <td className="text-center">
                      {getRoleBadge(u.role)}
                    </td>
                    <td className="text-center">
                      {getAccessBadge(u)}
                    </td>
                    <td className="text-center">
                      {!isMe ? (
                        <div className="inline-flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setModal({ kind: 'edit', user: u })}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 shadow-2xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                            title={lang === 'kh' ? 'កែប្រែសិទ្ធិ និងតួនាទី' : 'Edit Access & Role'}
                          >
                            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                            <span>{lang === 'kh' ? 'កែប្រែសិទ្ធិ' : 'Edit Access'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setModal({ kind: 'reset', user: u })}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 shadow-2xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                            title={lang === 'kh' ? 'កំណត់ពាក្យសម្ងាត់ថ្មី' : 'Set Password'}
                          >
                            <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                            <span>{lang === 'kh' ? 'កំណត់កូដ' : 'Set Password'}</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">
                          {lang === 'kh' ? 'គណនីបច្ចុប្បន្ន' : 'Active session'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Audit Log section */}
      <section className="panel space-y-3">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 leading-relaxed overflow-visible">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span className="leading-relaxed pt-0.5">{lang === 'kh' ? 'កំណត់ត្រាសកម្មភាព' : t('activityLog', 'Activity log')}</span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {lang === 'kh' 
                ? 'សកម្មភាពចុងក្រោយដែលបានកត់ត្រាក្នុងប្រព័ន្ធ' 
                : t('activityLogDesc', 'Latest recorded system actions.')}
            </p>
          </div>
          <button 
            type="button"
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-slate-200 shadow-2xs transition-all active:scale-95 cursor-pointer"
            onClick={load}
            title={lang === 'kh' ? 'ផ្ទុកទិន្នន័យឡើងវិញ' : 'Refresh activity log'}
          >
            <RotateCw className="w-3.5 h-3.5 text-slate-600" />
            <span>{lang === 'kh' ? 'ផ្ទុកឡើងវិញ' : t('refresh', 'Refresh')}</span>
          </button>
        </div>

        <div className="table-scroll border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-2xs">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('timeCol', 'Time')}</th>
                <th>{t('userCol', 'User')}</th>
                <th>{t('actionCol', 'Action')}</th>
                <th>{t('recordCol', 'Record')}</th>
              </tr>
            </thead>
            <tbody>
              {audit.map(a => {
                const cleanActor = cleanStaffName(a.actor);
                return (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="text-xs text-slate-500 whitespace-nowrap">
                      {new Date(a.created_at).toLocaleString(lang === 'kh' ? 'km-KH' : 'en-US')}
                    </td>
                    <td>
                      <strong className="text-xs font-bold text-slate-800">{cleanActor}</strong>
                    </td>
                    <td>
                      {formatActionLabel(a.action)}
                    </td>
                    <td>
                      {formatTarget(a.target, a.action)}
                    </td>
                  </tr>
                );
              })}
              {audit.length === 0 && (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-slate-400 text-xs">
                    {lang === 'kh' ? 'មិនទាន់មានកំណត់ត្រាសកម្មភាពនៅឡើយទេ' : 'No activity records found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* User Modal */}
      {modal && (
        <ModalFrame 
          label={getModalTitle(modal.kind)} 
          onClose={() => !busy && setModal(null)}
        >
          <form className="panel form-stack account-form" onSubmit={save}>
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
              {getModalTitle(modal.kind)}
            </h3>

            {modal.kind !== 'reset' && (
              <>
                <label className="block text-xs font-bold text-slate-700 space-y-1">
                  <span>{t('nameCol', 'Name')}</span>
                  <input 
                    name="name" 
                    defaultValue={cleanStaffName(modal.user?.name || '')} 
                    required 
                    maxLength={100} 
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-500 transition-all"
                  />
                </label>

                {modal.kind === 'new' && (
                  <label className="block text-xs font-bold text-slate-700 space-y-1">
                    <span>{t('emailCol', 'Email')}</span>
                    <input 
                      name="email" 
                      type="email" 
                      required 
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-500 transition-all"
                    />
                  </label>
                )}

                <label className="block text-xs font-bold text-slate-700 space-y-1">
                  <span>{t('roleCol', 'Role')}</span>
                  <select 
                    name="role" 
                    defaultValue={modal.user?.role || 'staff'}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-500 transition-all"
                  >
                    <option value="staff">{lang === 'kh' ? 'បុគ្គលិកផ្នែកលក់' : 'Sales staff'}</option>
                    <option value="accountant">{lang === 'kh' ? 'បុគ្គលិកគណនេយ្យ' : 'Finance / Accountant'}</option>
                    <option value="admin">{lang === 'kh' ? 'អ្នកគ្រប់គ្រង' : 'Administrator'}</option>
                  </select>
                </label>
              </>
            )}

            {modal.kind === 'edit' ? (
              <label className="block text-xs font-bold text-slate-700 space-y-1">
                <span>{t('accessCol', 'Access')}</span>
                <select 
                  name="is_active" 
                  defaultValue={String(modal.user.is_active)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-500 transition-all"
                >
                  <option value="true">{lang === 'kh' ? 'កំពុងដំណើរការ (Active)' : 'Active'}</option>
                  <option value="false">{lang === 'kh' ? 'បានបិទ (Disabled)' : 'Disabled'}</option>
                </select>
              </label>
            ) : (
              <>
                <label className="block text-xs font-bold text-slate-700 space-y-1">
                  <span>{t('tempPassword', 'Temporary password')}</span>
                  <input 
                    name="password" 
                    type="password" 
                    autoComplete="new-password" 
                    required 
                    maxLength={128} 
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-500 transition-all"
                  />
                </label>
                <small className="text-slate-400 text-[11px] block">
                  {lang === 'kh' 
                    ? 'អ្នកប្រើប្រាស់អាចផ្លាស់ប្តូរពាក្យសម្ងាត់ផ្ទាល់ខ្លួននៅពេលចូលប្រើប្រាស់លើកដំបូង។' 
                    : t('tempPasswordHelper', 'The user must choose their own password on first sign-in.')}
                </small>
              </>
            )}

            {error && <p role="alert" className="form-error">{error}</p>}

            <div className="inline-actions pt-2 flex items-center justify-end gap-2">
              <button 
                type="button" 
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-all"
                onClick={() => setModal(null)} 
                disabled={busy}
              >
                {t('cancel', 'Cancel')}
              </button>
              <button 
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer transition-all shadow-sm active:scale-95" 
                disabled={busy}
              >
                {busy ? (lang === 'kh' ? 'កំពុងរក្សាទុក...' : 'Saving…') : (lang === 'kh' ? 'រក្សាទុក' : 'Save user')}
              </button>
            </div>
          </form>
        </ModalFrame>
      )}
    </div>
  );
}
