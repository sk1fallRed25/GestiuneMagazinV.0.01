import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
    SafeAreaView, RefreshControl, Modal, ScrollView
} from 'react-native';
import { supabase } from '../lib/supabase';
import {
    ArrowLeft, AlertTriangle, ClipboardList, TrendingDown, TrendingUp,
    User, Calendar, X, Box, Store
} from 'lucide-react-native';

export default function AdminLogsScreen({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('inventar'); // 'inventar' sau 'pierderi'

    // Date
    const [inventoryLogs, setInventoryLogs] = useState([]);
    const [scrapLogs, setScrapLogs] = useState([]);

    // Modal State (Pop-out)
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    // --- 1. CONFIGURARE REALTIME & FETCH ---
    useEffect(() => {
        fetchLogs();

        // Abonare la modificări live
        const channel = supabase.channel('admin-logs-realtime')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'pierderi' },
                () => {
                    console.log('⚡ Pierdere nouă! Reîmprospătare...');
                    fetchLogs();
                }
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'istoric_inventar' },
                (payload) => {
                    if (payload.new.diferenta !== 0) {
                        console.log('⚡ Diferență inventar! Reîmprospătare...');
                        fetchLogs();
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            // Diferențe Inventar
            const { data: invData, error: invError } = await supabase
                .from('istoric_inventar')
                .select(`*, produse (nume, cod_bare), utilizatori (email, nume)`)
                .neq('diferenta', 0)
                .order('created_at', { ascending: false })
                .limit(50);

            if (invError) throw invError;
            setInventoryLogs(invData || []);

            // Pierderi
            const { data: scrapData, error: scrapError } = await supabase
                .from('pierderi')
                .select(`*, produse (nume, cod_bare), utilizatori (email, nume)`)
                .order('created_at', { ascending: false })
                .limit(50);

            if (scrapError) throw scrapError;
            setScrapLogs(scrapData || []);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const openDetails = (item) => {
        setSelectedItem(item);
        setModalVisible(true);
    };

    const closeModal = () => {
        setModalVisible(false);
        setSelectedItem(null);
    };

    const getUserName = (userObj) => {
        if (!userObj) return 'Necunoscut';
        if (userObj.nume) return userObj.nume;
        return userObj.email ? userObj.email.split('@')[0] : 'Utilizator';
    };

    // --- RENDER ITEMS ---
    const renderInventoryItem = ({ item }) => {
        const isNegative = item.diferenta < 0;
        const date = new Date(item.created_at).toLocaleDateString('ro-RO');

        return (
            <TouchableOpacity style={styles.card} onPress={() => openDetails(item)}>
                <View style={styles.cardHeader}>
                    <Text style={styles.prodName} numberOfLines={1}>{item.produse?.nume}</Text>
                    <Text style={styles.dateText}>{date}</Text>
                </View>
                <View style={styles.row}>
                    <View style={{flexDirection:'row', alignItems:'center', gap:5}}>
                        <User size={14} color="#6b7280" />
                        <Text style={styles.label}>{getUserName(item.utilizatori)}</Text>
                    </View>
                    <View style={[styles.badge, isNegative ? styles.badgeRed : styles.badgeGreen]}>
                        <Text style={[styles.badgeText, isNegative ? {color:'#dc2626'} : {color:'#166534'}]}>
                            {item.diferenta > 0 ? '+' : ''}{item.diferenta} buc
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderScrapItem = ({ item }) => {
        const date = new Date(item.created_at).toLocaleDateString('ro-RO');
        return (
            <TouchableOpacity style={[styles.card, {borderLeftColor: '#ef4444', borderLeftWidth: 4}]} onPress={() => openDetails(item)}>
                <View style={styles.cardHeader}>
                    <Text style={styles.prodName} numberOfLines={1}>{item.produse?.nume}</Text>
                    <AlertTriangle size={16} color="#ef4444" />
                </View>
                <View style={styles.row}>
                    <Text style={[styles.label, {color:'#b91c1c', fontWeight:'bold'}]}>{item.motiv}</Text>
                    <Text style={styles.dateText}>{date}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    // --- MODAL CONTENT ---
    const renderModalContent = () => {
        if (!selectedItem) return null;

        const isInventory = activeTab === 'inventar';
        const date = new Date(selectedItem.created_at).toLocaleDateString('ro-RO');
        const time = new Date(selectedItem.created_at).toLocaleTimeString('ro-RO', {hour:'2-digit', minute:'2-digit'});
        const userName = getUserName(selectedItem.utilizatori);
        const location = selectedItem.locatie || selectedItem.sursa_stoc;

        return (
            <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Detalii {isInventory ? 'Inventar' : 'Pierdere'}</Text>
                    <TouchableOpacity onPress={closeModal}><X size={24} color="#374151" /></TouchableOpacity>
                </View>

                <ScrollView style={{padding: 20}}>
                    <View style={styles.detailSection}>
                        <Text style={styles.detailLabel}>PRODUS VIZAT</Text>
                        <Text style={styles.detailValueBig}>{selectedItem.produse?.nume}</Text>
                        <Text style={styles.detailSub}>{selectedItem.produse?.cod_bare}</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <View style={styles.halfBox}>
                            <View style={{flexDirection:'row', gap:5, alignItems:'center', marginBottom:5}}>
                                <User size={16} color="#4F46E5" />
                                <Text style={styles.detailLabel}>RESPONSABIL</Text>
                            </View>
                            <Text style={styles.detailValue}>{userName}</Text>
                        </View>
                        <View style={styles.halfBox}>
                            <View style={{flexDirection:'row', gap:5, alignItems:'center', marginBottom:5}}>
                                <Calendar size={16} color="#4F46E5" />
                                <Text style={styles.detailLabel}>DATA & ORA</Text>
                            </View>
                            <Text style={styles.detailValue}>{date}</Text>
                            <Text style={styles.detailSub}>{time}</Text>
                        </View>
                    </View>

                    <View style={styles.locationBox}>
                        <View style={{flexDirection:'row', alignItems:'center', gap: 8}}>
                            {location === 'depozit' ? <Box size={24} color="#1e40af" /> : <Store size={24} color="#166534" />}
                            <Text style={styles.locationTitle}>
                                {location === 'depozit' ? 'DEPOZIT CENTRAL' : 'RAFT MAGAZIN'}
                            </Text>
                        </View>
                    </View>

                    {isInventory ? (
                        <View style={styles.diffContainer}>
                            <Text style={styles.diffHeader}>REZULTAT NUMĂRĂTOARE</Text>
                            <View style={styles.diffRow}>
                                <View style={styles.diffBox}>
                                    <Text style={styles.diffLabel}>SCRIPTIC</Text>
                                    <Text style={styles.diffValGray}>{selectedItem.stoc_vechi}</Text>
                                </View>
                                <Text style={{fontSize:20, color:'#9ca3af'}}>➔</Text>
                                <View style={styles.diffBox}>
                                    <Text style={styles.diffLabel}>FAPTIC</Text>
                                    <Text style={styles.diffValBlue}>{selectedItem.stoc_nou}</Text>
                                </View>
                            </View>
                            <View style={[styles.resultBadge, selectedItem.diferenta < 0 ? styles.resRed : styles.resGreen]}>
                                <Text style={[styles.resText, selectedItem.diferenta < 0 ? {color:'#b91c1c'} : {color:'#15803d'}]}>
                                    Diferență: {selectedItem.diferenta > 0 ? '+' : ''}{selectedItem.diferenta} buc
                                </Text>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.scrapContainer}>
                            <Text style={styles.diffHeader}>DETALII INCIDENT</Text>
                            <View style={styles.scrapRow}>
                                <View>
                                    <Text style={styles.scrapLabel}>MOTIV DECLARAT</Text>
                                    <Text style={styles.scrapValue}>{selectedItem.motiv}</Text>
                                </View>
                                <View style={styles.qtyBadge}>
                                    <Text style={styles.qtyText}>-{selectedItem.cantitate}</Text>
                                </View>
                            </View>
                        </View>
                    )}
                </ScrollView>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft size={24} color="#1f2937" /></TouchableOpacity>
                <Text style={styles.title}>Jurnal Probleme (Live)</Text>
            </View>

            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'inventar' && styles.activeTab]}
                    onPress={() => setActiveTab('inventar')}
                >
                    <ClipboardList size={18} color={activeTab === 'inventar' ? 'white' : '#6b7280'} />
                    <Text style={[styles.tabText, activeTab === 'inventar' && styles.activeTabText]}>Diferențe Inventar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'pierderi' && styles.activeTabRed]}
                    onPress={() => setActiveTab('pierderi')}
                >
                    <AlertTriangle size={18} color={activeTab === 'pierderi' ? 'white' : '#6b7280'} />
                    <Text style={[styles.tabText, activeTab === 'pierderi' && styles.activeTabText]}>Pierderi / Deteriorate</Text>
                </TouchableOpacity>
            </View>

            {loading ? <ActivityIndicator size="large" color="#4F46E5" style={{marginTop: 50}} /> : (
                <FlatList
                    data={activeTab === 'inventar' ? inventoryLogs : scrapLogs}
                    keyExtractor={item => item.id.toString()}
                    renderItem={activeTab === 'inventar' ? renderInventoryItem : renderScrapItem}
                    contentContainerStyle={{ padding: 20 }}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchLogs} />}
                    ListEmptyComponent={<Text style={{textAlign:'center', marginTop:50, color:'#9ca3af'}}>Nicio problemă înregistrată.</Text>}
                />
            )}

            <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={closeModal}>
                <View style={styles.modalOverlay}>
                    {renderModalContent()}
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { padding: 20, backgroundColor: 'white', flexDirection: 'row', gap: 15, alignItems: 'center', elevation: 2 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },

    tabs: { flexDirection: 'row', padding: 15, gap: 10 },
    tabBtn: { flex: 1, flexDirection: 'row', padding: 12, justifyContent: 'center', alignItems: 'center', gap: 8, borderRadius: 10, backgroundColor: '#e5e7eb' },
    activeTab: { backgroundColor: '#4F46E5' },
    activeTabRed: { backgroundColor: '#dc2626' },
    tabText: { fontWeight: '600', color: '#6b7280' },
    activeTabText: { color: 'white' },

    card: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 12, elevation: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    prodName: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', flex: 1 },
    dateText: { fontSize: 11, color: '#9ca3af' },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    label: { fontSize: 13, color: '#4b5563' },

    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    badgeRed: { backgroundColor: '#fef2f2' },
    badgeGreen: { backgroundColor: '#f0fdf4' },
    badgeText: { fontWeight: 'bold', fontSize: 12 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: 'white', borderRadius: 20, maxHeight: '80%', overflow: 'hidden' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderColor: '#f3f4f6' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },

    detailSection: { marginBottom: 20, alignItems: 'center' },
    detailLabel: { fontSize: 10, fontWeight: 'bold', color: '#9ca3af', marginBottom: 2 },
    detailValueBig: { fontSize: 22, fontWeight: '900', color: '#111827', textAlign: 'center' },
    detailSub: { color: '#6b7280' },
    detailRow: { flexDirection: 'row', gap: 15, marginBottom: 20 },
    halfBox: { flex: 1, backgroundColor: '#f9fafb', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
    detailValue: { fontSize: 16, fontWeight: 'bold', color: '#374151' },
    locationBox: { backgroundColor: '#eff6ff', padding: 15, borderRadius: 12, marginBottom: 20, flexDirection:'row', justifyContent:'center', borderWidth: 1, borderColor: '#bfdbfe' },
    locationTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e3a8a' },

    diffContainer: { backgroundColor: '#f8fafc', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
    diffHeader: { fontSize: 12, fontWeight: 'bold', color: '#6b7280', marginBottom: 15, textAlign: 'center' },
    diffRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 15 },
    diffBox: { alignItems: 'center' },
    diffLabel: { fontSize: 10, fontWeight: 'bold', color: '#9ca3af' },
    diffValGray: { fontSize: 24, fontWeight: 'bold', color: '#6b7280' },
    diffValBlue: { fontSize: 24, fontWeight: 'bold', color: '#2563eb' },

    resultBadge: { padding: 12, borderRadius: 10, alignItems: 'center' },
    resRed: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
    resGreen: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
    resText: { fontWeight: 'bold', fontSize: 16 },

    scrapContainer: { backgroundColor: '#fef2f2', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#fecaca' },
    scrapRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    scrapLabel: { fontSize: 10, fontWeight: 'bold', color: '#b91c1c' },
    scrapValue: { fontSize: 18, fontWeight: 'bold', color: '#7f1d1d' },
    qtyBadge: { backgroundColor: '#b91c1c', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12 },
    qtyText: { color: 'white', fontWeight: 'bold', fontSize: 20 }
});