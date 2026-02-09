import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, Modal, Alert, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform
} from 'react-native';
import { supabase } from '../lib/supabase';
import {
    ArrowLeft, Search, Trash2, X, AlertOctagon
} from 'lucide-react-native';

// --- PRIMIM PROPS-urile { navigation, route } ---
export default function ScrapScreen({ navigation, route }) {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const [modalVisible, setModalVisible] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [scrapQty, setScrapQty] = useState('');
    const [reason, setReason] = useState('');

    useEffect(() => {
        fetchProductsAndCheckParams();
    }, []);

    const fetchProductsAndCheckParams = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('produse')
                .select('id, nume, cod_bare, stoc_depozit, stoc_magazin')
                .order('nume');

            if (error) throw error;
            setProducts(data || []);

            // --- LOGICĂ NOUĂ: VERIFICARE PARAMETRI DE LA EXPIRĂRI ---
            // Dacă am venit din ecranul de Expirări, avem un 'preSelectedId'
            if (route.params?.preSelectedId) {
                const preSelected = data.find(p => p.id === route.params.preSelectedId);
                if (preSelected) {
                    // Deschidem automat modalul pentru acest produs
                    openScrapModal(preSelected);
                    // Pre-completăm motivul
                    setReason("Produs Expirat");
                }
            }

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const openScrapModal = (prod) => {
        setSelectedProduct(prod);
        setScrapQty('');
        setReason('');
        setModalVisible(true);
    };

    const handleScrap = async () => {
        const qty = parseInt(scrapQty);
        if (!qty || qty <= 0) return Alert.alert("Eroare", "Cantitate invalidă");
        if (!reason) return Alert.alert("Eroare", "Introdu motivul (ex: Expirat, Spart)");

        // Verificăm stocul total (Depozit + Raft)
        const totalStock = (selectedProduct.stoc_depozit || 0) + (selectedProduct.stoc_magazin || 0);

        if (qty > totalStock) {
            return Alert.alert("Eroare", `Nu poți scădea ${qty} buc. Stoc total disponibil: ${totalStock}`);
        }

        setLoading(true);
        try {
            // 1. Înregistrăm pierderea în tabelul 'pierderi'
            const { error: logError } = await supabase
                .from('pierderi')
                .insert([{
                    produs_id: selectedProduct.id,
                    cantitate: qty,
                    motiv: reason,
                    data_pierdere: new Date()
                }]);

            if (logError) throw logError;

            // 2. Scădem din stoc
            // Prioritizăm scăderea din Magazin (Raft), apoi din Depozit
            let remainingToScrap = qty;
            let newMagazin = selectedProduct.stoc_magazin || 0;
            let newDepozit = selectedProduct.stoc_depozit || 0;

            if (newMagazin >= remainingToScrap) {
                newMagazin -= remainingToScrap;
                remainingToScrap = 0;
            } else {
                remainingToScrap -= newMagazin;
                newMagazin = 0;
                newDepozit -= remainingToScrap; // Restul luăm din depozit
            }

            const { error: updateError } = await supabase
                .from('produse')
                .update({
                    stoc_magazin: newMagazin,
                    stoc_depozit: newDepozit
                })
                .eq('id', selectedProduct.id);

            if (updateError) throw updateError;

            Alert.alert("Succes", "Pierdere înregistrată și stoc actualizat.");
            setModalVisible(false);

            // Reîmprospătăm lista fără să suprascriem parametrii
            const { data } = await supabase.from('produse').select('*').order('nume');
            setProducts(data || []);

        } catch (err) {
            Alert.alert("Eroare", err.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = products.filter(p =>
        p.nume.toLowerCase().includes(search.toLowerCase()) ||
        p.cod_bare.includes(search)
    );

    const renderItem = ({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => openScrapModal(item)}>
            <View>
                <Text style={styles.prodName}>{item.nume}</Text>
                <Text style={styles.prodCode}>{item.cod_bare}</Text>
            </View>
            <View style={{alignItems:'flex-end'}}>
                <Text style={styles.stockLabel}>Stoc Total</Text>
                <Text style={styles.stockValue}>{(item.stoc_depozit || 0) + (item.stoc_magazin || 0)} buc</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ArrowLeft size={24} color="#374151" />
                </TouchableOpacity>
                <Text style={styles.title}>Raportare Pierderi</Text>
            </View>

            <View style={styles.searchContainer}>
                <Search size={20} color="#9ca3af" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Caută produs..."
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            {loading && !modalVisible ? (
                <ActivityIndicator size="large" color="#dc2626" style={{marginTop:20}} />
            ) : (
                <FlatList
                    data={filteredProducts}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={{padding: 20}}
                />
            )}

            <Modal visible={modalVisible} transparent animationType="slide">
                <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Confirmă Pierdere</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.prodTitleModal}>{selectedProduct?.nume}</Text>

                        <Text style={styles.label}>Cantitate Pierdută</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="0"
                            keyboardType="numeric"
                            value={scrapQty}
                            onChangeText={setScrapQty}
                            autoFocus
                        />

                        <Text style={styles.label}>Motiv (Ex: Expirat, Spart)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Motivul pierderii"
                            value={reason}
                            onChangeText={setReason}
                        />

                        <TouchableOpacity style={styles.confirmBtn} onPress={handleScrap}>
                            <AlertOctagon size={20} color="white" />
                            <Text style={styles.btnText}>Scoate din Gestiune</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fef2f2' },
    header: { padding: 20, backgroundColor: 'white', flexDirection: 'row', gap: 15, alignItems: 'center', elevation: 2 },
    title: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },

    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', margin: 20, paddingHorizontal: 15, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', height: 50 },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },

    card: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 1 },
    prodName: { fontWeight: 'bold', fontSize: 16, color: '#374151' },
    prodCode: { fontSize: 12, color: '#9ca3af' },
    stockLabel: { fontSize: 10, color: '#6b7280', textTransform: 'uppercase' },
    stockValue: { fontSize: 16, fontWeight: 'bold', color: '#dc2626' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 25 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color:'#374151' },
    prodTitleModal: { fontSize: 16, color: '#4b5563', marginBottom: 15, fontWeight:'bold' },

    label: { fontWeight: 'bold', color: '#374151', marginBottom: 5, marginTop: 10 },
    input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor:'#f9fafb' },

    confirmBtn: { backgroundColor: '#dc2626', height: 55, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 30 },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});