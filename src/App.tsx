import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast';
import {
    LayoutDashboard, Package, Truck, ShoppingCart, Settings, PackagePlus, ArrowRightLeft, ListTodo, Send, Inbox
} from 'lucide-react';

// --- IMPORTURI PAGINI ---
import Furnizori from './Furnizori'
import Produse from './Produse'
import Receptie from './Receptie'
import Vanzare from './Vanzare'
import Login from './Login'
import InregistrareAgent from './InregistrareAgent'
// FIX: Calea trebuie să fie relativă, nu absolută din sistemul tău
import AgentDashboard from './AgentDashboard'
import FastAdd from './FastAdd'
import TransferMarfa from './TransferMarfa'
import ListaCumparaturi from './ListaCumparaturi'
import DetaliiComanda from './DetaliiComanda';
import ComandaFurnizor from './ComandaFurnizor';
import ReceptieComanda from './ReceptieComanda';
import DetaliiComandaAgent from './DetaliiComandaAgent';

// --- WIDGETS PLACEHOLDER (Le poți muta în fișiere separate mai târziu) ---
const WidgetComenziAgenti = () => (
    <div className="bg-white p-4 rounded shadow">
        <h3 className="font-bold text-gray-700">Comenzi Agenți</h3>
        <p className="text-sm text-gray-500">Nu sunt comenzi noi.</p>
    </div>
);
const WidgetAlerteStoc = () => (
    <div className="bg-white p-4 rounded shadow border-l-4 border-red-500">
        <h3 className="font-bold text-red-700">Alerte Stoc</h3>
        <p className="text-sm text-gray-500">Toate stocurile sunt în parametri.</p>
    </div>
);
const WidgetCereri = () => (
    <div className="bg-white p-4 rounded shadow border-l-4 border-blue-500">
        <h3 className="font-bold text-blue-700">Cereri Furnizori</h3>
        <p className="text-sm text-gray-500">Nu sunt cereri în așteptare.</p>
    </div>
);

// --- COMPONENTE LAYOUT ---

const MainLayout = ({ children, onLogout, userRole }: { children: React.ReactNode, onLogout: () => void, userRole: string }) => {
    const location = useLocation();

    const NavLink = ({ to, label, icon }: any) => {
        const isActive = location.pathname === to;
        return (
            <Link to={to} className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm ${isActive ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                {icon}
                <span className="font-medium">{label}</span>
            </Link>
        )
    }

    return (
        <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
            <aside className="w-64 bg-gray-900 text-white flex flex-col shadow-2xl z-20 shrink-0">
                <div className="p-6 border-b border-gray-800 flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl">M</div>
                    <div><h2 className="text-lg font-bold">Magazin</h2><span className="text-xs text-blue-400">{userRole.charAt(0).toUpperCase() + userRole.slice(1)}</span></div>
                </div>
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    <NavLink to="/" label="Dashboard" icon={<LayoutDashboard size={18} />} />

                    {/* MENIU GESTIONAR & ADMIN */}
                    {(userRole === 'gestionar' || userRole === 'admin') && <>
                        <div className="text-xs font-bold text-gray-500 uppercase px-4 py-2 mt-4">Operațiuni</div>
                        <NavLink to="/receptie" label="Recepție Manuală" icon={<PackagePlus size={18} />} />
                        <NavLink to="/receptie-comanda" label="Recepție Comandă" icon={<Inbox size={18} />} />
                        <NavLink to="/transfer" label="Transfer Marfă" icon={<ArrowRightLeft size={18} />} />
                        <NavLink to="/produse" label="Stocuri & Produse" icon={<Package size={18} />} />
                    </>}

                    {/* MENIU STRICT ADMIN */}
                    {userRole === 'admin' && <>
                        <div className="text-xs font-bold text-gray-500 uppercase px-4 py-2 mt-4">Administrare</div>
                        <NavLink to="/comanda-furnizor" label="Comandă Furnizor" icon={<Send size={18} />} />
                        <NavLink to="/furnizori" label="Furnizori" icon={<Truck size={18} />} />
                        <NavLink to="/lista-cumparaturi" label="Listă Cumpărături" icon={<ListTodo size={18} />} />

                        <div className="text-xs font-bold text-gray-500 uppercase px-4 py-2 mt-4">Vânzare</div>
                        <NavLink to="/vanzare" label="Deschide POS" icon={<ShoppingCart size={18} />} />

                        <div className="text-xs font-bold text-gray-500 uppercase px-4 py-2 mt-4">Configurare</div>
                        <NavLink to="/fast-add" label="Adăugare Rapidă" icon={<Settings size={18} />} />
                    </>}
                </nav>
                <div className="p-4 border-t border-gray-800">
                    <button onClick={onLogout} className="w-full bg-red-900/20 text-red-400 py-2 rounded border border-red-900/50 hover:bg-red-900 hover:text-white transition text-sm">
                        Deconectare
                    </button>
                </div>
            </aside>
            <main className="flex-1 overflow-y-auto bg-gray-100 p-0 relative">
                {children}
            </main>
        </div>
    )
};

const Dashboard = ({ userRole }: { userRole: string }) => {
    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Panou de Control - {userRole.toUpperCase()}</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <WidgetAlerteStoc />
                <WidgetComenziAgenti />
                {userRole === 'admin' && <WidgetCereri />}
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
        if (id) {
            setAgentId(id);
            localStorage.setItem('magazin_agent_id', id.toString());
        }
    };

    const handleLogout = () => {
        if (confirm("Sigur dorești să te deconectezi?")) {
            setUserRole(null);
            setAgentId(null);
            localStorage.removeItem('magazin_role');
            localStorage.removeItem('magazin_agent_id');
        }
    };

    if (loading) {
        return <div className="flex h-screen items-center justify-center bg-gray-100 text-gray-600">Se încarcă aplicația...</div>;
    }

    return (
        <Router>
            <Routes>
                {/* Rute Publice */}
                <Route path="/login" element={!userRole ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />
                <Route path="/partener" element={<InregistrareAgent />} />

                {/* Rute Protejate */}
                {!userRole ? (
                    <Route path="*" element={<Navigate to="/login" />} />
                ) : userRole === 'casier' ? (
                    // Layout CASIER (POS)
                    <>
                        <Route path="/vanzare" element={
                            <div className="h-screen flex flex-col bg-gray-900">
                                <div className="bg-gray-900 text-white px-4 py-2 flex justify-between items-center text-xs border-b border-gray-800">
                                    <span>Mod Casier: <strong>Activ</strong></span>
                                    <button onClick={handleLogout} className="text-red-400 hover:text-white">Ieșire Tură</button>
                                </div>
                                <div className="flex-1 overflow-hidden bg-gray-100"><Vanzare /></div>
                            </div>
                        } />
                        <Route path="*" element={<Navigate to="/vanzare" replace />} />
                    </>
                ) : userRole === 'agent' ? (
                    // Layout AGENT
                    <Route path="/*" element={agentId ? <AgentDashboard agentId={agentId} onLogout={handleLogout} /> : <div>Eroare ID Agent</div>} />
                ) : (
                    // Layout ADMIN & GESTIONAR
                    <Route path="/*" element={
                        <MainLayout onLogout={handleLogout} userRole={userRole}>
                            <Routes>
                                <Route path="/" element={<Dashboard userRole={userRole} />} />

                                {/* Rute Comune Admin/Gestionar */}
                                <Route path="/produse" element={<Produse userRole={userRole} />} />
                                <Route path="/receptie" element={<Receptie />} />
                                <Route path="/receptie-comanda" element={<ReceptieComanda />} />
                                <Route path="/transfer" element={<TransferMarfa />} />
                                <Route path="/comanda/:id" element={<DetaliiComanda />} />

                                {/* Rute Doar Admin */}
                                {userRole === 'admin' && (
                                    <>
                                        <Route path="/furnizori" element={<Furnizori />} />
                                        <Route path="/vanzare" element={<Vanzare />} />
                                        <Route path="/fast-add" element={<FastAdd />} />
                                        <Route path="/lista-cumparaturi" element={<ListaCumparaturi />} />
                                        <Route path="/comanda-furnizor" element={<ComandaFurnizor />} />
                                        <Route path="/comanda-primita/:id" element={<DetaliiComandaAgent />} />
                                    </>
                                )}

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
            <Toaster position="bottom-right" reverseOrder={false} />
            <App />
        </>
    )
}

export default AppWrapper;