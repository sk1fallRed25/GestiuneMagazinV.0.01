import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { 
  User, Lock, LogIn, Loader2, AlertCircle, Building2 
} from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import { useAuth } from './features/auth/useAuth';

// Tipuri de roluri pentru compatibilitate legacy
type UserRole = 'admin' | 'casier' | 'gestionar';

interface LoginProps {
    // onLogin a fost eliminat pentru a centraliza totul în AuthContext
}

export default function Login({}: LoginProps) {
    const navigate = useNavigate();
    const { login, user, role: authRole, loading: authLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Citim variabila de mediu pentru fallback legacy
    const allowLegacy = import.meta.env.VITE_ALLOW_LEGACY_LOGIN === 'true';

    useEffect(() => {
        // Redirecționare dacă suntem deja logați (Auth real sau Legacy)
        const legacyRole = allowLegacy ? localStorage.getItem('magazin_role') : null;
        if (user || legacyRole) {
            navigate('/');
        }
    }, [user, allowLegacy, navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const userLower = email.toLowerCase().trim();
        const passTrim = password.trim();

        try {
            // 1. Încercăm login prin noul AuthContext (Supabase Auth)
            console.log("Încercare Login (Supabase Auth)...");
            const { error: authError } = await login(userLower, passTrim);

            if (!authError) {
                toast.success("Autentificare reușită (Supabase Auth)");
                navigate('/');
                return;
            }

            // 2. Dacă a eșuat și legacy este permis, încercăm logică veche
            if (allowLegacy) {
                console.log("Încercare Login Legacy (Fallback)...");
                
                // Cazul A: Conturi Hardcodate
                if (userLower === 'admin' && passTrim === 'admin') {
                    localStorage.setItem('magazin_role', 'admin');
                    toast.success("Autentificare Admin (Legacy)");
                    navigate('/');
                    return;
                }
                if (userLower === 'casier' && passTrim === '1234') {
                    localStorage.setItem('magazin_role', 'casier');
                    toast.success("Autentificare Casier (Legacy)");
                    navigate('/');
                    return;
                }
                if (userLower === 'gestionar' && passTrim === 'gestionar') {
                    localStorage.setItem('magazin_role', 'gestionar');
                    toast.success("Autentificare Gestionar (Legacy)");
                    navigate('/');
                    return;
                }

                // Cazul B: Verificare în tabela 'utilizatori' (Legacy - Parole în clar)
                const { data: dbUser } = await supabase
                    .from('utilizatori')
                    .select('*')
                    .eq('email', userLower)
                    .eq('parola', passTrim)
                    .maybeSingle();

                if (dbUser) {
                    localStorage.setItem('magazin_role', dbUser.rol);
                    localStorage.setItem('magazin_agent_id', dbUser.id);
                    toast.success(`Autentificare ${dbUser.rol} (Legacy DB)`);
                    navigate('/');
                    return;
                }

                throw new Error("Credențiale incorecte (Legacy).");
            } else {
                // Dacă legacy nu este permis, afișăm mesaj clar
                console.warn("Login legacy blocat (VITE_ALLOW_LEGACY_LOGIN=false)");
                throw new Error("Login legacy este dezactivat. Folosește cont Supabase Auth.");
            }

        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0f172a] relative overflow-hidden font-sans">
            <Toaster position="top-right" />
            
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
                    <p className="text-gray-500 font-medium mt-1 text-sm uppercase tracking-widest">Sistem de Gestiune v0.2.0</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                        <AlertCircle size={20} className="shrink-0 mt-0.5" />
                        <span className="font-medium">{error}</span>
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider ml-1">Email / Identificator</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all sm:text-sm font-bold text-gray-700"
                                placeholder="Introduceți email sau user"
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

            </div>

            <div className="absolute bottom-4 text-slate-600 text-[10px] opacity-40 font-mono font-bold uppercase tracking-widest">
                MagazinPro v0.2.0 • Hybrid Auth System
            </div>
        </div>
    );
}