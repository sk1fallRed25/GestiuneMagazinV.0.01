import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, SafeAreaView, RefreshControl, ActivityIndicator, TouchableOpacity
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Calendar, TrendingUp, Award, DollarSign } from 'lucide-react-native';

export default function ReportsScreen({ navigation }: any) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Starea pentru statistici
    const [stats, setStats] = useState({
        todayTotal: 0,
        weekTotal: 0,
        monthlyStats: [] as any[]
    });

    // --- FUNCȚIA DE CALCUL (MATE) ---
    const fetchReports = async () => {
        try {
            const now = new Date();

            // Definim startul anului curent
            const startYear = new Date(now.getFullYear(), 0, 1);

            // Definim startul zilei de azi (pentru comparație locală)
            const startToday = new Date();
            startToday.setHours(0,0,0,0);

            // Definim startul săptămânii (7 zile în urmă)
            const startWeek = new Date();
            startWeek.setDate(now.getDate() - 6);
            startWeek.setHours(0,0,0,0);

            // Luăm TOATE comenzile din acest an
            const { data, error } = await supabase
                .from('comenzi')
                .select('created_at, total_plata')
                .gte('created_at', startYear.toISOString())
                .order('created_at', { ascending: true });

            if (error) throw error;

            // Dacă nu sunt date (după ce ai șters tot), punem 0 peste tot
            if (!data || data.length === 0) {
                setStats({ todayTotal: 0, weekTotal: 0, monthlyStats: [] });
                setLoading(false);
                setRefreshing(false);
                return;
            }

            // Procesare Date
            let sumToday = 0;
            let sumWeek = 0;
            const monthsMap: any = {};

            data.forEach((item: any) => {
                const date = new Date(item.created_at);
                const val = parseFloat(item.total_plata);

                // A. Azi
                if (date >= startToday) sumToday += val;
                // B. 7 Zile
                if (date >= startWeek) sumWeek += val;

                // C. Lunar
                const monthIndex = date.getMonth();
                if (!monthsMap[monthIndex]) monthsMap[monthIndex] = 0;
                monthsMap[monthIndex] += val;
            });

            // Transformare în Array pentru Top Productivitate
            const monthlyStatsArray = Object.keys(monthsMap).map((key) => {
                const monthIndex = parseInt(key);
                const total = monthsMap[monthIndex];

                // Calcul medie zilnică
                const isCurrentMonth = monthIndex === now.getMonth();
                const daysInMonth = new Date(now.getFullYear(), monthIndex + 1, 0).getDate();
                const daysPassed = isCurrentMonth ? now.getDate() : daysInMonth;
                const dailyAverage = daysPassed > 0 ? total / daysPassed : 0;

                const monthName = new Date(now.getFullYear(), monthIndex, 1)
                    .toLocaleDateString('ro-RO', { month: 'long' });

                return {
                    name: monthName.charAt(0).toUpperCase() + monthName.slice(1),
                    total: total,
                    average: dailyAverage,
                    isBest: false
                };
            });

            // Găsim cea mai bună lună
            let maxAvg = 0;
            monthlyStatsArray.forEach(m => { if (m.average > maxAvg) maxAvg = m.average; });
            monthlyStatsArray.forEach(m => { if (m.average === maxAvg && maxAvg > 0) m.isBest = true; });

            // Sortăm invers cronologic (cea mai recentă sus)
            monthlyStatsArray.reverse();

            setStats({
                todayTotal: sumToday,
                weekTotal: sumWeek,
                monthlyStats: monthlyStatsArray
            });

        } catch (err) {
            console.log(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // 1. Încărcare inițială când intrăm pe ecran
    useFocusEffect(
        useCallback(() => {
            fetchReports();
        }, [])
    );

    // 2. REALTIME LISTENER (PARTEA MAGICĂ)
    // Ascultă tabelul 'comenzi'. Când apare un INSERT nou, recalculează totul.
    useEffect(() => {
        console.log("📡 Se conectează la canalul de vânzări live...");

        const channel = supabase
            .channel('public:comenzi') // Canal unic
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'comenzi' },
                (payload) => {
                    console.log('💰 VÂNZARE NOUĂ!', payload.new);
                    // Reîmprospătăm datele imediat
                    fetchReports();
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') console.log('✅ Conectat la fluxul de bani!');
            });

        return () => { supabase.removeChannel(channel); };
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.title}>Rapoarte Live</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchReports();}} />}
            >
                {loading && !refreshing ? (
                    <ActivityIndicator size="large" color="#2563eb" style={{marginTop: 50}} />
                ) : (
                    <>
                        <View style={styles.liveIndicator}>
                            <View style={styles.dot} />
                            <Text style={styles.liveText}>Sistem conectat în timp real</Text>
                        </View>

                        {/* 1. RAPORT AZI & 7 ZILE */}
                        <View style={styles.sectionTitle}>
                            <Text style={styles.sectionText}>REZUMAT FINANCIAR</Text>
                        </View>

                        <View style={styles.rowCards}>
                            <View style={[styles.card, styles.cardBlue]}>
                                <View style={styles.cardIcon}><Calendar color="white" size={20} /></View>
                                <Text style={styles.cardLabel}>Vânzări Azi</Text>
                                <Text style={styles.cardValue}>{stats.todayTotal.toFixed(2)} RON</Text>
                            </View>

                            <View style={[styles.card, styles.cardPurple]}>
                                <View style={styles.cardIcon}><TrendingUp color="white" size={20} /></View>
                                <Text style={styles.cardLabel}>Ultimele 7 Zile</Text>
                                <Text style={styles.cardValue}>{stats.weekTotal.toFixed(2)} RON</Text>
                            </View>
                        </View>

                        {/* 2. RAPORT TOP PRODUCTIVITATE */}
                        <View style={styles.sectionTitle}>
                            <Text style={styles.sectionText}>PRODUCTIVITATE (Medie Zilnică)</Text>
                        </View>

                        <View style={styles.listContainer}>
                            {stats.monthlyStats.length === 0 ? (
                                <View style={{padding: 30, alignItems:'center'}}>
                                    <DollarSign size={40} color="#e5e7eb" />
                                    <Text style={{textAlign:'center', color:'#9ca3af', marginTop:10}}>
                                        Nu există vânzări înregistrate. {"\n"}Totul este curat.
                                    </Text>
                                </View>
                            ) : (
                                stats.monthlyStats.map((month, index) => (
                                    <View key={index} style={[styles.listItem, month.isBest ? styles.bestItem : {}]}>
                                        <View style={styles.monthInfo}>
                                            <View style={{flexDirection:'row', alignItems:'center', gap:5}}>
                                                <Text style={[styles.monthName, month.isBest ? {color:'#92400e'} : {}]}>
                                                    {month.name}
                                                </Text>
                                                {month.isBest && <Award size={16} color="#d97706" fill="#d97706" />}
                                            </View>
                                            <Text style={styles.totalText}>Total: {month.total.toFixed(0)} RON</Text>
                                        </View>

                                        <View style={styles.avgContainer}>
                                            <Text style={styles.avgLabel}>Medie / Zi</Text>
                                            <Text style={[styles.avgValue, month.isBest ? {color:'#d97706'} : {}]}>
                                                {month.average.toFixed(2)}
                                            </Text>
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: 'white', paddingTop: 40 },
    backBtn: { marginRight: 15 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
    content: { padding: 20 },

    liveIndicator: { flexDirection:'row', alignItems:'center', justifyContent:'center', marginBottom:10, gap:6 },
    dot: { width:8, height:8, borderRadius:4, backgroundColor:'#22c55e' },
    liveText: { fontSize:12, color:'#22c55e', fontWeight:'600' },

    sectionTitle: { marginBottom: 15, marginTop: 10 },
    sectionText: { fontSize: 12, fontWeight: 'bold', color: '#6b7280', letterSpacing: 1 },
    rowCards: { flexDirection: 'row', gap: 15, marginBottom: 30 },
    card: { flex: 1, padding: 20, borderRadius: 20, elevation: 3 },
    cardBlue: { backgroundColor: '#2563eb' },
    cardPurple: { backgroundColor: '#7c3aed' },
    cardIcon: { backgroundColor: 'rgba(255,255,255,0.2)', width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    cardLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 'bold', marginBottom: 5 },
    cardValue: { color: 'white', fontSize: 22, fontWeight: '900' },

    listContainer: { backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', elevation: 2 },
    listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    bestItem: { backgroundColor: '#fef3c7' },
    monthInfo: { gap: 2 },
    monthName: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
    totalText: { fontSize: 12, color: '#6b7280' },
    avgContainer: { alignItems: 'flex-end' },
    avgLabel: { fontSize: 10, color: '#9ca3af', textTransform: 'uppercase' },
    avgValue: { fontSize: 18, fontWeight: 'bold', color: '#374151' }
});