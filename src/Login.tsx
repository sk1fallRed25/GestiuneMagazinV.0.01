import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { User, Lock, LogIn, Loader2, AlertCircle, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';

// Definim tipurile acceptate, adăugând 'furnizor' conform structurii DB
type UserRole = 'admin' | 'casier' | 'agent' | 'gestionar' | 'furnizor';

interface LoginProps {
    // Schimbăm tipul id-ului în any pentru a accepta UUID-ul din baza de date
    onLogin: (role: UserRole, id?: any) => void;
}

export default function Login({ onLogin }: LoginProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const userLower = email.toLowerCase().trim();
        const passTrim = password.trim();

        try {
            // --- 1. VERIFICARE CONTURI DIN TABELA 'utilizatori' ---
            // Această secțiune identifică Adminul, Casierul, Gestionarul și Furnizorul
            const { data: dbUser, error: errDbUser } = await supabase
                .from('utilizatori')
                .select('*')
                .eq('email', userLower)
                .eq('parola', passTrim)
                .maybeSingle();

            if (!errDbUser && dbUser) {
                // Transmitem UUID-ul (dbUser.id) pentru a fi salvat în localStorage drept 'magazin_agent_id'
                // Acest ID este critic pentru tabela 'pierderi' (user_id)
                onLogin(dbUser.rol as UserRole, dbUser.id);
                return;
            }

            // --- 2. FALLBACK: CONTURI INTERNE (Hardcodate) ---
            if (userLower === 'admin' && passTrim === 'admin') {
                onLogin('admin');
                return;
            }
            if (userLower === 'casier' && passTrim === '1234') {
                onLogin('casier');
                return;
            }
            if (userLower === 'gestionar' && passTrim === 'gestionar') {
                onLogin('gestionar');
                return;
            }

            // --- 3. VERIFICARE AGENȚI EXTERNI (Tabela 'agenti') ---
            const { data: agent, error: dbError } = await supabase
                .from('agenti')
                .select('*')
                .eq('email', userLower)
                .eq('parola', passTrim)
                .maybeSingle();

            if (dbError) throw dbError;

            if (agent) {
                onLogin('agent', agent.id);
                return;
            }

            // --- 4. VERIFICARE CERERI ÎN AȘTEPTARE ---
            const { data: cerere } = await supabase
                .from('cereri_furnizori')
                .select('status')
                .eq('email', userLower)
                .eq('parola', passTrim)
                .maybeSingle();

            if (cerere) {
                if (cerere.status === 'pending') {
                    setError("⏳ Contul tău este în curs de verificare de către administrator.");
                } else if (cerere.status === 'rejected') {
                    setError("⛔ Cererea de înregistrare a fost respinsă.");
                } else {
                    setError("⚠️ Cont inactiv. Contactează administratorul.");
                }
            } else {
                setError("Utilizator sau parolă incorectă.");
            }

        } catch (err: any) {
            console.error("Login Error:", err);
            setError("Eroare de conexiune la server.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0f172a] relative overflow-hidden font-sans">
            {/* Design fundal decorativ */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-indigo-500/20 rounded-full blur-[100px]"></div>
                <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px]"></div>
            </div>

            <div className="bg-white/95 backdrop-blur-sm p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-md z-10 relative border border-white/20">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4 shadow-lg shadow-indigo-500/30 transform rotate-3">
                        M
                    </div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Magazin<span className="text-indigo-600">Pro</span></h1>
                    <p className="text-gray-500 font-medium mt-1 text-sm uppercase tracking-widest">Sistem de Gestiune v0.1.2</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                        <AlertCircle size={20} className="shrink-0 mt-0.5" />
                        <span className="font-medium">{error}</span>
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider ml-1">Identificator / Email</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all sm:text-sm font-bold text-gray-700"
                                placeholder="Email sau nume utilizator"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider ml-1">Parolă de acces</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                            </div>
                            <input
                                type="password"
                                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all sm:text-sm font-bold text-gray-700"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-xl shadow-lg text-sm font-black text-white transition-all transform active:scale-[0.98] ${
                            loading
                                ? 'bg-indigo-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:shadow-indigo-500/40'
                        }`}
                    >
                        {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <><LogIn className="h-5 w-5" /> Securizează Sesiunea</>}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                    <Link to="/partener" className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-indigo-600 font-black uppercase tracking-tighter transition-colors group">
                        <Building2 size={14} className="group-hover:scale-110 transition-transform" />
                        Înregistrare parteneri externi
                    </Link>
                </div>
            </div>

            <div className="absolute bottom-4 text-slate-600 text-[10px] opacity-40 font-mono font-bold uppercase tracking-widest">
                MagazinPro v0.1.2 • Distributed System
            </div>
        </div>
    );
}