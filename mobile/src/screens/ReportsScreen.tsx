import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, SafeAreaView, RefreshControl, ActivityIndicator
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Wallet, CreditCard, Banknote, TrendingUp, Calendar } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';

export default function ReportsScreen({ navigation }: any) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // State pentru statistici
    const [stats, setStats] = useState({
        totalAzi: 0,
        nrComenzi: 0,
        cash: 0,
        card: 0,
        mediaComanda: 0
    });

    const fetchReports = async () => {
        try {
            // 1. Calculăm data de azi (start of day)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayStr = today.toISOString();

            // 2. Luăm toate comenzile de azi
            const { data, error } = await supabase
                .from('comenzi')
                .select('total_plata, metoda_plata')
                .gte('created_at', todayStr);

            if (error) throw error;

            // 3. Procesăm datele local (agregare)
            let total = 0;
            let cash = 0;
            let card = 0;
            let count = data?.length || 0;

            data?.forEach((item: any) => {
                const valoare = parseFloat(item.total_plata);
                total += valoare;
                if (item.metoda_plata === 'card') card += valoare;
                else cash += valoare;
            });

            setStats({
                totalAzi: total,
                nrComenzi: count,
                cash: cash,
                card: card,
                mediaComanda: count > 0 ? total / count : 0
            });

        } catch (err) {
            console.log(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchReports();
        }, [])
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.title}>Raport Vânzări Azi</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchReports();}} />}
            >
                {/* DATA */}
                <View style={styles.dateBadge}>
                    <Calendar size={16} color="#6b7280" />
                    <Text style={styles.dateText}>
                        {new Date().toLocaleDateString('ro-RO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </Text>
                </View>

                {loading && !refreshing ? (
                    <ActivityIndicator size="large" color="#2563eb" style={{marginTop: 50}} />
                ) : (
                    <>
                        {/* CARD PRINCIPAL - TOTAL */}
                        <View style={styles.mainCard}>
                            <Text style={styles.mainLabel}>ÎNCASĂRI TOTALE</Text>
                            <Text style={styles.mainValue}>{stats.totalAzi.toFixed(2)} RON</Text>
                            <View style={styles.row}>
                                <TrendingUp size={16} color="#d1fae5" />
                                <Text style={{color:'#d1fae5', marginLeft:5}}>
                                    {stats.nrComenzi} comenzi procesate
                                </Text>
                            </View>
                        </View>

                        {/* SPLIT CASH / CARD */}
                        <View style={styles.grid}>
                            <View style={[styles.statCard, { backgroundColor: '#e0f2fe' }]}>
                                <View style={[styles.iconCircle, { backgroundColor: '#0284c7' }]}>
                                    <CreditCard size={20} color="white" />
                                </View>
                                <Text style={styles.statLabel}>CARD</Text>
                                <Text style={[styles.statValue, { color: '#0284c7' }]}>{stats.card.toFixed(2)} RON</Text>
                            </View>

                            <View style={[styles.statCard, { backgroundColor: '#dcfce7' }]}>
                                <View style={[styles.iconCircle, { backgroundColor: '#16a34a' }]}>
                                    <Banknote size={20} color="white" />
                                </View>
                                <Text style={styles.statLabel}>CASH</Text>
                                <Text style={[styles.statValue, { color: '#16a34a' }]}>{stats.cash.toFixed(2)} RON</Text>
                            </View>
                        </View>

                        {/* ALTE STATISTICI */}
                        <View style={styles.infoBox}>
                            <View style={styles.infoRow}>
                                <View style={{flexDirection:'row', alignItems:'center', gap:10}}>
                                    <Wallet size={20} color="#6b7280" />
                                    <Text style={styles.infoText}>Media pe comandă</Text>
                                </View>
                                <Text style={styles.infoValue}>{stats.mediaComanda.toFixed(2)} RON</Text>
                            </View>
                        </View>

                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#e5e7eb', paddingTop: 40 },
    backBtn: { marginRight: 15 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
    content: { padding: 20 },

    dateBadge: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 20, backgroundColor: '#f3f4f6', paddingVertical: 8, borderRadius: 20, alignSelf: 'center', paddingHorizontal: 20 },
    dateText: { color: '#4b5563', fontWeight: '600', textTransform: 'capitalize' },

    mainCard: { backgroundColor: '#2563eb', borderRadius: 20, padding: 25, alignItems: 'center', marginBottom: 20, elevation: 5, shadowColor: '#2563eb', shadowOpacity: 0.3, shadowRadius: 10 },
    mainLabel: { color: '#93c5fd', fontWeight: 'bold', fontSize: 12, letterSpacing: 1, marginBottom: 5 },
    mainValue: { color: 'white', fontSize: 36, fontWeight: '900', marginBottom: 10 },
    row: { flexDirection: 'row', alignItems: 'center' },

    grid: { flexDirection: 'row', gap: 15, marginBottom: 20 },
    statCard: { flex: 1, borderRadius: 16, padding: 15, alignItems: 'center' },
    iconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    statLabel: { fontSize: 11, fontWeight: 'bold', color: '#64748b', marginBottom: 2 },
    statValue: { fontSize: 18, fontWeight: 'bold' },

    infoBox: { backgroundColor: 'white', borderRadius: 16, padding: 20, elevation: 1 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    infoText: { color: '#6b7280', fontSize: 14 },
    infoValue: { color: '#1f2937', fontSize: 16, fontWeight: 'bold' }
});