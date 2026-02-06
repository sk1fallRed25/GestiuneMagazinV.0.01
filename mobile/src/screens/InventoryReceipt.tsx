import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
    Alert, Modal, SafeAreaView, ActivityIndicator, Keyboard, Platform
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '../lib/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
    Barcode, Check, Plus, Trash2, X, Search, Calendar,
    ChevronDown, Package, FileText, ArrowLeft
} from 'lucide-react-native';

export default function InventoryReceipt({ navigation }) {
    // --- STATE GENERAL ---
    const [step, setStep] = useState(1); // 1 = Selectare Furnizor, 2 = Scanare Produse
    const [loading, setLoading] = useState(false);
    const [suppliers, setSuppliers] = useState([]);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [invoiceSeries, setInvoiceSeries] = useState('');

    // --- STATE PRODUSE ---
    const [scannedItems, setScannedItems] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [currentProduct, setCurrentProduct] = useState(null);

    // Formular Adăugare Cantitate/Preț/Lot
    const [qty, setQty] = useState('');
    const [price, setPrice] = useState('');
    const [batch, setBatch] = useState(''); // Lot
    const [expDate, setExpDate] = useState(new Date()); // Data Expirare
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [hasExpDate, setHasExpDate] = useState(false); // Checkbox virtual pentru expirare

    // --- STATE SCANNER ---
    const [permission, requestPermission] = useCameraPermissions();
    const [scannerVisible, setScannerVisible] = useState(false);
    const [manualSearch, setManualSearch] = useState('');

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        try {
            const { data, error } = await supabase.from('furnizori').select('*').order('nume');
            if (error) throw error;
            setSuppliers(data || []);
        } catch (err) {
            console.log("Eroare incarcare furnizori:", err.message);
        }
    };

    // --- PASUL 1: LOGICA FURNIZOR ---
    const handleSupplierSelect = (supplier) => {
        setSelectedSupplier(supplier);
    };

    const goToScanning = () => {
        if (!selectedSupplier || !invoiceNumber) {
            Alert.alert("Eroare", "Te rog selectează furnizorul și introdu numărul facturii.");
            return;
        }
        setStep(2);
    };

    // --- PASUL 2: LOGICA SCANARE ---
    const openScanner = async () => {
        if (!permission?.granted) await requestPermission();
        setScannerVisible(true);
    };

    const handleBarCodeScanned = async ({ data }) => {
        setScannerVisible(false);
        findProduct(data);
    };

    const findProduct = async (term) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('produse')
                .select('*')
                .or(`cod_bare.eq.${term},nume.ilike.%${term}%`)
                .maybeSingle();

            if (data) {
                setCurrentProduct(data);
                // Reset form
                setQty('');
                setPrice('');
                setBatch('');
                setHasExpDate(false);
                setExpDate(new Date());
                setModalVisible(true);
            } else {
                Alert.alert(
                    "Produs Inexistent",
                    "Acest produs nu există în nomenclator. Vrei să îl creezi?",
                    [
                        { text: "Nu", style: "cancel" },
                        { text: "Da, Crează", onPress: () => navigation.navigate('AdminQuickAddScreen') }
                    ]
                );
            }
        } catch (err) {
            Alert.alert("Eroare", "A apărut o problemă la căutare.");
        } finally {
            setLoading(false);
        }
    };

    const addItemToReceipt = () => {
        if (!qty || !price) {
            Alert.alert("Eroare", "Introdu cantitatea și prețul de achiziție.");
            return;
        }

        const newItem = {
            uniqueId: Date.now(), // ID temporar pt lista locală
            ...currentProduct,
            cantitate_intrata: parseInt(qty),
            pret_achizitie: parseFloat(price.replace(',', '.')),
            lot: batch || null,
            data_expirare: hasExpDate ? expDate.toISOString().split('T')[0] : null
        };

        setScannedItems([newItem, ...scannedItems]);
        setModalVisible(false);
        setManualSearch('');
    };

    const removeItem = (id) => {
        setScannedItems(scannedItems.filter(item => item.uniqueId !== id));
    };

    // --- FINALIZARE RECEPȚIE (LOGICĂ ROBUSTĂ) ---
    const submitReceipt = async () => {
        if (scannedItems.length === 0) return Alert.alert("Eroare", "Nu ai scanat niciun produs.");
        if (!selectedSupplier) return Alert.alert("Eroare", "Furnizorul s-a pierdut. Reia procesul.");

        Alert.alert(
            "Finalizare Recepție",
            `Salvezi ${scannedItems.length} produse?`,
            [
                { text: "Anulează", style: "cancel" },
                { text: "DA, Salvează", onPress: processSubmission }
            ]
        );
    };

    const processSubmission = async () => {
        setLoading(true);
        console.log("--> Începe salvarea recepției...");

        try {
            // 1. Verificăm Auth
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) throw new Error("Nu ești autentificat!");

            // 2. Creare Antet Recepție
            const totalValoare = scannedItems.reduce((sum, item) => sum + (item.cantitate_intrata * item.pret_achizitie), 0);

            const { data: receiptData, error: rError } = await supabase
                .from('receptii')
                .insert([{
                    furnizor_id: selectedSupplier.id,
                    user_id: user.id,
                    serie_factura: invoiceSeries || '',
                    numar_factura: invoiceNumber,
                    total_valoare: totalValoare
                }])
                .select()
                .single();

            if (rError) throw new Error(`Eroare salvare antet: ${rError.message}`);
            console.log("Antet creat ID:", receiptData.id);

            // 3. Salvare Detalii și Update Stoc (Item cu Item)
            for (const item of scannedItems) {
                // A. Insert Detaliu
                const { error: dError } = await supabase
                    .from('receptii_detalii')
                    .insert([{
                        receptie_id: receiptData.id,
                        produs_id: item.id,
                        cantitate: item.cantitate_intrata,
                        pret_achizitie: item.pret_achizitie,
                        lot: item.lot,
                        data_expirare: item.data_expirare
                    }]);

                if (dError) throw new Error(`Eroare la produsul ${item.nume}: ${dError.message}`);

                // B. Update Stoc (Încercăm RPC, dacă nu merge, facem Update direct)
                const { error: rpcError } = await supabase.rpc('increment_stock', {
                    row_id: item.id,
                    quantity: item.cantitate_intrata
                });

                if (rpcError) {
                    console.log(`⚠️ RPC failed for ${item.nume}, trying direct update...`);
                    // Fallback: Citim stocul curent și adăugăm
                    const { data: currentProd } = await supabase
                        .from('produse')
                        .select('stoc_depozit')
                        .eq('id', item.id)
                        .single();

                    const newStock = (currentProd?.stoc_depozit || 0) + item.cantitate_intrata;

                    await supabase.from('produse').update({
                        stoc_depozit: newStock,
                        ultimul_pret_achizitie: item.pret_achizitie
                    }).eq('id', item.id);
                } else {
                    // Dacă RPC a mers, actualizăm doar prețul de achiziție
                    await supabase.from('produse')
                        .update({ ultimul_pret_achizitie: item.pret_achizitie })
                        .eq('id', item.id);
                }
            }

            Alert.alert("Succes", "Recepția a fost salvată și stocul actualizat!");
            navigation.goBack();

        } catch (error) {
            console.error("CRITICAL ERROR:", error);
            Alert.alert("Eroare la Salvare", error.message);
        } finally {
            setLoading(false);
        }
    };

    // --- DATE PICKER HANDLER ---
    const onDateChange = (event, date) => {
        if (Platform.OS === 'android') setShowDatePicker(false);
        if (event.type === 'set' && date) setExpDate(date);
        else if (event.type === 'dismissed') setShowDatePicker(false);
    };

    // --- RENDER ---
    if (step === 1) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft size={24} color="#374151" /></TouchableOpacity>
                    <Text style={styles.title}>Recepție Nouă (1/2)</Text>
                </View>

                <View style={styles.formContainer}>
                    <Text style={styles.label}>1. Selectează Furnizor</Text>
                    <FlatList
                        data={suppliers}
                        keyExtractor={item => item.id.toString()}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{maxHeight: 80, marginBottom: 20}}
                        renderItem={({item}) => (
                            <TouchableOpacity
                                style={[styles.supplierCard, selectedSupplier?.id === item.id && styles.selectedCard]}
                                onPress={() => handleSupplierSelect(item)}
                            >
                                <Text style={[styles.supText, selectedSupplier?.id === item.id && {color:'white'}]}>{item.nume}</Text>
                            </TouchableOpacity>
                        )}
                    />

                    <Text style={styles.label}>2. Detalii Factură</Text>
                    <View style={styles.row}>
                        <TextInput
                            style={[styles.input, {flex:1}]}
                            placeholder="Serie (Opțional)"
                            value={invoiceSeries}
                            onChangeText={setInvoiceSeries}
                        />
                        <TextInput
                            style={[styles.input, {flex:2}]}
                            placeholder="Număr Factură *"
                            value={invoiceNumber}
                            onChangeText={setInvoiceNumber}
                            keyboardType="numeric"
                        />
                    </View>

                    <TouchableOpacity style={styles.nextBtn} onPress={goToScanning}>
                        <Text style={styles.btnText}>Continuă la Produse</Text>
                        <ChevronDown size={20} color="white" style={{transform: [{rotate:'-90deg'}]}} />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => setStep(1)}><ArrowLeft size={24} color="#374151" /></TouchableOpacity>
                <View>
                    <Text style={styles.title}>Scanare Produse (2/2)</Text>
                    <Text style={styles.subtitle}>{selectedSupplier?.nume} - {invoiceNumber}</Text>
                </View>
            </View>

            <View style={styles.scanArea}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Caută manual sau scanează..."
                    value={manualSearch}
                    onChangeText={setManualSearch}
                    onSubmitEditing={() => findProduct(manualSearch)}
                />
                <TouchableOpacity style={styles.scanBtn} onPress={openScanner}>
                    <Barcode size={24} color="white" />
                </TouchableOpacity>
            </View>

            {loading && <ActivityIndicator size="large" color="#4F46E5" />}

            <FlatList
                data={scannedItems}
                keyExtractor={item => item.uniqueId.toString()}
                contentContainerStyle={{padding: 20}}
                renderItem={({item}) => (
                    <View style={styles.itemCard}>
                        <View style={{flex:1}}>
                            <Text style={styles.itemName}>{item.nume}</Text>
                            <Text style={styles.itemSub}>{item.cantitate_intrata} buc x {item.pret_achizitie} RON</Text>
                            {(item.lot || item.data_expirare) && (
                                <View style={styles.metaBadge}>
                                    <Text style={styles.metaText}>
                                        {item.lot ? `Lot: ${item.lot} ` : ''}
                                        {item.data_expirare ? `Exp: ${item.data_expirare}` : ''}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <TouchableOpacity onPress={() => removeItem(item.uniqueId)}>
                            <Trash2 size={20} color="#ef4444" />
                        </TouchableOpacity>
                    </View>
                )}
            />

            <View style={styles.footer}>
                <View style={styles.totalBox}>
                    <Text style={styles.totalLabel}>Total Factură:</Text>
                    <Text style={styles.totalVal}>
                        {scannedItems.reduce((acc, i) => acc + (i.cantitate_intrata * i.pret_achizitie), 0).toFixed(2)} RON
                    </Text>
                </View>
                <TouchableOpacity style={styles.finishBtn} onPress={submitReceipt}>
                    {loading ? <ActivityIndicator color="white"/> : (
                        <>
                            <Check size={24} color="white" />
                            <Text style={styles.btnText}>Finalizează Recepția</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* MODAL CANTITATE & LOT */}
            <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{currentProduct?.nume}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}><X size={24} color="#374151" /></TouchableOpacity>
                        </View>

                        <View style={styles.row}>
                            <View style={{flex:1}}>
                                <Text style={styles.inputLabel}>Cantitate</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    keyboardType="numeric"
                                    value={qty}
                                    onChangeText={setQty}
                                    autoFocus
                                    placeholder="0"
                                />
                            </View>
                            <View style={{flex:1}}>
                                <Text style={styles.inputLabel}>Preț Achiziție (RON)</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    keyboardType="numeric"
                                    value={price}
                                    onChangeText={setPrice}
                                    placeholder="0.00"
                                />
                            </View>
                        </View>

                        <View style={styles.divider} />

                        {/* LOT SI EXPIRARE */}
                        <Text style={styles.sectionHeader}>Informații Lot (Opțional)</Text>

                        <View style={styles.formGroup}>
                            <Text style={styles.inputLabel}>Număr Lot</Text>
                            <TextInput
                                style={styles.modalInputSecondary}
                                value={batch}
                                onChangeText={setBatch}
                                placeholder="Ex: L2024-05"
                            />
                        </View>

                        <View style={styles.dateRow}>
                            <TouchableOpacity
                                style={[styles.checkbox, hasExpDate && styles.checkboxActive]}
                                onPress={() => setHasExpDate(!hasExpDate)}
                            >
                                {hasExpDate && <Check size={14} color="white" />}
                            </TouchableOpacity>
                            <Text style={{fontSize:14, color:'#374151'}}>Are dată de expirare?</Text>
                        </View>

                        {hasExpDate && (
                            <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowDatePicker(true)}>
                                <Calendar size={20} color="#4F46E5" />
                                <Text style={styles.dateText}>
                                    Expiră la: {expDate.toLocaleDateString('ro-RO')}
                                </Text>
                            </TouchableOpacity>
                        )}

                        {showDatePicker && (
                            <DateTimePicker
                                value={expDate}
                                mode="date"
                                onChange={onDateChange}
                                minimumDate={new Date()}
                            />
                        )}

                        <TouchableOpacity style={styles.addBtn} onPress={addItemToReceipt}>
                            <Text style={styles.addBtnText}>Adaugă în Recepție</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* SCANNER CAMERA */}
            <Modal visible={scannerVisible} animationType="slide">
                <CameraView
                    style={StyleSheet.absoluteFill}
                    onBarcodeScanned={scannerVisible ? handleBarCodeScanned : undefined}
                />
                <TouchableOpacity style={styles.closeCam} onPress={() => setScannerVisible(false)}>
                    <X size={35} color="white" />
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: { padding: 20, backgroundColor: 'white', flexDirection: 'row', gap: 15, alignItems: 'center', elevation: 2 },
    title: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
    subtitle: { fontSize: 12, color: '#6b7280' },

    // Step 1
    formContainer: { padding: 20 },
    label: { fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 10, marginTop: 10 },
    row: { flexDirection: 'row', gap: 10 },
    input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#d1d5db', padding: 12, borderRadius: 8, fontSize: 16 },
    supplierCard: { padding: 15, backgroundColor: 'white', borderRadius: 10, marginRight: 10, borderWidth: 1, borderColor: '#e5e7eb', minWidth: 100, alignItems: 'center', justifyContent:'center' },
    selectedCard: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
    supText: { fontWeight: '600', color: '#374151' },
    nextBtn: { backgroundColor: '#4F46E5', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 30, gap: 10 },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

    // Step 2
    scanArea: { flexDirection: 'row', padding: 15, gap: 10 },
    searchInput: { flex: 1, backgroundColor: 'white', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#e5e7eb' },
    scanBtn: { backgroundColor: '#4F46E5', width: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

    itemCard: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 1 },
    itemName: { fontWeight: 'bold', fontSize: 16, color: '#1f2937' },
    itemSub: { color: '#6b7280', marginTop: 2 },
    metaBadge: { backgroundColor: '#fef3c7', alignSelf:'flex-start', paddingHorizontal:6, paddingVertical:2, borderRadius:4, marginTop:4 },
    metaText: { fontSize:10, color:'#b45309', fontWeight:'bold' },

    footer: { padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderColor: '#e5e7eb' },
    totalBox: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    totalLabel: { fontSize: 16, color: '#6b7280' },
    totalVal: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
    finishBtn: { backgroundColor: '#059669', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    inputLabel: { fontSize: 12, fontWeight: 'bold', color: '#6b7280', marginBottom: 5 },
    modalInput: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 18, fontWeight: 'bold' },
    modalInputSecondary: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10 },

    divider: { height:1, backgroundColor:'#e5e7eb', marginVertical:15 },
    sectionHeader: { fontSize:14, fontWeight:'bold', color:'#374151', marginBottom:10 },
    dateRow: { flexDirection:'row', alignItems:'center', gap:10, marginBottom:10 },
    checkbox: { width:20, height:20, borderRadius:4, borderWidth:2, borderColor:'#4F46E5', alignItems:'center', justifyContent:'center' },
    checkboxActive: { backgroundColor:'#4F46E5' },
    datePickerBtn: { flexDirection:'row', alignItems:'center', gap:10, backgroundColor:'#e0e7ff', padding:10, borderRadius:8 },
    dateText: { color:'#4338ca', fontWeight:'bold' },

    addBtn: { backgroundColor: '#4F46E5', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20 },
    addBtnText: { color: 'white', fontWeight: 'bold' },

    closeCam: { position: 'absolute', top: 50, right: 25, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 25, padding: 5 }
});