import React, { useState, useRef } from 'react'
import { supabase } from './supabaseClient'
import { Link } from 'react-router-dom'
import { ScanBarcode, ArrowLeft, Package, CheckCircle, AlertTriangle, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

// --- 1. STANDARDIZARE GRAMAJ ---
const formateazaGramaj = (text: string) => {
    if (!text) return '';
    let t = text.toLowerCase().trim();
    t = t.replace('litri', 'L').replace('litru', 'L').replace('l', 'L');
    t = t.replace('mililitri', 'ml').replace('ml', 'ml');
    t = t.replace('kilograme', 'kg').replace('kilogram', 'kg').replace('kg', 'kg');
    t = t.replace('grame', 'g').replace('gram', 'g').replace('g', 'g');
    t = t.replace(/\s/g, '');

    if (t.endsWith('l') && !t.endsWith('ml')) {
        t = t.replace('l', 'L');
    }
    return t;
}

// --- 2. DETECȚIE CATEGORII ---
const detecteazaCategorie = (nume: string) => {
    const n = nume.toLowerCase();

    if (n.includes('apa') || n.includes('mineral') || n.includes('borsec') || n.includes('dorna')) return { cat: 'Băuturi', sub: 'Apă' };
    if (n.includes('cola') || n.includes('pepsi') || n.includes('fanta') || n.includes('suc') || n.includes('schweppes') || n.includes('prigat')) return { cat: 'Băuturi', sub: 'Răcoritoare' };
    if (n.includes('hell') || n.includes('red bull') || n.includes('monster') || n.includes('energizant')) return { cat: 'Băuturi', sub: 'Energizante' };
    if (n.includes('bere') || n.includes('ciuc') || n.includes('ursus') || n.includes('heineken') || n.includes('timisoreana')) return { cat: 'Băuturi', sub: 'Bere' };
    if (n.includes('vin') || n.includes('cotnari') || n.includes('jidvei')) return { cat: 'Băuturi', sub: 'Vin' };
    if (n.includes('vodka') || n.includes('whisky') || n.includes('cognac') || n.includes('alexandrion')) return { cat: 'Băuturi', sub: 'Spirtoase' };
    if (n.includes('cafea') || n.includes('nes') || n.includes('jacobs')) return { cat: 'Băuturi', sub: 'Cafea' };

    if (n.includes('ciocolata') || n.includes('milka') || n.includes('kinder') || n.includes('snickers')) return { cat: 'Dulciuri', sub: 'Ciocolată' };
    if (n.includes('biscuit') || n.includes('napolitana') || n.includes('croissant') || n.includes('7days')) return { cat: 'Dulciuri', sub: 'Patiserie' };
    if (n.includes('chips') || n.includes('lays') || n.includes('chio') || n.includes('seminte')) return { cat: 'Dulciuri', sub: 'Snacks' };

    if (n.includes('paine') || n.includes('franzela')) return { cat: 'Panificație', sub: 'Pâine' };
    if (n.includes('iaurt') || n.includes('lapte') || n.includes('branza') || n.includes('smantana') || n.includes('unt')) return { cat: 'Lactate', sub: 'Derivate' };
    if (n.includes('salam') || n.includes('parizer') || n.includes('sunca') || n.includes('carnati')) return { cat: 'Mezeluri', sub: 'Carne' };

    if (n.includes('detergent') || n.includes('sapun') || n.includes('sampon') || n.includes('ariel')) return { cat: 'Non-Alimentare', sub: 'Curățenie' };
    if (n.includes('tigari') || n.includes('tutun') || n.includes('kent') || n.includes('marlboro')) return { cat: 'Tutun', sub: 'Țigări' };

    return { cat: 'General', sub: 'Diverse' };
}

export default function FastAdd() {
    const [barcode, setBarcode] = useState('')
    const [nume, setNume] = useState('')
    const [gramaj, setGramaj] = useState('')

    const [categorie, setCategorie] = useState('General')
    const [subcategorie, setSubcategorie] = useState('Diverse')

    const [status, setStatus] = useState({ msg: '', type: '' })
    const [isNew, setIsNew] = useState(false)
    const [loadingAPI, setLoadingAPI] = useState(false)

    const barcodeRef = useRef<HTMLInputElement>(null)
    const numeRef = useRef<HTMLInputElement>(null)

    // --- 3. CAUTARE API INTELIGENTĂ ---
    const cautaOnline = async (cod: string) => {
        setLoadingAPI(true);
        try {
            const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${cod}.json`);
            const data = await response.json();

            if (data.status === 1) {
                const p = data.product;
                const brand = p.brands ? p.brands.split(',')[0] : '';
                const numeProd = p.product_name_ro || p.product_name || p.product_name_en || '';

                let numeFinal = numeProd;

                // FIX PENTRU NUME DUBLAT
                const brandCurat = brand.toLowerCase().replace(/[^a-z0-9]/g, '');
                const numeCurat = numeProd.toLowerCase().replace(/[^a-z0-9]/g, '');

                if (brand && !numeCurat.includes(brandCurat)) {
                    numeFinal = `${brand} ${numeProd}`;
                }

                const cantitateCurata = formateazaGramaj(p.quantity || '');

                setNume(numeFinal);
                setGramaj(cantitateCurata);

                const { cat, sub } = detecteazaCategorie(numeFinal);
                setCategorie(cat);
                setSubcategorie(sub);

                setStatus({ msg: `🌍 Produs identificat: ${numeFinal}`, type: 'success' });
                return true;
            } else {
                setStatus({ msg: '🔍 Nu l-am găsit online. Introdu manual.', type: 'warning' });
                return false;
            }
        } catch (error) {
            setStatus({ msg: '⚠️ Eroare conexiune internet.', type: 'error' });
            return false;
        } finally {
            setLoadingAPI(false);
        }
    }

    // --- 4. SCANARE ---
    const handleScan = async (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && barcode) {
            setStatus({ msg: 'Caut în baza locală...', type: 'info' });

            // Verificăm dacă există deja
            const { data: existent } = await supabase
                .from('produse')
                .select('*')
                .eq('cod_bare', barcode)
                .single();

            if (existent) {
                setStatus({ msg: `⚠️ ${existent.nume} există deja!`, type: 'error' });
                toast.error("Produsul este deja în stoc!");
                setBarcode('');
                return;
            }

            setIsNew(true);
            setStatus({ msg: '☁️ Caut pe serverele globale...', type: 'info' });
            const gasit = await cautaOnline(barcode);

            setTimeout(() => {
                if (gasit) document.getElementById('btn-save')?.focus();
                else numeRef.current?.focus();
            }, 100);
        }
    }

    const saveProduct = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!nume) {
            toast.error("Scrie un nume pentru produs!");
            return;
        }

        try {
            // FIX: Folosim numele corecte de coloane din DB
            const { error } = await supabase.from('produse').insert([{
                cod_bare: barcode,
                nume: nume,
                unitate_masura: gramaj || 'buc', // Mapăm 'gramaj' la 'unitate_masura' sau similar
                categorie_principala: categorie, // FIX
                categorie_secundara: subcategorie, // FIX
                stoc_depozit: 0,
                stoc_magazin: 0,
                pret_vanzare: 0,
                // ultimul_pret_achizitie: 0 // Opțional
            }]);

            if (error) throw error;

            toast.success(`Produs adăugat: ${nume}`);
            setStatus({ msg: `✅ Adăugat: ${nume}`, type: 'success' });

            // Reset
            setBarcode('');
            setNume('');
            setGramaj('');
            setIsNew(false);
            setStatus({ msg: '', type: '' });
            barcodeRef.current?.focus();

        } catch (err: any) {
            console.error(err);
            toast.error("Eroare la salvare: " + err.message);
            setStatus({ msg: 'Eroare la salvare.', type: 'error' });
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 font-sans">
            <div className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-2xl border border-gray-100">

                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-xl text-blue-600"><ScanBarcode size={32} /></div>
                        Adăugare Rapidă
                    </h1>
                    <Link to="/" className="flex items-center text-gray-400 hover:text-gray-600 font-medium transition-colors">
                        <ArrowLeft size={18} className="mr-1" /> Înapoi
                    </Link>
                </div>

                {/* STATUS BAR */}
                {status.msg && (
                    <div className={`p-4 rounded-xl mb-8 flex items-center gap-3 font-bold text-lg transition-all animate-in fade-in zoom-in duration-300 ${
                        status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' :
                            status.type === 'warning' ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' :
                                status.type === 'error' ? 'bg-red-50 text-red-700 border border-red-100' :
                                    'bg-blue-50 text-blue-700 border border-blue-100'
                    }`}>
                        {status.type === 'success' && <CheckCircle size={24} />}
                        {status.type === 'warning' && <AlertTriangle size={24} />}
                        {status.type === 'info' && <Loader2 size={24} className="animate-spin" />}
                        {status.msg}
                    </div>
                )}

                {/* INPUT SCANARE */}
                <div className="mb-8 relative group">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Scanează Cod Bare</label>
                    <input
                        ref={barcodeRef}
                        type="text"
                        className="w-full text-4xl font-mono font-bold border-2 border-gray-200 rounded-2xl p-5 focus:border-blue-500 outline-none text-center tracking-[0.2em] text-gray-700 placeholder-gray-200 transition-all group-hover:border-gray-300"
                        placeholder="||||||||||||"
                        value={barcode}
                        onChange={e => setBarcode(e.target.value)}
                        onKeyDown={handleScan}
                        autoFocus
                        disabled={isNew}
                    />
                    <div className="absolute right-5 top-[3.2rem] text-gray-300 pointer-events-none group-focus-within:text-blue-400 transition-colors">
                        <ScanBarcode size={32} />
                    </div>
                </div>

                {isNew && (
                    <form onSubmit={saveProduct} className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-300">

                        <div className="relative">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Denumire Produs</label>
                            <div className="relative">
                                <input
                                    ref={numeRef}
                                    type="text"
                                    className={`w-full text-xl font-bold border-2 rounded-2xl p-4 outline-none transition-all ${loadingAPI ? 'bg-gray-50 text-gray-400 border-gray-100' : 'bg-white focus:border-blue-500 border-gray-200 text-gray-800'}`}
                                    value={nume}
                                    onChange={e => {
                                        setNume(e.target.value);
                                        const c = detecteazaCategorie(e.target.value);
                                        setCategorie(c.cat);
                                        setSubcategorie(c.sub);
                                    }}
                                    placeholder="Ex: Coca Cola 2L"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-indigo-50 text-indigo-600 text-xs font-bold px-3 py-1.5 rounded-lg border border-indigo-100 flex items-center gap-1">
                                    <Package size={12} /> {categorie} &gt; {subcategorie}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Cantitate / Gramaj</label>
                                <input
                                    type="text"
                                    className="w-full text-lg font-medium border-2 border-gray-200 rounded-2xl p-4 focus:border-blue-500 outline-none transition-all"
                                    value={gramaj}
                                    onChange={e => setGramaj(e.target.value)}
                                    placeholder="Ex: 500ml"
                                />
                            </div>
                            <div className="flex items-end">
                                <button
                                    id="btn-save"
                                    type="submit"
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl text-lg shadow-lg shadow-blue-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    <Save size={20} /> Salvează
                                </button>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => { setIsNew(false); setBarcode(''); setStatus({msg:'', type:''}); barcodeRef.current?.focus(); }}
                            className="w-full text-gray-400 text-sm hover:text-red-500 font-medium transition-colors py-2"
                        >
                            Anulează și scanează alt cod
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}