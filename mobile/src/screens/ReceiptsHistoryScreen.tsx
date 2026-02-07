import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Modal, SafeAreaView, ActivityIndicator, ScrollView
} from 'react-native';
import { supabase } from '../lib/supabase';
import {
    ArrowLeft, Calendar, ChevronRight, FileText,
    X, AlertTriangle, CheckCircle, Package
} from 'lucide-react-native';

export default function ReceiptsHistoryScreen({ navigation }) {
    const [receipts, setReceipts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal Detalii
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [comparisonData, setComparisonData] = useState([]); // Aici ținem datele comparate
    const [loadingDetails, setLoadingDetails] = useState(false);

    useEffect(() => {
        fetchReceipts();
    }, []);

    const fetchReceipts = async () => {
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
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchComparisonDetails = async (receipt) => {
        setLoadingDetails(true);
        try {
            // 1. Luăm ce s-a recepționat fizic
            const { data: recLines } = await supabase
                .from('receptii_detalii')
                .select(`*, produse (nume, cod_bare)`)
                .eq('receptie_id', receipt.id);

            let finalData = recLines.map(line => ({
                ...line,
                qty_ordered: null, // Inițial nu știm
                diff: 0,
                status: 'manual' // Presupunem recepție manuală
            }));

            // 2. Dacă recepția vine dintr-o comandă, luăm și comanda originală
            if (receipt.comanda_aprovizionare_id) {
                const { data: orderLines } = await supabase
                    .from('comenzi_aprovizionare_detalii')
                    .select('produs_id, cantitate_totala')
                    .eq('comanda_id', receipt.comanda_aprovizionare_id);

                // 3. Facem MERGE între cele două liste
                finalData = finalData.map(recLine => {
                    const ordLine = orderLines.find(o => o.produs_id === recLine.produs_id);
                    const ordered = ordLine ? ordLine.cantitate_totala : 0;

                    // Calculăm diferența (Scanat - Comandat)
                    // Ex: Scanat 8, Comandat 10 => Diff -2
                    const difference = recLine.cantitate_totala - ordered;

                    let status = 'ok';
                    if (difference < 0) status = 'missing';
                    if (difference > 0) status = 'extra';
                    if (!ordLine) status = 'unplanned'; // Nu era în comandă

                    return {
                        ...recLine,
                        qty_ordered: ordered,
                        diff: difference,
                        status: status
                    };
                });
            }

            setComparisonData(finalData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingDetails(false);
        }
    };

    const openReceipt = (receipt) => {
        setSelectedReceipt(receipt);
        setModalVisible(true);
        fetchComparisonDetails(receipt);
    };

    const renderReceiptItem = ({ item }) => {
        const date = new Date(item.created_at).toLocaleDateString('ro-RO', {day: 'numeric', month:'short', hour:'2-digit', minute:'2-digit'});
        return (
            <TouchableOpacity style={styles.card} onPress={() => openReceipt(item)}>
                <View style={styles.iconContainer}>
                    <FileText size={24} color="#4F46E5" />
                </View>
                <View style={{flex:1}}>
                    <Text style={styles.supplier}>{item.furnizori?.nume || 'Furnizor Necunoscut'}</Text>
                    <Text style={styles.invoice}>Factura: {item.serie_factura} {item.numar_factura}</Text>
                    <Text style={styles.user}>Recepționat de: {item.utilizatori?.nume || 'Gestionar'}</Text>
                </View>
                <View style={{alignItems:'flex-end'}}>
                    <Text style={styles.date}>{date}</Text>
                    <Text style={styles.total}>{item.total_valoare?.toFixed(2)} RON</Text>
                    <ChevronRight size={20} color="#ccc" style={{marginTop:5}}/>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ArrowLeft size={24} color="#374151" />
                </TouchableOpacity>
                <Text style={styles.title}>Istoric Recepții</Text>
            </View>

            {loading ? <ActivityIndicator size="large" color="#4F46E5" style={{marginTop:50}} /> : (
                <FlatList
                    data={receipts}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderReceiptItem}
                    contentContainerStyle={{padding:20}}
                    ListEmptyComponent={<Text style={styles.emptyText}>Nu există recepții.</Text>}
                />
            )}

            {/* MODAL DETALII COMPARATIVE */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Detalii Recepție</Text>
                                <Text style={{fontSize:12, color:'#666'}}>
                                    {selectedReceipt?.serie_factura} {selectedReceipt?.numar_factura}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            {loadingDetails ? <ActivityIndicator color="#4F46E5"/> : (
                                comparisonData.map((item, index) => {
                                    const isProblem = item.status === 'missing' || item.cantitate_defecte > 0;

                                    return (
                                        <View key={index} style={[styles.detailRow, isProblem && {backgroundColor:'#fef2f2'}]}>
                                            <View style={{flex:1}}>
                                                <Text style={styles.prodName}>{item.produse?.nume}</Text>

                                                {/* LINIA DE COMPARARE */}
                                                {item.qty_ordered !== null ? (
                                                    <View style={{flexDirection:'row', gap:10, marginTop:4}}>
                                                        <Text style={{fontSize:12, color:'#374151'}}>
                                                            Scanat: <Text style={{fontWeight:'bold'}}>{item.cantitate_totala}</Text>
                                                        </Text>
                                                        <Text style={{fontSize:12, color:'#6b7280'}}>
                                                            / Comandat: {item.qty_ordered}
                                                        </Text>
                                                    </View>
                                                ) : (
                                                    <Text style={{fontSize:12, color:'#6b7280'}}>Recepție Manuală</Text>
                                                )}

                                                {/* INFO DEFECTE */}
                                                {item.cantitate_defecte > 0 && (
                                                    <Text style={{color:'#dc2626', fontSize:11, fontWeight:'bold', marginTop:2}}>
                                                        ⚠️ {item.cantitate_defecte} Defecte: {item.motiv_refuz}
                                                    </Text>
                                                )}
                                            </View>

                                            {/* ZONA STATUS / DIFERENȚĂ */}
                                            <View style={{alignItems:'flex-end'}}>
                                                {item.status === 'missing' && (
                                                    <View style={styles.diffBadgeBad}>
                                                        <Text style={{color:'#dc2626', fontWeight:'bold', fontSize:12}}>
                                                            Lipsă: {item.diff}
                                                        </Text>
                                                    </View>
                                                )}
                                                {item.status === 'extra' && (
                                                    <View style={styles.diffBadgeWarn}>
                                                        <Text style={{color:'#d97706', fontWeight:'bold', fontSize:12}}>
                                                            Plus: +{item.diff}
                                                        </Text>
                                                    </View>
                                                )}
                                                {item.status === 'ok' && item.cantitate_defecte === 0 && (
                                                    <CheckCircle size={20} color="#059669" />
                                                )}
                                            </View>
                                        </View>
                                    );
                                })
                            )}
                        </ScrollView>
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

    card: { backgroundColor: 'white', padding: 15, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 12, elevation: 1 },
    iconContainer: { width: 45, height: 45, borderRadius: 25, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
    supplier: { fontWeight: 'bold', fontSize: 16, color: '#1f2937' },
    invoice: { fontSize: 13, color: '#4b5563', marginVertical: 2 },
    user: { fontSize: 11, color: '#9ca3af' },
    date: { fontSize: 11, color: '#6b7280' },
    total: { fontWeight: 'bold', color: '#059669', marginTop: 4 },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#999' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '80%', padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },

    detailRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f3f4f6', paddingHorizontal: 5 },
    prodName: { fontWeight: 'bold', fontSize: 14, color: '#374151' },

    diffBadgeBad: { backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    diffBadgeWarn: { backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }
});