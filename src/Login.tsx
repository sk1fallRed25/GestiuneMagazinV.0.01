import React, { useState } from 'react';
import { supabase } from './supabaseClient';

// Am adăugat 'gestionar' la tipul rolului
export default function Login({ onLogin }: { onLogin: (role: 'admin' | 'casier' | 'agent' | 'gestionar', id?: number) => void }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // 1. ADMIN
        if (username.toLowerCase() === 'admin' && password === 'admin') {
            onLogin('admin');
            return;
        }

        // 2. CASIER
        if (username.toLowerCase() === 'casier' && password === '1234') {
            onLogin('casier');
            return;
        }

        // 3. GESTIONAR (NOU)
        if (username.toLowerCase() === 'gestionar' && password === 'gestionar') {
            onLogin('gestionar');
            return;
        }

        try {
            // 4. AGENT (Căutare în DB)
            const { data: agent } = await supabase
                .from('agenti')
                .select('*')
                .eq('email', username)
                .eq('parola', password)
                .single();

            if (agent) {
                onLogin('agent', agent.id);
                return;
            }

            // 5. Verificare Status Cerere (Dacă nu e cont activ)
            const { data: cerere } = await supabase.from('cereri_furnizori').select('status').eq('email', username).eq('parola', password).single();

            if (cerere) {
                if (cerere.status === 'pending') setError("⏳ Contul tău așteaptă aprobarea administratorului.");
                else if (cerere.status === 'rejected') setError("⛔ Acces Refuzat de administrator.");
                else setError("Eroare status.");
            } else {
                setError("Utilizator sau parolă incorectă!");
            }

        } catch (err: any) {
            setError("Eroare de conexiune.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
                <div className="transform -rotate-12 opacity-[0.03] text-white font-black text-[120px] whitespace-nowrap">IONITA STEFAN</div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md z-10 relative border-t-4 border-blue-600">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">M</div>
                    <h1 className="text-2xl font-bold text-gray-800">Autentificare</h1>
                    <p className="text-gray-500 font-bold mt-1 text-sm tracking-widest">By SyS</p>
                </div>

                {error && <div className="p-3 bg-red-50 text-red-600 rounded border border-red-100 text-sm font-bold text-center mb-4">{error}</div>}

                <form onSubmit={handleLogin} className="space-y-4">
                    <input type="text" className="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="Utilizator / Email" value={username} onChange={e => setUsername(e.target.value)} autoFocus />
                    <input type="password" className="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="Parolă" value={password} onChange={e => setPassword(e.target.value)} />
                    <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition">
                        {loading ? '...' : 'Conectare'}
                    </button>
                </form>

                <div className="mt-6 pt-4 border-t border-gray-100 text-center text-sm">
                    <a href="/partener" className="text-blue-600 hover:underline font-medium">Partener nou? Creează cont</a>
                </div>
            </div>
        </div>
    );
}