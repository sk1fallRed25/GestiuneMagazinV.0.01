import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
    LayoutDashboard, Package, CalendarClock, AlertOctagon, PackagePlus, 
    ArrowRightLeft, BrainCircuit, 
    ShoppingCart, FileText, Settings, LogOut, Search, Bell, AlertTriangle, History 
} from 'lucide-react';
import { supabase } from '../shared/supabase/supabaseClient';
import { isAdminLike, isManagerLike, isStockOperator, isCashierLike } from '../features/auth/permissions';
import { useAuth } from '../features/auth/useAuth';

interface Notification {
    id: number;
    type: 'alert' | 'info';
    message: string;
    time: string;
    read: boolean;
}

const MainLayout = ({ children }: { children: React.ReactNode }) => {
    const { role, profile, currentStore, logout } = useAuth();
    const location = useLocation();
    const [scrolled, setScrolled] = useState(false);

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

    interface NavLinkProps {
        to: string;
        label: string;
        icon: React.ReactNode;
        className?: string;
    }

    const NavLink = ({ to, label, icon, className = "" }: NavLinkProps) => {
        const isActive = location.pathname === to;
        return (
            <Link to={to} className={`relative flex items-center gap-3 px-4 py-3 mx-2 rounded-xl transition-all duration-200 text-sm font-medium group ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'} ${className}`}>
                {icon}
                <span>{label}</span>
                {isActive && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-l-full opacity-20"></div>}
            </Link>
        )
    }

    interface LinkuriOperatiuniProps {
        isSubmenu?: boolean;
    }

    const LinkuriOperatiuni = ({ isSubmenu = false }: LinkuriOperatiuniProps) => (
        <>
            <NavLink to="/receptie" label="Recepție Marfă" icon={<PackagePlus size={18} />} className={isSubmenu ? "ml-4 text-xs" : ""} />
            <NavLink to="/transfer" label="Transfer Marfă" icon={<ArrowRightLeft size={18} />} className={isSubmenu ? "ml-4 text-xs" : ""} />
        </>
    );

    return (
        <div className="flex h-screen bg-slate-50 font-sans overflow-hidden text-slate-800">
            {/* SIDEBAR */}
            <aside className="w-72 bg-[#0f172a] text-white flex flex-col shadow-2xl z-30 shrink-0 transition-all duration-300">
                <div className="p-8 pb-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-xl">M</div>
                    <div>
                        <h2 className="text-lg font-bold tracking-tight">MagazinPro</h2>
                        <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">
                            {role || 'rol necunoscut'}
                        </span>
                    </div>
                </div>
                <div className="px-6 py-4"><div className="h-[1px] bg-slate-800 w-full"></div></div>

                <nav className="flex-1 px-2 space-y-1 overflow-y-auto custom-scrollbar pb-4">
                    <div className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">General</div>
                    {isManagerLike(role) && <NavLink to="/" label="Dashboard" icon={<LayoutDashboard size={18} />} />}

                    <div className="px-4 py-2 mt-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Stocuri</div>
                    {isStockOperator(role) && (
                        <>
                            <NavLink to="/produse" label="Stocuri & Produse" icon={<Package size={18} />} />
                            <NavLink to="/expirari" label="Produse Expirate" icon={<CalendarClock size={18} />} />
                        </>
                    )}
                    {(isAdminLike(role) || role === 'gestionar') && (
                        <NavLink to="/pierderi" label="Raportare Pierderi" icon={<AlertOctagon size={18} />} />
                    )}

                    {(isAdminLike(role) || role === 'gestionar') && (
                        <>
                            <div className="px-4 py-2 mt-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Operațiuni</div>
                            <LinkuriOperatiuni />
                        </>
                    )}

                    {isManagerLike(role) && (
                        <>
                            <div className="px-4 py-2 mt-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Administrare</div>
                            <NavLink to="/istoric-pierderi" label="Audit Pierderi" icon={<History size={18} />} />
                            <NavLink to="/ai-consultant" label="AI Consultant" icon={<BrainCircuit size={18} />} />
                        </>
                    )}

                    {isCashierLike(role) && (
                        <>
                            <div className="px-4 py-2 mt-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Vânzare</div>
                            <NavLink to="/vanzare" label="Deschide POS" icon={<ShoppingCart size={18} />} />
                        </>
                    )}
                    
                    {isManagerLike(role) && (
                        <NavLink to="/istoric-vanzari" label="Istoric Vânzări" icon={<FileText size={18} />} />
                    )}

                    {isAdminLike(role) && (
                        <>
                            <div className="px-4 py-2 mt-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Sistem</div>
                            <NavLink to="/fast-add" label="Adăugare Rapidă" icon={<Settings size={18} />} />
                        </>
                    )}
                </nav>
                <div className="p-4 bg-[#0a0f1c]">
                    <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all text-sm font-medium border border-transparent hover:border-red-500/20"><LogOut size={18} /><span>Deconectare</span></button>
                </div>
            </aside>

            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <header className={`h-20 flex items-center justify-between px-8 z-20 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-md border-b border-gray-200' : 'bg-transparent'}`}>
                    <div className="flex items-center bg-white border border-gray-200 rounded-full px-4 py-2 w-96 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                        <Search size={18} className="text-gray-400" />
                        <input type="text" placeholder="Caută produse, stocuri..." className="ml-3 bg-transparent outline-none text-sm text-gray-600 w-full placeholder-gray-400" />
                    </div>

                    <div className="flex items-center gap-4">
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
                        <div className="flex items-center gap-3 pl-2">
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-bold text-gray-700">{profile?.full_name || 'Utilizator'}</p>
                                <p className="text-xs text-gray-400">{currentStore?.name || (role === 'platform_owner' ? 'Platform Administration' : 'Fără magazin')}</p>
                            </div>
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm text-indigo-600 font-bold">
                                {(profile?.full_name || 'U').charAt(0).toUpperCase()}
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
