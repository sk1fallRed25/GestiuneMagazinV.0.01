import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
    LayoutDashboard, Package, CalendarClock, AlertOctagon, PackagePlus, 
    ArrowRightLeft, BrainCircuit, 
    ShoppingCart, FileText, Settings, LogOut, Search, Bell, AlertTriangle, History, ShieldAlert, BarChart3, Power 
} from 'lucide-react';
import { supabase } from '../shared/supabase/supabaseClient';
import { isAdminLike, isManagerLike, isStockOperator, isCashierLike } from '../features/auth/permissions';
import { useAuth } from '../features/auth/useAuth';
import { StoreContextSwitcher } from '../components/layout/StoreContextSwitcher';
import { useModuleEntitlementsContext } from '../features/module-entitlements/ModuleEntitlementsContext';
import { useNetworkStatus } from '../shared/network/useNetworkStatus';
import { LogoutCartWarningDialog } from '../components/dialogs/LogoutCartWarningDialog';
import { AppCloseCartWarningDialog } from '../components/dialogs/AppCloseCartWarningDialog';
import { clearPosCartDraft } from '../features/pos/services/posCartRecoveryService';
import { Badge, Button } from '../shared/components/ui';


interface Notification {
    id: number;
    type: 'alert' | 'info';
    message: string;
    time: string;
    read: boolean;
}

const MainLayout = ({ children }: { children: React.ReactNode }) => {
    const { role, profile, user, currentStore, currentStoreId, availableStores, selectStore, logout } = useAuth();
    const { isModuleEnabled } = useModuleEntitlementsContext();
    const { isOnline, isReconnecting } = useNetworkStatus();
    const location = useLocation();
    const [scrolled, setScrolled] = useState(false);
    const [appVersion, setAppVersion] = useState('1.0.0');
    const [offlineQueuedCount, setOfflineQueuedCount] = useState(0);

    const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI?.isElectron;

    useEffect(() => {
        if (!isElectron || !currentStoreId) return;
        
        const updateCount = async () => {
            if ((window as any).electronAPI?.sqlite?.getOfflineSalesSummary) {
                try {
                    const stats = await (window as any).electronAPI.sqlite.getOfflineSalesSummary({ storeId: currentStoreId });
                    setOfflineQueuedCount(stats.queuedCount);
                } catch (e) {
                    console.error('Error fetching offline stats in MainLayout:', e);
                }
            }
        };

        updateCount();
        const interval = setInterval(updateCount, 15000);
        return () => clearInterval(interval);
    }, [isElectron, currentStoreId]);

    // Logout/Close dialogs state
    const [showLogoutCartWarning, setShowLogoutCartWarning] = useState(false);
    const [showCloseCartWarning, setShowCloseCartWarning] = useState(false);

    useEffect(() => {
        const fetchVersion = async () => {
            if (typeof window !== 'undefined' && (window as any).electronAPI?.getAppVersion) {
                try {
                    const v = await (window as any).electronAPI.getAppVersion();
                    setAppVersion(v);
                    // Also set global version for posCartRecoveryService
                    (window as any).__APP_VERSION__ = v;
                } catch (e) {
                    console.error(e);
                }
            }
        };
        fetchVersion();
    }, []);

    const [notifications, setNotifications] = useState<Notification[]>([]);

    const [showNotifMenu, setShowNotifMenu] = useState(false);
    const notifMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (notifMenuRef.current && !notifMenuRef.current.contains(event.target as Node)) {
                setShowNotifMenu(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // --- MONITORIZARE REALTIME: PIERDERI ȘI STOCURI (Schema v2) ---
    useEffect(() => {
        const channel = supabase.channel('v2-monitoring')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'waste_events' }, async (payload) => {
                const { profile_id, reason } = payload.new;

                // Interogăm profilul (v2)
                const { data: userProfile } = await supabase.from('profiles').select('full_name').eq('id', profile_id).single();
                const numeAngajat = userProfile?.full_name || "Angajat necunoscut";

                const msg = `⚠️ PIERDERE raportată de ${numeAngajat}: ${reason}`;
                toast.error(msg, { duration: 6000, position: 'bottom-right' });

                setNotifications(prev => [{
                    id: Date.now(),
                    type: 'alert',
                    message: msg,
                    time: 'Acum',
                    read: false
                }, ...prev]);
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'products' }, (payload) => {
                const newProd = payload.new;
                // Logica de stoc minim va fi adaptată în Etapa 2B când avem stock_batches
                // Momentan păstrăm placeholder pentru a nu crăpa UI
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // --- Cart-aware helpers ---

    /** Check if there are items in the POS cart (using the backward-compatible key) */
    const hasCartItems = (): boolean => {
        try {
            const saved = localStorage.getItem('pos_cart');
            if (!saved) return false;
            const items = JSON.parse(saved);
            return Array.isArray(items) && items.length > 0;
        } catch {
            return false;
        }
    };

    const handleLogoutClick = () => {
        if (hasCartItems()) {
            setShowLogoutCartWarning(true);
        } else {
            logout();
        }
    };

    const handleLogoutKeepCart = () => {
        // Draft is already saved by autosave; just logout
        setShowLogoutCartWarning(false);
        logout();
    };

    const handleLogoutDiscardCart = () => {
        // Clear cart from localStorage and draft
        localStorage.setItem('pos_cart', '[]');
        if (currentStoreId && user?.id) {
            clearPosCartDraft({ storeId: currentStoreId, profileId: user.id });
        }
        setShowLogoutCartWarning(false);
        logout();
    };

    const handleLogoutCancel = () => {
        setShowLogoutCartWarning(false);
    };

    // --- Close App handlers ---

    const handleCloseAppClick = () => {
        if (!isElectron) {
            toast.error('Închiderea aplicației este disponibilă doar în versiunea desktop.');
            return;
        }

        if (hasCartItems()) {
            setShowCloseCartWarning(true);
        } else {
            // Simple confirm
            if (window.confirm('Închide aplicația?')) {
                (window as any).electronAPI.appControls.quitApp();
            }
        }
    };

    const handleCloseKeepCart = () => {
        // Draft is already saved by autosave; just quit
        setShowCloseCartWarning(false);
        if ((window as any).electronAPI?.appControls?.quitApp) {
            (window as any).electronAPI.appControls.quitApp();
        }
    };

    const handleCloseDiscardCart = () => {
        // Clear cart and draft, then quit
        localStorage.setItem('pos_cart', '[]');
        if (currentStoreId && user?.id) {
            clearPosCartDraft({ storeId: currentStoreId, profileId: user.id });
        }
        setShowCloseCartWarning(false);
        if ((window as any).electronAPI?.appControls?.quitApp) {
            (window as any).electronAPI.appControls.quitApp();
        }
    };

    const handleCloseCancel = () => {
        setShowCloseCartWarning(false);
    };

    interface NavLinkProps {
        to: string;
        label: string;
        icon: React.ReactNode;
        className?: string;
        badge?: React.ReactNode;
    }

    const NavLink = ({ to, label, icon, className = "", badge }: NavLinkProps) => {
        const isActive = location.pathname === to;
        return (
            <Link
                to={to}
                className={`
                    relative flex items-center justify-between px-4 py-3 mx-2 rounded-xl transition-all duration-200 text-sm font-semibold group outline-none
                    focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
                    ${isActive 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/40' 
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }
                    ${className}
                `}
            >
                <div className="flex items-center gap-3">
                    {icon}
                    <span>{label}</span>
                </div>
                {badge && <div className="z-10">{badge}</div>}
                {isActive && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-l-full opacity-20"></div>}
            </Link>
        )
    }

    interface LinkuriOperatiuniProps {
        isSubmenu?: boolean;
    }

    const LinkuriOperatiuni = ({ isSubmenu = false }: LinkuriOperatiuniProps) => (
        <>
            {isModuleEnabled('reception') && (
                <NavLink to="/receptie" label="Recepție Marfă" icon={<PackagePlus size={18} />} className={isSubmenu ? "ml-4 text-xs" : ""} />
            )}
            {(role === 'admin' || role === 'platform_owner' || role === 'manager' || role === 'gestionar') && (
                <NavLink to="/nir" label="NIR / e-Factura" icon={<FileText size={18} />} className={isSubmenu ? "ml-4 text-xs" : ""} />
            )}
            {isModuleEnabled('transfer') && (
                <NavLink to="/transfer" label="Transfer Marfă" icon={<ArrowRightLeft size={18} />} className={isSubmenu ? "ml-4 text-xs" : ""} />
            )}
        </>
    );


    return (
        <div className="flex h-screen bg-slate-50 font-sans overflow-hidden text-slate-800">
            {/* Logout Cart Warning Dialog */}
            {showLogoutCartWarning && (
                <LogoutCartWarningDialog
                    onKeepAndLogout={handleLogoutKeepCart}
                    onDiscardAndLogout={handleLogoutDiscardCart}
                    onCancel={handleLogoutCancel}
                />
            )}

            {/* Close App Cart Warning Dialog */}
            {showCloseCartWarning && (
                <AppCloseCartWarningDialog
                    onKeepAndClose={handleCloseKeepCart}
                    onDiscardAndClose={handleCloseDiscardCart}
                    onCancel={handleCloseCancel}
                />
            )}

            {/* SIDEBAR */}
            <aside className="w-72 bg-[#0f172a] text-white flex flex-col shadow-2xl z-30 shrink-0 transition-all duration-300">
                <div className="p-8 pb-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-xl select-none">M</div>
                    <div>
                        <h2 className="text-lg font-bold tracking-tight select-none">MagazinPro</h2>
                        <span className="text-[10px] text-indigo-400 uppercase font-bold tracking-widest select-none">
                            {role || 'rol necunoscut'}
                        </span>
                    </div>
                </div>
                <div className="px-6 py-4"><div className="h-[1px] bg-slate-800 w-full"></div></div>

                <nav className="flex-1 px-2 space-y-1 overflow-y-auto custom-scrollbar pb-4">
                    {role === 'platform_owner' ? (
                        <>
                            <div className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Platformă</div>
                            <NavLink to="/owner" label="Consolă Proprietar" icon={<ShieldAlert size={18} />} />

                            <div className="px-4 py-2 mt-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Administrare Globală</div>
                            <div className="px-4 py-3 mx-2 text-xs text-slate-400 bg-slate-900/50 rounded-xl border border-slate-800/80 italic leading-relaxed">
                                Administrezi platforma global. Magazinele se gestionează din Consolă Proprietar.
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">General</div>
                            {isManagerLike(role) && isModuleEnabled('dashboard') && (
                                <NavLink to="/" label="Dashboard" icon={<LayoutDashboard size={18} />} />
                            )}

                            {isStockOperator(role) && (isModuleEnabled('products') || isModuleEnabled('expiration_tracking')) && (
                                <>
                                    <div className="px-4 py-2 mt-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Stocuri</div>
                                    {isModuleEnabled('products') && (
                                        <NavLink to="/produse" label="Stocuri & Produse" icon={<Package size={18} />} />
                                    )}
                                    {isModuleEnabled('expiration_tracking') && (
                                        <NavLink to="/expirari" label="Produse Expirate" icon={<CalendarClock size={18} />} />
                                    )}
                                </>
                            )}

                            {(isAdminLike(role) || role === 'gestionar') && isModuleEnabled('loss_reporting') && (
                                <NavLink to="/pierderi" label="Raportare Pierderi" icon={<AlertOctagon size={18} />} />
                            )}

                            {(isAdminLike(role) || role === 'gestionar') && (isModuleEnabled('reception') || isModuleEnabled('transfer')) && (
                                <>
                                    <div className="px-4 py-2 mt-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Operațiuni</div>
                                    <LinkuriOperatiuni />
                                </>
                            )}

                            {isManagerLike(role) && (isModuleEnabled('waste_audit') || isModuleEnabled('commercial_reports') || isModuleEnabled('store_settings') || isModuleEnabled('ai_consultant')) && (
                                <>
                                    <div className="px-4 py-2 mt-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Administrare</div>
                                    {isModuleEnabled('waste_audit') && (
                                        <NavLink to="/istoric-pierderi" label="Audit Pierderi" icon={<History size={18} />} />
                                    )}
                                    {isModuleEnabled('commercial_reports') && (
                                        <NavLink to="/rapoarte" label="Rapoarte Comerciale" icon={<BarChart3 size={18} />} />
                                    )}
                                    {isModuleEnabled('store_settings') && (
                                        <NavLink to="/setari-magazin" label="Setări Magazin" icon={<Settings size={18} />} />
                                    )}
                                    {isModuleEnabled('ai_consultant') && (
                                        <NavLink to="/ai-consultant" label="AI Consultant" icon={<BrainCircuit size={18} />} />
                                    )}
                                </>
                            )}

                            {isCashierLike(role) && isModuleEnabled('pos') && (
                                <>
                                    <div className="px-4 py-2 mt-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Vânzare</div>
                                    <NavLink to="/vanzare" label="Deschide POS" icon={<ShoppingCart size={18} />} />
                                    {isElectron && (
                                        <NavLink 
                                            to="/offline-sales" 
                                            label="Vânzări offline" 
                                            icon={<FileText size={18} />} 
                                            badge={offlineQueuedCount > 0 ? (
                                                <span className="bg-amber-500 text-white font-black text-[10px] px-2 py-0.5 rounded-full animate-pulse shadow-sm">
                                                    {offlineQueuedCount}
                                                </span>
                                            ) : null}
                                        />
                                    )}
                                </>
                            )}
                            
                            {isManagerLike(role) && isModuleEnabled('sales_history') && (
                                <NavLink to="/istoric-vanzari" label="Istoric Vânzări" icon={<FileText size={18} />} />
                            )}

                            {isAdminLike(role) && (
                                <>
                                    <div className="px-4 py-2 mt-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Sistem</div>
                                    <NavLink to="/fast-add" label="Adăugare Rapidă" icon={<Settings size={18} />} />
                                </>
                            )}
                        </>
                    )}
                </nav>
                <div className="p-4 bg-[#0a0f1c] flex flex-col gap-2">
                    <div className="flex flex-col px-4 py-2 bg-slate-900/50 rounded-xl border border-slate-800 text-[10px] text-slate-300 font-semibold gap-1 mb-2">
                        <div className="flex justify-between select-none">
                            <span>VERSIUNE</span>
                            <span data-testid="app-version-label" className="font-bold text-slate-200">{appVersion}</span>
                        </div>
                        <div className="flex justify-between select-none">
                            <span>RUNTIME</span>
                            <span data-testid="app-runtime-label" className="font-bold text-slate-200">
                                {import.meta.env.DEV ? 'development' : 'production'} / {((window as any).electronAPI?.isElectron) ? 'electron' : 'web'}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={handleLogoutClick}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-350 transition-all text-sm font-bold border border-transparent hover:border-red-500/20 outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                    >
                        <LogOut size={18} />
                        <span>Deconectare</span>
                    </button>
                    <button
                        data-testid="app-close-button"
                        onClick={handleCloseAppClick}
                        disabled={!isElectron}
                        title={isElectron ? 'Închide aplicația desktop' : 'Închiderea aplicației este disponibilă doar în versiunea desktop.'}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold border transition-all outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                            isElectron 
                                ? 'text-slate-300 hover:bg-slate-700/50 hover:text-slate-100 border-transparent hover:border-slate-600/30 cursor-pointer' 
                                : 'text-slate-600 border-transparent opacity-40 cursor-not-allowed'
                        }`}
                    >
                        <Power size={18} />
                        <span>Închide aplicația</span>
                    </button>
                </div>
            </aside>

            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                {/* Global Network Banners */}
                {!isOnline && !isReconnecting && (
                    <div data-testid="network-offline-banner" className="w-full bg-red-600 text-white text-center py-2 text-xs font-bold flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300 z-50 shrink-0">
                        <span>⚠️ Offline — unele funcții sunt indisponibile</span>
                    </div>
                )}
                {isReconnecting && (
                    <div data-testid="network-reconnecting-banner" className="w-full bg-amber-500 text-white text-center py-2 text-xs font-bold flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300 z-50 shrink-0">
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>Reconectare...</span>
                    </div>
                )}

                <header className={`h-20 flex items-center justify-between px-8 z-20 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-md border-b border-gray-200' : 'bg-transparent'}`}>
                    <div className="flex items-center bg-white border border-gray-200 rounded-full px-4 py-2 w-96 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                        <Search size={18} className="text-gray-400" />
                        <input 
                            type="text" 
                            placeholder={role === 'platform_owner' ? "Caută magazine, utilizatori, audit..." : "Caută produse, stocuri..."} 
                            className="ml-3 bg-transparent outline-none text-sm text-gray-600 w-full placeholder-gray-400" 
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        {isOnline && !isReconnecting && (
                            <Badge
                                data-testid="network-status-indicator"
                                variant="online"
                                size="sm"
                                showDot
                                className="uppercase font-bold tracking-wider"
                            >
                                Online
                            </Badge>
                        )}
                        <div className="relative" ref={notifMenuRef}>
                            <button onClick={() => setShowNotifMenu(!showNotifMenu)} className={`p-2 rounded-full hover:bg-gray-100 relative transition-colors ${showNotifMenu ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500'}`}>
                                <Bell size={20} />
                                {notifications.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse"></span>}
                            </button>
                            {showNotifMenu && (
                                <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                                        <h3 className="font-bold text-gray-800 text-sm">Notificări ({notifications.length})</h3>
                                        {notifications.length > 0 && <button onClick={() => setNotifications([])} className="text-xs text-indigo-600 hover:underline">Șterge tot</button>}
                                    </div>
                                    <div className="max-h-64 overflow-y-auto">
                                        {notifications.length === 0 ? <div className="p-8 text-center text-gray-400 text-sm">Nu ai notificări noi.</div> : notifications.map((notif, idx) => (
                                            <div key={idx} className="p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors flex gap-3 items-start">
                                                <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 mt-1"><AlertTriangle size={14} /></div>
                                                <div><p className="text-sm text-gray-800 font-medium leading-tight">{notif.message}</p><p className="text-xs text-gray-400 mt-1">{notif.time}</p></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="h-8 w-[1px] bg-gray-300 mx-2"></div>
                        <StoreContextSwitcher
                            availableStores={availableStores}
                            currentStoreId={currentStoreId}
                            onSelectStore={selectStore}
                            isOwner={role === 'platform_owner'}
                        />
                        <div className="flex items-center gap-3 pl-2">
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-bold text-gray-700">{profile?.full_name || 'Platform Owner'}</p>
                                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                    {role === 'platform_owner' && !currentStoreId && (
                                        <Badge variant="info" size="sm" className="uppercase font-bold tracking-tight">
                                            Platform Administration
                                        </Badge>
                                    )}
                                    <Badge variant="default" size="sm" className="bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase font-bold tracking-tight">
                                        {role || 'rol necunoscut'}
                                    </Badge>
                                </div>
                            </div>
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm text-indigo-600 font-bold">
                                {(profile?.full_name || 'Platform Owner').charAt(0).toUpperCase()}
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-0 scroll-smooth">
                    {children}
                </main>
            </div>
        </div>
    )
};

export default MainLayout;
