import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Calendar, TrendingUp, Award, DollarSign } from 'lucide-react-native';

export default function ReportsScreen({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({ todayTotal: 0, weekTotal: 0, monthlyStats: [] });

    // --- REALTIME LISTENER ---
    useEffect(() => {
        const channel = supabase.channel('sales-live')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'bonuri' },
                () => {
                    console.log('💰 Vânzare nouă! Reîmprospătare rapoarte...');
                    fetchReports();
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchReports = async () => {
        try {
            const now = new Date();
            const startYear = new Date(now.getFullYear(), 0, 1);
            const startToday = new Date(); startToday.setHours(0,0,0,0);
            const startWeek = new Date(); startWeek.setDate(now.getDate() - 6); startWeek.setHours(0,0,0,0);

            const { data, error } = await supabase
                .from('bonuri')
                .select('created_at, total')
                .gte('created_at', startYear.toISOString())
                .order('created_at', { ascending: true });

            if (error) throw error;
            if (!data || data.length === 0) {
                setStats({ todayTotal: 0, weekTotal: 0, monthlyStats: [] });
                setLoading(false); return;
            }

            let sumToday = 0, sumWeek = 0;
            const monthsMap = {};

            data.forEach(item => {
                const date = new Date(item.created_at);
                const val = Number(item.total);

                if (date >= startToday) sumToday += val;
                if (date >= startWeek) sumWeek += val;

                const monthIndex = date.getMonth();
                if (!monthsMap[monthIndex]) monthsMap[monthIndex] = 0;
                monthsMap[monthIndex] += val;
            });

            const monthlyStatsArray = Object.keys(monthsMap).map(key => {
                const idx = parseInt(key);
                const total = monthsMap[idx];
                const isCurrent = idx === now.getMonth();
                const daysPassed = isCurrent ? now.getDate() : new Date(now.getFullYear(), idx + 1, 0).getDate();

                return {
                    name: new Date(now.getFullYear(), idx, 1).toLocaleDateString('ro-RO', { month: 'long' }),
                    total: total,
                    average: daysPassed > 0 ? total / daysPassed : total,
                    isBest: false
                };
            });

            let maxAvg = 0;
            monthlyStatsArray.forEach(m => { if (m.average > maxAvg) maxAvg = m.average; });
            monthlyStatsArray.forEach(m => { if (m.average === maxAvg && maxAvg > 0) m.isBest = true; });

            setStats({ todayTotal: sumToday, weekTotal: sumWeek, monthlyStats: monthlyStatsArray.reverse() });

        } catch (err) { console.log(err); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useFocusEffect(useCallback(() => { fetchReports(); }, []));

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft size={24} color="#1f2937" /></TouchableOpacity>
                <Text style={styles.title}>Rapoarte Live</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchReports();}} />}>
                {loading && !refreshing ? <ActivityIndicator size="large" color="#2563eb" /> : (
                    <>
                        <View style={styles.liveIndicator}>
                            <View style={styles.dot} />
                            <Text style={styles.liveText}>CONECTAT LA SERVER</Text>
                        </View>

                        <View style={styles.rowCards}>
                            <View style={[styles.card, styles.cardBlue]}>
                                <Calendar color="white" size={20} />
                                <Text style={styles.cardLabel}>Vânzări Azi</Text>
                                <Text style={styles.cardValue}>{stats.todayTotal.toFixed(2)} RON</Text>
                            </View>
                            <View style={[styles.card, styles.cardPurple]}>
                                <TrendingUp color="white" size={20} />
                                <Text style={styles.cardLabel}>Ultimele 7 Zile</Text>
                                <Text style={styles.cardValue}>{stats.weekTotal.toFixed(2)} RON</Text>
                            </View>
                        </View>

                        <View style={styles.listContainer}>
                            {stats.monthlyStats.map((month, index) => (
                                <View key={index} style={[styles.listItem, month.isBest ? styles.bestItem : {}]}>
                                    <View>
                                        <Text style={[styles.monthName, month.isBest ? {color:'#92400e'} : {}]}>
                                            {month.name.toUpperCase()} {month.isBest && <Award size={14} color="#d97706" />}
                                        </Text>
                                        <Text style={styles.totalText}>Total: {month.total.toFixed(0)} RON</Text>
                                    </View>
                                    <View style={{alignItems:'flex-end'}}>
                                        <Text style={styles.avgLabel}>MEDIE / ZI</Text>
                                        <Text style={styles.avgValue}>{month.average.toFixed(2)}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: 'white', gap: 15 },
    title: { fontSize: 20, fontWeight: 'bold' },
    content: { padding: 20 },
    liveIndicator: { flexDirection:'row', alignItems:'center', justifyContent:'center', marginBottom:15, gap:6 },
    dot: { width:8, height:8, borderRadius:4, backgroundColor:'#22c55e' },
    liveText: { fontSize:10, color:'#22c55e', fontWeight:'900', letterSpacing:1 },
    rowCards: { flexDirection: 'row', gap: 15, marginBottom: 20 },
    card: { flex: 1, padding: 20, borderRadius: 16, alignItems:'center', gap:5 },
    cardBlue: { backgroundColor: '#2563eb' },
    cardPurple: { backgroundColor: '#7c3aed' },
    cardLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 'bold' },
    cardValue: { color: 'white', fontSize: 20, fontWeight: '900' },
    listContainer: { backgroundColor: 'white', borderRadius: 16, overflow: 'hidden' },
    listItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderColor: '#f3f4f6' },
    bestItem: { backgroundColor: '#fef3c7' },
    monthName: { fontWeight: 'bold', color: '#374151' },
    totalText: { fontSize: 12, color: '#6b7280' },
    avgLabel: { fontSize: 10, color: '#9ca3af' },
    avgValue: { fontSize: 16, fontWeight: 'bold' }
});