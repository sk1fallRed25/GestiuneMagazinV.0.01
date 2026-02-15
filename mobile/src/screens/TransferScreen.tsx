import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, Modal, Alert, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera'; // Import Camera
import { supabase } from '../lib/supabase';
import {
    ArrowLeft, Search, ArrowRightLeft, Package, Store, Check, X, ScanBarcode
} from 'lucide-react-native';

export default function TransferScreen({ navigation }) {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Modal Transfer
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [transferQty, setTransferQty] = useState('');

    // --- STATE PENTRU CAMERA ---
    const [permission, requestPermission] = useCameraPermissions();
    const [isCameraVisible, setIsCameraVisible] = useState(false);
    const [scanned, setScanned] = useState(false);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const { data, error } = await supabase
                .from('produse')
                .select('id, nume, cod_bare, stoc_depozit, stoc_magazin')
                .order('nume');

            if (error) throw error;
            setProducts(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // --- 1. LOGICA CAMEREI ---
    const handleOpenScanner = async () => {
        if (!permission?.granted) {
            const { granted } = await requestPermission();
            if (!granted) {
                Alert.alert("Permisiune", "Camera este necesară pentru a scana.");
                return;
            }
        }
        setScanned(false);
        setIsCameraVisible(true);
    };

    const handleBarCodeScanned = ({ data }) => {
        setScanned(true);
        setIsCameraVisible(false); // Închidem camera
        setSearch(data); // Punem codul în bara de căutare -> declanșează filtrarea automată
        Alert.alert("Produs Scanat", `Cod: ${data}`);
    };

    // --- 2. LOGICA TRANSFER ---
    const openTransferModal = (prod) => {
        setSelectedProduct(prod);
        setTransferQty('');
        setModalVisible(true);
    };

    const handleTransfer = async () => {
        const qty = parseInt(transferQty);

        if (!qty || qty <= 0) {
            return Alert.alert("Eroare", "Introdu o cantitate validă.");
        }

        if (qty > selectedProduct.stoc_depozit) {
            return Alert.alert("Eroare", "Nu ai suficient stoc în depozit!");
        }

        setLoading(true);
        try {
            const newDepozit = selectedProduct.stoc_depozit - qty;
            const newMagazin = (selectedProduct.stoc_magazin || 0) + qty;

            const { error } = await supabase
                .from('produse')
                .update({
                    stoc_depozit: newDepozit,
                    stoc_magazin: newMagazin
                })
                .eq('id', selectedProduct.id);

            if (error) throw error;

            Alert.alert("Succes", `Ai transferat ${qty} buc la Raft!`);
            setModalVisible(false);
            fetchProducts();
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
        <TouchableOpacity style={styles.card} onPress={() => openTransferModal(item)}>
            <View style={{flex:1}}>
                <Text style={styles.prodName}>{item.nume}</Text>
                <Text style={styles.prodCode}>{item.cod_bare}</Text>
            </View>

            <View style={styles.stockContainer}>
                <View style={styles.stockBox}>
                    <Text style={styles.stockLabel}>Depozit</Text>
                    <Text style={[styles.stockValue, {color:'#4b5563'}]}>{item.stoc_depozit}</Text>
                </View>

                <ArrowRightLeft size={16} color="#9ca3af" style={{marginHorizontal:8}} />

                <View style={[styles.stockBox, {backgroundColor:'#e0e7ff', borderColor:'#c7d2fe'}]}>
                    <Text style={[styles.stockLabel, {color:'#4338ca'}]}>Raft</Text>
                    <Text style={[styles.stockValue, {color:'#3730a3'}]}>{item.stoc_magazin || 0}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ArrowLeft size={24} color="#374151" />
                </TouchableOpacity>
                <Text style={styles.title}>Transfer Marfă</Text>
            </View>

            {/* ZONA DE CĂUTARE + SCANARE */}
            <View style={styles.searchContainer}>
                <Search size={20} color="#9ca3af" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Caută produs (nume sau cod)..."
                    value={search}
                    onChangeText={setSearch}
                />

                {/* BUTONUL DE SCANARE SAU STERGERE */}
                {search.length > 0 ? (
                    <TouchableOpacity onPress={() => setSearch('')}>
                        <X size={20} color="#6b7280" />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity onPress={handleOpenScanner} style={{ padding: 5 }}>
                        <ScanBarcode size={24} color="#4F46E5" />
                    </TouchableOpacity>
                )}
            </View>

            {loading && !modalVisible ? (
                <ActivityIndicator size="large" color="#4F46E5" style={{marginTop:20}} />
            ) : (
                <FlatList
                    data={filteredProducts}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={{padding: 20}}
                    ListEmptyComponent={<Text style={{textAlign:'center', color:'#999', marginTop:20}}>Nu am găsit produse.</Text>}
                />
            )}

            {/* MODAL CAMERĂ (SCANNER) */}
            <Modal visible={isCameraVisible} animationType="slide">
                <View style={styles.cameraContainer}>
                    <CameraView
                        style={StyleSheet.absoluteFillObject}
                        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                        barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "qr", "upc_a"] }}
                    />
                    <View style={styles.overlay}>
                        <Text style={styles.overlayText}>Scanează codul de bare</Text>
                        <View style={styles.scanFrame} />
                        <TouchableOpacity style={styles.closeCamera} onPress={() => setIsCameraVisible(false)}>
                            <X color="white" size={30} />
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* MODAL TRANSFER */}
            <Modal visible={modalVisible} transparent animationType="slide">
                <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Transferă la Raft</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.prodTitleModal}>{selectedProduct?.nume}</Text>
                        <Text style={styles.stockInfo}>Disponibil în Depozit: <Text style={{fontWeight:'bold'}}>{selectedProduct?.stoc_depozit} buc</Text></Text>

                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Cantitate"
                                keyboardType="numeric"
                                value={transferQty}
                                onChangeText={setTransferQty}
                                autoFocus
                            />
                        </View>

                        <TouchableOpacity style={styles.confirmBtn} onPress={handleTransfer}>
                            {loading ? <ActivityIndicator color="white"/> : (
                                <>
                                    <ArrowRightLeft size={20} color="white" />
                                    <Text style={styles.btnText}>Confirmă Transferul</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { padding: 20, backgroundColor: 'white', flexDirection: 'row', gap: 15, alignItems: 'center', elevation: 2 },
    title: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },

    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', margin: 20, paddingHorizontal: 15, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', height: 50 },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },

    card: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 1 },
    prodName: { fontWeight: 'bold', fontSize: 16, color: '#374151', marginBottom: 4 },
    prodCode: { fontSize: 12, color: '#9ca3af' },

    stockContainer: { flexDirection: 'row', alignItems: 'center' },
    stockBox: { alignItems: 'center', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#f3f4f6', backgroundColor: '#f9fafb', minWidth: 60 },
    stockLabel: { fontSize: 10, color: '#6b7280', textTransform: 'uppercase' },
    stockValue: { fontSize: 16, fontWeight: 'bold' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 25 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color:'#374151' },
    prodTitleModal: { fontSize: 16, color: '#4b5563', marginBottom: 5 },
    stockInfo: { fontSize: 14, color: '#6b7280', marginBottom: 20 },

    inputContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    input: { flex: 1, height: 50, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 15, fontSize: 18, textAlign: 'center', backgroundColor:'#f9fafb' },

    confirmBtn: { backgroundColor: '#4F46E5', height: 55, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

    // CAMERA STYLES
    cameraContainer: { flex: 1, backgroundColor: 'black' },
    overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    overlayText: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
    scanFrame: { width: 250, height: 250, borderWidth: 2, borderColor: '#00ff00', borderRadius: 20 },
    closeCamera: { position: 'absolute', bottom: 50, backgroundColor: '#dc2626', padding: 15, borderRadius: 30 },
});