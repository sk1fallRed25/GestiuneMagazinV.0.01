import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
    AlertTriangle, CalendarClock, History, TrendingUp, BrainCircuit 
} from 'lucide-react';
import { supabase } from '../../shared/supabase/supabaseClient';
import StatCard from '../../shared/components/StatCard';

const Dashboard = ({ userRole }: { userRole: string }) => {
    const [stats, setStats] = useState({
        alerteStoc: 0,
        alerteExpirari: 0,
        pierderiLuna: 0,
        vanzariAstazi: 0,
        loading: true
    });

    const fetchDashboardData = useCallback(async () => {
        try {
            const { data: produse } = await supabase.from('produse').select('stoc_depozit, stoc_minim_depozit');
            const alerteCount = produse?.filter((p: any) => p.stoc_depozit <= p.stoc_minim_depozit).length || 0;

            const { count: expirariCount } = await supabase.from('view_expirari').select('*', { count: 'exact', head: true });

            // Calcul pierderi luna curentă pentru audit
            const primaZi = new Date(); primaZi.setDate(1);
            const { count: pierderiCount } = await supabase.from('pierderi').select('*', { count: 'exact', head: true }).gte('created_at', primaZi.toISOString());

            const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
            const { data: vanzari } = await supabase.from('vanzari').select('total').eq('status', 'finalizat').gte('data_vanzare', todayStart.toISOString());
            const totalVanzari = vanzari?.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0) || 0;

            setStats({
                alerteStoc: alerteCount,
                alerteExpirari: expirariCount || 0,
                pierderiLuna: pierderiCount || 0,
                vanzariAstazi: totalVanzari,
                loading: false
            });

        } catch (error) {
            console.error("Eroare dashboard:", error);
            setStats(s => ({ ...s, loading: false }));
        }
    }, []);

    useEffect(() => {
        fetchDashboardData();
        const channel = supabase.channel('dashboard-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'produse' }, () => fetchDashboardData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pierderi' }, () => fetchDashboardData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'vanzari' }, () => fetchDashboardData())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [fetchDashboardData]);

    return (
        <div className="p-8 max-w-7xl mx-auto pb-20">
            <div className="mb-10">
                <h1 className="text-3xl font-black text-gray-800 mb-2 tracking-tight">Consolă Gestiune v0.1.2</h1>
                <p className="text-gray-500 font-medium">Sinteza riscurilor și monitorizarea integrității stocurilor.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <Link to="/produse">
                    <StatCard
                        title="Stocuri Critice"
                        value={`${stats.alerteStoc} Repere`}
                        icon={AlertTriangle}
                        color={stats.alerteStoc > 0 ? "bg-red-500" : "bg-green-500"}
                        trend={{ isPositive: stats.alerteStoc === 0, value: stats.alerteStoc > 0 ? "Alertă Stoc" : "Optim" }}
                        loading={stats.loading}
                    />
                </Link>

                <Link to="/expirari">
                    <StatCard
                        title="Termene Expirare"
                        value={`${stats.alerteExpirari} Loturi`}
                        icon={CalendarClock}
                        color={stats.alerteExpirari > 0 ? "bg-orange-500" : "bg-green-500"}
                        trend={{ isPositive: stats.alerteExpirari === 0, value: stats.alerteExpirari > 0 ? "Risc detectat" : "Sigur" }}
                        loading={stats.loading}
                    />
                </Link>

                <Link to="/istoric-pierderi">
                    <StatCard
                        title="Audit Pierderi"
                        value={`${stats.pierderiLuna} Luna aceasta`}
                        icon={History}
                        color="bg-indigo-600"
                        trend={{ isPositive: true, value: "Monitorizat", label: "trasabilitate activă" }}
                        loading={stats.loading}
                    />
                </Link>

                <StatCard
                    title="Vânzări Astăzi"
                    value={`${stats.vanzariAstazi.toFixed(2)} Lei`}
                    icon={TrendingUp}
                    color="bg-green-500"
                    trend={{ isPositive: true, value: "Incasări" }}
                    loading={stats.loading}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-3xl p-8 border shadow-sm flex flex-col items-center justify-center text-center">
                    <BrainCircuit size={48} className="text-indigo-600 mb-4 animate-pulse" />
                    <h3 className="text-xl font-bold text-gray-800">Sistem de Trasabilitate</h3>
                    <p className="text-gray-400 mt-2 max-w-xs font-medium italic">Fiecare declasare de stoc este acum atribuită nominal angajatului responsabil.</p>
                </div>
                <div className="bg-[#0f172a] rounded-3xl p-8 shadow-xl text-white relative overflow-hidden flex flex-col justify-center">
                    <AlertTriangle size={120} className="absolute -right-10 -bottom-10 opacity-10" />
                    <h3 className="text-2xl font-black mb-4">Protocol de Casare</h3>
                    <p className="text-slate-400 mb-6 font-medium">Administratorul poate audita cine a identificat produsele cu defect sau expirate.</p>
                    <Link to="/pierderi" className="bg-white text-slate-900 px-6 py-3 rounded-xl font-black text-center w-fit hover:bg-slate-200 transition-all">Lansează Raport Pierderi</Link>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
