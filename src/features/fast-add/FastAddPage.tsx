import React, { useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    ScanBarcode, ArrowLeft, Package, CheckCircle, AlertTriangle,
    Save, Loader2, DollarSign, Plus, X, FolderOpen, Tag, Barcode, RefreshCw
} from 'lucide-react';
import { useFastAdd } from './hooks/useFastAdd';
import { formateazaGramaj } from './utils';
import { ProductVatGroupSelector } from '../products/components/ProductVatGroupSelector';
import { ProductSgrSelector } from '../products/components/ProductSgrSelector';
import { useCategories } from '../catalog/useCategories';
import { useAuth } from '../auth/useAuth';
import { generateUniqueInternalBarcode } from './services/fastAddService';
import { isInternalBarcode, isValidEan13 } from '../products/utils/barcodeGenerator';

// ─── Mini Modal reutilizabil ────────────────────────────────────────────
interface MiniModalProps {
    title: string;
    placeholder: string;
    subtitle?: string;
    onConfirm: (value: string) => Promise<void>;
    onClose: () => void;
    dataTestid?: string;
}

const MiniModal: React.FC<MiniModalProps> = ({ title, placeholder, subtitle, onConfirm, onClose, dataTestid }) => {
    const [value, setValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState('');

    const handleSubmit = async () => {
        if (value.trim().length < 2) {
            setErr('Minim 2 caractere.');
            return;
        }
        setLoading(true);
        setErr('');
        try {
            await onConfirm(value.trim());
            onClose();
        } catch (e) {
            setErr(e instanceof Error ? e.message : 'Eroare.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in"
            data-testid={dataTestid}
        >
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black text-gray-800 text-lg">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                {subtitle && (
                    <p className="text-xs text-gray-500 mb-3 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
                        {subtitle}
                    </p>
                )}
                <input
                    autoFocus
                    type="text"
                    className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm font-bold focus:border-blue-500 outline-none transition-all"
                    placeholder={placeholder}
                    value={value}
                    onChange={e => { setValue(e.target.value); setErr(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                />
                {err && <p className="text-red-600 text-xs font-bold mt-2">{err}</p>}
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70"
                >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                    {loading ? 'Se creează...' : 'Creează'}
                </button>
            </div>
        </div>
    );
};

// ─── FastAddPage ────────────────────────────────────────────────────────
export default function FastAddPage() {
    const { currentStoreId } = useAuth();
    const { form, submitting, error, updateField, submit, resetForm, vatConfig } = useFastAdd();
    const barcodeRef = useRef<HTMLInputElement>(null);
    const nameRef = useRef<HTMLInputElement>(null);
    const [status, setStatus] = useState({ msg: '', type: '' });
    const [loadingAPI, setLoadingAPI] = useState(false);

    // ── State cod intern ──────────────────────────────────────────────────
    const [generatingBarcode, setGeneratingBarcode] = useState(false);
    const [isInternalCode, setIsInternalCode] = useState(false);
    const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);

    // Categorii
    const {
        rootCategories,
        subcategories,
        selectedCategoryId,
        selectedSubcategoryId,
        loadingCategories,
        loadingSubcategories,
        selectCategory,
        selectSubcategory,
        createRootCategory,
        createSubcategory,
        resetCategorySelection
    } = useCategories({ storeId: currentStoreId });

    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);

    // Sincronizăm categoryId/subcategoryId în form
    const handleCategoryChange = (catId: string) => {
        selectCategory(catId);
        updateField('categoryId', catId);
        updateField('subcategoryId', '');
    };

    const handleSubcategoryChange = (subId: string) => {
        selectSubcategory(subId);
        updateField('subcategoryId', subId);
    };

    // ── Handler generare cod intern ────────────────────────────────────────
    const doGenerateBarcode = useCallback(async () => {
        if (!currentStoreId) {
            setStatus({ msg: 'Selectează mai întâi un magazin.', type: 'warning' });
            return;
        }
        setGeneratingBarcode(true);
        setStatus({ msg: 'Se generează cod intern...', type: 'info' });
        try {
            const code = await generateUniqueInternalBarcode(currentStoreId);
            updateField('barcode', code);
            setIsInternalCode(true);
            setStatus({ msg: 'Cod intern generat. Poți imprima sau nota acest cod pentru scanare.', type: 'success' });
        } catch (e) {
            setStatus({ msg: e instanceof Error ? e.message : 'Eroare la generare cod.', type: 'error' });
        } finally {
            setGeneratingBarcode(false);
            setShowReplaceConfirm(false);
        }
    }, [currentStoreId, updateField]);

    const handleGenerateBarcode = () => {
        if (form.barcode.trim()) {
            // Există deja un cod — cerem confirmare
            setShowReplaceConfirm(true);
        } else {
            doGenerateBarcode();
        }
    };

    // Detectează dacă barcode-ul curent e intern (la tastare manuală, resetăm badge-ul)
    const handleBarcodeChange = (val: string) => {
        updateField('barcode', val);
        setIsInternalCode(isInternalBarcode(val));
        if (showReplaceConfirm) setShowReplaceConfirm(false);
    };

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
            setStatus({ msg: `Adaugat/Actualizat cu succes!`, type: 'success' });
            resetCategorySelection();
            setIsInternalCode(false);
            setShowReplaceConfirm(false);
            barcodeRef.current?.focus();
            setTimeout(() => setStatus({ msg: '', type: '' }), 3000);
        }
    };

    const handleReset = () => {
        resetForm();
        resetCategorySelection();
        setIsInternalCode(false);
        setShowReplaceConfirm(false);
        barcodeRef.current?.focus();
    };

    // Hint text categorie
    const categoryHint = (() => {
        if (!selectedCategoryId) return null;
        const catName = rootCategories.find(c => c.id === selectedCategoryId)?.name;
        if (catName === 'General') return '⚠️ Categoria General este recomandată doar temporar.';
        if (selectedCategoryId && !selectedSubcategoryId && subcategories.length > 0) {
            return 'ℹ️ Produsul va fi salvat doar în categoria principală.';
        }
        return null;
    })();

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-6 font-sans">
            {/* Modals */}
            {showCategoryModal && (
                <MiniModal
                    title="Categorie Nouă"
                    placeholder="Ex: Băuturi, Panificație..."
                    onConfirm={async (name) => { await createRootCategory(name); }}
                    onClose={() => setShowCategoryModal(false)}
                    dataTestid="quick-add-category-modal"
                />
            )}
            {showSubcategoryModal && (
                <MiniModal
                    title="Subcategorie Nouă"
                    placeholder="Ex: Sucuri, Bere, Pâine..."
                    subtitle={selectedCategoryId
                        ? `Categorie principală: ${rootCategories.find(c => c.id === selectedCategoryId)?.name ?? '—'}`
                        : undefined}
                    onConfirm={async (name) => { await createSubcategory(name); }}
                    onClose={() => setShowSubcategoryModal(false)}
                    dataTestid="quick-add-subcategory-modal"
                />
            )}

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

                {/* ── STÂNGA: Scanare, Denumire, Categorie ── */}
                <div className="flex-1 space-y-6">
                    {/* 1. Barcode + Generate button */}
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                            1. Scanează Cod Bare (Apasă Enter)
                        </label>

                        {/* Input + Generate button pe același rând */}
                        <div className="flex gap-2 items-stretch">
                            <div className="relative flex-1 group">
                                <input
                                    ref={barcodeRef}
                                    data-testid="quick-add-barcode-input"
                                    type="text"
                                    className={`w-full text-2xl font-mono font-black border-2 rounded-2xl p-4 focus:border-blue-500 outline-none text-center tracking-[0.1em] placeholder-gray-200 transition-all group-hover:border-gray-300 ${
                                        isInternalCode
                                            ? 'border-emerald-400 text-emerald-700 bg-emerald-50'
                                            : 'border-gray-200 text-gray-800 bg-white'
                                    }`}
                                    placeholder="||||||||||||"
                                    value={form.barcode}
                                    onChange={e => handleBarcodeChange(e.target.value)}
                                    onKeyDown={handleScan}
                                    autoFocus
                                    disabled={submitting || generatingBarcode}
                                />
                                <div className="absolute right-3 top-4 text-gray-300 pointer-events-none">
                                    <ScanBarcode size={22} />
                                </div>
                            </div>

                            {/* Buton Generează cod */}
                            <button
                                type="button"
                                data-testid="quick-add-generate-barcode-button"
                                onClick={handleGenerateBarcode}
                                disabled={submitting || generatingBarcode}
                                title="Generează cod intern EAN-13 pentru produse fără cod de bare"
                                className="flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[72px] bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-200 hover:border-emerald-400 text-emerald-700 font-black rounded-2xl transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-[10px] uppercase tracking-wide shrink-0"
                            >
                                {generatingBarcode
                                    ? <Loader2 size={18} className="animate-spin" />
                                    : <Barcode size={18} />}
                                <span>{generatingBarcode ? 'Generez...' : 'Gen. Cod'}</span>
                            </button>
                        </div>

                        {/* Confirmare înlocuire cod existent */}
                        {showReplaceConfirm && (
                            <div className="flex flex-col gap-2 p-3 bg-amber-50 border-2 border-amber-200 rounded-xl animate-in fade-in">
                                <p className="text-xs font-bold text-amber-800">
                                    Există deja un cod de bare. Vrei să îl înlocuiești cu un cod intern generat?
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={doGenerateBarcode}
                                        disabled={generatingBarcode}
                                        className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs py-2 rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1"
                                    >
                                        {generatingBarcode
                                            ? <Loader2 size={12} className="animate-spin" />
                                            : <RefreshCw size={12} />}
                                        Înlocuiește
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowReplaceConfirm(false)}
                                        className="flex-1 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-black text-xs py-2 rounded-lg transition-all active:scale-95"
                                    >
                                        Păstrează codul
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Badge cod intern generat */}
                        {isInternalCode && form.barcode && (
                            <div
                                data-testid="quick-add-generated-barcode-badge"
                                className="flex items-center justify-between gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl animate-in fade-in"
                            >
                                <div className="flex items-center gap-2">
                                    <Barcode size={14} className="text-emerald-600 shrink-0" />
                                    <span className="text-xs font-black text-emerald-700">Cod intern generat</span>
                                    <span className="text-xs text-emerald-500 font-mono">{form.barcode}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigator.clipboard?.writeText(form.barcode)}
                                    className="text-[10px] text-emerald-600 hover:text-emerald-800 font-bold underline underline-offset-2 transition-colors"
                                    title="Copiază codul"
                                >
                                    Copiază
                                </button>
                            </div>
                        )}

                        {/* Badge EAN-13 valid (pentru coduri reale introduse manual) */}
                        {!isInternalCode && form.barcode && isValidEan13(form.barcode) && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-xl">
                                <CheckCircle size={12} className="text-blue-500 shrink-0" />
                                <span className="text-[10px] font-bold text-blue-600">EAN-13 valid</span>
                            </div>
                        )}
                    </div>

                    {/* Status / Eroare */}
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

                    {/* 2. Denumire */}
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

                    {/* 3. Unitate Măsură */}
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

                    {/* 4. Categorie Principală */}
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                            Categorie Principală
                        </label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <FolderOpen size={16} className="absolute left-3 top-3.5 text-gray-400 pointer-events-none" />
                                <select
                                    data-testid="quick-add-category-select"
                                    className="w-full text-sm font-bold border-2 border-gray-200 rounded-xl pl-9 pr-3 py-3 focus:border-blue-500 outline-none transition-all text-gray-700 bg-white appearance-none disabled:opacity-60"
                                    value={selectedCategoryId}
                                    onChange={e => handleCategoryChange(e.target.value)}
                                    disabled={submitting || loadingCategories}
                                >
                                    <option value="">
                                        {loadingCategories ? 'Se încarcă...' : 'Alege categoria'}
                                    </option>
                                    {rootCategories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                type="button"
                                data-testid="quick-add-create-category-button"
                                onClick={() => setShowCategoryModal(true)}
                                disabled={submitting}
                                title="Creează categorie nouă"
                                className="flex items-center gap-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 text-blue-700 font-black rounded-xl transition-all text-xs active:scale-95 disabled:opacity-60 shrink-0"
                            >
                                <Plus size={14} /> Cat.
                            </button>
                        </div>
                    </div>

                    {/* 5. Subcategorie */}
                    <div>
                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ml-1 ${selectedCategoryId ? 'text-gray-400' : 'text-gray-200'}`}>
                            Subcategorie
                        </label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Tag size={16} className="absolute left-3 top-3.5 text-gray-400 pointer-events-none" />
                                <select
                                    data-testid="quick-add-subcategory-select"
                                    className="w-full text-sm font-bold border-2 border-gray-200 rounded-xl pl-9 pr-3 py-3 focus:border-purple-500 outline-none transition-all text-gray-700 bg-white appearance-none disabled:opacity-40 disabled:cursor-not-allowed"
                                    value={selectedSubcategoryId}
                                    onChange={e => handleSubcategoryChange(e.target.value)}
                                    disabled={!selectedCategoryId || submitting || loadingSubcategories}
                                >
                                    <option value="">
                                        {!selectedCategoryId
                                            ? 'Alege întâi categoria'
                                            : loadingSubcategories
                                                ? 'Se încarcă...'
                                                : subcategories.length === 0
                                                    ? 'Fără subcategorii'
                                                    : 'Alege subcategoria'}
                                    </option>
                                    {subcategories.map(sub => (
                                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                type="button"
                                data-testid="quick-add-create-subcategory-button"
                                onClick={() => {
                                    if (!selectedCategoryId) {
                                        setStatus({ msg: 'Selectează mai întâi o categorie principală.', type: 'warning' });
                                        return;
                                    }
                                    setShowSubcategoryModal(true);
                                }}
                                disabled={submitting || !selectedCategoryId}
                                title="Creează subcategorie nouă"
                                className="flex items-center gap-1 px-3 py-2 bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 text-purple-700 font-black rounded-xl transition-all text-xs active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                            >
                                <Plus size={14} /> Sub.
                            </button>
                        </div>

                        {/* Hint text */}
                        {categoryHint && (
                            <p className="text-[11px] text-amber-600 font-semibold mt-1.5 ml-1">{categoryHint}</p>
                        )}
                        {selectedCategoryId && (
                            <p className="text-[11px] text-gray-400 mt-1 ml-1 flex items-center gap-1">
                                <Package size={10} />
                                {rootCategories.find(c => c.id === selectedCategoryId)?.name}
                                {selectedSubcategoryId && subcategories.length > 0 && (
                                    <span className="text-purple-400">
                                        {' → '}{subcategories.find(s => s.id === selectedSubcategoryId)?.name}
                                    </span>
                                )}
                            </p>
                        )}
                    </div>
                </div>

                {/* ── DREAPTA: Prețuri, TVA, SGR, Stoc ── */}
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

                    <ProductVatGroupSelector
                        value={form.vatGroup}
                        onChange={(val) => updateField('vatGroup', val)}
                        config={vatConfig}
                    />

                    <ProductSgrSelector
                        value={form.sgrSelection}
                        onChange={(val) => updateField('sgrSelection', val)}
                    />

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
                            <input
                                type="date"
                                className="w-full text-sm font-bold border-2 border-gray-200 rounded-xl p-3 focus:border-red-500 outline-none transition-all text-gray-700 bg-white"
                                value={form.expiryDate || ''}
                                onChange={e => updateField('expiryDate', e.target.value)}
                                disabled={submitting}
                            />
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
                            onClick={handleReset}
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
