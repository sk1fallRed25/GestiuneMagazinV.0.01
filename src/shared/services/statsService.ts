import { supabase } from '../../config/supabase';

// Interfețe pentru datele noi
export interface ChartData {
    data: string;
    vanzari: number;
}

export interface TopProduct {
    nume: string;
    cantitate: number;
    totalVandut: number;
}

export interface DashboardStats {
    vanzariAzi: number;
    produseCritic: number;
    totalAngajati: number;
    graficVanzari: ChartData[];      // Date pentru grafic
    produsulZilei: TopProduct | null;
    produsulSaptamanii: TopProduct | null;
    produsulLunii: TopProduct | null;
}

// Funcție ajutătoare pentru a calcula Top Produse dintr-o listă de vânzări
const calculateTopProduct = (items: any[]): TopProduct | null => {
    if (!items || items.length === 0) return null;

    // 1. Grupăm după produs și somăm cantitățile
    const counts: Record<string, { cantitate: number, nume: string, total: number }> = {};

    items.forEach(item => {
        const id = item.produs_id;
        // Verificăm dacă produsul există (e posibil să fi fost șters)
        if (!item.produse) return;

        if (!counts[id]) {
            counts[id] = { cantitate: 0, nume: item.produse.nume, total: 0 };
        }
        counts[id].cantitate += item.cantitate;
        counts[id].total += (item.cantitate * item.pret_vanzare);
    });

    // 2. Transformăm în array și sortăm descrescător după cantitate
    const sorted = Object.values(counts).sort((a, b) => b.cantitate - a.cantitate);

    return sorted.length > 0 ? {
        nume: sorted[0].nume,
        cantitate: sorted[0].cantitate,
        totalVandut: sorted[0].total
    } : null;
};

export const fetchDashboardStats = async (): Promise<DashboardStats> => {
    const now = new Date();

    // Date de referință
    const startOfToday = new Date(now.setHours(0,0,0,0)).toISOString();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoISO = sevenDaysAgo.toISOString();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

    // --- 1. CARDURILE DE SUS (Totaluri) ---
    const { data: vanzariAziData } = await supabase
        .from('vanzari')
        .select('total')
        .gte('data_vanzare', startOfToday);
    const totalVanzariAzi = vanzariAziData?.reduce((sum: number, item: any) => sum + item.total, 0) || 0;

    const { data: produse } = await supabase.from('produse').select('stoc, prag_minim');
    const produseCritic = produse?.filter((p: any) => p.stoc <= p.prag_minim).length || 0;

    const { count: angajatiCount } = await supabase.from('utilizatori').select('*', { count: 'exact', head: true });


    // --- 2. GRAFIC VÂNZĂRI (Ultimele 7 zile) ---
    const { data: istoricVanzari } = await supabase
        .from('vanzari')
        .select('data_vanzare, total')
        .gte('data_vanzare', sevenDaysAgoISO)
        .order('data_vanzare', { ascending: true });

    // Procesăm datele pentru grafic (grupăm pe zile: "Lun", "Mar", etc.)
    const chartMap: Record<string, number> = {};
    istoricVanzari?.forEach((v: any) => {
        const day = new Date(v.data_vanzare).toLocaleDateString('ro-RO', { weekday: 'short' }); // "Lun", "Mar"
        chartMap[day] = (chartMap[day] || 0) + v.total;
    });

    // Convertim map-ul în array pentru Recharts
    const graficVanzari = Object.keys(chartMap).map(day => ({
        data: day.toUpperCase(),
        vanzari: chartMap[day]
    }));


    // --- 3. CALCUL TOP PRODUSE (Zi / Săptămână / Lună) ---
    // Luăm toate detaliile de vânzare din ultima lună (inclusiv produsul și data vânzării părintelui)
    const { data: toateDetaliile } = await supabase
        .from('detalii_vanzare')
        .select(`
        cantitate,
        pret_vanzare,
        produs_id,
        produse ( nume ),
        vanzari!inner ( data_vanzare )
      `)
        .gte('vanzari.data_vanzare', thirtyDaysAgoISO);

    if (!toateDetaliile) {
        return { vanzariAzi: totalVanzariAzi, produseCritic, totalAngajati: angajatiCount || 0, graficVanzari: [], produsulZilei: null, produsulSaptamanii: null, produsulLunii: null };
    }

    // Filtrăm în memorie pentru viteză
    const detaliiAzi = toateDetaliile.filter((d: any) => d.vanzari.data_vanzare >= startOfToday);
    const detaliiSaptamana = toateDetaliile.filter((d: any) => d.vanzari.data_vanzare >= sevenDaysAgoISO);
    const detaliiLuna = toateDetaliile; // Deja filtrate din query

    return {
        vanzariAzi: totalVanzariAzi,
        produseCritic,
        totalAngajati: angajatiCount || 0,
        graficVanzari,
        produsulZilei: calculateTopProduct(detaliiAzi),
        produsulSaptamanii: calculateTopProduct(detaliiSaptamana),
        produsulLunii: calculateTopProduct(detaliiLuna),
    };
};
