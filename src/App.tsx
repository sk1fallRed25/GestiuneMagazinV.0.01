import React, { useState, useEffect, useCallback, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import { Toaster, toast } from 'react-hot-toast';
import { supabase } from './supabaseClient';
import {
    LayoutDashboard, Package, Truck, ShoppingCart, Settings, PackagePlus, ArrowRightLeft, ListTodo, Send, Inbox,
    Briefcase, ChevronDown, ChevronRight, Bell, Search, LogOut, TrendingUp, AlertTriangle, X, Check
} from 'lucide-react';

// --- IMPORTURI PAGINI ---
import Furnizori from './Furnizori'
import Produse from './Produse'
import Receptie from './Receptie'
import Vanzare from './Vanzare'
import Login from './Login'
import InregistrareAgent from './InregistrareAgent'
import AgentDashboard from './AgentDashboard'
import FastAdd from './FastAdd'
import TransferMarfa from './TransferMarfa'
import ListaCumparaturi from './ListaCumparaturi'
import DetaliiComanda from './DetaliiComanda';
import ComandaFurnizor from './ComandaFurnizor';
import ReceptieComanda from './ReceptieComanda';
import DetaliiComandaAgent from './DetaliiComandaAgent';

// ==========================================
// COMPONENTE UI (Stat Cards - Actualizat pt culori custom)
// ==========================================

const StatCard = ({ title, value, icon: Icon, color, valueColor, trend, loading }: any) => (
    <div className="bg-white rounded-2xl p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] hover:shadow-xl transition-all duration-300 border border-gray-100 group relative overflow-hidden">
        {loading && <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>}
        <div className="flex justify-between items-start">
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                {/* Folosim valueColor pentru movul specific din imagine */}
                <h3 className={`text-3xl font-bold transition-colors ${valueColor || 'text-gray-800 group-hover:text-indigo-600'}`}>
                    {value}
                </h3>
            </div>
            <div className={`p-3 rounded-xl ${color} bg-opacity-10 group-hover:scale-110 transition-transform duration-300`}>
                <Icon size={24} className={color.replace('bg-', 'text-')} />
            </div>
        </div>
        {trend && (
            <div className="mt-4 flex items-center text-xs font-medium">
                <span className={`${trend.isPositive ? 'text-green-500 bg-green-50' : 'text-red-500 bg-red-50'} flex items-center font-bold px-2 py-1 rounded-md`}>
                    {trend.isPositive ? <TrendingUp size={14} className="mr-1"/> : <AlertTriangle size={14} className="mr-1"/>}
                    {trend.value}
                </span>
                <span className="text-gray-400 ml-2">{trend.label || "față de perioada trecută"}</span>
            </div>
        )}
    </div>
);

// ==========================================
// LAYOUT PRINCIPAL
// ==========================================

const MainLayout = ({ children, onLogout, userRole }: { children: React.ReactNode, onLogout: () => void, userRole: string }) => {
    const location = useLocation();
    const [isGestionarMenuOpen, setIsGestionarMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    // --- STATE NOTIFICĂRI ---
    const [notifications, setNotifications] = useState<any[]>([]);
    const [showNotifMenu, setShowNotifMenu] = useState(false);
    const notifMenuRef = useRef<HTMLDivElement>(null);

    // Închide meniul de notificări dacă dai click în afară
    useEffect(() => {
        function handleClickOutside(event: any) {
            if (notifMenuRef.current && !notifMenuRef.current.contains(event.target)) {
                setShowNotifMenu(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Scroll effect Header
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // --- LOGICA DE NOTIFICĂRI ---
    const fetchNotifications = useCallback(async () => {
        const { data: produse } = await supabase.from('produse').select('id, nume, stoc_depozit, stoc_minim_depozit');

        const critice = produse?.filter(p => p.stoc_depozit <= p.stoc_minim_depozit).map(p => ({
            id: p.id,
            type: 'alert',
            message: `Stoc critic: ${p.nume} (${p.stoc_depozit} buc)`,
            time: 'Acum',
            read: false
        })) || [];

        setNotifications(critice);
    }, []);

    useEffect(() => {
        fetchNotifications();
        const subscription = supabase.channel('global-notifications')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'produse' }, (payload) => {
                const newProd = payload.new;
                if (newProd.stoc_depozit <= newProd.stoc_minim_depozit) {
                    toast.error(`ATENȚIE: ${newProd.nume} a ajuns la stocul ${newProd.stoc_depozit}!`, { duration: 5000, position: 'top-right' });
                    setNotifications(prev => {
                        const filtered = prev.filter(n => !n.message.includes(newProd.nume));
                        return [{ id: new Date().getTime(), type: 'alert', message: `ATENȚIE: ${newProd.nume} a ajuns la stocul ${newProd.stoc_depozit}!`, time: 'Chiar acum', read: false }, ...filtered];
                    });
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(subscription); }
    }, [fetchNotifications]);

    const NavLink = ({ to, label, icon, className = "" }: any) => {
        const isActive = location.pathname === to;
        return (
            <Link to={to} className={`relative flex items-center gap-3 px-4 py-3 mx-2 rounded-xl transition-all duration-200 text-sm font-medium group ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'} ${className}`}>
                {icon}
                <span>{label}</span>
                {isActive && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-l-full opacity-20"></div>}
            </Link>
        )
    }

    const LinkuriOperatiuni = ({ isSubmenu = false }) => (
        <>
            <NavLink to="/receptie" label="Recepție Manuală" icon={<PackagePlus size={18} />} className={isSubmenu ? "ml-4 text-xs" : ""} />
            <NavLink to="/receptie-comanda" label="Recepție Comandă" icon={<Inbox size={18} />} className={isSubmenu ? "ml-4 text-xs" : ""} />
            <NavLink to="/transfer" label="Transfer Marfă" icon={<ArrowRightLeft size={18} />} className={isSubmenu ? "ml-4 text-xs" : ""} />
        </>
    );

    return (
        <div className="flex h-screen bg-slate-50 font-sans overflow-hidden text-slate-800">
            {/* SIDEBAR */}
            <aside className="w-72 bg-[#0f172a] text-white flex flex-col shadow-2xl z-30 shrink-0 transition-all duration-300">
                <div className="p-8 pb-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <span className="font-bold text-xl text-white">M</span>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold tracking-tight">Magazin<span className="text-indigo-400">Pro</span></h2>
                        <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">{userRole}</span>
                    </div>
                </div>
                <div className="px-6 py-4"><div className="h-[1px] bg-slate-800 w-full"></div></div>

                <nav className="flex-1 px-2 space-y-1 overflow-y-auto custom-scrollbar pb-4">
                    <div className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">General</div>
                    <NavLink to="/" label="Dashboard" icon={<LayoutDashboard size={18} />} />

                    {userRole === 'gestionar' && (
                        <>
                            <div className="px-4 py-2 mt-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Gestiune Stoc</div>
                            <LinkuriOperatiuni />
                            <NavLink to="/produse" label="Stocuri & Produse" icon={<Package size={18} />} />
                        </>
                    )}

                    {userRole === 'admin' && (
                        <>
                            <div className="px-4 py-2 mt-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Administrare</div>
                            <div className="mx-2 mb-1">
                                <button onClick={() => setIsGestionarMenuOpen(!isGestionarMenuOpen)} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-sm font-medium ${isGestionarMenuOpen ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                                    <div className="flex items-center gap-3"><Briefcase size={18} /><span>Atribuții Gestionar</span></div>
                                    <div className={`transition-transform duration-300 ${isGestionarMenuOpen ? 'rotate-180' : ''}`}><ChevronDown size={16} /></div>
                                </button>
                                <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isGestionarMenuOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                    <div className="overflow-hidden bg-slate-900/50 rounded-b-xl mb-2"><div className="py-2 space-y-1"><LinkuriOperatiuni isSubmenu={true} /></div></div>
                                </div>
                            </div>
                            <NavLink to="/produse" label="Stocuri & Produse" icon={<Package size={18} />} />
                            <NavLink to="/comanda-furnizor" label="Comandă Furnizor" icon={<Send size={18} />} />
                            <NavLink to="/furnizori" label="Furnizori" icon={<Truck size={18} />} />
                            <NavLink to="/lista-cumparaturi" label="Listă Cumpărături" icon={<ListTodo size={18} />} />
                            <div className="px-4 py-2 mt-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Punct de Vânzare</div>
                            <NavLink to="/vanzare" label="Deschide POS" icon={<ShoppingCart size={18} />} />
                            <div className="px-4 py-2 mt-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Sistem</div>
                            <NavLink to="/fast-add" label="Adăugare Rapidă" icon={<Settings size={18} />} />
                        </>
                    )}
                </nav>
                <div className="p-4 bg-[#0a0f1c]">
                    <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all text-sm font-medium border border-transparent hover:border-red-500/20"><LogOut size={18} /><span>Deconectare</span></button>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <header className={`h-20 flex items-center justify-between px-8 z-20 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-md border-b border-gray-200' : 'bg-transparent'}`}>
                    <div className="flex items-center bg-white border border-gray-200 rounded-full px-4 py-2 w-96 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                        <Search size={18} className="text-gray-400" />
                        <input type="text" placeholder="Caută produse, comenzi..." className="ml-3 bg-transparent outline-none text-sm text-gray-600 w-full placeholder-gray-400" />
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
                            <div className="text-right hidden md:block"><p className="text-sm font-bold text-gray-700">Administrator</p><p className="text-xs text-gray-400">Magazin Central</p></div>
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm text-indigo-600 font-bold">A</div>
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

// --- DASHBOARD (CU SUMA CORECTĂ DIN VANZARI) ---
const Dashboard = ({ userRole }: { userRole: string }) => {
    const [stats, setStats] = useState({
        alerteStoc: 0,
        comenziAgenti: 0,
        vanzariAstazi: 0,
        cereriFurnizori: 0,
        loading: true
    });

    const fetchDashboardData = useCallback(async () => {
        try {
            // 1. Alerte Stoc
            const { data: produse } = await supabase.from('produse').select('stoc_depozit, stoc_minim_depozit');
            const alerteCount = produse?.filter((p: any) => p.stoc_depozit <= p.stoc_minim_depozit).length || 0;

            // 2. Comenzi Agenți
            const { count: comenziCount } = await supabase.from('comenzi_agenti').select('*', { count: 'exact', head: true }).eq('status', 'pending_admin');

            // 3. Cereri Furnizori
            const { count: cereriCount } = await supabase.from('cereri_furnizori').select('*', { count: 'exact', head: true }).eq('status', 'pending');

            // 4. Vânzări Astăzi (CALCUL CORECT)
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);

            const { data: vanzari, error } = await supabase
                .from('vanzari')
                .select('total')
                .eq('status', 'finalizat') // Importanța maximă: doar vânzările finalizate
                .gte('data_vanzare', todayStart.toISOString()) // Folosim data_vanzare din poza ta
                .lte('data_vanzare', todayEnd.toISOString());

            if (error) console.error("Eroare fetch vanzari:", error);

            const totalVanzari = vanzari?.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0) || 0;

            setStats({
                alerteStoc: alerteCount,
                comenziAgenti: comenziCount || 0,
                vanzariAstazi: totalVanzari,
                cereriFurnizori: cereriCount || 0,
                loading: false
            });

        } catch (error) {
            console.error("Eroare generala dashboard:", error);
            setStats(s => ({ ...s, loading: false }));
        }
    }, []);

    // --- REALTIME LISTENER ---
    useEffect(() => {
        fetchDashboardData();

        const channel = supabase.channel('dashboard-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'produse' }, () => fetchDashboardData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'comenzi_agenti' }, () => fetchDashboardData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cereri_furnizori' }, () => fetchDashboardData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'vanzari' }, () => fetchDashboardData())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchDashboardData]);

    return (
        <div className="p-8 max-w-7xl mx-auto pb-20">
            <div className="mb-10">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Bine ai revenit! 👋</h1>
                <p className="text-gray-500">Iată situația magazinului în timp real.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">

                {/* 1. WIDGET ALERTE STOC */}
                <Link to="/produse">
                    <StatCard
                        title="Alerte Stoc Critic"
                        value={`${stats.alerteStoc} Produse`}
                        icon={AlertTriangle}
                        color={stats.alerteStoc > 0 ? "bg-red-500 text-red-600" : "bg-green-500 text-green-600"}
                        trend={{
                            isPositive: stats.alerteStoc === 0,
                            value: stats.alerteStoc > 0 ? "Necesită aprovizionare" : "Stoc Optim",
                            label: "status curent"
                        }}
                        loading={stats.loading}
                    />
                </Link>

                {/* 2. WIDGET COMENZI AGENTI */}
                <StatCard
                    title="Comenzi Agenți"
                    value={`${stats.comenziAgenti} Noi`}
                    icon={Inbox}
                    color="bg-purple-500 text-purple-600"
                    valueColor="text-gray-800"
                    trend={{ isPositive: true, value: "În așteptare", label: "" }}
                    loading={stats.loading}
                />

                {/* 3. WIDGET VÂNZĂRI ASTĂZI (DESIGN ACTUALIZAT) */}
                <StatCard
                    title="Vânzări Astăzi"
                    value={`${stats.vanzariAstazi.toFixed(2)} RON`}
                    icon={TrendingUp}
                    color="bg-green-100 text-green-600"
                    valueColor="text-indigo-600" // Culoarea MOV din design
                    trend={{ isPositive: true, value: "Astăzi", label: "total încasări" }}
                    loading={stats.loading}
                />

                {/* 4. WIDGET CERERI FURNIZORI */}
                {userRole === 'admin' && (
                    <StatCard
                        title="Cereri Furnizori"
                        value={`${stats.cereriFurnizori} În Așteptare`}
                        icon={Briefcase}
                        color="bg-blue-500 text-blue-600"
                        valueColor="text-gray-800"
                        loading={stats.loading}
                    />
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 min-h-[300px]">
                    <h3 className="font-bold text-lg text-gray-800 mb-4">Activitate Recentă</h3>
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        Grafic vânzări (În dezvoltare...)
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <h3 className="font-bold text-lg text-gray-800 mb-4">Top Produse</h3>
                    <div className="space-y-4">
                        {[1, 2, 3].map((_, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group">
                                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center font-bold">#{i+1}</div>
                                <div>
                                    <div className="h-4 w-24 bg-gray-200 rounded mb-1 group-hover:bg-gray-300 transition-colors"></div>
                                    <div className="h-3 w-12 bg-gray-100 rounded"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
};

// ==========================================
// APP PRINCIPAL
// ==========================================
function App() {
    const [userRole, setUserRole] = useState<'admin' | 'casier' | 'agent' | 'gestionar' | null>(null);
    const [agentId, setAgentId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedRole = localStorage.getItem('magazin_role') as any;
        const savedId = localStorage.getItem('magazin_agent_id');
        if (savedRole) setUserRole(savedRole);
        if (savedId) setAgentId(parseInt(savedId));
        setLoading(false);
    }, []);

    const handleLogin = (role: 'admin' | 'casier' | 'agent' | 'gestionar', id?: number) => {
        setUserRole(role);
        localStorage.setItem('magazin_role', role);
        if (id) { setAgentId(id); localStorage.setItem('magazin_agent_id', id.toString()); }
    };

    const handleLogout = () => {
        if (confirm("Sigur dorești să te deconectezi?")) {
            setUserRole(null); setAgentId(null);
            localStorage.removeItem('magazin_role'); localStorage.removeItem('magazin_agent_id');
        }
    };

    if (loading) { return <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-600 font-medium">Se încarcă aplicația...</div>; }

    return (
        <Router>
            <Routes>
                <Route path="/login" element={!userRole ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />
                <Route path="/partener" element={<InregistrareAgent />} />
                {!userRole ? <Route path="*" element={<Navigate to="/login" />} /> : userRole === 'casier' ? (
                    <>
                        <Route path="/vanzare" element={<div className="h-screen flex flex-col bg-gray-900"><div className="bg-gray-900 text-white px-4 py-2 flex justify-between items-center text-xs border-b border-gray-800"><span>Mod Casier: <strong>Activ</strong></span><button onClick={handleLogout} className="text-red-400 hover:text-white">Ieșire Tură</button></div><div className="flex-1 overflow-hidden bg-gray-100"><Vanzare /></div></div>} />
                        <Route path="*" element={<Navigate to="/vanzare" replace />} />
                    </>
                ) : userRole === 'agent' ? (
                    <Route path="/*" element={agentId ? <AgentDashboard agentId={agentId} onLogout={handleLogout} /> : <div>Eroare ID Agent</div>} />
                ) : (
                    <Route path="/*" element={
                        <MainLayout onLogout={handleLogout} userRole={userRole}>
                            <Routes>
                                <Route path="/" element={<Dashboard userRole={userRole} />} />
                                <Route path="/produse" element={<Produse userRole={userRole} />} />
                                <Route path="/receptie" element={<Receptie />} />
                                <Route path="/receptie-comanda" element={<ReceptieComanda />} />
                                <Route path="/transfer" element={<TransferMarfa />} />
                                <Route path="/comanda/:id" element={<DetaliiComanda />} />
                                {userRole === 'admin' && (<><Route path="/furnizori" element={<Furnizori />} /><Route path="/vanzare" element={<Vanzare />} /><Route path="/fast-add" element={<FastAdd />} /><Route path="/lista-cumparaturi" element={<ListaCumparaturi />} /><Route path="/comanda-furnizor" element={<ComandaFurnizor />} /><Route path="/comanda-primita/:id" element={<DetaliiComandaAgent />} /></>)}
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </MainLayout>
                    } />
                )}
            </Routes>
        </Router>
    );
}

function AppWrapper() {
    return (
        <>
            <Toaster position="top-right" reverseOrder={false} toastOptions={{ style: { background: '#333', color: '#fff', borderRadius: '10px' } }} />
            <App />
        </>
    )
}

export default AppWrapper;