import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { toast } from 'react-hot-toast';
import {
    Upload, Plus, Trash2, Save, Search, FileText,
    Package, ArrowRight, Truck
} from 'lucide-react';

// --- Tipuri ---
interface Produs {
    id: number;
    nume: string;
    cod_bare: string;
    pret_vanzare: number;
    pret_achizitie: number;
    stoc_depozit: number;
    stoc_magazin: number;
}
interface LinieNIR {
    id: number;
    produs: Produs;
    isBax: boolean;
    cantitateBaxuri: number;
    bucatiPerBax: number;
    cantitateTotala: number;
    pretTotalLinie: number;
    pretAchizitieUnitar: number;
    adaos: number;
    pretVanzareNou: number;
}

export default function Receptie() {
    // --- STATE-URI ---
    const [nrFactura, setNrFactura] = useState('');
    const [dataFactura, setDataFactura] = useState(new Date().toISOString().slice(0, 10));

    // Search & Produs
    const [search, setSearch] = useState('');
    const [rezultateCautare, setRezultateCautare] = useState<Produs[]>([]);
    const [produsSelectat, setProdusSelectat] = useState<Produs | null>(null);

    // Inputs Linie
    const [isBax, setIsBax] = useState(false);
    const [cantitateInput, setCantitateInput] = useState<number | string>('');
    const [bucatiPerBax, setBucatiPerBax] = useState<number | string>(1);
    const [pretTotalInput, setPretTotalInput] = useState<number | string>('');
    const [adaos, setAdaos] = useState<number>(30); // Default 30%

    const [liniiNIR, setLiniiNIR] = useState<LinieNIR[]>([]);
    const [loading, setLoading] = useState(false);
    const [xmlStatus, setXmlStatus] = useState('');
    const [supplierInfo, setSupplierInfo] = useState({ name: '', cui: '' });

    const fileInputRef = useRef<HTMLInputElement>(null);


    // Căutare produse (Debounce)
    useEffect(() => {
        const delayDebounce = setTimeout(async () => {
            if (search.length < 2) { setRezultateCautare([]); return; }
            const { data } = await supabase
                .from('produse')
                .select('*')
                .or(`nume.ilike.%${search}%,cod_bare.eq.${search}`)
                .limit(5);
            if (data) setRezultateCautare(data as Produs[]);
        }, 300);
        return () => clearTimeout(delayDebounce);
    }, [search]);

    const selecteazaProdus = (p: Produs) => {
        setProdusSelectat(p);
        setSearch(p.nume);
        setRezultateCautare([]);
        setAdaos(30);
        setPretTotalInput('');
        setCantitateInput('');
        setBucatiPerBax(1);
        setIsBax(false);
    };

    // --- XML PARSER ---
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            await parseXMLInvoice(text);
        };
        reader.readAsText(file);
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const parseXMLInvoice = async (xmlText: string) => {
        setXmlStatus('⏳ Se analizează factura...');
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");

            const supplierName = xmlDoc.getElementsByTagName("cbc:RegistrationName")[0]?.textContent;
            const supplierCUI = xmlDoc.getElementsByTagName("cbc:CompanyID")[0]?.textContent;
            const invoiceID = xmlDoc.getElementsByTagName("cbc:ID")[0]?.textContent;
            const invoiceDate = xmlDoc.getElementsByTagName("cbc:IssueDate")[0]?.textContent;

            if (invoiceID) setNrFactura(invoiceID);
            if (invoiceDate) setDataFactura(invoiceDate);

            if (supplierName || supplierCUI) {
                setSupplierInfo({ name: supplierName || '', cui: supplierCUI || '' });
                toast.success(`Informații furnizor identificate în XML: ${supplierName || supplierCUI}`);
            }

            // Procesare Linii
            const lines = xmlDoc.getElementsByTagName("cac:InvoiceLine");
            let produseNoi: LinieNIR[] = [];
            let produseNeidentificate: string[] = [];

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const name = line.getElementsByTagName("cbc:Name")[0]?.textContent;
                const quantity = parseFloat(line.getElementsByTagName("cbc:InvoicedQuantity")[0]?.textContent || '0');
                const lineTotalAmount = parseFloat(line.getElementsByTagName("cbc:LineExtensionAmount")[0]?.textContent || '0');

                if (name) {
                    const { data: prodExistent } = await supabase.from('produse').select('*').ilike('nume', name).maybeSingle();
                    if (prodExistent) {
                        const pretUnit = lineTotalAmount / quantity;
                        const pretVanz = Number((pretUnit * 1.3).toFixed(2)); // Default 30% adaos
                        produseNoi.push({
                            id: Date.now() + i,
                            produs: prodExistent as Produs,
                            isBax: false,
                            cantitateBaxuri: 0,
                            bucatiPerBax: 1,
                            cantitateTotala: quantity,
                            pretTotalLinie: lineTotalAmount,
                            pretAchizitieUnitar: pretUnit,
                            adaos: 30,
                            pretVanzareNou: pretVanz
                        });
                    } else {
                        produseNeidentificate.push(name);
                    }
                }
            }

            if (produseNoi.length > 0) {
                setLiniiNIR(prev => [...prev, ...produseNoi]);
                toast.success(`${produseNoi.length} produse importate automat!`);
            }
            if (produseNeidentificate.length > 0) {
                toast.error(`${produseNeidentificate.length} produse nu au fost găsite în baza de date locală.`);
            }
            setXmlStatus('✅ Procesare XML completă');
        } catch (error) {
            console.error(error);
            setXmlStatus('❌ Eroare la citire XML');
            toast.error("Fișierul XML nu este valid sau formatul e-Factura diferă.");
        }
    };

    // --- CALCULE ---
    const cantInputVal = Number(cantitateInput) || 0;
    const bucPerBaxVal = Number(bucatiPerBax) || 1;
    const pretTotalVal = Number(pretTotalInput) || 0;

    const cantitateReala = isBax ? cantInputVal * bucPerBaxVal : cantInputVal;
    const pretAchizitieUnitar = (pretTotalVal > 0 && cantitateReala > 0) ? (pretTotalVal / cantitateReala) : 0;
    const pretVanzareCalculat = Number((pretAchizitieUnitar * (1 + adaos / 100)).toFixed(2));

    const adaugaLinie = () => {
        if (!produsSelectat) return toast.error("Selectează un produs!");
        if (cantitateReala <= 0) return toast.error("Cantitatea trebuie să fie pozitivă.");
        if (pretTotalVal <= 0) return toast.error("Valoarea liniei trebuie să fie pozitivă.");

        const linieNoua: LinieNIR = {
            id: Date.now(),
            produs: produsSelectat,
            isBax,
            cantitateBaxuri: isBax ? cantInputVal : 0,
            bucatiPerBax: isBax ? bucPerBaxVal : 1,
            cantitateTotala: cantitateReala,
            pretTotalLinie: pretTotalVal,
            pretAchizitieUnitar,
            adaos,
            pretVanzareNou: pretVanzareCalculat
        };

        setLiniiNIR([...liniiNIR, linieNoua]);

        // Reset parțial
        setProdusSelectat(null);
        setSearch('');
        setCantitateInput('');
        setPretTotalInput('');
        document.getElementById('search-input')?.focus();
    };

    const stergeLinie = (id: number) => {
        setLiniiNIR(liniiNIR.filter(l => l.id !== id));
    };

    const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : 'Eroare necunoscută';

    const salveazaNIR = async () => {
        if (!nrFactura) return toast.error("Completează Numărul de Document!");
        if (liniiNIR.length === 0) return toast.error("Nu ai adăugat niciun produs!");

        setLoading(true);
        const promise = new Promise(async (resolve, reject) => {
            try {
                // 1. Header Receptie
                const { data: receptie, error: errR } = await supabase.from('receptii').insert([{
                    numar_factura: nrFactura,
                    data_factura: dataFactura,
                    total_valoare: liniiNIR.reduce((acc, l) => acc + l.pretTotalLinie, 0),
                    // furnizor_id: ... - SCOS pentru Etapa 1E
                }]).select().single();

                if (errR) {
                    if (errR.code === '23502' && errR.message?.includes('furnizor_id')) {
                        throw new Error("Schema bazei de date încă cere furnizor_id. Aplică migrarea propusă pentru recepții fără furnizor.");
                    }
                    throw errR;
                }

                // 2. Detalii Receptie + Update Stoc (Loop)
                for (const linie of liniiNIR) {
                    await supabase.from('receptii_detalii').insert([{
                        receptie_id: receptie.id,
                        produs_id: linie.produs.id,
                        cantitate_baxuri: linie.cantitateBaxuri,
                        bucati_per_bax: linie.bucatiPerBax,
                        cantitate_totala: linie.cantitateTotala,
                        pret_achizitie_unitar: linie.pretAchizitieUnitar,
                        pret_vanzare_vechi: linie.produs.pret_vanzare,
                        pret_vanzare_nou: linie.pretVanzareNou,
                        adaos_procentual: linie.adaos
                    }]);

                    // Actualizare stoc prin RPC (funcție stocată în DB)
                    const { error: rpcError } = await supabase.rpc('adauga_stoc_depozit', {
                        p_produs_id: linie.produs.id,
                        p_cantitate: linie.cantitateTotala,
                        p_pret_achizitie: linie.pretAchizitieUnitar,
                        p_pret_vanzare: linie.pretVanzareNou
                    });

                    if (rpcError) throw rpcError;
                }
                resolve("Recepție salvată!");
            } catch (err) {
                reject(err);
            }
        });

        toast.promise(promise, {
            loading: 'Se salvează recepția...',
            success: 'Recepție salvată! Stocul a fost actualizat.',
            error: (err: unknown) => `Eroare: ${getErrorMessage(err)}`
        }).then(() => {
            setLiniiNIR([]); setNrFactura(''); setXmlStatus(''); setSupplierInfo({ name: '', cui: '' });
        }).finally(() => {
            setLoading(false);
        });
    };

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen bg-gray-50/50 pb-20">

            {/* --- HEADER PAGINĂ --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <span className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-200"><Truck size={28} /></span>
                        Recepție Marfă (NIR)
                    </h1>
                    <p className="text-gray-500 mt-2 ml-1">Înregistrează intrările de marfă și actualizează stocul.</p>
                </div>

                <div className="flex gap-3">
                    <label className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 cursor-pointer transition active:scale-95">
                        <Upload size={20} />
                        Importă XML (SPV)
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xml"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                    </label>
                </div>
            </div>

            {xmlStatus && (
                <div className={`mb-6 p-4 rounded-xl border flex items-center gap-2 font-bold ${xmlStatus.includes('❌') ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                    <FileText size={20} />
                    {xmlStatus}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-2">
                        <FileText className="text-indigo-500 w-5 h-5" /> Informații Document
                    </h3>
                    
                    <div className="space-y-4">
                        {supplierInfo.name && (
                            <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                                <p className="text-[10px] uppercase font-bold text-indigo-400 mb-1">Furnizor (din XML)</p>
                                <p className="text-sm font-bold text-indigo-900">{supplierInfo.name}</p>
                                {supplierInfo.cui && <p className="text-[10px] text-indigo-600">CUI: {supplierInfo.cui}</p>}
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nr. Document / Factură</label>
                            <input
                                type="text"
                                value={nrFactura}
                                onChange={(e) => setNrFactura(e.target.value)}
                                placeholder="Ex: 123456"
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Data Document</label>
                            <input
                                type="date"
                                value={dataFactura}
                                onChange={(e) => setDataFactura(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* --- SECTIUNEA 2: ADĂUGARE PRODUS --- */}
                <div className="lg:col-span-3 bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Plus className="text-green-500" size={20} />
                        Adaugă Linie Recepție
                    </h3>

                    <div className="space-y-6">
                        {/* Căutare */}
                        <div className="relative">
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Caută Produs (Nume / Cod Bare)</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    id="search-input"
                                    type="text"
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-700"
                                    placeholder="Scrie pentru a căuta..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    autoComplete="off"
                                />
                            </div>

                            {/* Rezultate Căutare */}
                            {rezultateCautare.length > 0 && (
                                <div className="absolute z-20 w-full bg-white shadow-2xl border border-gray-100 rounded-xl mt-2 max-h-60 overflow-y-auto">
                                    {rezultateCautare.map(p => (
                                        <div
                                            key={p.id}
                                            className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
                                            onClick={() => selecteazaProdus(p)}
                                        >
                                            <div className="font-bold text-gray-800">{p.nume}</div>
                                            <div className="flex justify-between mt-1 text-xs text-gray-500">
                                                <span>Cod: {p.cod_bare}</span>
                                                <span className="font-bold text-blue-600">Vânzare: {p.pret_vanzare} RON</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Detalii Linie */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                            <div className="col-span-2 md:col-span-1">
                                <label className="flex items-center gap-2 text-xs font-bold text-gray-600 uppercase mb-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                        checked={isBax}
                                        onChange={e => setIsBax(e.target.checked)}
                                    />
                                    Intrare la Bax?
                                </label>
                                {isBax ? (
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            className="w-1/2 p-3 bg-blue-50 border border-blue-100 rounded-xl outline-none focus:border-blue-500 text-center font-bold"
                                            placeholder="Baxuri"
                                            value={cantitateInput}
                                            onChange={e => setCantitateInput(e.target.value)}
                                        />
                                        <input
                                            type="number"
                                            className="w-1/2 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 text-center text-sm"
                                            placeholder="Buc/Bax"
                                            value={bucatiPerBax}
                                            onChange={e => setBucatiPerBax(e.target.value)}
                                        />
                                    </div>
                                ) : (
                                    <input
                                        type="number"
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 font-bold"
                                        placeholder="Cantitate (buc)"
                                        value={cantitateInput}
                                        onChange={e => setCantitateInput(e.target.value)}
                                    />
                                )}
                            </div>

                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Valoare Totală Linie</label>
                                <input
                                    type="number"
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 text-right font-mono font-bold"
                                    placeholder="0.00"
                                    value={pretTotalInput}
                                    onChange={e => setPretTotalInput(e.target.value)}
                                />
                            </div>

                            <div className="col-span-2 md:col-span-2 flex items-end">
                                <button
                                    onClick={adaugaLinie}
                                    disabled={!produsSelectat}
                                    className="w-full bg-gray-900 hover:bg-black text-white py-3 rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed font-bold flex items-center justify-center gap-2"
                                >
                                    <Plus size={18} /> Adaugă Linie
                                </button>
                            </div>
                        </div>

                        {/* Previzualizare Calcule */}
                        {produsSelectat && (
                            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 flex flex-col md:flex-row justify-between items-center gap-4 animate-in fade-in zoom-in duration-300">
                                <div className="text-sm text-gray-600">
                                    Produs: <span className="font-bold text-gray-900">{produsSelectat.nume}</span>
                                    <div className="text-xs text-gray-400 mt-0.5">Stoc Actual: {produsSelectat.stoc_depozit}</div>
                                </div>

                                <div className="flex items-center gap-2 text-sm bg-white px-3 py-1.5 rounded-lg border border-blue-100 shadow-sm">
                                    <span className="text-gray-500">Intrare:</span>
                                    <span className="font-bold text-blue-700">{cantitateReala} buc</span>
                                    <span className="text-gray-300">|</span>
                                    <span className="text-gray-500">Cost:</span>
                                    <span className="font-bold text-orange-600">{pretAchizitieUnitar.toFixed(2)} RON</span>
                                </div>

                                <div className="flex items-center gap-2 text-sm">
                                    <div className="flex items-center bg-white rounded-lg border border-gray-200 overflow-hidden">
                                        <span className="px-2 bg-gray-50 text-gray-500 text-xs font-bold border-r">Adaos%</span>
                                        <input
                                            type="number"
                                            className="w-14 p-1.5 text-center font-bold outline-none"
                                            value={adaos}
                                            onChange={e => setAdaos(Number(e.target.value))}
                                        />
                                    </div>
                                    <ArrowRight size={16} className="text-gray-400" />
                                    <div className="font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
                                        {pretVanzareCalculat.toFixed(2)} RON
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- LISTA PRODUSE INTRODUSE --- */}
            <div className="mt-8 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Package className="text-purple-500" size={20} />
                        Linii NIR ({liniiNIR.length})
                    </h3>
                    <div className="text-sm font-bold text-gray-500">
                        Total Recepție: <span className="text-gray-900 text-lg ml-2">{liniiNIR.reduce((acc, x) => acc + x.pretTotalLinie, 0).toFixed(2)} RON</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                        <tr className="bg-white text-gray-400 text-xs uppercase font-bold border-b border-gray-100">
                            <th className="p-4 pl-6">Produs</th>
                            <th className="p-4 text-center">Cantitate</th>
                            <th className="p-4 text-right">Preț Achiziție</th>
                            <th className="p-4 text-right">Adaos</th>
                            <th className="p-4 text-right">Preț Vânzare Nou</th>
                            <th className="p-4 text-right">Valoare Linie</th>
                            <th className="p-4 text-center">Acțiuni</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-sm">
                        {liniiNIR.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="p-12 text-center text-gray-400 italic">
                                    Nu ai adăugat niciun produs încă.
                                </td>
                            </tr>
                        ) : (
                            liniiNIR.map(linie => (
                                <tr key={linie.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4 pl-6 font-bold text-gray-700">
                                        {linie.produs.nume}
                                        {linie.isBax && <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded uppercase font-bold">Bax</span>}
                                    </td>
                                    <td className="p-4 text-center font-bold text-gray-800">{linie.cantitateTotala}</td>
                                    <td className="p-4 text-right text-orange-600 font-mono">{linie.pretAchizitieUnitar.toFixed(2)}</td>
                                    <td className="p-4 text-right text-gray-500">{linie.adaos}%</td>
                                    <td className="p-4 text-right font-bold text-green-600">{linie.pretVanzareNou.toFixed(2)}</td>
                                    <td className="p-4 text-right font-bold text-gray-900 font-mono">{linie.pretTotalLinie.toFixed(2)}</td>
                                    <td className="p-4 text-center">
                                        <button
                                            onClick={() => stergeLinie(linie.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end">
                    <button
                        onClick={salveazaNIR}
                        disabled={loading || liniiNIR.length === 0}
                        className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-green-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                    >
                        {loading ? "Se salvează..." : <><Save size={24} /> Finalizează Recepția</>}
                    </button>
                </div>
            </div>
        </div>
    );
}