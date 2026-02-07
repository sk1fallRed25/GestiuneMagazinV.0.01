import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Alert, Modal, ActivityIndicator, SafeAreaView, ScrollView, RefreshControl
} from 'react-native';
import { supabase } from '../lib/supabase';
import {
    ArrowLeft, CheckCircle, XCircle, FileText,
    User, Calendar, ChevronRight, X, Truck, Package, Clock
} from 'lucide-react-native';

export default function AdminSupplyOrdersScreen({ navigation }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal Detalii
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderDetails, setOrderDetails] = useState([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            // Luăm comenzile active + istoricul recent
            const { data, error } = await supabase
                .from('comenzi_aprovizionare')
                .select(`
                    *,
                    furnizori (nume),
                    utilizatori (nume, email)
                `)
                .order('created_at', { ascending: false }); // Cele mai noi primele

            if (error) throw error;
            setOrders(data || []);
        } catch (err) {
            Alert.alert("Eroare", err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchDetails = async (orderId) => {
        setLoadingDetails(true);
        try {
            const { data, error } = await supabase
                .from('comenzi_aprovizionare_detalii')
                .select(`
                    *,
                    produse (nume, cod_bare)
                `)
                .eq('comanda_id', orderId);

            if (error) throw error;
            setOrderDetails(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingDetails(false);
        }
    };

    const openOrder = (order) => {
        setSelectedOrder(order);
        setOrderDetails([]);
        setModalVisible(true);
        fetchDetails(order.id);
    };

    const updateStatus = async (newStatus) => {
        if (!selectedOrder) return;

        try {
            const { error } = await supabase
                .from('comenzi_aprovizionare')
                .update({ status: newStatus })
                .eq('id', selectedOrder.id);

            if (error) throw error;

            Alert.alert("Succes", `Comanda a fost actualizată: ${newStatus.toUpperCase()}`);
            setModalVisible(false);
            fetchOrders(); // Reîmprospătăm lista
        } catch (err) {
            Alert.alert("Eroare", err.message);
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'transmisa': return { color: '#f59e0b', text: 'În Așteptare', icon: Clock };
            case 'confirmata': return { color: '#3b82f6', text: 'Confirmată', icon: CheckCircle };
            case 'in_livrare': return { color: '#8b5cf6', text: 'În Livrare', icon: Truck };
            case 'receptionata': return { color: '#10b981', text: 'Recepționată', icon: Package };
            case 'anulata': return { color: '#ef4444', text: 'Anulată', icon: XCircle };
            default: return { color: '#6b7280', text: status, icon: FileText };
        }
    };

    const renderOrderItem = ({ item }) => {
        const date = new Date(item.created_at).toLocaleDateString('ro-RO', {day: '2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit'});
        const { color, text, icon: Icon } = getStatusStyle(item.status);

        return (
            <TouchableOpacity style={styles.card} onPress={() => openOrder(item)}>
                <View style={[styles.statusLine, { backgroundColor: color }]} />
                <View style={styles.cardContent}>
                    <View style={styles.rowBetween}>
                        <Text style={styles.supplierName}>{item.furnizori?.nume || 'Furnizor Necunoscut'}</Text>
                        <View style={[styles.badge, { backgroundColor: color + '20' }]}>
                            <Text style={[styles.badgeText, { color: color }]}>{text.toUpperCase()}</Text>
                        </View>
                    </View>

                    {/* ZONA FACTURĂ - NOU */}
                    <View style={styles.invoiceRow}>
                        <FileText size={14} color="#4b5563" />
                        <Text style={styles.invoiceText}>
                            Factura: <Text style={{fontWeight:'bold'}}>{item.serie_factura || '---'} {item.numar_factura || ''}</Text>
                        </Text>
                    </View>

                    <Text style={styles.agentName}>Agent: {item.utilizatori?.nume || item.utilizatori?.email}</Text>

                    <View style={[styles.rowBetween, {marginTop: 8}]}>
                        <View style={styles.metaBox}>
                            <Calendar size={14} color="#9ca3af" />
                            <Text style={styles.metaText}>{date}</Text>
                        </View>
                        <Text style={styles.totalText}>
                            {item.total_estimat_fara_tva ? item.total_estimat_fara_tva.toFixed(2) : '0.00'} RON
                        </Text>
                    </View>
                </View>
                <ChevronRight size={20} color="#d1d5db" style={{ marginRight: 10 }} />
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ArrowLeft size={24} color="#374151" />
                </TouchableOpacity>
                <Text style={styles.title}>Comenzi Agenți</Text>
            </View>

            {loading ? <ActivityIndicator size="large" color="#4F46E5" style={{marginTop: 50}} /> : (
                <FlatList
                    data={orders}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderOrderItem}
                    contentContainerStyle={{ padding: 20 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <FileText size={48} color="#d1d5db" />
                            <Text style={styles.emptyText}>Nu există comenzi.</Text>
                        </View>
                    }
                />
            )}

            {/* MODAL DETALII */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Comanda #{selectedOrder?.id}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        {/* INFO FACTURĂ ÎN MODAL */}
                        <View style={styles.modalInfoBox}>
                            <Text style={{color:'#6b7280', fontSize:12}}>Furnizor: <Text style={{fontWeight:'bold', color:'#374151'}}>{selectedOrder?.furnizori?.nume}</Text></Text>
                            <Text style={{color:'#6b7280', fontSize:12}}>Factura: <Text style={{fontWeight:'bold', color:'#374151'}}>{selectedOrder?.serie_factura} {selectedOrder?.numar_factura}</Text></Text>
                            <Text style={{color:'#6b7280', fontSize:12}}>Agent: <Text style={{fontWeight:'bold', color:'#374151'}}>{selectedOrder?.utilizatori?.nume}</Text></Text>
                        </View>

                        <ScrollView style={{flex:1}}>
                            <Text style={styles.sectionHeader}>Produse Comandate</Text>
                            {loadingDetails ? <ActivityIndicator color="#4F46E5" /> : (
                                orderDetails.map((det, index) => (
                                    <View key={index} style={styles.detailItem}>
                                        <View style={{flex:1}}>
                                            <Text style={styles.prodName}>{det.produse?.nume}</Text>
                                            <Text style={styles.prodSub}>
                                                {det.nr_baxuri > 0 ? `${det.nr_baxuri} bax` : ''}
                                                {(det.nr_baxuri > 0 && det.cantitate_fractionara > 0) ? ' + ' : ''}
                                                {det.cantitate_fractionara > 0 ? `${det.cantitate_fractionara} buc` : ''}
                                            </Text>
                                        </View>
                                        <View style={{alignItems:'flex-end'}}>
                                            <Text style={styles.prodTotal}>{det.cantitate_totala} buc</Text>
                                            <Text style={styles.prodPrice}>
                                                {det.pret_unitar_fara_tva} RON + {det.cota_tva}%
                                            </Text>
                                        </View>
                                    </View>
                                ))
                            )}
                        </ScrollView>

                        {/* BUTOANE ACȚIUNE ADMIN */}
                        <View style={styles.footerActions}>
                            {selectedOrder?.status === 'transmisa' && (
                                <View style={styles.actionRow}>
                                    <TouchableOpacity
                                        style={[styles.actionBtn, { backgroundColor: '#fee2e2' }]}
                                        onPress={() => updateStatus('anulata')}
                                    >
                                        <XCircle size={20} color="#dc2626" />
                                        <Text style={[styles.btnText, {color:'#dc2626'}]}>Refuză</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.actionBtn, { backgroundColor: '#059669' }]}
                                        onPress={() => updateStatus('confirmata')}
                                    >
                                        <CheckCircle size={20} color="white" />
                                        <Text style={styles.btnText}>Confirmă</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {selectedOrder?.status === 'confirmata' && (
                                <TouchableOpacity
                                    style={[styles.actionBtn, { backgroundColor: '#8b5cf6', width: '100%' }]}
                                    onPress={() => updateStatus('in_livrare')}
                                >
                                    <Truck size={20} color="white" />
                                    <Text style={styles.btnText}>Trimite la Livrare (Către Depozit)</Text>
                                </TouchableOpacity>
                            )}

                            {selectedOrder?.status === 'receptionata' && (
                                <View style={[styles.actionBtn, { backgroundColor: '#ecfdf5', width: '100%', borderColor:'#059669', borderWidth:1 }]}>
                                    <CheckCircle size={20} color="#059669" />
                                    <Text style={[styles.btnText, {color:'#059669'}]}>Comandă Finalizată</Text>
                                </View>
                            )}
                        </View>
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

    card: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 12, marginBottom: 12, elevation: 2, overflow: 'hidden', alignItems:'center' },
    statusLine: { width: 6, height: '100%' },
    cardContent: { flex: 1, padding: 15 },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

    supplierName: { fontWeight: 'bold', fontSize: 16, color: '#1f2937' },
    agentName: { fontSize: 12, color: '#6b7280', marginTop: 2 },

    invoiceRow: { flexDirection:'row', alignItems:'center', gap:5, marginTop:5, backgroundColor:'#f3f4f6', padding:5, borderRadius:6, alignSelf:'flex-start' },
    invoiceText: { fontSize: 12, color:'#374151' },

    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    badgeText: { fontSize: 10, fontWeight: '800' },

    metaBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 12, color: '#6b7280' },
    totalText: { fontWeight: 'bold', fontSize: 16, color: '#1f2937' },

    emptyState: { alignItems: 'center', marginTop: 50 },
    emptyText: { marginTop: 10, color: '#9ca3af' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '85%', padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },

    modalInfoBox: { backgroundColor:'#f9fafb', padding:10, borderRadius:8, marginBottom:15, gap:2 },
    sectionHeader: { fontWeight:'bold', marginBottom:10, color:'#374151' },

    detailItem: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f3f4f6' },
    prodName: { fontWeight: 'bold', color: '#374151', fontSize:14 },
    prodSub: { fontSize: 12, color: '#6b7280' },
    prodTotal: { fontWeight: 'bold', color: '#1f2937' },
    prodPrice: { fontSize: 11, color: '#059669' },

    footerActions: { marginTop: 20, paddingTop:10, borderTopWidth:1, borderColor:'#e5e7eb' },
    actionRow: { flexDirection: 'row', gap: 15 },
    actionBtn: { flex: 1, flexDirection: 'row', padding: 15, borderRadius: 10, justifyContent: 'center', alignItems: 'center', gap: 8 },
    btnText: { color: 'white', fontWeight: 'bold' }
});