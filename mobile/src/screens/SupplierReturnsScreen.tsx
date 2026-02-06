import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
    Alert, Modal, SafeAreaView, ActivityIndicator
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '../lib/supabase';
import {
    ArrowLeft, Barcode, Trash2, X, Check, Truck,
    Calendar, AlertTriangle
} from 'lucide-react-native';

export default function SupplierReturnsScreen({ navigation }) {
    const [step, setStep] = useState(1); // 1 = Selectare Furnizor, 2 = Scanare
    const [loading, setLoading] = useState(false);
    const [suppliers, setSuppliers] = useState([]);
    const [selectedSupplier, setSelectedSupplier] = useState(null);

    // Scanare
    const [scannedItems, setScannedItems] = useState([]);
    const [permission, requestPermission] = useCameraPermissions();
    const [scannerVisible, setScannerVisible] = useState(false);

    // Modal Cantitate
    const [modalVisible, setModalVisible] = useState(false);
    const [currentProduct, setCurrentProduct] = useState(null);
    const [qty, setQty] = useState('');
    const [reason, setReason] = useState('expirat'); // 'expirat', 'deteriorat'

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        const { data } = await supabase.from('furnizori').select('*').order('nume');
        setSuppliers(data || []);
    };

    // --- LOGICA ---
    const handleBarCodeScanned = async ({ data }) => {
        setScannerVisible(false);
        setLoading(true);
        const { data: prod } = await supabase.from('produse').select('*').eq('cod_bare', data).maybeSingle();
        setLoading(false);

        if (prod) {
            setCurrentProduct(prod);
            setQty('');
            setModalVisible(true);
        } else {
            Alert.alert("Eroare", "Produsul nu a fost găsit.");
        }
    };

    const addItem = () => {
        if (!qty) return;
        setScannedItems([...scannedItems, { ...currentProduct, returnQty: parseInt(qty), reason }]);
        setModalVisible(false);
    };

    const submitReturn = async () => {
        if (scannedItems.length === 0) return;
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            // 1. Header Retur
            const { data: retur, error: rErr } = await supabase
                .from('retururi_furnizor')
                .insert([{
                    furnizor_id: selectedSupplier.id,
                    user_id: user.id,
                    status: 'in_asteptare',
                    total_valoare: scannedItems.reduce((acc, i) => acc + (i.returnQty * (i.ultimul_pret_achizitie || 0)), 0)
                }])
                .select()
                .single();

            if (rErr) throw rErr;

            // 2. Detalii & Scădere Stoc
            for (const item of scannedItems) {
                await supabase.from('retururi_furnizor_detalii').insert([{
                    retur_id: retur.id,
                    produs_id: item.id,
                    cantitate: item.returnQty,
                    motiv: item.reason
                }]);

                // Scădem stocul din depozit (presupunem că returul se face din depozit)
                await supabase.rpc('decrement_stock_depozit', {
                    row_id: item.id,
                    quantity: item.returnQty
                });
            }

            Alert.alert("Succes", "Returul a fost generat!");
            navigation.goBack();
        } catch (err) {
            Alert.alert("Eroare", err.message);
        } finally {
            setLoading(false);
        }
    };

    // --- RENDER ---
    if (step === 1) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft size={24} color="#374151" /></TouchableOpacity>
                    <Text style={styles.title}>Retur Marfă (1/2)</Text>
                </View>
                <Text style={styles.label}>Selectează Furnizorul:</Text>
                <FlatList
                    data={suppliers}
                    keyExtractor={i => i.id.toString()}
                    renderItem={({item}) => (
                        <TouchableOpacity style={styles.supCard} onPress={() => { setSelectedSupplier(item); setStep(2); }}>
                            <Truck size={24} color="#4F46E5" />
                            <Text style={styles.supText}>{item.nume}</Text>
                        </TouchableOpacity>
                    )}
                />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => setStep(1)}><ArrowLeft size={24} color="#374151" /></TouchableOpacity>
                <View>
                    <Text style={styles.title}>Scanare Produse (2/2)</Text>
                    <Text style={styles.subtitle}>{selectedSupplier?.nume}</Text>
                </View>
            </View>

            <TouchableOpacity style={styles.scanBtn} onPress={() => { if(!permission?.granted) requestPermission(); setScannerVisible(true); }}>
                <Barcode size={24} color="white" />
                <Text style={{color:'white', fontWeight:'bold'}}>SCANEAZĂ PRODUS</Text>
            </TouchableOpacity>

            <FlatList
                data={scannedItems}
                keyExtractor={(item, index) => index.toString()}
                contentContainerStyle={{padding: 20}}
                renderItem={({item}) => (
                    <View style={styles.itemCard}>
                        <View>
                            <Text style={styles.itemName}>{item.nume}</Text>
                            <Text style={styles.itemReason}>Motiv: {item.reason.toUpperCase()}</Text>
                        </View>
                        <Text style={styles.itemQty}>{item.returnQty} buc</Text>
                    </View>
                )}
            />

            <TouchableOpacity style={styles.finishBtn} onPress={submitReturn}>
                {loading ? <ActivityIndicator color="white"/> : <Text style={styles.finishText}>FINALIZEAZĂ RETUR</Text>}
            </TouchableOpacity>

            {/* MODAL CANTITATE */}
            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{currentProduct?.nume}</Text>

                        <Text style={styles.labelSmall}>Cantitate de returnat:</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={qty}
                            onChangeText={setQty}
                            autoFocus
                        />

                        <Text style={styles.labelSmall}>Motiv:</Text>
                        <View style={{flexDirection:'row', gap:10, marginBottom:20}}>
                            <TouchableOpacity onPress={() => setReason('expirat')} style={[styles.reasonBtn, reason==='expirat' && styles.reasonActive]}>
                                <Text style={[styles.reasonText, reason==='expirat' && {color:'white'}]}>Expirat</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setReason('deteriorat')} style={[styles.reasonBtn, reason==='deteriorat' && styles.reasonActive]}>
                                <Text style={[styles.reasonText, reason==='deteriorat' && {color:'white'}]}>Deteriorat</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.addBtn} onPress={addItem}>
                            <Text style={{color:'white', fontWeight:'bold'}}>ADAUGĂ ÎN LISTĂ</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={scannerVisible} animationType="slide">
                <CameraView style={StyleSheet.absoluteFill} onBarcodeScanned={scannerVisible ? handleBarCodeScanned : undefined} />
                <TouchableOpacity style={styles.closeCam} onPress={() => setScannerVisible(false)}><X size={35} color="white" /></TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: { padding: 20, backgroundColor: 'white', flexDirection: 'row', gap: 15, alignItems: 'center', elevation: 2 },
    title: { fontSize: 18, fontWeight: 'bold' },
    subtitle: { fontSize: 12, color: '#6b7280' },
    label: { padding: 20, fontWeight: 'bold', color: '#6b7280' },

    supCard: { flexDirection: 'row', alignItems: 'center', gap: 15, backgroundColor: 'white', padding: 20, marginHorizontal: 20, marginBottom: 10, borderRadius: 12, elevation: 1 },
    supText: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },

    scanBtn: { backgroundColor: '#4F46E5', margin: 20, padding: 15, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },

    itemCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 10 },
    itemName: { fontWeight: 'bold', color: '#1f2937' },
    itemReason: { fontSize: 12, color: '#ef4444', marginTop: 2 },
    itemQty: { fontSize: 18, fontWeight: 'bold', color: '#4F46E5' },

    finishBtn: { backgroundColor: '#ef4444', margin: 20, padding: 15, borderRadius: 12, alignItems: 'center' },
    finishText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 30 },
    modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 25 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    labelSmall: { fontSize: 12, fontWeight: 'bold', color: '#6b7280', marginBottom: 5 },
    input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, fontSize: 18, marginBottom: 15 },

    reasonBtn: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' },
    reasonActive: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
    reasonText: { fontWeight: 'bold', color: '#374151' },

    addBtn: { backgroundColor: '#1f2937', padding: 15, borderRadius: 10, alignItems: 'center' },
    closeCam: { position: 'absolute', top: 50, right: 25, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 25, padding: 5 }
});