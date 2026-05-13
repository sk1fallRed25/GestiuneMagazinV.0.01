import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ScanBarcode, ArrowLeft, Package, CheckCircle, AlertTriangle, Save, Loader2, DollarSign, Percent, Calendar } from 'lucide-react';
import { useFastAdd } from './hooks/useFastAdd';
import { detecteazaCategorie, formateazaGramaj } from './utils'; // Vom implementa un fișier de utilitare sau le lăsăm aici

export default function FastAddPage() {
    const { form, submitting, error, updateField, submit, resetForm } = useFastAdd();
    const barcodeRef = useRef<HTMLInputElement>(null);
    const nameRef = useRef<HTMLInputElement>(null);
    const [status, setStatus] = useState({ msg: '', type: '' });
    const [loadingAPI, setLoadingAPI] = useState(false);

    // Cautare online
    const cautaOnline = async (cod: string) => {
        setLoadingAPI(true);
        setStatus({ msg: '☁️ Caut pe serverele globale...', type: 'info' });
        try {
            const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${cod}.json`);
            const data = await response.json();

            if (data.status === 1) {
                const p = data.product;
                const brand = p.brands ? p.brands.split(',')[0] : '';
                const numeProd = p.product_name_ro || p.product_name || p.product_name_en || '';

                let numeFinal = numeProd;
                const brandCurat = brand.toLowerCase().replace(/[^a-z0-9]/g, '');
                const numeCurat = numeProd.toLowerCase().replace(/[^a-z0-9]/g, '');

                if (brand && !numeCurat.includes(brandCurat)) {
                    numeFinal = `${brand} ${numeProd}`;
                }

                updateField('name', numeFinal);
                updateField('unit', formateazaGramaj(p.quantity || 'buc'));

                setStatus({ msg: `🌍 Produs identificat: ${numeFinal}`, type: 'success' });
                return true;
            } else {
                setStatus({ msg: '🔍 Nu l-am găsit online. Introdu manual.', type: 'warning' });
                return false;
            }
        } catch (err) {
            setStatus({ msg: '⚠️ Eroare conexiune internet.', type: 'error' });
            return false;
        } finally {
            setLoadingAPI(false);
        }
    };

    const handleScan = async (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && form.barcode) {
            const gasit = await cautaOnline(form.barcode);
            setTimeout(() => {
                if (gasit) document.getElementById('priceSale')?.focus();
                else nameRef.current?.focus();
            }, 100);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await submit();
        if (success) {
            setStatus({ msg: `✅ Adăugat/Actualizat cu succes!`, type: 'success' });
            barcodeRef.current?.focus();
            setTimeout(() => setStatus({ msg: '', type: '' }), 3000);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-6 font-sans">
            <div className="w-full max-w-4xl flex justify-between items-center mb-6">
                <h1 className="text-3xl font-black text-gray-800 flex items-center gap-3 tracking-tight">
                    <span className="bg-blue-600 p-2.5 rounded-2xl text-white shadow-lg shadow-blue-200">
                        <ScanBarcode size={28} />
                    </span>
                    Adăugare Rapidă (v2)
                </h1>
                <Link to="/" className="flex items-center text-gray-500 hover:text-gray-900 font-bold transition-colors bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
                    <ArrowLeft size={18} className="mr-2" /> Înapoi la Dashboard
                </Link>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-4xl border border-gray-100 flex flex-col md:flex-row gap-8">
                
                {/* Partea Stangă - Scanare și Nume */}
                <div className="flex-1 space-y-6">
                    <div className="relative group">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">1. Scanează Cod Bare (Apasă Enter)</label>
                        <input
                            ref={barcodeRef}
                            type="text"
                            className="w-full text-3xl font-mono font-black border-2 border-gray-200 rounded-2xl p-4 focus:border-blue-500 outline-none text-center tracking-[0.1em] text-gray-800 placeholder-gray-200 transition-all group-hover:border-gray-300"
                            placeholder="||||||||||||"
                            value={form.barcode}
                            onChange={e => updateField('barcode', e.target.value)}
                            onKeyDown={handleScan}
                            autoFocus
                            disabled={submitting}
                        />
                        <div className="absolute right-4 top-[3.2rem] text-gray-300 pointer-events-none transition-colors">
                            <ScanBarcode size={24} />
                        </div>
                    </div>

                    {(status.msg || error) && (
                        <div className={`p-4 rounded-xl flex items-center gap-3 font-bold text-sm transition-all animate-in fade-in zoom-in ${
                            error ? 'bg-red-50 text-red-700 border border-red-100' :
                            status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' :
                            status.type === 'warning' ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' :
                            'bg-blue-50 text-blue-700 border border-blue-100'
                        }`}>
                            {error ? <AlertTriangle size={20} /> :
                             status.type === 'success' ? <CheckCircle size={20} /> :
                             status.type === 'warning' ? <AlertTriangle size={20} /> :
                             <Loader2 size={20} className="animate-spin" />}
                            {error || status.msg}
                        </div>
                    )}

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">2. Denumire Produs</label>
                        <input
                            ref={nameRef}
                            type="text"
                            className={`w-full text-lg font-bold border-2 rounded-2xl p-4 outline-none transition-all ${loadingAPI ? 'bg-gray-50 text-gray-400 border-gray-100' : 'bg-white focus:border-blue-500 border-gray-200 text-gray-800'}`}
                            value={form.name}
                            onChange={e => updateField('name', e.target.value)}
                            placeholder="Ex: Coca Cola 2L"
                            disabled={submitting}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Unitate Măsură</label>
                            <input
                                type="text"
                                className="w-full text-base font-bold border-2 border-gray-200 rounded-xl p-3 focus:border-blue-500 outline-none transition-all text-gray-700"
                                value={form.unit}
                                onChange={e => updateField('unit', e.target.value)}
                                placeholder="buc, kg, L..."
                                disabled={submitting}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Categorie (Auto)</label>
                            <div className="w-full text-sm font-bold bg-gray-50 border-2 border-gray-100 rounded-xl p-3 text-gray-500 flex items-center gap-2">
                                <Package size={16} /> {detecteazaCategorie(form.name).cat}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Partea Dreaptă - Prețuri și Stoc */}
                <div className="flex-1 bg-gray-50/50 p-6 rounded-2xl border border-gray-100 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Preț Vânzare</label>
                            <div className="relative">
                                <input
                                    id="priceSale"
                                    type="number"
                                    min="0" step="0.01"
                                    className="w-full text-lg font-black border-2 border-gray-200 rounded-xl p-3 focus:border-emerald-500 outline-none transition-all text-gray-800"
                                    value={form.priceSale}
                                    onChange={e => updateField('priceSale', e.target.value)}
                                    placeholder="0.00"
                                    disabled={submitting}
                                />
                                <DollarSign size={16} className="absolute right-3 top-4 text-gray-400" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Preț Achiziție</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="0" step="0.01"
                                    className="w-full text-lg font-bold border-2 border-gray-200 rounded-xl p-3 focus:border-blue-500 outline-none transition-all text-gray-700"
                                    value={form.pricePurchase}
                                    onChange={e => updateField('pricePurchase', e.target.value)}
                                    placeholder="0.00"
                                    disabled={submitting}
                                />
                                <DollarSign size={16} className="absolute right-3 top-4 text-gray-400" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Stoc Inițial (Opțional)</label>
                            <input
                                type="number"
                                min="0" step="0.01"
                                className="w-full text-lg font-bold border-2 border-gray-200 rounded-xl p-3 focus:border-amber-500 outline-none transition-all text-gray-700"
                                value={form.initialStock}
                                onChange={e => updateField('initialStock', e.target.value)}
                                placeholder="0"
                                disabled={submitting}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Zonă Stoc</label>
                            <select
                                className="w-full text-sm font-bold border-2 border-gray-200 rounded-xl p-3 focus:border-blue-500 outline-none transition-all text-gray-700 bg-white"
                                value={form.stockZone}
                                onChange={e => updateField('stockZone', e.target.value as 'magazin' | 'depozit')}
                                disabled={submitting}
                            >
                                <option value="magazin">Magazin (Raft)</option>
                                <option value="depozit">Depozit (Spate)</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Nr. Lot (Opțional)</label>
                            <input
                                type="text"
                                className="w-full text-sm font-bold border-2 border-gray-200 rounded-xl p-3 focus:border-blue-500 outline-none transition-all text-gray-700"
                                value={form.batchNumber || ''}
                                onChange={e => updateField('batchNumber', e.target.value)}
                                placeholder="ex: LOT-001"
                                disabled={submitting}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Dată Expirare</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    className="w-full text-sm font-bold border-2 border-gray-200 rounded-xl p-3 focus:border-red-500 outline-none transition-all text-gray-700 bg-white"
                                    value={form.expiryDate || ''}
                                    onChange={e => updateField('expiryDate', e.target.value)}
                                    disabled={submitting}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={submitting}
                        className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl text-lg shadow-lg shadow-blue-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:active:scale-100"
                    >
                        {submitting ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
                        {submitting ? 'SE SALVEAZĂ...' : 'SALVEAZĂ PRODUS'}
                    </button>
                    
                    <div className="text-center">
                        <button
                            type="button"
                            onClick={() => { resetForm(); barcodeRef.current?.focus(); }}
                            disabled={submitting}
                            className="text-[10px] font-black text-gray-400 hover:text-red-500 uppercase tracking-widest transition-colors"
                        >
                            Resetare Formular
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
