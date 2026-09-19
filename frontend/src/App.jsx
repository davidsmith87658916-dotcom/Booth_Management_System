import { useEffect, useState, useCallback, useRef } from 'react';
import { api, write } from './api';
import AuthScreen,{PasswordScreen} from './components/AuthScreen';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import FloorPlan from './components/FloorPlan';
import BoothDrawer from './components/BoothDrawer';
import DashboardView from './components/DashboardView';
import PaymentNotesList from './components/PaymentNotesList';
import AdminStudio from './components/AdminStudio';
import BookingWizardModal from './components/BookingWizardModal';
import PaymentRecordModal from './components/PaymentRecordModal';
import AccountSettings from './components/AccountSettings';
import TeamPanel from './components/TeamPanel';
import EventSettings from './components/EventSettings';
import RecordsView from './components/RecordsView';
import InvoiceReceiptModal from './components/InvoiceReceiptModal';
import BoothHandoverModal from './components/BoothHandoverModal';
import PublicFloorPlanModal from './components/PublicFloorPlanModal';
import PublicFloorPlanPage from './components/PublicFloorPlanPage';
import { exportExhibitorsToCSV, exportPaymentsToCSV } from './utils/exportUtils';
import { Plus, Download, Map, Globe } from 'lucide-react';
import { useLanguage } from './i18n';

export default function App(){
 const { t } = useLanguage();
 const [publicEventId, setPublicEventId] = useState(() => {
   const hash = typeof window !== 'undefined' ? window.location.hash || '' : '';
   const match = hash.match(/#public-view-(\d+)/);
   return match ? Number(match[1]) : null;
 });

 useEffect(() => {
   const handleHashChange = () => {
     const hash = window.location.hash || '';
     const match = hash.match(/#public-view-(\d+)/);
     setPublicEventId(match ? Number(match[1]) : null);
   };
   window.addEventListener('hashchange', handleHashChange);
   return () => window.removeEventListener('hashchange', handleHashChange);
 }, []);

 const [user,setUser]=useState(null),[setup,setSetup]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState('');
 const initialize=useCallback(async()=>{setError('');try{const state=await api('/auth/status');setSetup(state.needs_setup);try{setUser(await api('/auth/me'));}catch(err){if(err.status!==401)throw err;setUser(null);}}catch(err){setError(err.message);}finally{setReady(true);}},[]);
 useEffect(()=>{initialize();const expire=()=>setUser(null);window.addEventListener('session-expired',expire);return()=>window.removeEventListener('session-expired',expire);},[initialize]);
 const logout=async()=>{try{await write('/auth/logout',{});setUser(null);}catch(err){setError(err.message);}};

 if(publicEventId) {
   return (
     <PublicFloorPlanPage
       eventId={publicEventId}
       onExitToLogin={() => {
         window.location.hash = '';
         setPublicEventId(null);
       }}
     />
   );
 }

 if(!ready)return <div className="auth-page">{t('loadingWorkspace')}</div>;
 if(error)return <div className="auth-page"><section className="auth-card"><h2>{t('cannotConnect')}</h2><p role="alert">{error}</p><button className="primary-action" onClick={initialize}>{t('tryAgain')}</button></section></div>;
 if(!user)return <AuthScreen setup={setup} onSignedIn={u=>{setSetup(false);setUser(u);}}/>;
 if(user.must_change_password)return <PasswordScreen required onDone={setUser} onLogout={logout}/>;
 return <Workspace key={user.id} user={user} onUserChanged={setUser} onLogout={logout}/>;
}
function Workspace({user,onUserChanged,onLogout}){
 const { lang, toggleLang, t } = useLanguage();
 const [events,setEvents]=useState([]),[eventId,setEventId]=useState(null),[data,setData]=useState({booths:[],categories:[],analytics:null,layout:null}),[activeTab,setActiveTab]=useState('dashboard'),[search,setSearch]=useState('');
 const [floorViewMode, setFloorViewMode] = useState('canvas'); // 'canvas' | 'table'
 const [selectedId,setSelectedId]=useState(null),[modal,setModal]=useState(null),[error,setError]=useState(''),[syncError,setSyncError]=useState(''),[loading,setLoading]=useState(true),[dirty,setDirty]=useState(false);
 const [invoiceDoc,setInvoiceDoc]=useState(null),[handoverBooth,setHandoverBooth]=useState(null),[showPublicModal,setShowPublicModal]=useState(false);
 const [staffTrigger, setStaffTrigger] = useState(0);
 const [settingsTrigger, setSettingsTrigger] = useState(0);
 const [boothTrigger, setBoothTrigger] = useState(0);
 const requestVersion=useRef(0);
 const admin=user.role==='admin';
 const currentEvent=events.find(e=>e.id===eventId);
 const selectedBooth=data.booths.find(b=>b.id===selectedId);
 const modalBooth=data.booths.find(b=>b.id===modal?.id);
 const fetchEvents=useCallback(async()=>{const result=await api('/events');setEvents(result);setEventId(id=>result.some(e=>e.id===id)?id:(result.find(e=>e.status==='active')||result[0])?.id||null);return result;},[]);
 useEffect(()=>{fetchEvents().catch(e=>setError(e.message)).finally(()=>setLoading(false));},[fetchEvents]);
 useEffect(()=>{document.body.dataset.theme='royal';localStorage.setItem('expohub-theme','royal');},[]);
 const refresh=useCallback(async(id)=>{const [booths,categories,analytics,layout]=await Promise.all([api(`/events/${id}/booths`),api(`/events/${id}/categories`),api(`/analytics/${id}`),api(`/events/${id}/layout`)]);return {booths,categories,analytics,layout};},[]);
 useEffect(()=>{
   if(!eventId)return;let stopped=false,timer;
   const update=async()=>{const version=++requestVersion.current;try{const result=await refresh(eventId);if(!stopped&&version===requestVersion.current){setData(result);setSyncError('');}}catch(err){if(!stopped)setSyncError(err.message);}finally{if(!stopped){setLoading(false);timer=setTimeout(update,3000);}}};
   update();return()=>{stopped=true;clearTimeout(timer);};
 },[eventId,refresh]);
 const reload=async()=>{const version=++requestVersion.current;if(eventId){const result=await refresh(eventId);if(version===requestVersion.current){setData(result);setSyncError('');}}await fetchEvents();};
 const mutate=async(path,payload,method='POST')=>{const result=await write(path,payload,method);try{await reload();}catch(err){setSyncError('Saved, but refresh failed: '+err.message);}return result;};
 const safeMutation=async(path,payload,method)=>{try{await mutate(path,payload,method);return true;}catch(err){alert(err.message);return false;}};
 const handleVerifyPayment=async(noteId)=>safeMutation(`/payment-notes/${noteId}/verify`,{});
 const handleRejectPayment=async(noteId)=>{
   if(!confirm(lang==='kh'?'តើអ្នកប្រាកដជាចង់បដិសេធ (Reject) កំណត់ត្រាទូទាត់នេះមែនទេ?':'Are you sure you want to reject this payment record?'))return false;
   return safeMutation(`/payment-notes/${noteId}/reject`,{});
 };
 const handleExtendHold=async(bookingId,hours=24)=>safeMutation(`/bookings/${bookingId}/extend-hold`,{hours});
 const handleClearExpiredHolds=async()=>{
   if(!confirm(lang==='kh'?'តើអ្នកប្រាកដជាចង់រំលាយស្តង់ដែលផុតកំណត់ Hold ទាំងអស់មែនទេ?':'Are you sure you want to release all expired holds?'))return false;
   return safeMutation(`/events/${eventId}/release-expired-holds`,{});
 };
  const handleOpenInvoice=(booth,docType='invoice',paymentNote=null)=>setInvoiceDoc({booth,docType,paymentNote});
  const handleOpenHandover=(booth)=>setHandoverBooth(booth);
  const handleOpenPublicModal=()=>setShowPublicModal(true);
  const navigate=tab=>{
    if(dirty&&!confirm(t('discardFloorConfirm')))return;
    setDirty(false);
    setSelectedId(null);
    setSearch('');
    if (tab === 'analytics') {
      setActiveTab('dashboard');
    } else if (tab === 'exhibitors') {
      setActiveTab('bookings');
    } else if (tab === 'booth_management') {
      setFloorViewMode('table');
      setActiveTab('floorplan');
    } else {
      setActiveTab(tab);
    }
  };
  const chooseEvent=id=>{if(dirty&&!confirm(t('discardFloorSwitchConfirm')))return;setDirty(false);setSelectedId(null);setModal(null);setSearch('');setError('');setLoading(true);setEventId(id);};
  const title = t('title_' + activeTab, 'Floor Plan Studio');
  const subtitle = t('subtitle_' + activeTab, 'Arrange your venue. Keep your team in sync.');
  const filtered=data.booths.filter(b=>{
    const bk = b.active_booking;
    const searchTarget = `${b.booth_code} ${b.zone||''} ${bk?.exhibitor_name||''} ${bk?.fascia_name||''} ${bk?.staff_name||''} ${bk?.contact_person||''} ${bk?.phone||''} ${bk?.email||''}`.toLowerCase();
    return searchTarget.includes(search.toLowerCase());
  });

 const getHeaderConfig = () => {
   switch (activeTab) {
     case 'floorplan':
     case 'booth_management':
       return {
         showEventSelector: true,
         showSearch: true,
         searchPlaceholder: t('searchBoothOrExhibitor'),
         viewModeControl: {
           mode: floorViewMode,
           onChange: setFloorViewMode
         },
         actionButton: admin ? {
           label: floorViewMode === 'table' ? t('newBoothBtn') : t('addBooth'),
           icon: Plus,
           onClick: () => {
             if (floorViewMode === 'table') {
               setBoothTrigger(v => v + 1);
             } else {
               setFloorViewMode('table');
             }
           },
           className: 'px-3 sm:px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm shadow-purple-500/25 transition-all active:scale-95 cursor-pointer shrink-0'
         } : {
           label: t('publicLiveLink'),
           icon: Globe,
           onClick: handleOpenPublicModal,
           className: 'px-3 sm:px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer shrink-0'
         }
       };
     case 'bookings':
     case 'exhibitors':
       return {
         showEventSelector: true,
         showSearch: true,
         searchPlaceholder: t('searchBookingsPlaceholder'),
         actionButton: {
           label: t('exportBookings'),
           icon: Download,
           onClick: () => exportExhibitorsToCSV(filtered, currentEvent?.name || 'Expo'),
           className: 'px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm shadow-emerald-500/25 transition-all active:scale-95 cursor-pointer shrink-0'
         }
       };
     case 'payments':
       return {
         showEventSelector: true,
         showSearch: true,
         searchPlaceholder: t('searchPaymentsPlaceholder'),
         actionButton: {
           label: t('exportPayments'),
           icon: Download,
           onClick: () => exportPaymentsToCSV(filtered, currentEvent?.name || 'Expo'),
           className: 'px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm shadow-emerald-500/25 transition-all active:scale-95 cursor-pointer shrink-0'
         }
       };
     case 'dashboard':
     case 'analytics':
       return {
         showEventSelector: true,
         showSearch: false,
         actionButton: {
           label: t('viewFloorPlan'),
           icon: Map,
           onClick: () => navigate('floorplan'),
           className: 'px-3 sm:px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm shadow-purple-500/25 transition-all active:scale-95 cursor-pointer shrink-0'
         }
       };
     case 'staff':
       return {
         showEventSelector: false,
         showSearch: false,
         actionButton: admin ? {
           label: t('addStaffUser'),
           icon: Plus,
           onClick: () => setStaffTrigger(v => v + 1),
           className: 'px-3 sm:px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm shadow-purple-500/25 transition-all active:scale-95 cursor-pointer shrink-0'
         } : null
       };
     case 'settings':
       return {
         showEventSelector: true,
         showSearch: true,
         searchPlaceholder: lang === 'kh' ? 'ស្វែងរកព្រឹត្តិការណ៍ ឬទីតាំង...' : 'Search event or venue...',
         actionButton: admin ? {
           label: lang === 'kh' ? '+ ព្រឹត្តិការណ៍ថ្មី' : '+ New Event',
           icon: Plus,
           onClick: () => setSettingsTrigger(v => v + 1),
           className: 'px-3 sm:px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm shadow-purple-500/25 transition-all active:scale-95 cursor-pointer shrink-0'
         } : null
       };
     case 'account':
       return {
         showEventSelector: false,
         showSearch: false,
         actionButton: null
       };
     default:
       return {
         showEventSelector: true,
         showSearch: true,
         actionButton: null
       };
   }
 };
 const headerConfig = getHeaderConfig();

 return <div className="app-shell flex h-screen overflow-hidden bg-slate-50 text-slate-800"><Sidebar activeTab={activeTab} setActiveTab={navigate} currentEvent={currentEvent} user={user} onLogout={()=>{if(!dirty||confirm(t('discardFloorSignOutConfirm')))onLogout();}} lang={lang}/><div className={`workspace-content ${activeTab==='floorplan'?'floor-workspace':''} flex-1 flex flex-col min-w-0 overflow-hidden`}><Header title={title} subtitle={subtitle} events={events} selectedEventId={eventId} onSelectEvent={chooseEvent} showEventSelector={headerConfig.showEventSelector} searchQuery={search} onSearchChange={setSearch} searchPlaceholder={headerConfig.searchPlaceholder} showSearch={headerConfig.showSearch} actionButton={headerConfig.actionButton} viewModeControl={headerConfig.viewModeControl} lang={lang} onToggleLang={toggleLang}/>{syncError&&<div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-xs px-4 py-2 flex items-center justify-between" role="alert"><span>{t('connectionIssue')}: {syncError}</span><button onClick={()=>reload().catch(e=>setSyncError(e.message))} className="underline font-bold ml-2">{t('refreshNow')}</button></div>}<main className={`app-main ${activeTab==='floorplan'?'floor-main':''} flex-1 overflow-auto p-4 sm:p-6 flex flex-col`}>
 {error&&<p role="alert" className="form-error">{error}</p>}
 {activeTab==='staff'&&admin?<TeamPanel currentUser={user} lang={lang} triggerNewUser={staffTrigger}/>:activeTab==='account'?<AccountSettings user={user} onUserChanged={onUserChanged} onLogout={onLogout}/>:activeTab==='settings'&&admin?<EventSettings currentEvent={currentEvent} events={events} selectedEventId={eventId} onSelectEvent={chooseEvent} onRefreshEvents={fetchEvents} searchQuery={search} onSave={async(id,payload)=>{await mutate(`/events/${id}`,payload,'PUT');await fetchEvents();}} onCreate={async payload=>{const result=await write('/events',payload);await fetchEvents();chooseEvent(result.event_id);navigate('floorplan');}} lang={lang} triggerNewEvent={settingsTrigger}/>:loading?<div className="panel">{t('loadingEventData')}</div>:!eventId?<div className="plan-empty"><h3>{t('noEventsYet')}</h3><p>{admin?t('createEventBlankFloor'):t('askAdminCreateEvent')}</p>{admin&&<button className="primary-action" onClick={()=>navigate('settings')}>{t('createEvent')}</button>}</div>:<>
 {activeTab==='floorplan'&&(
   floorViewMode === 'canvas' ? (
     <FloorPlan key={eventId} booths={data.booths} categories={data.categories} layout={data.layout} user={user} onDirtyChange={setDirty} searchQuery={search} selectedBooth={selectedBooth} onSelectBooth={b=>setSelectedId(b.id)} onSaveLayout={draft=>mutate(`/events/${eventId}/layout`,draft,'PUT')} onCreateBooth={payload=>mutate('/booths',{...payload,event_id:eventId})} onOpenPublicModal={handleOpenPublicModal} onClearExpiredHolds={handleClearExpiredHolds} lang={lang}/>
   ) : (
      <AdminStudio key={eventId} currentEvent={currentEvent} booths={data.booths} categories={data.categories} user={user} onCreateBooth={payload=>safeMutation('/booths',payload)} onUpdateBooth={(id,payload)=>safeMutation(`/booths/${id}`,payload,'PUT')} onDeleteBooth={id=>{if(confirm(t('deleteBoothConfirm')))return safeMutation(`/booths/${id}`,{},'DELETE');}} onCreateEvent={async payload=>{try{const result=await write('/events',payload);await fetchEvents();chooseEvent(result.event_id);return true;}catch(err){alert(err.message);return false;}}} lang={lang} searchQuery={search} triggerNewBooth={boothTrigger}/>
   )
 )}
 {activeTab==='dashboard'&&<DashboardView booths={data.booths} categories={data.categories} analytics={data.analytics} currentEvent={currentEvent} user={user} onNavigate={navigate} onSelectBooth={b=>setSelectedId(b.id)} onOpenInvoice={handleOpenInvoice} onVerifyPayment={handleVerifyPayment} onRejectPayment={handleRejectPayment} onOpenPublicModal={handleOpenPublicModal} lang={lang}/>}
 {activeTab==='bookings'&&<PaymentNotesList booths={filtered} onSelectBooth={b=>setSelectedId(b.id)} onAddPayment={b=>setModal({kind:'payment',id:b.id})} onOpenInvoice={handleOpenInvoice} onOpenHandover={handleOpenHandover} onVerifyPayment={handleVerifyPayment} onRejectPayment={handleRejectPayment} user={user} currentEvent={currentEvent} lang={lang}/>}
 {activeTab==='payments'&&<RecordsView mode="payments" booths={filtered} onSelectBooth={b=>setSelectedId(b.id)} onOpenInvoice={handleOpenInvoice} onVerifyPayment={handleVerifyPayment} onRejectPayment={handleRejectPayment} user={user} currentEvent={currentEvent} lang={lang}/>}
</>}
 </main></div>
 {selectedBooth&&<BoothDrawer key={selectedBooth.id} booth={selectedBooth} user={user} currentEvent={currentEvent} onReload={reload} onClose={()=>setSelectedId(null)} onConvertSold={b=>setModal({kind:'booking',id:b.id})} onAddPayment={b=>setModal({kind:'payment',id:b.id})} onConfirmSale={id=>safeMutation(`/bookings/${id}/confirm`,{})} onReleaseBooth={id=>{if(confirm(t('releaseBoothConfirm')))return safeMutation(`/booths/${id}/release`,{});}} onOpenInvoice={handleOpenInvoice} onVerifyPayment={handleVerifyPayment} onRejectPayment={handleRejectPayment} onExtendHold={handleExtendHold} lang={lang}/>}
 {modal?.kind==='booking'&&modalBooth&&<BookingWizardModal booth={modalBooth} onClose={()=>setModal(null)} onSubmitBooking={async(id,payload)=>{const ok=await safeMutation(`/booths/${id}/book`,payload);if(ok)setModal(null);return ok;}} lang={lang}/>}
 {modal?.kind==='payment'&&modalBooth&&<PaymentRecordModal booth={modalBooth} onClose={()=>setModal(null)} onSavePayment={async(id,payload)=>{const ok=await safeMutation(`/bookings/${id}/payment-note`,payload);if(ok)setModal(null);return ok;}} lang={lang}/>}
 {invoiceDoc&&<InvoiceReceiptModal booth={invoiceDoc.booth} currentEvent={currentEvent} initialDocType={invoiceDoc.docType} selectedPaymentNote={invoiceDoc.paymentNote} onClose={()=>setInvoiceDoc(null)}/>}
 {handoverBooth&&<BoothHandoverModal booth={handoverBooth} currentEvent={currentEvent} user={user} onClose={()=>setHandoverBooth(null)} onHandoverSaved={()=>{setHandoverBooth(null);reload();}}/>}
 {showPublicModal&&<PublicFloorPlanModal currentEvent={currentEvent} booths={data.booths} onClose={()=>setShowPublicModal(false)}/>}
 </div>;
}
