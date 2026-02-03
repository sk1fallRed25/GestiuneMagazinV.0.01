import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    FlatList, SafeAreaView, Alert, Modal, ActivityIndicator, Vibration
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Plus, Trash2, X, Barcode, FileText } from 'lucide-react-native';

export default function InventoryReceipt({ navigation }) {
    // Date Factură
    const [suppliers, setSuppliers] = useState([]);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [invoiceSeries, setInvoiceSeries] = useState(''); // SERIE
    const [invoiceNumber, setInvoiceNumber] = useState(''); // NUMĂR

    // Coș Recepție
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(false);

    // Scanner & Produse Noi
    const [permission, requestPermission] = useCameraPermissions();
    const [scannerVisible, setScannerVisible] = useState(false);
    const [scannedCode, setScannedCode] = useState(null);

    // Modal pentru Produs Nou / Cantitate
    const [qtyModalVisible, setQtyModalVisible] = useState(false);
    const [tempQty, setTempQty] = useState('');
    const [tempProduct, setTempProduct] = useState(null); // Produsul curent (existent sau nou)
    const [isNewProduct, setIsNewProduct] = useState(false); // Flag dacă e produs nou

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        const { data } = await supabase.from('furnizori').select('*');
        if (data) setSuppliers(data);
    };

    // --- LOGICA DE SCANARE ---
    const startScanning = async () => {
        if (!permission?.granted) await requestPermission();
        setScannerVisible(true);
    };

    const handleBarCodeScanned = async ({ data }) => {
        // Pauză scanare pentru procesare
        setScannerVisible(false);
        setScannedCode(data);
        Vibration.vibrate();

        try {
            // 1. Căutăm produsul în baza de date
            const { data: existingProd, error } = await supabase
                .from('produse')
                .select('*')
                .eq('cod_bare', data)
                .maybeSingle();

            if (existingProd) {
                // CAZ A: Produsul EXISTĂ
                setTempProduct(existingProd);
                setIsNewProduct(false);
                setTempQty(''); // Resetăm câmpul cantitate
                setQtyModalVisible(true); // Deschidem modalul doar pentru cantitate
            } else {
                // CAZ B: Produsul NU EXISTĂ -> Îl vom crea
                setTempProduct({ cod_bare: data, nume: `PRODUS NOU - ${data}` });
                setIsNewProduct(true);
                setTempQty('');
                setQtyModalVisible(true);
            }
        } catch (err) {
            Alert.alert("Eroare", "Nu am putut verifica produsul.");
        }
    };

    // --- ADĂUGARE ÎN LISTA DE RECEPȚIE ---
    const confirmAddItem = async () => {
        if (!tempQty || parseInt(tempQty) <= 0) {
            Alert.alert("Eroare", "Introdu o cantitate validă.");
            return;
        }

        let productToAdd = tempProduct;

        // Dacă e produs nou, îl creăm acum în Baza de Date
        if (isNewProduct) {
            setLoading(true);
            const { data: newProd, error } = await supabase
                .from('produse')
                .insert([{
                    nume: `PRODUS NOU - ${scannedCode}`, // Nume temporar
                    cod_bare: scannedCode,
                    stoc_depozit: 0,
                    stoc_magazin: 0,
                    pret_vanzare: 0 // Adminul va seta prețul
                }])
                .select()
                .single();

            setLoading(false);

            if (error) {
                Alert.alert("Eroare", "Nu s-a putut crea produsul nou în bază.");
                return;
            }
            productToAdd = newProd;
        }

        // Adăugăm în coșul local
        const existingInCart = cart.find(p => p.id === productToAdd.id);
        if (existingInCart) {
            // Dacă e deja în listă, adunăm cantitatea
            setCart(cart.map(p => p.id === productToAdd.id ? { ...p, qty: parseInt(p.qty) + parseInt(tempQty) } : p));
        } else {
            setCart([...cart, { ...productToAdd, qty: parseInt(tempQty), price: '' }]);
        }

        // Închidem tot și resetăm
        setQtyModalVisible(false);
        setTempQty('');
        setTempProduct(null);
    };

    // --- GESTIUNE COȘ ---
    const removeCartItem = (id) => {
        setCart(cart.filter(item => item.id !== id));
    };

    const updatePrice = (id, price) => {
        setCart(cart.map(item => item.id === id ? { ...item, price: price } : item));
    };

    // --- SALVARE FINALĂ ---
    const submitReceipt = async () => {
        if (!selectedSupplier) return Alert.alert("Eroare", "Selectează un furnizor.");
        if (!invoiceNumber) return Alert.alert("Eroare", "Introdu numărul facturii.");
        if (cart.length === 0) return Alert.alert("Eroare", "Lista de recepție e goală.");

        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            // 1. Header Recepție
            const { data: receipt, error: rError } = await supabase
                .from('receptii')
                .insert([{
                    furnizor_id: selectedSupplier.id,
                    user_id: user.id,
                    serie_factura: invoiceSeries, // Câmp nou
                    numar_factura: invoiceNumber,
                    total_valoare: 0
                }])
                .select()
                .single();

            if (rError) throw rError;

            // 2. Detalii Recepție
            const details = cart.map(item => ({
                receptie_id: receipt.id,
                produs_id: item.id,
                cantitate: parseInt(item.qty),
                pret_achizitie: parseFloat(item.price) || 0
            }));

            const { error: dError } = await supabase.from('receptii_detalii').insert(details);
            if (dError) throw dError;

            Alert.alert("Succes", "Recepție salvată!");
            navigation.goBack();

        } catch (error) {
            Alert.alert("Eroare", error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* 1. Header Simplificat */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft size={24} color="#1f2937" /></TouchableOpacity>
                <Text style={styles.title}>Recepție Marfă</Text>
            </View>

            <View style={styles.content}>

                {/* 2. Selector Furnizor */}
                <View style={styles.section}>
                    <Text style={styles.label}>Furnizor:</Text>
                    <FlatList
                        horizontal
                        data={suppliers}
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={item => item.id.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[styles.chip, selectedSupplier?.id === item.id && styles.activeChip]}
                                onPress={() => setSelectedSupplier(item)}
                            >
                                <Text style={[styles.chipText, selectedSupplier?.id === item.id && styles.activeChipText]}>
                                    {item.nume}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>

                {/* 3. Date Factură (Serie & Număr) */}
                <View style={styles.rowInputs}>
                    <View style={{flex: 1}}>
                        <Text style={styles.label}>Serie Factură</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ex: F-RO"
                            value={invoiceSeries}
                            onChangeText={setInvoiceSeries}
                        />
                    </View>
                    <View style={{flex: 1}}>
                        <Text style={styles.label}>Număr Factură</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ex: 12345"
                            value={invoiceNumber}
                            onChangeText={setInvoiceNumber}
                            keyboardType="numeric"
                        />
                    </View>
                </View>

                {/* 4. Buton SCANARE MARE */}
                <TouchableOpacity style={styles.scanBtn} onPress={startScanning}>
                    <Barcode size={28} color="white" />
                    <Text style={styles.scanBtnText}>SCANARE PRODUS</Text>
                </TouchableOpacity>

                {/* 5. Lista Produse Scanate */}
                <FlatList
                    data={cart}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    ListHeaderComponent={<Text style={styles.listHeader}>Produse pe Factură:</Text>}
                    ListEmptyComponent={<Text style={styles.emptyText}>Scanează pentru a adăuga produse.</Text>}
                    renderItem={({ item }) => (
                        <View style={styles.cartItem}>
                            <View style={{flex: 1}}>
                                <Text style={styles.itemName}>{item.nume}</Text>
                                <Text style={styles.itemCode}>{item.cod_bare}</Text>
                            </View>

                            <View style={styles.itemDetails}>
                                <View style={styles.qtyBadge}>
                                    <Text style={styles.qtyText}>{item.qty} buc</Text>
                                </View>
                                <TextInput
                                    style={styles.priceInput}
                                    placeholder="Preț Ach."
                                    keyboardType="numeric"
                                    value={item.price}
                                    onChangeText={t => updatePrice(item.id, t)}
                                />
                                <TouchableOpacity onPress={() => removeCartItem(item.id)} style={{padding:5}}>
                                    <Trash2 size={20} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                />
            </View>

            {/* Buton Salvare */}
            <View style={styles.footer}>
                {loading ? <ActivityIndicator color="#4F46E5" /> : (
                    <TouchableOpacity style={styles.saveBtn} onPress={submitReceipt}>
                        <FileText size={20} color="white" />
                        <Text style={styles.saveBtnText}>FINALIZEAZĂ RECEPȚIA</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* --- MODAL CANTITATE (Produs Nou sau Existent) --- */}
            <Modal visible={qtyModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {isNewProduct ? "⚠️ PRODUS NOU DETECTAT" : "Produs Identificat"}
                        </Text>

                        <View style={styles.modalProdInfo}>
                            <Text style={styles.modalProdName}>
                                {isNewProduct ? `Cod: ${scannedCode}` : tempProduct?.nume}
                            </Text>
                            {isNewProduct && (
                                <Text style={styles.newProdHint}>
                                    Acest produs va fi salvat în bază. Adminul va edita detaliile ulterior.
                                </Text>
                            )}
                        </View>

                        <Text style={styles.label}>Introdu Cantitatea Primită:</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="0"
                            keyboardType="numeric"
                            autoFocus={true}
                            value={tempQty}
                            onChangeText={setTempQty}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setQtyModalVisible(false)}>
                                <Text style={styles.cancelText}>Anulează</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmBtn} onPress={confirmAddItem}>
                                <Text style={styles.confirmText}>ADAUGĂ</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* --- MODAL CAMERA --- */}
            <Modal visible={scannerVisible} animationType="slide">
                <View style={{flex: 1, backgroundColor: 'black'}}>
                    <CameraView
                        style={StyleSheet.absoluteFill}
                        onBarcodeScanned={scannerVisible ? handleBarCodeScanned : undefined}
                    />
                    <TouchableOpacity style={styles.closeCamera} onPress={() => setScannerVisible(false)}>
                        <X size={32} color="white" />
                    </TouchableOpacity>

                    <View style={styles.overlay}>
                        <View style={styles.scanFrame} />
                        <Text style={styles.scanText}>Încadrează codul de bare</Text>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 15, backgroundColor: 'white', elevation: 2 },
    title: { fontSize: 20, fontWeight: 'bold' },
    content: { padding: 20, flex: 1 },

    // Form
    section: { marginBottom: 15 },
    label: { fontWeight: '600', marginBottom: 5, color: '#374151', fontSize: 13 },
    chip: { backgroundColor: '#e5e7eb', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginRight: 10 },
    activeChip: { backgroundColor: '#4F46E5' },
    chipText: { color: '#374151' },
    activeChipText: { color: 'white', fontWeight: 'bold' },

    rowInputs: { flexDirection: 'row', gap: 15, marginBottom: 15 },
    input: { backgroundColor: 'white', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db' },

    // Scan Button
    scanBtn: { backgroundColor: '#4F46E5', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 20, elevation: 3 },
    scanBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

    // List
    listHeader: { fontWeight: 'bold', marginBottom: 10, color: '#6b7280' },
    emptyText: { textAlign: 'center', color: '#9ca3af', marginTop: 20 },
    cartItem: { backgroundColor: 'white', padding: 12, borderRadius: 10, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent:'space-between', elevation: 1 },
    itemName: { fontWeight: 'bold', fontSize: 14, color: '#1f2937', maxWidth: '60%' },
    itemCode: { color: '#6b7280', fontSize: 11 },
    itemDetails: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    qtyBadge: { backgroundColor: '#e0e7ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    qtyText: { color: '#4338ca', fontWeight: 'bold', fontSize: 12 },
    priceInput: { backgroundColor: '#f3f4f6', padding: 8, borderRadius: 6, width: 70, textAlign: 'center', fontSize: 12 },

    // Footer
    footer: { padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderColor: '#e5e7eb' },
    saveBtn: { backgroundColor: '#059669', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

    // Modal Qty
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: 'white', borderRadius: 15, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
    modalProdInfo: { backgroundColor: '#f9fafb', padding: 10, borderRadius: 8, marginBottom: 15 },
    modalProdName: { fontWeight: 'bold', textAlign: 'center', fontSize: 16 },
    newProdHint: { fontSize: 11, color: '#ea580c', textAlign: 'center', marginTop: 5 },
    modalInput: { backgroundColor: '#f3f4f6', fontSize: 24, fontWeight: 'bold', textAlign: 'center', padding: 15, borderRadius: 10, marginBottom: 20 },
    modalButtons: { flexDirection: 'row', gap: 10 },
    cancelBtn: { flex: 1, padding: 15, alignItems: 'center' },
    cancelText: { color: '#6b7280', fontWeight: 'bold' },
    confirmBtn: { flex: 1, backgroundColor: '#4F46E5', padding: 15, borderRadius: 10, alignItems: 'center' },
    confirmText: { color: 'white', fontWeight: 'bold' },

    // Camera
    closeCamera: { position: 'absolute', top: 50, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 20 },
    overlay: { position: 'absolute', bottom: 100, left: 0, right: 0, alignItems: 'center' },
    scanFrame: { width: 250, height: 250, borderWidth: 2, borderColor: 'white', borderRadius: 20, marginBottom: 20 },
    scanText: { color: 'white', fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 8 }
});