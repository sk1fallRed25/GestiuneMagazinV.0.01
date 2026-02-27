import React, { useState, useEffect, useCallback, useRef } from 'react'
import { HashRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import { Toaster, toast } from 'react-hot-toast';
import { supabase } from './supabaseClient';
import {
    LayoutDashboard, Package, Truck, ShoppingCart, Settings, PackagePlus, ArrowRightLeft, ListTodo, Send, Inbox,
    Briefcase, ChevronDown, ChevronRight, Bell, Search, LogOut, TrendingUp, AlertTriangle, X, Check, Users, ClipboardList, FileText,
    BrainCircuit, CalendarClock, AlertOctagon, History,
    Link as LinkIcon
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
import Comenzi from './Comenzi';
import ReceptieComanda from './ReceptieComanda';
import DetaliiComandaAgent from './DetaliiComandaAgent';
import GestiuneAgenti from './GestiuneAgenti';
import IstoricVanzari from './IstoricVanzari';
import AiConsultant from './AiConsultant';
import GestiuneProduseFurnizor from './GestiuneProduseFurnizor';
import Expirari from './Expirari';
import Pierderi from './Pierderi';
import IstoricPierderi from './IstoricPierderi'; // Import Nou pentru Audit

// ==========================================
// COMPONENTE UI (Stat Cards)
// ==========================================

const StatCard = ({ title, value, icon: Icon, color, valueColor, trend, loading }: any) => (
    <div className="bg-white rounded-2xl p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] hover:shadow-xl transition-all duration-300 border border-gray-100 group relative overflow-hidden">
        {loading && <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>}
        <div className="flex justify-between items-start">
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
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

    const [notifications, setNotifications] = useState<any[]>([]);
    const [showNotifMenu, setShowNotifMenu] = useState(false);
    const notifMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: any) {
            if (notifMenuRef.current && !notifMenuRef.current.contains(event.target)) {
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

    // --- MONITORIZARE REALTIME: PIERDERI NOMINALE ȘI STOCURI ---
    useEffect(() => {
        const channel = supabase.channel('audit-monitoring')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pierderi' }, async (payload) => {
                const { user_id, motiv } = payload.new;

                // Interogăm numele angajatului pe baza UUID-ului din tabela utilizatori
                const { data: user } = await supabase.from('utilizatori').select('nume').eq('id', user_id).single();
                const numeAngajat = user?.nume || "Angajat necunoscut";

                const msg = `⚠️ PIERDERE raportată de ${numeAngajat}: ${motiv}`;
                toast.error(msg, { duration: 6000, position: 'bottom-right' });

                setNotifications(prev => [{
                    id: Date.now(),
                    type: 'alert',
                    message: msg,
                    time: 'Acum',
                    read: false
                }, ...prev]);
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'produse' }, (payload) => {
                const newProd = payload.new;
                if (newProd.stoc_depozit <= newProd.stoc_minim_depozit) {
                    toast.error(`ATENȚIE: ${newProd.nume} la stoc critic!`, { duration: 5000 });
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

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

    const LinkuriOperatiuni = ({ isSubmenu = false }: any) => (
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
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-xl">M</div>
                    <div>
                        <h2 className="text-lg font-bold tracking-tight">MagazinPro</h2>
                        <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{userRole}</span>
                    </div>
                </div>
                <div className="px-6 py-4"><div className="h-[1px] bg-slate-800 w-full"></div></div>

                <nav className="flex-1 px-2 space-y-1 overflow-y-auto custom-scrollbar pb-4">
                    <div className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">General</div>
                    <NavLink to="/" label="Dashboard" icon={<LayoutDashboard size={18} />} />

                    <div className="px-4 py-2 mt-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Stocuri</div>
                    <NavLink to="/produse" label="Stocuri & Produse" icon={<Package size={18} />} />
                    <NavLink to="/expirari" label="Produse Expirate" icon={<CalendarClock size={18} />} />
                    <NavLink to="/pierderi" label="Raportare Pierderi" icon={<AlertOctagon size={18} />} />

                    {userRole === 'gestionar' && (
                        <>
                            <div className="px-4 py-2 mt-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Operațiuni</div>
                            <LinkuriOperatiuni />
                        </>
                    )}

                    {userRole === 'admin' && (
                        <>
                            <div className="px-4 py-2 mt-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Administrare</div>

                            <NavLink to="/istoric-pierderi" label="Audit Pierderi" icon={<History size={18} />} />

                            <div className="mx-2 mb-1">
                                <button onClick={() => setIsGestionarMenuOpen(!isGestionarMenuOpen)} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-sm font-medium ${isGestionarMenuOpen ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                                    <div className="flex items-center gap-3"><Briefcase size={18} /><span>Atribuții Gestionar</span></div>
                                    <div className={`transition-transform duration-300 ${isGestionarMenuOpen ? 'rotate-180' : ''}`}><ChevronDown size={16} /></div>
                                </button>
                                <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isGestionarMenuOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                    <div className="overflow-hidden bg-slate-900/50 rounded-b-xl mb-2"><div className="py-2 space-y-1"><LinkuriOperatiuni isSubmenu={true} /></div></div>
                                </div>
                            </div>

                            <NavLink to="/ai-consultant" label="AI Consultant" icon={<BrainCircuit size={18} />} />
                            <NavLink to="/furnizori" label="Furnizori" icon={<Truck size={18} />} />
                            <NavLink to="/gestiune-produse-furnizor" label="Alocare Directă" icon={<LinkIcon size={18} />} />
                            <NavLink to="/gestiune-agenti" label="Gestiune Agenți" icon={<Users size={18} />} />

                            <div className="px-4 py-2 mt-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Aprovizionare</div>
                            <NavLink to="/comanda-furnizor" label="Comandă Furnizor" icon={<Send size={18} />} />
                            <NavLink to="/comenzi" label="Situație Comenzi" icon={<ClipboardList size={18} />} />
                            <NavLink to="/lista-cumparaturi" label="Listă Cumpărături" icon={<ListTodo size={18} />} />

                            <div className="px-4 py-2 mt-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Vânzare</div>
                            <NavLink to="/vanzare" label="Deschide POS" icon={<ShoppingCart size={18} />} />
                            <NavLink to="/istoric-vanzari" label="Istoric Vânzări" icon={<FileText size={18} />} />

                            <div className="px-4 py-2 mt-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Sistem</div>
                            <NavLink to="/fast-add" label="Adăugare Rapidă" icon={<Settings size={18} />} />
                        </>
                    )}
                </nav>
                <div className="p-4 bg-[#0a0f1c]">
                    <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all text-sm font-medium border border-transparent hover:border-red-500/20"><LogOut size={18} /><span>Deconectare</span></button>
                </div>
            </aside>

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

// --- DASHBOARD (ACTUALIZAT CU STATISTICI PIERDERI) ---
const Dashboard = ({ userRole }: { userRole: string }) => {
    const [stats, setStats] = useState({
        alerteStoc: 0,
        alerteExpirari: 0,
        pierderiLuna: 0, // Statistică nouă
        vanzariAstazi: 0,
        comenziFurnizor: 0,
        loading: true
    });

    const fetchDashboardData = useCallback(async () => {
        try {
            const { data: produse } = await supabase.from('produse').select('stoc_depozit, stoc_minim_depozit');
            const alerteCount = produse?.filter((p: any) => p.stoc_depozit <= p.stoc_minim_depozit).length || 0;

            const { count: expirariCount } = await supabase.from('view_expirari').select('*', { count: 'exact', head: true });

            // Calcul pierderi luna curentă pentru audit
            const primaZi = new Date(); primaZi.setDate(1);
            const { count: pierderiCount } = await supabase.from('pierderi').select('*', { count: 'exact', head: true }).gte('created_at', primaZi.toISOString());

            const { count: comenziFurnizorCount } = await supabase.from('comenzi_catre_furnizor').select('*', { count: 'exact', head: true }).eq('status', 'pending');

            const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
            const { data: vanzari } = await supabase.from('vanzari').select('total').eq('status', 'finalizat').gte('data_vanzare', todayStart.toISOString());
            const totalVanzari = vanzari?.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0) || 0;

            setStats({
                alerteStoc: alerteCount,
                alerteExpirari: expirariCount || 0,
                pierderiLuna: pierderiCount || 0,
                vanzariAstazi: totalVanzari,
                comenziFurnizor: comenziFurnizorCount || 0,
                loading: false
            });

        } catch (error) {
            console.error("Eroare dashboard:", error);
            setStats(s => ({ ...s, loading: false }));
        }
    }, []);

    useEffect(() => {
        fetchDashboardData();
        const channel = supabase.channel('dashboard-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'produse' }, () => fetchDashboardData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pierderi' }, () => fetchDashboardData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'vanzari' }, () => fetchDashboardData())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [fetchDashboardData]);

    return (
        <div className="p-8 max-w-7xl mx-auto pb-20">
            <div className="mb-10">
                <h1 className="text-3xl font-black text-gray-800 mb-2 tracking-tight">Consolă Gestiune v0.1.2</h1>
                <p className="text-gray-500 font-medium">Sinteza riscurilor și monitorizarea integrității stocurilor.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <Link to="/produse">
                    <StatCard
                        title="Stocuri Critice"
                        value={`${stats.alerteStoc} Repere`}
                        icon={AlertTriangle}
                        color={stats.alerteStoc > 0 ? "bg-red-500" : "bg-green-500"}
                        trend={{ isPositive: stats.alerteStoc === 0, value: stats.alerteStoc > 0 ? "Alertă Stoc" : "Optim" }}
                        loading={stats.loading}
                    />
                </Link>

                <Link to="/expirari">
                    <StatCard
                        title="Termene Expirare"
                        value={`${stats.alerteExpirari} Loturi`}
                        icon={CalendarClock}
                        color={stats.alerteExpirari > 0 ? "bg-orange-500" : "bg-green-500"}
                        trend={{ isPositive: stats.alerteExpirari === 0, value: stats.alerteExpirari > 0 ? "Risc detectat" : "Sigur" }}
                        loading={stats.loading}
                    />
                </Link>

                <Link to="/istoric-pierderi">
                    <StatCard
                        title="Audit Pierderi"
                        value={`${stats.pierderiLuna} Luna aceasta`}
                        icon={History}
                        color="bg-indigo-600"
                        trend={{ isPositive: true, value: "Monitorizat", label: "trasabilitate activă" }}
                        loading={stats.loading}
                    />
                </Link>

                <StatCard
                    title="Vânzări Astăzi"
                    value={`${stats.vanzariAstazi.toFixed(2)} Lei`}
                    icon={TrendingUp}
                    color="bg-green-500"
                    trend={{ isPositive: true, value: "Incasări" }}
                    loading={stats.loading}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-3xl p-8 border shadow-sm flex flex-col items-center justify-center text-center">
                    <BrainCircuit size={48} className="text-indigo-600 mb-4 animate-pulse" />
                    <h3 className="text-xl font-bold text-gray-800">Sistem de Trasabilitate</h3>
                    <p className="text-gray-400 mt-2 max-w-xs font-medium italic">Fiecare declasare de stoc este acum atribuită nominal angajatului responsabil.</p>
                </div>
                <div className="bg-[#0f172a] rounded-3xl p-8 shadow-xl text-white relative overflow-hidden flex flex-col justify-center">
                    <AlertTriangle size={120} className="absolute -right-10 -bottom-10 opacity-10" />
                    <h3 className="text-2xl font-black mb-4">Protocol de Casare</h3>
                    <p className="text-slate-400 mb-6 font-medium">Administratorul poate audita cine a identificat produsele cu defect sau expirate.</p>
                    <Link to="/pierderi" className="bg-white text-slate-900 px-6 py-3 rounded-xl font-black text-center w-fit hover:bg-slate-200 transition-all">Lansează Raport Pierderi</Link>
                </div>
            </div>
        </div>
    )
};

// ==========================================
// APP PRINCIPAL
// ==========================================
function App() {
    const [userRole, setUserRole] = useState<'admin' | 'casier' | 'agent' | 'gestionar' | 'furnizor' | null>(null);
    const [agentId, setAgentId] = useState<string | number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedRole = localStorage.getItem('magazin_role') as any;
        const savedId = localStorage.getItem('magazin_agent_id');
        if (savedRole) setUserRole(savedRole);
        if (savedId) setAgentId(savedId);
        setLoading(false);
    }, []);

    const handleLogin = (role: any, id?: any) => {
        setUserRole(role);
        localStorage.setItem('magazin_role', role);
        if (id) {
            setAgentId(id);
            localStorage.setItem('magazin_agent_id', id.toString());
        }
    };

    const handleLogout = () => {
        if (confirm("Deconectare MagazinPro?")) {
            setUserRole(null); setAgentId(null);
            localStorage.clear();
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center font-black text-slate-400">MagazinPro 0.1.2...</div>;

    return (
        <Router>
            <Routes>
                <Route path="/login" element={!userRole ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />
                <Route path="/partener" element={<InregistrareAgent />} />

                {!userRole ? <Route path="*" element={<Navigate to="/login" />} /> : userRole === 'casier' ? (
                    <>
                        <Route path="/pos" element={<div className="h-screen flex flex-col bg-gray-900"><div className="bg-gray-800 text-white px-6 py-2 flex justify-between items-center text-[10px] font-black border-b border-gray-700"><span>MOD CASIER ACTIV</span><button onClick={handleLogout} className="text-red-400 uppercase tracking-widest">Iesire</button></div><div className="flex-1 bg-gray-100 overflow-hidden"><Vanzare /></div></div>} />
                        <Route path="*" element={<Navigate to="/pos" replace />} />
                    </>
                ) : (userRole === 'furnizor' || userRole === 'gestionar') ? (
                    /* --- ADĂUGAT: RUTA DE MENTENANȚĂ PENTRU GESTIONAR & FURNIZOR --- */
                    <Route path="/*" element={
                        <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white font-sans p-6 text-center">
                            <div className="w-20 h-20 bg-orange-600/20 rounded-3xl flex items-center justify-center mb-8 animate-pulse">
                                <Briefcase size={40} className="text-orange-400" />
                            </div>
                            <h1 className="text-4xl font-black mb-4 uppercase">
                                {userRole === 'gestionar' ? 'Acces Gestionar' : 'Portal Furnizori'}
                            </h1>
                            <p className="text-slate-400 max-w-md font-medium leading-relaxed">
                                {userRole === 'gestionar'
                                    ? 'Varianta Web pentru gestionar este momentan în lucru. Vă rugăm să utilizați terminalul mobil pentru operațiuni de depozit.'
                                    : 'Modulul pentru furnizori externi este în curs de dezvoltare pentru varianta desktop.'}
                            </p>
                            <button onClick={handleLogout} className="mt-10 px-10 py-4 bg-white text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-orange-500 hover:text-white transition-all shadow-xl">
                                Închide Sesiunea
                            </button>
                            <div className="absolute bottom-8 text-slate-700 text-[10px] font-black uppercase tracking-widest">
                                MagazinPro Security Framework v0.1.2
                            </div>
                        </div>
                    } />
                ) : userRole === 'agent' ? (
                    <Route path="/*" element={agentId ? <AgentDashboard agentId={Number(agentId)} onLogout={handleLogout} /> : <Navigate to="/login" />} />
                ) : (
                    <Route path="/*" element={
                        <MainLayout onLogout={handleLogout} userRole={userRole}>
                            <Routes>
                                <Route path="/" element={<Dashboard userRole={userRole} />} />
                                <Route path="/produse" element={<Produse userRole={userRole} />} />
                                <Route path="/expirari" element={<Expirari />} />
                                <Route path="/pierderi" element={<Pierderi />} />
                                <Route path="/istoric-pierderi" element={<IstoricPierderi />} />

                                {userRole === 'admin' && (
                                    <>
                                        <Route path="/ai-consultant" element={<AiConsultant />} />
                                        <Route path="/gestiune-produse-furnizor" element={<GestiuneProduseFurnizor />} />
                                        <Route path="/furnizori" element={<Furnizori />} />
                                        <Route path="/vanzare" element={<Vanzare />} />
                                        <Route path="/fast-add" element={<FastAdd />} />
                                        <Route path="/lista-cumparaturi" element={<ListaCumparaturi />} />
                                        <Route path="/comanda-furnizor" element={<ComandaFurnizor />} />
                                        <Route path="/comenzi" element={<Comenzi />} />
                                        <Route path="/gestiune-agenti" element={<GestiuneAgenti />} />
                                        <Route path="/istoric-vanzari" element={<IstoricVanzari />} />
                                        <Route path="/comanda-primita/:id" element={<DetaliiComandaAgent />} />
                                    </>
                                )}

                                <Route path="/receptie" element={<Receptie />} />
                                <Route path="/receptie-comanda" element={<ReceptieComanda />} />
                                <Route path="/transfer" element={<TransferMarfa />} />
                                <Route path="/comanda/:id" element={<DetaliiComanda />} />
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </MainLayout>
                    } />
                )}
            </Routes>
        </Router>
    );
}

export default function AppWrapper() {
    return (
        <>
            <Toaster position="top-right" />
            <App />
        </>
    )
}