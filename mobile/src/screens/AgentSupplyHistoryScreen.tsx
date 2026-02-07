import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, SafeAreaView, RefreshControl, Modal, ScrollView
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import {
    ArrowLeft, Calendar, ChevronRight, Package,
    FileText, X, CheckCircle, Clock, Truck, AlertTriangle, AlertCircle
} from 'lucide-react-native';

export default function AgentSupplyHistoryScreen({ navigation }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal Detalii
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderDetails, setOrderDetails] = useState([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    useFocusEffect(
        useCallback(() => {
            fetchMyOrders();
        }, [])
    );

    const fetchMyOrders = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('comenzi_aprovizionare')
                .select(`*, furnizori (nume)`)
                .eq('agent_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setOrders(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchOrderDetails = async (orderId, status) => {
        setLoadingDetails(true);
        try {
            // 1. Luăm ce a comandat Agentul
            const { data: orderLines, error: errOrder } = await supabase
                .from('comenzi_aprovizionare_detalii')
                .select(`*, produse (nume, cod_bare)`)
                .eq('comanda_id', orderId);

            if (errOrder) throw errOrder;

            let finalLines = orderLines.map(line => ({
                ...line,
                cantitate_primita: null, // Inițial nu știm
                cantitate_defecte: 0,
                status_linie: 'pending'
            }));

            // 2. Dacă comanda e recepționată, căutăm și ce a scanat Gestionarul
            if (status === 'receptionata') {
                // Găsim recepția legată de această comandă
                // (Presupunem că am salvat comanda_aprovizionare_id în tabelul receptii,
                // sau căutăm după factură. Aici folosim logica de factură pentru siguranță)

                // Mai întâi luăm detaliile comenzii curente pentru factură
                const currentOrder = orders.find(o => o.id === orderId);

                if (currentOrder) {
                    const { data: receipt } = await supabase
                        .from('receptii')
                        .select('id')
                        .eq('serie_factura', currentOrder.serie_factura)
                        .eq('numar_factura', currentOrder.numar_factura)
                        .maybeSingle();

                    if (receipt) {
                        const { data: receiptLines } = await supabase
                            .from('receptii_detalii')
                            .select('produs_id, cantitate_totala, cantitate_defecte')
                            .eq('receptie_id', receipt.id);

                        // 3. Îmbinăm datele (Merge)
                        finalLines = finalLines.map(line => {
                            const recItem = receiptLines.find(r => r.produs_id === line.produs_id);
                            const qtyRec = recItem ? recItem.cantitate_totala : 0;
                            const qtyDef = recItem ? recItem.cantitate_defecte : 0;

                            let st = 'ok';
                            if (qtyRec < line.cantitate_totala) st = 'missing';
                            if (qtyDef > 0) st = 'defect';

                            return {
                                ...line,
                                cantitate_primita: qtyRec,
                                cantitate_defecte: qtyDef,
                                status_linie: st
                            };
                        });
                    }
                }
            }

            setOrderDetails(finalLines);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingDetails(false);
        }
    };

    const openDetails = (order) => {
        setSelectedOrder(order);
        setModalVisible(true);
        fetchOrderDetails(order.id, order.status);
    };

    const getStatusInfo = (status) => {
        switch (status) {
            case 'transmisa': return { color: '#f59e0b', text: 'În Așteptare', icon: Clock };
            case 'confirmata': return { color: '#3b82f6', text: 'Confirmată', icon: CheckCircle };
            case 'in_livrare': return { color: '#8b5cf6', text: 'În Livrare', icon: Truck };
            case 'receptionata': return { color: '#10b981', text: 'Finalizată', icon: Package };
            case 'anulata': return { color: '#ef4444', text: 'Anulată', icon: X };
            default: return { color: '#6b7280', text: status, icon: FileText };
        }
    };

    const renderOrderItem = ({ item }) => {
        const statusInfo = getStatusInfo(item.status);
        const StatusIcon = statusInfo.icon;
        const date = new Date(item.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });

        return (
            <TouchableOpacity style={styles.card} onPress={() => openDetails(item)}>
                <View style={[styles.statusStrip, { backgroundColor: statusInfo.color }]} />
                <View style={styles.cardContent}>
                    <View style={styles.rowBetween}>
                        <Text style={styles.idText}>#{item.id} | {item.serie_factura} {item.numar_factura}</Text>
                        <View style={[styles.badge, { backgroundColor: statusInfo.color + '20' }]}>
                            <StatusIcon size={12} color={statusInfo.color} style={{marginRight:4}} />
                            <Text style={[styles.badgeText, { color: statusInfo.color }]}>
                                {statusInfo.text.toUpperCase()}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.rowBetween}>
                        <View style={styles.dateRow}>
                            <Calendar size={14} color="#9ca3af" />
                            <Text style={styles.dateText}>{date}</Text>
                        </View>
                        <Text style={styles.totalValue}>
                            {item.total_estimat_fara_tva?.toFixed(2)} RON
                        </Text>
                    </View>
                </View>
                <ChevronRight size={20} color="#d1d5db" style={{marginRight:10}} />
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ArrowLeft size={24} color="#374151" />
                </TouchableOpacity>
                <Text style={styles.title}>Istoricul Meu</Text>
            </View>

            {loading ? <ActivityIndicator size="large" color="#0284c7" style={{marginTop:50}} /> : (
                <FlatList
                    data={orders}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderOrderItem}
                    contentContainerStyle={{ padding: 20 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMyOrders(); }} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Package size={48} color="#d1d5db" />
                            <Text style={styles.emptyText}>Nu ai trimis nicio comandă încă.</Text>
                        </View>
                    }
                />
            )}

            {/* MODAL DETALII */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Detalii #{selectedOrder?.serie_factura} {selectedOrder?.numar_factura}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            {loadingDetails ? <ActivityIndicator color="#0284c7" /> : (
                                orderDetails.map((det, index) => {
                                    // LOGICA VIZUALĂ PENTRU DIFERENȚE
                                    const isReceived = selectedOrder?.status === 'receptionata';
                                    const hasDifference = isReceived && (det.status_linie === 'missing' || det.status_linie === 'defect');

                                    return (
                                        <View key={index} style={[styles.detailItem, hasDifference && {backgroundColor: '#fef2f2'}]}>
                                            <View style={{flex:1}}>
                                                <Text style={styles.prodName}>{det.produse?.nume}</Text>
                                                <Text style={styles.prodSub}>
                                                    Comandat: {det.nr_baxuri > 0 ? `${det.nr_baxuri} Bax ` : ''}{det.cantitate_fractionara > 0 ? `+ ${det.cantitate_fractionara} Buc` : ''}
                                                    {` (Total: ${det.cantitate_totala})`}
                                                </Text>

                                                {/* AFIȘARE ERORI/DIFERENȚE */}
                                                {isReceived && det.status_linie === 'missing' && (
                                                    <View style={{flexDirection:'row', alignItems:'center', marginTop:2}}>
                                                        <AlertTriangle size={12} color="#dc2626" />
                                                        <Text style={{color:'#dc2626', fontSize:12, fontWeight:'bold', marginLeft:4}}>
                                                            Lipsă la recepție! (Sosit: {det.cantitate_primita})
                                                        </Text>
                                                    </View>
                                                )}
                                                {isReceived && det.status_linie === 'defect' && (
                                                    <View style={{flexDirection:'row', alignItems:'center', marginTop:2}}>
                                                        <AlertCircle size={12} color="#dc2626" />
                                                        <Text style={{color:'#dc2626', fontSize:12, fontWeight:'bold', marginLeft:4}}>
                                                            {det.cantitate_defecte} buc DEFECTE
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>

                                            <View style={{alignItems:'flex-end', justifyContent:'center'}}>
                                                {isReceived && det.status_linie === 'ok' ? (
                                                    <CheckCircle size={20} color="#059669" />
                                                ) : (
                                                    <Text style={styles.prodPrice}>
                                                        {det.pret_unitar_fara_tva} RON
                                                    </Text>
                                                )}
                                            </View>
                                        </View>
                                    );
                                })
                            )}
                        </ScrollView>

                        <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                            <Text style={styles.closeBtnText}>Închide</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { padding: 20, backgroundColor: 'white', flexDirection: 'row', gap: 15, alignItems: 'center', elevation: 2 },
    title: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
    card: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 12, marginBottom: 12, elevation: 1, overflow: 'hidden', alignItems: 'center' },
    statusStrip: { width: 6, height: '100%' },
    cardContent: { flex: 1, padding: 15 },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    idText: { fontWeight: 'bold', fontSize: 14, color: '#374151' },
    badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeText: { fontSize: 10, fontWeight: '800' },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dateText: { fontSize: 12, color: '#9ca3af' },
    divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 8 },
    totalValue: { fontSize: 14, fontWeight: 'bold', color: '#1f2937' },
    emptyState: { alignItems: 'center', marginTop: 50 },
    emptyText: { color: '#9ca3af', marginTop: 10, fontSize: 16 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '70%', padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    detailItem: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f3f4f6', paddingHorizontal:5 },
    prodName: { fontWeight: 'bold', color: '#374151', fontSize: 14 },
    prodSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
    prodPrice: { fontSize: 11, color: '#059669' },
    closeBtn: { backgroundColor: '#f3f4f6', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 20 },
    closeBtnText: { color: '#374151', fontWeight: 'bold' }
});