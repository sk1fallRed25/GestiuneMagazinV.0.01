import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
    Alert, Modal, SafeAreaView, ActivityIndicator, Platform, ScrollView, KeyboardAvoidingView
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '../lib/supabase';
import {
    Barcode, Check, Trash2, X, ArrowLeft,
    AlertTriangle, Search, FileInput, Package, Calendar, Tag, AlertOctagon
} from 'lucide-react-native';

export default function InventoryReceipt({ navigation }) {
    // --- STATE ---
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Antet Factură
    const [suppliers, setSuppliers] = useState([]);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [invoiceSeries, setInvoiceSeries] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');

    const [linkedOrderId, setLinkedOrderId] = useState(null);
    const [scannedItems, setScannedItems] = useState([]);

    // Modal & Inputs
    const [modalVisible, setModalVisible] = useState(false);
    const [currentProduct, setCurrentProduct] = useState(null);

    // INPUTURI CANTITATE TOTALĂ
    const [packs, setPacks] = useState('');
    const [perPack, setPerPack] = useState('');
    const [looseQty, setLooseQty] = useState('');

    // --- LOGICA NOUĂ (CHECKBOXURI) ---
    // 1. Defecte
    const [hasDefects, setHasDefects] = useState(false); // Checkbox
    const [defectQty, setDefectQty] = useState('');      // Input Cantitate Defectă
    const [defectReason, setDefectReason] = useState(''); // Motiv

    // 2. Trasabilitate (Lot/Exp)
    const [hasExpiry, setHasExpiry] = useState(false);   // Checkbox
    const [lot, setLot] = useState('');
    const [expiryDate, setExpiryDate] = useState('');    // Format YYYY-MM-DD

    // Scanner
    const [scannerVisible, setScannerVisible] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();
    const [manualSearch, setManualSearch] = useState('');

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        const { data } = await supabase.from('furnizori').select('*').order('nume');
        setSuppliers(data || []);
    };

    // --- PASUL 1: SETUP ---
    const startReception = async () => {
        if (!selectedSupplier || !invoiceSeries || !invoiceNumber) {
            alert("Completează toate datele facturii!");
            return;
        }

        setLoading(true);
        try {
            const { data: comanda } = await supabase
                .from('comenzi_aprovizionare')
                .select('id')
                .eq('furnizor_id', selectedSupplier.id)
                .ilike('serie_factura', invoiceSeries.trim())
                .eq('numar_factura', invoiceNumber.trim())
                .in('status', ['confirmata', 'in_livrare'])
                .maybeSingle();

            if (comanda) {
                setLinkedOrderId(comanda.id);
            }
            setStep(2);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // --- PASUL 2: SCANARE ---
    const findProduct = async (term) => {
        setLoading(true);
        try {
            const { data } = await supabase.from('produse')
                .select('*')
                .or(`cod_bare.eq.${term},nume.ilike.%${term}%`)
                .maybeSingle();

            if (data) {
                if (data.furnizor_id && data.furnizor_id !== selectedSupplier.id) {
                    Alert.alert("Atenție", "Produs de la alt furnizor. Continui?", [
                        { text: "Nu", style: 'cancel' },
                        { text: "Da", onPress: () => openModal(data) }
                    ]);
                } else {
                    openModal(data);
                }
            } else {
                alert("Produsul nu există.");
            }
        } finally {
            setLoading(false);
            setManualSearch('');
        }
    };

    const openModal = (product) => {
        setCurrentProduct(product);
        // Resetăm inputurile standard
        setPacks('');
        setPerPack('');
        setLooseQty('');

        // Resetăm Checkboxurile și valorile lor
        setHasDefects(false);
        setDefectQty('');
        setDefectReason('');

        setHasExpiry(false);
        setLot('');
        setExpiryDate('');

        setModalVisible(true);
    };

    const addScannedItem = () => {
        // 1. Calculăm TOTAL FIZIC (Bune + Rele)
        const p = parseFloat(packs.replace(',', '.')) || 0;
        const pp = parseFloat(perPack.replace(',', '.')) || 0;
        const l = parseFloat(looseQty.replace(',', '.')) || 0;

        const totalQty = (p * pp) + l;

        if (totalQty <= 0) return alert("Introdu cantitatea totală recepționată (fizică).");

        // 2. Validare Defecte
        let qtyDef = 0;
        if (hasDefects) {
            qtyDef = parseFloat(defectQty.replace(',', '.')) || 0;
            if (qtyDef <= 0) return alert("Ai bifat 'Defecte', dar nu ai introdus cantitatea defectă.");
            if (qtyDef > totalQty) return alert("Cantitatea defectă nu poate fi mai mare decât totalul recepționat!");
            if (!defectReason) return alert("Introdu motivul defectului (ex: Spart).");
        }

        // 3. Validare Lot/Exp
        if (hasExpiry) {
            if (!lot) return alert("Ai bifat 'Lot', te rugăm introdu numărul lotului.");
            if (!expiryDate) return alert("Ai bifat 'Expirare', te rugăm introdu data.");
            // Validare simplă dată (YYYY-MM-DD)
            if (!expiryDate.match(/^\d{4}-\d{2}-\d{2}$/)) return alert("Data trebuie să fie AAAA-LL-ZZ (ex: 2026-12-31).");
        }

        const newItem = {
            uniqueId: Date.now(),
            ...currentProduct,

            // Cantități Fizice
            cantitate_baxuri: p,
            bucati_per_bax: pp,
            cantitate_fractionara: l,
            cantitate_receptie: totalQty, // TOTAL GENERAL (INCLUSIV DEFECTE)

            // Trasabilitate
            lot: hasExpiry ? lot : null,
            data_expirare: hasExpiry ? expiryDate : null,

            // Defecte
            has_defects: hasDefects,
            cantitate_defecte: qtyDef,
            motiv: hasDefects ? defectReason : null,

            pret_achizitie: currentProduct.ultimul_pret_achizitie || 0
        };

        setScannedItems([newItem, ...scannedItems]);
        setModalVisible(false);
    };

    // --- PASUL 3: SALVARE ---
    const submitReceipt = async () => {
        if (scannedItems.length === 0) return alert("Lista e goală.");

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const totalValoare = scannedItems.reduce((acc, i) => acc + (i.cantitate_receptie * i.pret_achizitie), 0);

            // 1. Creare Recepție
            const { data: receipt, error: rError } = await supabase.from('receptii').insert([{
                furnizor_id: selectedSupplier.id,
                user_id: user.id,
                serie_factura: invoiceSeries,
                numar_factura: invoiceNumber,
                total_valoare: totalValoare,
                comanda_aprovizionare_id: linkedOrderId
            }]).select().single();

            if (rError) throw rError;

            // 2. Salvare Detalii
            for (const item of scannedItems) {
                await supabase.from('receptii_detalii').insert([{
                    receptie_id: receipt.id,
                    produs_id: item.id,
                    cantitate_totala: item.cantitate_receptie, // Total fizic sosit
                    pret_achizitie_unitar: item.pret_achizitie,

                    cantitate_baxuri: item.cantitate_baxuri,
                    bucati_per_bax: item.bucati_per_bax,

                    lot: item.lot,
                    data_expirare: item.data_expirare,

                    cantitate_defecte: item.cantitate_defecte, // Cât din total e stricat
                    motiv_refuz: item.motiv
                }]);

                // 3. Update Stoc (DOAR CANTITATEA BUNĂ)
                // Cantitate Bună = Total Recepționat - Cantitate Defectă
                const goodQty = item.cantitate_receptie - item.cantitate_defecte;

                if (goodQty > 0) {
                    await supabase.rpc('increment_stock', {
                        row_id: item.id,
                        quantity: goodQty
                    });
                }
            }

            if (linkedOrderId) {
                await supabase.from('comenzi_aprovizionare').update({ status: 'receptionata' }).eq('id', linkedOrderId);
            }

            Alert.alert("Succes", "Recepția a fost salvată!");
            navigation.goBack();
        } catch (err) {
            alert("Eroare: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    // --- RENDER ELEMENT LISTĂ ---
    const renderSummaryItem = ({ item }) => (
        <View style={[styles.itemCard, item.has_defects && { borderLeftWidth:4, borderLeftColor:'#ef4444' }]}>
            <View style={{flex:1}}>
                <Text style={styles.itemName}>{item.nume}</Text>

                <Text style={{color:'#6b7280', fontSize:13, marginVertical:2}}>
                    {item.cantitate_baxuri > 0 ? `${item.cantitate_baxuri} Bax + ` : ''}
                    {item.cantitate_fractionara > 0 ? `${item.cantitate_fractionara} Buc` : ''}
                    {` (Total Fizic: ${item.cantitate_receptie})`}
                </Text>

                {/* INFO TRASABILITATE */}
                {(item.lot || item.data_expirare) && (
                    <View style={styles.traceInfo}>
                        <Tag size={12} color="#4F46E5"/>
                        <Text style={styles.traceText}>{item.lot || '-'}</Text>
                        <Calendar size={12} color="#4F46E5" style={{marginLeft:8}}/>
                        <Text style={styles.traceText}>{item.data_expirare || '-'}</Text>
                    </View>
                )}

                {/* INFO DEFECTE */}
                {item.has_defects && (
                    <View style={styles.defectInfo}>
                        <AlertOctagon size={12} color="#ef4444" />
                        <Text style={{color:'#ef4444', fontSize:12, fontWeight:'bold'}}>
                            {item.cantitate_defecte} buc DEFECTE ({item.motiv})
                        </Text>
                    </View>
                )}
            </View>

            <TouchableOpacity onPress={() => setScannedItems(scannedItems.filter(i => i.uniqueId !== item.uniqueId))} style={{marginLeft:10}}>
                <Trash2 size={20} color="#ef4444"/>
            </TouchableOpacity>
        </View>
    );

    // STEP 1: FACTURA
    if (step === 1) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft size={24} color="#374151" /></TouchableOpacity>
                    <Text style={styles.title}>Recepție Marfă (1/2)</Text>
                </View>
                <View style={{padding:20}}>
                    <Text style={styles.label}>1. Selectează Furnizor</Text>
                    <FlatList
                        data={suppliers} horizontal showsHorizontalScrollIndicator={false}
                        renderItem={({item}) => (
                            <TouchableOpacity
                                style={[styles.supCard, selectedSupplier?.id === item.id && styles.supCardActive]}
                                onPress={() => setSelectedSupplier(item)}>
                                <Text style={{color: selectedSupplier?.id === item.id ? 'white':'black'}}>{item.nume}</Text>
                            </TouchableOpacity>
                        )}
                    />
                    <Text style={styles.label}>2. Date Factură</Text>
                    <View style={{flexDirection:'row', gap:10}}>
                        <TextInput style={[styles.input, {flex:1}]} placeholder="Serie" value={invoiceSeries} onChangeText={setInvoiceSeries}/>
                        <TextInput style={[styles.input, {flex:2}]} placeholder="Număr" value={invoiceNumber} onChangeText={setInvoiceNumber} keyboardType="numeric"/>
                    </View>
                    <TouchableOpacity style={styles.nextBtn} onPress={startReception}>
                        {loading ? <ActivityIndicator color="white"/> : (
                            <>
                                <FileInput size={24} color="white" />
                                <Text style={styles.btnText}>Începe Scanarea</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // STEP 2: SCANARE
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => setStep(1)}><ArrowLeft size={24} color="#374151" /></TouchableOpacity>
                <View>
                    <Text style={styles.title}>Recepție: {selectedSupplier?.nume}</Text>
                    <Text style={{fontSize:12, color:'#666'}}>Factura: {invoiceSeries} {invoiceNumber}</Text>
                </View>
            </View>

            <View style={styles.scanArea}>
                <View style={styles.searchBox}>
                    <Search size={20} color="#999"/>
                    <TextInput style={{flex:1}} placeholder="Caută manual..." value={manualSearch} onChangeText={setManualSearch} onSubmitEditing={()=>findProduct(manualSearch)}/>
                </View>
                <TouchableOpacity style={styles.scanBtn} onPress={() => { if(!permission?.granted) requestPermission(); setScannerVisible(true); }}>
                    <Barcode size={24} color="white"/>
                </TouchableOpacity>
            </View>

            <FlatList
                data={scannedItems}
                keyExtractor={item => item.uniqueId.toString()}
                renderItem={renderSummaryItem}
                contentContainerStyle={{padding:20, paddingBottom:100}}
                ListEmptyComponent={<Text style={{textAlign:'center', marginTop:50, color:'#999'}}>Scanează produsele.</Text>}
            />

            <View style={styles.footer}>
                <TouchableOpacity style={styles.finishBtn} onPress={submitReceipt}>
                    {loading ? <ActivityIndicator color="white"/> : (
                        <>
                            <Check size={24} color="white"/>
                            <Text style={styles.btnText}>Salvează Recepția</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* MODAL COMPLEX */}
            <Modal visible={modalVisible} transparent animationType="slide">
                <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                                <Text style={styles.modalTitle}>{currentProduct?.nume}</Text>
                                <TouchableOpacity onPress={()=>setModalVisible(false)}><X size={24}/></TouchableOpacity>
                            </View>

                            {/* 1. CANTITATE TOTALA */}
                            <Text style={styles.sectionTitle}>1. Cantitate Totală (Fizică)</Text>
                            <View style={styles.qtyRow}>
                                <View style={styles.qtyCol}>
                                    <Text style={styles.smallLabel}>Baxuri</Text>
                                    <TextInput style={styles.bigInput} keyboardType="numeric" placeholder="0" value={packs} onChangeText={setPacks} autoFocus/>
                                </View>
                                <Text style={styles.mathSign}>X</Text>
                                <View style={styles.qtyCol}>
                                    <Text style={styles.smallLabel}>Buc/Bax</Text>
                                    <TextInput style={styles.bigInput} keyboardType="numeric" placeholder="0" value={perPack} onChangeText={setPerPack} />
                                </View>
                                <Text style={styles.mathSign}>+</Text>
                                <View style={styles.qtyCol}>
                                    <Text style={styles.smallLabel}>Vrac</Text>
                                    <TextInput style={styles.bigInput} keyboardType="numeric" placeholder="0" value={looseQty} onChangeText={setLooseQty} />
                                </View>
                            </View>

                            {/* 2. CHECKBOX DEFECTE */}
                            <TouchableOpacity style={styles.checkRow} onPress={() => setHasDefects(!hasDefects)}>
                                <View style={[styles.checkbox, hasDefects && styles.checkboxChecked]}>
                                    {hasDefects && <Check size={14} color="white"/>}
                                </View>
                                <Text style={styles.checkLabel}>Conține produse Defecte / Expirate?</Text>
                            </TouchableOpacity>

                            {/* POP-OUT DEFECTE */}
                            {hasDefects && (
                                <View style={styles.popOutBoxRed}>
                                    <Text style={{fontWeight:'bold', color:'#dc2626', marginBottom:5}}>Detalii Refuz</Text>
                                    <View style={{flexDirection:'row', gap:10}}>
                                        <View style={{flex:1}}>
                                            <Text style={styles.smallLabel}>Cantitate Defectă</Text>
                                            <TextInput
                                                style={styles.input}
                                                keyboardType="numeric"
                                                placeholder="Ex: 2"
                                                value={defectQty}
                                                onChangeText={setDefectQty}
                                            />
                                        </View>
                                        <View style={{flex:2}}>
                                            <Text style={styles.smallLabel}>Motiv</Text>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Ex: Spart, Expirat"
                                                value={defectReason}
                                                onChangeText={setDefectReason}
                                            />
                                        </View>
                                    </View>
                                </View>
                            )}

                            {/* 3. CHECKBOX TRASABILITATE */}
                            <TouchableOpacity style={styles.checkRow} onPress={() => setHasExpiry(!hasExpiry)}>
                                <View style={[styles.checkbox, hasExpiry && styles.checkboxCheckedBlue]}>
                                    {hasExpiry && <Check size={14} color="white"/>}
                                </View>
                                <Text style={styles.checkLabel}>Adaugă Lot și Data Expirării</Text>
                            </TouchableOpacity>

                            {/* POP-OUT TRASABILITATE */}
                            {hasExpiry && (
                                <View style={styles.popOutBoxBlue}>
                                    <Text style={{fontWeight:'bold', color:'#4F46E5', marginBottom:5}}>Trasabilitate</Text>
                                    <View style={{gap:10}}>
                                        <View style={{flexDirection:'row', alignItems:'center', gap:10}}>
                                            <Tag size={20} color="#6b7280" />
                                            <TextInput
                                                style={[styles.input, {flex:1}]}
                                                placeholder="Număr Lot / Batch"
                                                value={lot}
                                                onChangeText={setLot}
                                            />
                                        </View>
                                        <View style={{flexDirection:'row', alignItems:'center', gap:10}}>
                                            <Calendar size={20} color="#6b7280" />
                                            <TextInput
                                                style={[styles.input, {flex:1}]}
                                                placeholder="Data: AAAA-LL-ZZ"
                                                value={expiryDate}
                                                onChangeText={setExpiryDate}
                                            />
                                        </View>
                                    </View>
                                </View>
                            )}

                            <TouchableOpacity style={styles.confirmBtn} onPress={addScannedItem}>
                                <Text style={{color:'white', fontWeight:'bold', fontSize:16}}>Confirmă și Adaugă</Text>
                            </TouchableOpacity>

                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <Modal visible={scannerVisible}><CameraView style={StyleSheet.absoluteFill} onBarcodeScanned={({data})=>{setScannerVisible(false); findProduct(data)}}/><TouchableOpacity style={styles.closeCam} onPress={()=>setScannerVisible(false)}><X size={30} color="white"/></TouchableOpacity></Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: { padding: 20, backgroundColor: 'white', flexDirection: 'row', gap: 15, alignItems: 'center', elevation: 2 },
    title: { fontSize: 18, fontWeight: 'bold' },
    label: { marginTop: 15, marginBottom: 5, fontWeight: 'bold', color: '#374151' },
    input: { backgroundColor: 'white', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db' },
    supCard: { padding: 15, backgroundColor: 'white', marginRight: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb' },
    supCardActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
    nextBtn: { backgroundColor: '#4F46E5', padding: 15, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 20 },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    finishBtn: { backgroundColor: '#059669', padding: 15, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', gap: 10 },
    footer: { padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderColor: '#e5e7eb' },

    scanArea: { flexDirection:'row', padding:15, gap:10 },
    searchBox: { flex:1, flexDirection:'row', alignItems:'center', backgroundColor:'white', borderRadius:10, borderWidth:1, borderColor:'#ddd', paddingHorizontal:10 },
    scanBtn: { backgroundColor:'#4F46E5', width:50, borderRadius:10, justifyContent:'center', alignItems:'center' },

    itemCard: { backgroundColor: 'white', padding: 15, borderRadius: 10, flexDirection: 'row', alignItems: 'center', marginBottom: 10, elevation: 1 },
    itemName: { fontWeight:'bold', fontSize:16, color:'#333' },
    traceInfo: { flexDirection:'row', gap:8, marginTop:5, backgroundColor:'#f3f4f6', padding:4, borderRadius:4, alignSelf:'flex-start', alignItems:'center' },
    traceText: { fontSize:11, color:'#4b5563' },
    defectInfo: { flexDirection:'row', gap:5, marginTop:5, alignItems:'center' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding:20 },
    modalContent: { backgroundColor: 'white', padding: 20, borderRadius: 20, maxHeight:'90%' },
    modalTitle: { fontSize:18, fontWeight:'bold', marginBottom:5 },
    sectionTitle: { fontSize:14, fontWeight:'600', color:'#666', marginBottom:10, marginTop:20 },

    // Inputs Cantitate
    qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    qtyCol: { flex: 1 },
    bigInput: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, textAlign: 'center', fontSize: 18, fontWeight:'bold', color: '#111827', height:50 },
    mathSign: { fontSize: 20, fontWeight: 'bold', color: '#9ca3af', marginTop: 15 },
    smallLabel: { fontSize: 11, color: '#6b7280', marginBottom: 4, textAlign:'center' },

    // CHECKBOXURI & POP-OUTS
    checkRow: { flexDirection:'row', alignItems:'center', gap:10, marginTop:25, marginBottom:5 },
    checkbox: { width:24, height:24, borderRadius:4, borderWidth:2, borderColor:'#d1d5db', alignItems:'center', justifyContent:'center', backgroundColor:'white' },
    checkboxChecked: { backgroundColor:'#ef4444', borderColor:'#ef4444' },
    checkboxCheckedBlue: { backgroundColor:'#4F46E5', borderColor:'#4F46E5' },
    checkLabel: { fontWeight:'bold', color:'#374151' },

    popOutBoxRed: { backgroundColor:'#fef2f2', padding:10, borderRadius:8, borderWidth:1, borderColor:'#fecaca', marginTop:5 },
    popOutBoxBlue: { backgroundColor:'#e0e7ff', padding:10, borderRadius:8, borderWidth:1, borderColor:'#c7d2fe', marginTop:5 },

    confirmBtn: { backgroundColor: '#059669', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 30 },
    closeCam: { position:'absolute', top:40, right:20 }
});