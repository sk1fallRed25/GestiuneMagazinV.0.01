import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, SafeAreaView, RefreshControl,
    ActivityIndicator, TouchableOpacity, Platform, Modal, FlatList
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
    ArrowLeft, Calendar, TrendingUp, Award,
    ChevronLeft, ChevronRight, FileText, Clock, CalendarDays, Eye, X, CreditCard, Banknote
} from 'lucide-react-native';

export default function ReportsScreen({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Statistici Generale
    const [stats, setStats] = useState({ todayTotal: 0, weekTotal: 0, monthlyStats: [] });

    // --- ISTORIC ZILNIC ---
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [dailyReceipts, setDailyReceipts] = useState([]);
    const [dailyTotal, setDailyTotal] = useState(0);
    const [loadingDay, setLoadingDay] = useState(false);

    // Calendar Picker State
    const [showPicker, setShowPicker] = useState(false);

    // --- MODAL DETALII BON ---
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedBon, setSelectedBon] = useState(null);
    const [bonDetails, setBonDetails] = useState([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // --- CONFIGURARE REALTIME & FETCH ---
    useEffect(() => {
        fetchDailyHistory(selectedDate);

        const channel = supabase.channel('reports-live')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'bonuri' },
                () => {
                    fetchGeneralReports();
                    fetchDailyHistory(selectedDate);
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [selectedDate]);

    useFocusEffect(useCallback(() => { fetchGeneralReports(); }, []));

    // --- A. RAPOARTE GENERALE ---
    const fetchGeneralReports = async () => {
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

            setStats({
                todayTotal: sumToday,
                weekTotal: sumWeek,
                monthlyStats: monthlyStatsArray.reverse()
            });

        } catch (err) { console.log(err); }
        finally { setLoading(false); setRefreshing(false); }
    };

    // --- B. ISTORIC ZILNIC ---
    const fetchDailyHistory = async (date) => {
        setLoadingDay(true);
        try {
            const start = new Date(date); start.setHours(0,0,0,0);
            const end = new Date(date); end.setHours(23,59,59,999);

            const { data, error } = await supabase
                .from('bonuri')
                .select('*')
                .gte('created_at', start.toISOString())
                .lte('created_at', end.toISOString())
                .order('created_at', { ascending: false });

            if (error) throw error;

            const total = data.reduce((acc, curr) => acc + parseFloat(curr.total), 0);
            setDailyTotal(total);
            setDailyReceipts(data || []);

        } catch (error) {
            console.error(error);
        } finally {
            setLoadingDay(false);
        }
    };

    // --- C. DETALII BON (PRODUSE + PLATA) ---
    const openBonDetails = async (bon) => {
        setSelectedBon(bon);
        setModalVisible(true);
        setLoadingDetails(true);

        try {
            // Aducem produsele de pe bon
            const { data, error } = await supabase
                .from('bonuri_detalii')
                .select(`
                    *,
                    produse (nume)
                `)
                .eq('bon_id', bon.id);

            if (error) throw error;
            setBonDetails(data || []);
        } catch (err) {
            console.error("Eroare detalii:", err);
        } finally {
            setLoadingDetails(false);
        }
    };

    // --- HELPERS NAVIGARE ---
    const changeDate = (days) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + days);
        setSelectedDate(newDate);
    };

    const handleOpenCalendar = () => {
        if (Platform.OS === 'web') {
            alert("⚠️ Calendarul nativ funcționează doar pe telefon. Pe web, folosește săgețile.");
            return;
        }
        setShowPicker(true);
    };

    const onDateChange = (event, date) => {
        if (Platform.OS === 'android') setShowPicker(false);
        if (event.type === 'set' && date) setSelectedDate(date);
        else if (event.type === 'dismissed') setShowPicker(false);
    };

    const formattedDate = selectedDate.toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' });

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft size={24} color="#1f2937" /></TouchableOpacity>
                <Text style={styles.title}>Rapoarte & Vânzări</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchGeneralReports(); fetchDailyHistory(selectedDate);}} />}
            >
                <View style={styles.liveIndicator}>
                    <View style={styles.dot} />
                    <Text style={styles.liveText}>CONECTAT LA SERVER</Text>
                </View>

                {/* --- 1. CARDURI STATISTICI --- */}
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

                {/* --- 2. ISTORIC ZILNIC --- */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Istoric Vânzări (Pe Zile)</Text>

                    <View style={styles.dateNavigator}>
                        <TouchableOpacity style={styles.navBtn} onPress={() => changeDate(-1)}>
                            <ChevronLeft size={24} color="#374151" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.dateCenterBtn} onPress={handleOpenCalendar}>
                            <CalendarDays size={18} color="#4F46E5" />
                            <Text style={styles.dateText}>{formattedDate.toUpperCase()}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.navBtn} onPress={() => changeDate(1)}>
                            <ChevronRight size={24} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    {showPicker && (
                        <DateTimePicker testID="dateTimePicker" value={selectedDate} mode="date" display="default" onChange={onDateChange} maximumDate={new Date()} />
                    )}

                    <View style={styles.daySummary}>
                        <View>
                            <Text style={styles.summaryLabel}>TOTAL ZI</Text>
                            <Text style={styles.summaryValueBig}>{dailyTotal.toFixed(2)} RON</Text>
                        </View>
                        <View style={{alignItems:'flex-end'}}>
                            <Text style={styles.summaryLabel}>BONURI</Text>
                            <Text style={styles.summaryValueBig}>{dailyReceipts.length}</Text>
                        </View>
                    </View>

                    {/* LISTA BONURI CU BUTON DETALII */}
                    {loadingDay ? <ActivityIndicator color="#4F46E5" style={{padding:20}} /> : (
                        <View style={styles.receiptsList}>
                            {dailyReceipts.length === 0 ? (
                                <Text style={styles.emptyText}>Nicio vânzare în această zi.</Text>
                            ) : (
                                dailyReceipts.map((bon) => (
                                    <TouchableOpacity key={bon.id} style={styles.receiptItem} onPress={() => openBonDetails(bon)}>
                                        <View style={{flexDirection:'row', alignItems:'center', gap:10}}>
                                            <View style={[styles.iconBox, {backgroundColor: '#e0e7ff'}]}>
                                                <FileText size={18} color="#4F46E5" />
                                            </View>
                                            <View>
                                                <Text style={styles.receiptId}>Bon #{bon.id.toString().slice(-4)}</Text>
                                                <View style={{flexDirection:'row', alignItems:'center', gap:4}}>
                                                    <Clock size={10} color="#9ca3af" />
                                                    <Text style={styles.receiptTime}>
                                                        {new Date(bon.created_at).toLocaleTimeString('ro-RO', {hour:'2-digit', minute:'2-digit'})}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>

                                        <View style={{flexDirection:'row', alignItems:'center', gap:10}}>
                                            <Text style={styles.receiptValue}>+{Number(bon.total).toFixed(2)} RON</Text>
                                            <Eye size={20} color="#9ca3af" />
                                        </View>
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>
                    )}
                </View>

                {/* --- 3. RAPORT LUNAR --- */}
                <View style={[styles.sectionContainer, {marginTop: 20}]}>
                    <Text style={styles.sectionTitle}>Performanță Lunară</Text>
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
                </View>

            </ScrollView>

            {/* --- MODAL DETALII --- */}
            <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                Detalii Bon #{selectedBon?.id?.toString().slice(-4)}
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        {selectedBon && (
                            <View style={styles.paymentInfoBox}>
                                <Text style={styles.paymentLabel}>METODĂ PLATĂ:</Text>
                                <View style={styles.paymentBadge}>
                                    {selectedBon.metoda_plata === 'card' ? <CreditCard size={14} color="#059669"/> : <Banknote size={14} color="#059669"/>}
                                    <Text style={styles.paymentText}>
                                        {selectedBon.metoda_plata ? selectedBon.metoda_plata.toUpperCase() : 'CASH'}
                                    </Text>
                                </View>
                                {/* Dacă e plată mixtă, poți afișa aici detaliile */}
                            </View>
                        )}

                        <Text style={styles.listHeader}>Produse Vândute:</Text>

                        {loadingDetails ? <ActivityIndicator size="large" color="#4F46E5" style={{marginTop:20}} /> : (
                            <FlatList
                                data={bonDetails}
                                keyExtractor={(item) => item.id.toString()}
                                contentContainerStyle={{paddingBottom: 20}}
                                ListEmptyComponent={<Text style={{textAlign:'center', marginTop:20, color:'#9ca3af'}}>Nu există detalii salvate pentru acest bon.</Text>}
                                renderItem={({item}) => (
                                    <View style={styles.detailItem}>
                                        <View style={{flex:1}}>
                                            <Text style={styles.prodName}>{item.produse?.nume || 'Produs Șters'}</Text>
                                            <Text style={styles.prodQty}>{item.cantitate} buc x {item.pret_vanzare} RON</Text>
                                        </View>
                                        <Text style={styles.prodTotal}>{item.subtotal} RON</Text>
                                    </View>
                                )}
                            />
                        )}

                        <View style={styles.modalFooter}>
                            <Text style={styles.totalLabel}>TOTAL ACHITAT:</Text>
                            <Text style={styles.totalValue}>{selectedBon?.total} RON</Text>
                        </View>
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: 'white', gap: 15, elevation: 2 },
    title: { fontSize: 20, fontWeight: 'bold' },
    content: { padding: 20, paddingBottom: 50 },

    liveIndicator: { flexDirection:'row', alignItems:'center', justifyContent:'center', marginBottom:15, gap:6 },
    dot: { width:8, height:8, borderRadius:4, backgroundColor:'#22c55e' },
    liveText: { fontSize:10, color:'#22c55e', fontWeight:'900', letterSpacing:1 },

    // Cards
    rowCards: { flexDirection: 'row', gap: 15, marginBottom: 25 },
    card: { flex: 1, padding: 20, borderRadius: 16, alignItems:'center', gap:5 },
    cardBlue: { backgroundColor: '#2563eb' },
    cardPurple: { backgroundColor: '#7c3aed' },
    cardLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 'bold' },
    cardValue: { color: 'white', fontSize: 20, fontWeight: '900' },

    // Sections
    sectionContainer: { backgroundColor: 'white', borderRadius: 16, padding: 15, elevation: 1 },
    sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#6b7280', marginBottom: 15, marginLeft: 5 },

    // Date Navigator
    dateNavigator: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, backgroundColor: '#f3f4f6', borderRadius: 12, padding: 5 },
    navBtn: { padding: 10, backgroundColor: 'white', borderRadius: 8, elevation: 1 },
    dateCenterBtn: { flexDirection:'row', alignItems:'center', gap: 8, padding: 10, backgroundColor:'#e0e7ff', borderRadius:8 },
    dateText: { fontWeight: 'bold', color: '#4338ca', fontSize: 14 },

    // Summary
    daySummary: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#e0e7ff', padding: 15, borderRadius: 12, marginBottom: 15 },
    summaryLabel: { fontSize: 10, fontWeight: 'bold', color: '#4338ca', marginBottom: 2 },
    summaryValueBig: { fontSize: 18, fontWeight: '900', color: '#312e81' },

    // Receipts List
    receiptsList: { gap: 10 },
    emptyText: { textAlign: 'center', color: '#9ca3af', padding: 20, fontStyle: 'italic' },
    receiptItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f3f4f6' },
    iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    receiptId: { fontWeight: 'bold', color: '#374151', fontSize: 14 },
    receiptTime: { color: '#9ca3af', fontSize: 11 },
    receiptValue: { fontWeight: 'bold', color: '#166534', fontSize: 15 },

    // Monthly List
    listContainer: { borderRadius: 16, overflow: 'hidden' },
    listItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderColor: '#f3f4f6' },
    bestItem: { backgroundColor: '#fffbeb' },
    monthName: { fontWeight: 'bold', color: '#374151' },
    totalText: { fontSize: 12, color: '#6b7280' },
    avgLabel: { fontSize: 10, color: '#9ca3af' },
    avgValue: { fontSize: 16, fontWeight: 'bold' },

    // MODAL STYLES
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '70%', padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },

    paymentInfoBox: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', backgroundColor:'#ecfdf5', padding:10, borderRadius:8, marginBottom:15, borderWidth:1, borderColor:'#d1fae5' },
    paymentLabel: { fontSize:12, fontWeight:'bold', color:'#065f46' },
    paymentBadge: { flexDirection:'row', alignItems:'center', gap:5 },
    paymentText: { fontWeight:'bold', color:'#059669' },

    listHeader: { fontSize:14, fontWeight:'bold', color:'#6b7280', marginBottom:10 },

    detailItem: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:12, borderBottomWidth:1, borderColor:'#f3f4f6' },
    prodName: { fontSize:14, fontWeight:'bold', color:'#1f2937' },
    prodQty: { fontSize:12, color:'#9ca3af' },
    prodTotal: { fontSize:14, fontWeight:'bold', color:'#111827' },

    modalFooter: { marginTop: 10, borderTopWidth: 1, borderColor: '#e5e7eb', paddingTop: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalLabel: { fontSize: 16, fontWeight: 'bold', color: '#374151' },
    totalValue: { fontSize: 24, fontWeight: '900', color: '#4F46E5' }
});