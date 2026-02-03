import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
    SafeAreaView, Modal, RefreshControl
} from 'react-native';
import { supabase } from '../lib/supabase';
import { ArrowLeft, FileText, X, ChevronRight, User } from 'lucide-react-native';

export default function ReceiptsHistoryScreen({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [receipts, setReceipts] = useState([]);

    // Detalii Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [receiptDetails, setReceiptDetails] = useState([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    useEffect(() => {
        // 1. Încărcare inițială
        fetchReceipts();

        // 2. ACTIVARE REALTIME (Actualizare Live)
        console.log("📡 Se ascultă recepții noi...");
        const channel = supabase.channel('receipts-history-live')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'receptii' },
                (payload) => {
                    console.log('⚡ Recepție nouă în istoric! Reîmprospătare...');
                    fetchReceipts(); // Reîncărcăm lista pentru a vedea noua intrare
                }
            )
            .subscribe();

        // 3. Curățenie la ieșire
        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchReceipts = async () => {
        // Nu mai punem setLoading(true) aici pentru a nu face ecranul să "pâlpâie" la fiecare update live
        // Doar la prima încărcare (când lista e goală) vrem spinner
        try {
            const { data, error } = await supabase
                .from('receptii')
                .select(`
                    *,
                    furnizori (nume),
                    utilizatori (nume, email)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setReceipts(data || []);
        } catch (error) {
            console.error("Eroare la incarcare receptii:", error.message);
        } finally {
            setLoading(false);
        }
    };

    const openDetails = async (receipt) => {
        setSelectedReceipt(receipt);
        setModalVisible(true);
        setLoadingDetails(true);

        try {
            const { data, error } = await supabase
                .from('receptii_detalii')
                .select(`
                    *,
                    produse (nume, cod_bare)
                `)
                .eq('receptie_id', receipt.id);

            if (error) throw error;
            setReceiptDetails(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingDetails(false);
        }
    };

    const renderReceiptItem = ({ item }) => {
        const date = new Date(item.created_at).toLocaleDateString('ro-RO');
        const supplierName = item.furnizori?.nume || 'Furnizor Necunoscut';
        const userLabel = item.utilizatori?.nume || item.utilizatori?.email?.split('@')[0] || 'N/A';

        return (
            <TouchableOpacity style={styles.card} onPress={() => openDetails(item)}>
                <View style={styles.cardHeader}>
                    <View style={styles.iconContainer}>
                        <FileText size={24} color="#4F46E5" />
                    </View>

                    <View style={styles.infoContainer}>
                        <Text style={styles.supplierText}>{supplierName}</Text>

                        <View style={styles.invoiceRow}>
                            <Text style={styles.invoiceLabel}>Factura:</Text>
                            <Text style={styles.invoiceValue}>
                                {item.serie_factura ? `${item.serie_factura} ` : ''}{item.numar_factura}
                            </Text>
                        </View>

                        <View style={styles.metaRow}>
                            <Text style={styles.dateText}>{date}</Text>
                            <Text style={styles.bullet}>•</Text>
                            <View style={{flexDirection:'row', alignItems:'center', gap:4}}>
                                <User size={10} color="#6b7280" />
                                <Text style={styles.userText}>{userLabel}</Text>
                            </View>
                        </View>
                    </View>

                    <ChevronRight size={20} color="#9ca3af" />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ArrowLeft size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.title}>Istoric Recepții (Live)</Text>
            </View>

            {loading ? <ActivityIndicator size="large" color="#4F46E5" style={{marginTop: 50}} /> : (
                <FlatList
                    data={receipts}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderReceiptItem}
                    contentContainerStyle={{ padding: 20 }}
                    refreshControl={<RefreshControl refreshing={false} onRefresh={() => { setLoading(true); fetchReceipts(); }} />}
                    ListEmptyComponent={
                        <Text style={{textAlign:'center', marginTop: 50, color:'#9ca3af'}}>
                            Nu există recepții înregistrate.
                        </Text>
                    }
                />
            )}

            {/* MODAL DETALII */}
            <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Detalii Recepție</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                                <X size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        {selectedReceipt && (
                            <View style={styles.summaryBox}>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Furnizor:</Text>
                                    <Text style={styles.summaryValue}>{selectedReceipt.furnizori?.nume}</Text>
                                </View>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Factură:</Text>
                                    <Text style={styles.summaryValue}>
                                        {selectedReceipt.serie_factura} {selectedReceipt.numar_factura}
                                    </Text>
                                </View>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Dată:</Text>
                                    <Text style={styles.summaryValue}>
                                        {new Date(selectedReceipt.created_at).toLocaleDateString('ro-RO')}
                                    </Text>
                                </View>
                            </View>
                        )}

                        <Text style={styles.listTitle}>Produse Recepționate:</Text>

                        {loadingDetails ? <ActivityIndicator color="#4F46E5" style={{padding:20}} /> : (
                            <FlatList
                                data={receiptDetails}
                                keyExtractor={item => item.id.toString()}
                                style={{marginTop: 5}}
                                renderItem={({ item }) => (
                                    <View style={styles.detailItem}>
                                        <View style={{flex:1}}>
                                            <Text style={styles.prodName}>{item.produse?.nume || 'Produs Șters'}</Text>
                                            <Text style={styles.prodCode}>{item.produse?.cod_bare}</Text>
                                        </View>
                                        <View style={styles.qtyBox}>
                                            <Text style={styles.qtyText}>+{item.cantitate} buc</Text>
                                            <Text style={styles.priceText}>{item.pret_achizitie} RON</Text>
                                        </View>
                                    </View>
                                )}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { padding: 20, backgroundColor: 'white', flexDirection: 'row', gap: 15, alignItems: 'center', elevation: 2 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },

    card: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 12, elevation: 2, shadowColor:'#000', shadowOpacity:0.05, shadowRadius:5 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    iconContainer: { backgroundColor: '#e0e7ff', padding: 12, borderRadius: 10, justifyContent:'center', alignItems:'center' },
    infoContainer: { flex: 1 },

    supplierText: { fontWeight: 'bold', fontSize: 16, color: '#1f2937', marginBottom: 2 },
    invoiceRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
    invoiceLabel: { fontSize: 13, color: '#6b7280' },
    invoiceValue: { fontSize: 13, fontWeight: '700', color: '#374151' },

    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    dateText: { fontSize: 11, color: '#9ca3af' },
    bullet: { fontSize: 11, color: '#d1d5db' },
    userText: { fontSize: 11, color: '#6b7280' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '85%', padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    closeBtn: { padding: 5, backgroundColor:'#f3f4f6', borderRadius:20 },

    summaryBox: { backgroundColor: '#f9fafb', padding: 15, borderRadius: 12, marginBottom: 20, borderWidth:1, borderColor:'#f3f4f6' },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    summaryLabel: { color: '#6b7280', fontSize: 14 },
    summaryValue: { fontWeight: 'bold', color: '#1f2937', fontSize: 14 },

    listTitle: { fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 10, marginLeft: 5 },
    detailItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f3f4f6' },
    prodName: { fontWeight: '600', color: '#1f2937', fontSize: 14 },
    prodCode: { fontSize: 12, color: '#9ca3af' },
    qtyBox: { alignItems: 'flex-end' },
    qtyText: { color: '#166534', fontWeight: 'bold', fontSize: 14 },
    priceText: { color: '#6b7280', fontSize: 11 }
});