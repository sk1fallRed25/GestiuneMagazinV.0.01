import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { toast } from 'react-hot-toast';

// --- Tipuri ---
interface Furnizor { id: number; nume_firma: string; cui: string }
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
    id: number
    produs: Produs
    isBax: boolean
    cantitateBaxuri: number
    bucatiPerBax: number
    cantitateTotala: number
    pretTotalLinie: number
    pretAchizitieUnitar: number
    adaos: number
    pretVanzareNou: number
}

export default function Receptie() {
    // --- STATE-URI ---
    const [furnizori, setFurnizori] = useState<Furnizor[]>([])
    const [selFurnizor, setSelFurnizor] = useState<string>('')
    const [nrFactura, setNrFactura] = useState('')
    const [dataFactura, setDataFactura] = useState(new Date().toISOString().slice(0, 10))
    const [search, setSearch] = useState('')
    const [rezultateCautare, setRezultateCautare] = useState<Produs[]>([])
    const [produsSelectat, setProdusSelectat] = useState<Produs | null>(null)
    const [isBax, setIsBax] = useState(false)
    const [cantitateInput, setCantitateInput] = useState<number>(1)
    const [bucatiPerBax, setBucatiPerBax] = useState<number>(1)
    const [pretTotalInput, setPretTotalInput] = useState<number>(0)
    const [adaos, setAdaos] = useState<number>(30)
    const [liniiNIR, setLiniiNIR] = useState<LinieNIR[]>([])
    const [loading, setLoading] = useState(false)
    const [xmlStatus, setXmlStatus] = useState('')

    useEffect(() => {
        supabase.from('furnizori').select('*').order('nume_firma').then(({ data }) => {
            if (data) setFurnizori(data)
        })
    }, [])

    useEffect(() => {
        const delayDebounce = setTimeout(async () => {
            if (search.length < 2) { setRezultateCautare([]); return }
            const { data } = await supabase
                .from('produse')
                .select('id, nume, cod_bare, pret_vanzare, pret_achizitie, stoc_depozit, stoc_magazin')
                .or(`nume.ilike.%${search}%,cod_bare.eq.${search}`)
                .limit(5)
            if (data) setRezultateCautare(data as Produs[])
        }, 300)
        return () => clearTimeout(delayDebounce)
    }, [search])

    const selecteazaProdus = (p: Produs) => {
        setProdusSelectat(p)
        setSearch(p.nume)
        setRezultateCautare([])
        setAdaos(30)
        setPretTotalInput(0)
        setCantitateInput(1)
        setBucatiPerBax(1)
        setIsBax(false)
    }

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            await parseXMLInvoice(text);
        };
        reader.readAsText(file);
    };

    const parseXMLInvoice = async (xmlText: string) => {
        setXmlStatus('⏳ Se analizează factura...');
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");

        const supplierName = xmlDoc.getElementsByTagName("cbc:RegistrationName")[0]?.textContent;
        const supplierCUI = xmlDoc.getElementsByTagName("cbc:CompanyID")[0]?.textContent;
        const invoiceID = xmlDoc.getElementsByTagName("cbc:ID")[0]?.textContent;
        const invoiceDate = xmlDoc.getElementsByTagName("cbc:IssueDate")[0]?.textContent;

        if (invoiceID) setNrFactura(invoiceID);
        if (invoiceDate) setDataFactura(invoiceDate);

        let furnizorGasit = null;
        if (supplierCUI) {
            const { data: fCui } = await supabase.from('furnizori').select('*').ilike('cui', `%${supplierCUI}%`).single();
            furnizorGasit = fCui;
        }
        if (!furnizorGasit && supplierName) {
            const { data: fNume } = await supabase.from('furnizori').select('*').ilike('nume_firma', `%${supplierName}%`).single();
            furnizorGasit = fNume;
        }

        if (furnizorGasit) {
            setSelFurnizor(furnizorGasit.id.toString());
            toast.success(`Furnizor identificat: ${furnizorGasit.nume_firma}`);
        } else {
            toast.error(`Furnizor necunoscut (${supplierName}). Selectează manual.`);
        }

        const lines = xmlDoc.getElementsByTagName("cac:InvoiceLine");
        let produseNoi: LinieNIR[] = [];
        let produseNeidentificate: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const name = line.getElementsByTagName("cbc:Name")[0]?.textContent;
            const quantity = parseFloat(line.getElementsByTagName("cbc:InvoicedQuantity")[0]?.textContent || '0');
            const lineTotalAmount = parseFloat(line.getElementsByTagName("cbc:LineExtensionAmount")[0]?.textContent || '0');

            if (name) {
                const { data: prodExistent } = await supabase.from('produse').select('id, nume, cod_bare, pret_vanzare, pret_achizitie, stoc_depozit, stoc_magazin').ilike('nume', name).maybeSingle();
                if (prodExistent) {
                    const pretUnit = lineTotalAmount / quantity;
                    const pretVanz = Number((pretUnit * 1.3).toFixed(2));
                    produseNoi.push({
                        id: Date.now() + i, produs: prodExistent as Produs, isBax: false, cantitateBaxuri: 0, bucatiPerBax: 1,
                        cantitateTotala: quantity, pretTotalLinie: lineTotalAmount, pretAchizitieUnitar: pretUnit, adaos: 30, pretVanzareNou: pretVanz
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
            toast.error(`Produse neidentificate: ${produseNeidentificate.join(', ')}. Adaugă-le manual.`);
        }
        setXmlStatus('');
    };

    const cantitateReala = isBax ? cantitateInput * bucatiPerBax : cantitateInput
    const pretAchizitieUnitar = pretTotalInput > 0 && cantitateReala > 0 ? (pretTotalInput / cantitateReala) : 0
    const pretVanzareCalculat = Number((pretAchizitieUnitar * (1 + adaos / 100)).toFixed(2))

    const adaugaLinie = () => {
        if (!produsSelectat || cantitateReala <= 0) return toast.error("Selectează un produs și cantitatea!")
        const linieNoua: LinieNIR = {
            id: Date.now(), produs: produsSelectat, isBax, cantitateBaxuri: isBax ? cantitateInput : 0, bucatiPerBax: isBax ? bucatiPerBax : 1,
            cantitateTotala: cantitateReala, pretTotalLinie: pretTotalInput, pretAchizitieUnitar, adaos, pretVanzareNou: pretVanzareCalculat
        }
        setLiniiNIR([...liniiNIR, linieNoua])
        setProdusSelectat(null)
        setSearch('')
        setCantitateInput(1)
        setPretTotalInput(0)
        document.getElementById('search-input')?.focus()
    }

    const stergeLinie = (id: number) => {
        setLiniiNIR(liniiNIR.filter(l => l.id !== id))
    }

    const salveazaNIR = async () => {
        if (!selFurnizor || !nrFactura) return toast.error("Completează Furnizorul și Nr. Factură!")
        if (liniiNIR.length === 0) return toast.error("Nu ai adăugat niciun produs!")

        setLoading(true)
        const promise = new Promise(async (resolve, reject) => {
            try {
                const { data: receptie, error: errR } = await supabase.from('receptii').insert([{
                    furnizor_id: parseInt(selFurnizor), numar_factura: nrFactura, data_factura: dataFactura,
                    total_valoare: liniiNIR.reduce((acc, l) => acc + l.pretTotalLinie, 0)
                }]).select().single()
                if (errR) throw errR

                for (const linie of liniiNIR) {
                    await supabase.from('receptii_detalii').insert([{
                        receptie_id: receptie.id, produs_id: linie.produs.id, cantitate_baxuri: linie.cantitateBaxuri, bucati_per_bax: linie.bucatiPerBax,
                        cantitate_totala: linie.cantitateTotala, pret_achizitie_unitar: linie.pretAchizitieUnitar, pret_vanzare_vechi: linie.produs.pret_vanzare,
                        pret_vanzare_nou: linie.pretVanzareNou, adaos_procentual: linie.adaos
                    }])
                    const { error: rpcError } = await supabase.rpc('adauga_stoc_depozit', {
                        p_produs_id: linie.produs.id, p_cantitate: linie.cantitateTotala,
                        p_pret_achizitie: linie.pretAchizitieUnitar, p_pret_vanzare: linie.pretVanzareNou
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
            error: (err) => `Eroare: ${err.message}`
        }).then(() => {
            setLiniiNIR([]); setNrFactura(''); setSelFurnizor(''); setXmlStatus('');
        }).finally(() => {
            setLoading(false);
        });
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">Recepție Marfă (NIR)</h1>
                <div className="relative overflow-hidden group">
                    <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold shadow-md flex items-center gap-2 transition">Importă e-Factura (XML)</button>
                    <input type="file" accept=".xml" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" title="Încarcă XML din SPV" />
                </div>
            </div>
            {xmlStatus && <div className="mb-4 p-3 bg-purple-50 border-purple-200 text-purple-800 rounded-lg text-sm font-bold">{xmlStatus}</div>}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Furnizor</label>
                    <select className="w-full border p-2 rounded outline-none focus:border-blue-500" value={selFurnizor} onChange={e => setSelFurnizor(e.target.value)}>
                        <option value="">-- Alege Furnizor --</option>
                        {furnizori.map(f => <option key={f.id} value={f.id}>{f.nume_firma}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nr. Factură</label>
                    <input type="text" className="w-full border p-2 rounded outline-none" placeholder="Ex: F1024" value={nrFactura} onChange={e => setNrFactura(e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data Factură</label>
                    <input type="date" className="w-full border p-2 rounded outline-none" value={dataFactura} onChange={e => setDataFactura(e.target.value)} />
                </div>
            </div>
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 mb-6 shadow-sm">
                <h3 className="font-bold text-blue-800 mb-4 flex items-center gap-2">Adaugă Manual</h3>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-4 relative">
                        <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Caută Produs</label>
                        <input id="search-input" type="text" className="w-full border p-2 rounded font-bold" placeholder="Nume sau Cod Bare..." value={search} onChange={e => setSearch(e.target.value)} autoComplete="off" />
                        {rezultateCautare.length > 0 && <div className="absolute z-10 w-full bg-white shadow-xl border rounded-lg mt-1 max-h-60 overflow-y-auto">
                            {rezultateCautare.map(p => <div key={p.id} className="p-3 hover:bg-blue-50 cursor-pointer border-b" onClick={() => selecteazaProdus(p)}>
                                <div className="font-bold text-gray-800">{p.nume}</div>
                                <div className="text-xs text-gray-500">Preț Vânzare: {p.pret_vanzare} RON</div>
                            </div>)}
                        </div>}
                    </div>
                    <div className="md:col-span-2 flex flex-col items-center pb-2">
                        <label className="text-xs font-bold text-blue-700 uppercase mb-1 cursor-pointer"><input type="checkbox" className="mr-2" checked={isBax} onChange={e => setIsBax(e.target.checked)} />Intrare la Bax?</label>
                    </div>
                    {isBax ? <>
                        <div className="md:col-span-1"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Baxuri</label><input type="number" className="w-full border p-2 rounded text-center" value={cantitateInput} onChange={e => setCantitateInput(Number(e.target.value))} /></div>
                        <div className="md:col-span-1"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Buc/Bax</label><input type="number" className="w-full border p-2 rounded text-center bg-white" value={bucatiPerBax} onChange={e => setBucatiPerBax(Number(e.target.value))} /></div>
                    </> : <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cantitate</label><input type="number" className="w-full border p-2 rounded text-center" value={cantitateInput} onChange={e => setCantitateInput(Number(e.target.value))} /></div>}
                    <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valoare Linie</label><input type="number" className="w-full border p-2 rounded text-right font-mono" placeholder="0.00" value={pretTotalInput || ''} onChange={e => setPretTotalInput(Number(e.target.value))} /></div>
                    <div className="md:col-span-2"><button onClick={adaugaLinie} className="w-full bg-blue-600 text-white py-2 rounded shadow-md hover:bg-blue-700 font-bold transition">+ Adaugă</button></div>
                </div>
                {produsSelectat && <div className="mt-4 p-3 bg-white rounded border border-blue-100 flex justify-between items-center text-sm">
                    <div>Intră în stoc: <span className="font-bold text-lg">{cantitateReala} buc</span></div>
                    <div>Cost Unitar: <span className="font-bold text-lg text-orange-600">{pretAchizitieUnitar.toFixed(2)} RON</span></div>
                    <div className="flex items-center gap-2">Adaos: <input type="number" className="w-16 border p-1 rounded text-center bg-gray-50" value={adaos} onChange={e => setAdaos(Number(e.target.value))} /> % ➜ Preț Nou: <span className="font-bold text-lg text-green-600">{pretVanzareCalculat.toFixed(2)} RON</span></div>
                </div>}
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-100 text-gray-500 uppercase text-xs"><tr>
                        <th className="p-4">Produs</th><th className="p-4 text-center">Cantitate</th><th className="p-4 text-right">Preț Achiziție</th>
                        <th className="p-4 text-right">Adaos</th><th className="p-4 text-right">Preț Vânzare</th><th className="p-4 text-right">Total</th><th className="p-4"></th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-100">
                    {liniiNIR.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-gray-400 italic">Lista e goală. Adaugă manual sau importă XML.</td></tr> :
                        liniiNIR.map(linie => <tr key={linie.id} className="hover:bg-gray-50">
                            <td className="p-4 font-bold text-gray-800">{linie.produs.nume} {linie.isBax && <span className="text-xs text-blue-500 font-normal">(Bax)</span>}</td>
                            <td className="p-4 text-center font-bold">{linie.cantitateTotala}</td><td className="p-4 text-right">{linie.pretAchizitieUnitar.toFixed(2)}</td>
                            <td className="p-4 text-right">{linie.adaos}%</td><td className="p-4 text-right font-bold text-green-600">{linie.pretVanzareNou.toFixed(2)}</td>
                            <td className="p-4 text-right font-mono">{linie.pretTotalLinie.toFixed(2)}</td>
                            <td className="p-4 text-right"><button onClick={() => stergeLinie(linie.id)} className="text-red-500 font-bold">✕</button></td>
                        </tr>)}
                    </tbody>
                    {liniiNIR.length > 0 && <tfoot className="bg-gray-50 font-bold text-gray-800"><tr>
                        <td colSpan={5} className="p-4 text-right uppercase text-xs tracking-wider">Total Factură:</td>
                        <td className="p-4 text-right text-xl">{liniiNIR.reduce((acc, x) => acc + x.pretTotalLinie, 0).toFixed(2)} RON</td><td></td>
                    </tr></tfoot>}
                </table>
            </div>
            <div className="mt-6 flex justify-end">
                <button onClick={salveazaNIR} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition">
                    {loading ? "Se salvează..." : "✅ Finalizează Recepția"}
                </button>
            </div>
        </div>
    )
}