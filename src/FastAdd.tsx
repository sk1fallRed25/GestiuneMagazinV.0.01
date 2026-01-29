import React, { useState, useRef } from 'react'
import { supabase } from './supabaseClient'
import { Link } from 'react-router-dom'

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

    const [status, setStatus] = useState('')
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

                // --- FIX PENTRU NUME DUBLAT ---
                // Curățăm ambele șiruri de caractere speciale și spații pentru comparație
                const brandCurat = brand.toLowerCase().replace(/[^a-z0-9]/g, '');
                const numeCurat = numeProd.toLowerCase().replace(/[^a-z0-9]/g, '');

                // Adăugăm brandul DOAR dacă nu este deja conținut în nume (ignorant spații/cratime)
                if (brand && !numeCurat.includes(brandCurat)) {
                    numeFinal = `${brand} ${numeProd}`;
                }

                const cantitateCurata = formateazaGramaj(p.quantity || '');

                setNume(numeFinal);
                setGramaj(cantitateCurata);

                const { cat, sub } = detecteazaCategorie(numeFinal);
                setCategorie(cat);
                setSubcategorie(sub);

                setStatus(`🌍 Produs identificat: ${numeFinal}`);
                return true;
            } else {
                setStatus('🔍 Nu l-am găsit online. Introdu manual.');
                return false;
            }
        } catch (error) {
            setStatus('⚠️ Fără internet.');
            return false;
        } finally {
            setLoadingAPI(false);
        }
    }

    // --- 4. SCANARE ---
    const handleScan = async (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && barcode) {
            setStatus('Caut în baza locală...');
            const { data: existent } = await supabase.from('produse').select('*').eq('cod_bare', barcode).single()

            if (existent) {
                setStatus(`⚠️ ${existent.nume} există deja!`);
                setBarcode('');
                return;
            }

            setIsNew(true);
            setStatus('☁️ Caut pe serverele globale...');
            const gasit = await cautaOnline(barcode);

            setTimeout(() => {
                if (gasit) document.getElementById('btn-save')?.focus();
                else numeRef.current?.focus();
            }, 100);
        }
    }

    const saveProduct = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!nume) return setStatus('❌ Scrie un nume!');

        try {
            const { error } = await supabase.from('produse').insert([{
                cod_bare: barcode,
                nume: nume,
                gramaj: gramaj,
                categorie: categorie,
                subcategorie: subcategorie,
                stoc_curent: 0,
                pret_vanzare: 0,
                pret_achizitie: 0
            }])

            if (error) throw error;

            setStatus(`✅ Adăugat: ${nume}`);
            setBarcode(''); setNume(''); setGramaj(''); setIsNew(false);
            barcodeRef.current?.focus();
        } catch (err: any) {
            setStatus('Eroare: ' + err.message);
        }
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
            {/* Design Curat */}
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-2xl border-t-8 border-blue-500">

                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">☁️ Adăugare Smart</h1>
                    <Link to="/" className="text-gray-400 hover:text-gray-600">Înapoi</Link>
                </div>

                {/* STATUS BAR */}
                <div className={`p-4 rounded-lg mb-6 text-center font-bold text-lg transition-all ${
                    loadingAPI ? 'bg-blue-100 text-blue-800 animate-pulse' :
                        status.includes('✅') ? 'bg-green-100 text-green-700' :
                            status.includes('⚠️') ? 'bg-orange-100 text-orange-700' :
                                'bg-gray-100 text-gray-600'
                }`}>
                    {status || 'Scanează un produs. Căutăm automat datele lui.'}
                </div>

                {/* INPUT SCANARE */}
                <div className="mb-6">
                    <label className="block text-sm font-bold text-gray-500 uppercase mb-1">Scanează Cod Bare</label>
                    <input
                        ref={barcodeRef} type="text"
                        className="w-full text-3xl font-mono border-2 border-gray-300 rounded-lg p-3 focus:border-blue-500 outline-none text-center tracking-widest"
                        placeholder="Scanează aici..."
                        value={barcode} onChange={e => setBarcode(e.target.value)} onKeyDown={handleScan}
                        autoFocus disabled={isNew}
                    />
                </div>

                {isNew && (
                    <form onSubmit={saveProduct} className="space-y-4 animate-fade-in-up">

                        <div className="relative">
                            <label className="block text-sm font-bold text-gray-500 uppercase mb-1">Nume Produs</label>
                            <input
                                ref={numeRef} type="text"
                                className={`w-full text-xl border-2 rounded-lg p-3 outline-none ${loadingAPI ? 'bg-gray-100' : 'bg-white focus:border-blue-500 border-gray-200'}`}
                                value={nume} onChange={e => { setNume(e.target.value); const c = detecteazaCategorie(e.target.value); setCategorie(c.cat); setSubcategorie(c.sub); }}
                            />
                            <div className="absolute right-2 top-9 bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded shadow-sm border border-blue-200">
                                {categorie} &gt; {subcategorie}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-500 uppercase mb-1">Gramaj (Standardizat)</label>
                                <input type="text" className="w-full text-lg border-2 border-gray-200 rounded-lg p-3 focus:border-blue-500 outline-none"
                                       value={gramaj} onChange={e => setGramaj(e.target.value)}
                                />
                            </div>
                            <div className="flex items-end">
                                <button id="btn-save" type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl text-lg shadow-lg transition active:scale-95">
                                    Confirmă (Enter)
                                </button>
                            </div>
                        </div>

                        <button type="button" onClick={() => { setIsNew(false); setBarcode(''); barcodeRef.current?.focus(); }} className="w-full text-gray-400 text-sm hover:text-red-500 mt-2">
                            Anulează
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}