import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { User, Building2, FileText, Phone, Mail, Lock, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';

export default function InregistrareAgent() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        nume_firma: '',
        cui: '',
        adresa: '',
        termen_plata: 30,
        nume_agent: '',
        telefon_agent: '',
        email: '',
        parola: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.email || !formData.parola || !formData.nume_firma) {
            toast.error("Te rog completează toate câmpurile obligatorii.");
            return;
        }

        setLoading(true);

        try {
            // 1. Verificăm dacă emailul există deja în tabela de agenți activi
            const { data: existent, error: checkError } = await supabase
                .from('agenti')
                .select('id')
                .eq('email', formData.email)
                .maybeSingle(); // Folosim maybeSingle pentru a nu arunca eroare dacă nu există

            if (checkError) throw checkError;
            if (existent) throw new Error("Acest email este deja asociat unui cont activ!");

            // 2. Trimitem cererea în tabela de așteptare
            // Notă: Asigură-te că există tabela 'cereri_furnizori' în Supabase
            const { error } = await supabase.from('cereri_furnizori').insert([{
                ...formData,
                status: 'pending',
                created_at: new Date().toISOString()
            }]);

            if (error) throw error;

            setSuccess(true);
            toast.success("Cererea a fost trimisă cu succes!");

        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "A apărut o eroare la înregistrare.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans animate-in fade-in duration-500">
                <div className="bg-white p-10 rounded-2xl shadow-xl max-w-md text-center border border-gray-100">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <CheckCircle size={40} />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">Cerere Trimisă!</h2>
                    <p className="text-gray-500 mb-8 leading-relaxed">
                        Datele tale au fost înregistrate. Un administrator va verifica informațiile firmei și îți va activa contul în curând.
                    </p>
                    <Link
                        to="/"
                        className="inline-flex items-center justify-center gap-2 w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-black transition-all shadow-lg active:scale-95"
                    >
                        Înapoi la Autentificare <ArrowRight size={18} />
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 flex items-center justify-center p-4 font-sans">
            <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in slide-in-from-bottom-8 duration-500">

                {/* Partea Stângă (Branding) */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-10 md:w-2/5 flex flex-col justify-between text-white relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>

                    <div className="z-10">
                        <h3 className="text-3xl font-bold mb-2">Portal Parteneri</h3>
                        <div className="h-1 w-20 bg-blue-400 rounded-full mb-6"></div>
                        <p className="text-blue-100 leading-relaxed">
                            Alătură-te rețelei noastre de furnizori. Gestionează comenzile și stocurile într-un singur loc, simplu și eficient.
                        </p>
                    </div>

                    <div className="z-10 mt-10">
                        <p className="text-sm text-blue-200 font-medium">Ai deja cont?</p>
                        <Link to="/" className="inline-block mt-2 text-white font-bold hover:text-blue-200 transition flex items-center gap-2">
                            Autentifică-te aici <ArrowRight size={16} />
                        </Link>
                    </div>
                </div>

                {/* Partea Dreaptă (Formular) */}
                <div className="p-8 md:p-10 md:w-3/5 bg-white">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Building2 className="text-indigo-600" /> Înregistrare Furnizor
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Secțiunea 1: Date Firmă */}
                        <div className="space-y-4">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Informații Companie</p>

                            <div className="relative group">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                <input
                                    type="text"
                                    placeholder="Denumire Firmă (SRL/SA)"
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                    value={formData.nume_firma}
                                    onChange={e => setFormData({...formData, nume_firma: e.target.value})}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative group">
                                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500" size={18} />
                                    <input
                                        type="text"
                                        placeholder="CUI / CIF"
                                        required
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                        value={formData.cui}
                                        onChange={e => setFormData({...formData, cui: e.target.value})}
                                    />
                                </div>
                                <div className="relative group">
                                    <input
                                        type="number"
                                        placeholder="Termen (zile)"
                                        required
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-center"
                                        value={formData.termen_plata}
                                        onChange={e => setFormData({...formData, termen_plata: parseInt(e.target.value) || 0})}
                                    />
                                </div>
                            </div>

                            <input
                                type="text"
                                placeholder="Adresă Sediu Social"
                                required
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                value={formData.adresa}
                                onChange={e => setFormData({...formData, adresa: e.target.value})}
                            />
                        </div>

                        <hr className="border-gray-100" />

                        {/* Secțiunea 2: Date Agent */}
                        <div className="space-y-4">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Date Reprezentant (Login)</p>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative group">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Nume Prenume"
                                        required
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                        value={formData.nume_agent}
                                        onChange={e => setFormData({...formData, nume_agent: e.target.value})}
                                    />
                                </div>
                                <div className="relative group">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Telefon"
                                        required
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                        value={formData.telefon_agent}
                                        onChange={e => setFormData({...formData, telefon_agent: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="relative group">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500" size={18} />
                                <input
                                    type="email"
                                    placeholder="Adresă de Email (pentru autentificare)"
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                    value={formData.email}
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                />
                            </div>

                            <div className="relative group">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500" size={18} />
                                <input
                                    type="password"
                                    placeholder="Parolă Sigură"
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                    value={formData.parola}
                                    onChange={e => setFormData({...formData, parola: e.target.value})}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                                loading
                                    ? 'bg-indigo-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 hover:shadow-indigo-500/30'
                            }`}
                        >
                            {loading ? <Loader2 className="animate-spin" /> : 'Trimite Cererea de Înregistrare'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}