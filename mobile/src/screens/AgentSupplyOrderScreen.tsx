import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
    Alert, Modal, SafeAreaView, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '../lib/supabase';
import {
    Barcode, X, Plus, Search,
    Package, ArrowLeft, Send, Trash2, FileText
} from 'lucide-react-native';

export default function AgentSupplyOrderScreen({ navigation }) {
    // --- STATE ---
    const [loading, setLoading] = useState(false);
    const [agentSupplierId, setAgentSupplierId] = useState(null);

    // --- DATE FACTURĂ (AICI SUNT VARIABILELE) ---
    const [invoiceSeries, setInvoiceSeries] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');

    const [orderItems, setOrderItems] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [currentProduct, setCurrentProduct] = useState(null);

    // Formular Produs
    const [packs, setPacks] = useState('');
    const [perPack, setPerPack] = useState('');
    const [looseQty, setLooseQty] = useState('');
    const [priceNoVat, setPriceNoVat] = useState('');
    const [vatRate, setVatRate] = useState(null);

    // Scanner
    const [permission, requestPermission] = useCameraPermissions();
    const [scannerVisible, setScannerVisible] = useState(false);

    // --- INITIALIZARE ---
    useEffect(() => {
        getCurrentAgentProfile();
    }, []);

    const getCurrentAgentProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('utilizatori')
                .select('furnizor_id')
                .eq('id', user.id)
                .single();

            if (error || !data?.furnizor_id) {
                const msg = "Contul tău nu este asociat unui Furnizor. Contactează Adminul.";
                Platform.OS === 'web' ? alert(msg) : Alert.alert("Configurare Incompletă", msg);
                navigation.goBack();
                return;
            }
            setAgentSupplierId(data.furnizor_id);
        } catch (err) {
            console.error(err);
        }
    };

    // --- CĂUTARE PRODUS ---
    const findProduct = async (term) => {
        if (!term || !agentSupplierId) return;
        setLoading(true);
        try {
            const { data } = await supabase
                .from('produse')
                .select('*')
                .eq('furnizor_id', agentSupplierId)
                .or(`cod_bare.eq.${term},nume.ilike.%${term}%`)
                .maybeSingle();

            if (data) {
                openProductModal(data);
            } else {
                const msg = "Produsul nu aparține furnizorului tău sau nu există.";
                Platform.OS === 'web' ? alert(msg) : Alert.alert("Produs Negăsit", msg);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setSearchQuery('');
        }
    };

    const openProductModal = (product) => {
        setCurrentProduct(product);
        setPacks('');
        setPerPack('');
        setLooseQty('');
        setPriceNoVat(product.ultimul_pret_achizitie ? product.ultimul_pret_achizitie.toString() : '');
        setVatRate(null);
        setModalVisible(true);
    };

    // --- ADAUGĂ ÎN COȘ ---
    const addItemToOrder = () => {
        const p = parseFloat(packs.replace(',', '.')) || 0;
        const pp = parseFloat(perPack.replace(',', '.')) || 0;
        const l = parseFloat(looseQty.replace(',', '.')) || 0;

        const totalQty = (p * pp) + l;

        if (totalQty <= 0) {
            return Platform.OS === 'web' ? alert("Introdu cantitate!") : Alert.alert("Eroare", "Introdu cantitate validă.");
        }

        const price = parseFloat(priceNoVat.replace(',', '.')) || 0;
        if (price <= 0) {
            return Platform.OS === 'web' ? alert("Introdu preț!") : Alert.alert("Eroare", "Introdu preț valid.");
        }
        if (!vatRate) {
            return Platform.OS === 'web' ? alert("Selectează TVA!") : Alert.alert("Eroare", "Selectează TVA.");
        }

        const newItem = {
            uniqueId: Date.now(),
            ...currentProduct,
            nr_baxuri: p,
            bucati_per_bax: pp,
            cantitate_fractionara: l,
            cantitate_totala: totalQty,
            pret_unitar_fara_tva: price,
            cota_tva: vatRate,
            valoare_linie: totalQty * price
        };

        setOrderItems([newItem, ...orderItems]);
        setModalVisible(false);
    };

    // --- TRIMITE COMANDA ---
    const submitOrder = async () => {
        // VALIDARE: FACTURA ESTE OBLIGATORIE
        if (!invoiceSeries || !invoiceNumber) {
            const msg = "Te rugăm să completezi Seria și Numărul Facturii (sus în pagină).";
            Platform.OS === 'web' ? alert(msg) : Alert.alert("Date Lipsă", msg);
            return;
        }

        if (orderItems.length === 0) {
            const msg = "Adaugă produse înainte de a trimite.";
            Platform.OS === 'web' ? alert(msg) : Alert.alert("Coș Gol", msg);
            return;
        }

        const msgConfirm = `Factura: ${invoiceSeries} ${invoiceNumber}\nTotal: ${orderItems.length} poziții\n\nTrimiți comanda?`;

        if (Platform.OS === 'web') {
            if (window.confirm(msgConfirm)) processOrderSubmission();
        } else {
            Alert.alert("Confirmare", msgConfirm, [
                { text: "Nu", style: "cancel" },
                { text: "DA, Trimite", onPress: processOrderSubmission }
            ]);
        }
    };

    const processOrderSubmission = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const totalFaraTva = orderItems.reduce((acc, item) => acc + item.valoare_linie, 0);

            // 1. Inserare Antet (CU SERIE SI NUMAR)
            const { data: comanda, error: errComanda } = await supabase
                .from('comenzi_aprovizionare')
                .insert([{
                    agent_id: user.id,
                    furnizor_id: agentSupplierId,
                    status: 'transmisa',
                    total_estimat_fara_tva: totalFaraTva,
                    serie_factura: invoiceSeries, // <--- SALVAM
                    numar_factura: invoiceNumber  // <--- SALVAM
                }])
                .select()
                .single();

            if (errComanda) throw errComanda;

            // 2. Inserare Linii
            const detalii = orderItems.map(item => ({
                comanda_id: comanda.id,
                produs_id: item.id,
                nr_baxuri: item.nr_baxuri,
                bucati_per_bax: item.bucati_per_bax,
                cantitate_fractionara: item.cantitate_fractionara,
                cantitate_totala: item.cantitate_totala,
                pret_unitar_fara_tva: item.pret_unitar_fara_tva,
                cota_tva: item.cota_tva,
                valoare_linie_fara_tva: item.valoare_linie
            }));

            const { error: errDetalii } = await supabase
                .from('comenzi_aprovizionare_detalii')
                .insert(detalii);

            if (errDetalii) throw errDetalii;

            Platform.OS === 'web' ? alert("Trimisă cu succes!") : Alert.alert("Succes", "Comanda a fost transmisă!");
            navigation.goBack();

        } catch (error) {
            Platform.OS === 'web' ? alert("Eroare: " + error.message) : Alert.alert("Eroare", error.message);
        } finally {
            setLoading(false);
        }
    };

    const openScanner = async () => {
        if (Platform.OS === 'web') return alert("Scanarea nu merge pe web.");
        if (!permission?.granted) await requestPermission();
        setScannerVisible(true);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ArrowLeft size={24} color="#374151" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.title}>Comandă Nouă</Text>
                    <Text style={styles.subtitle}>Introduceți factura și produsele</Text>
                </View>
            </View>

            {/* --- ZONA INPUT FACTURĂ (VIZIBILĂ) --- */}
            <View style={styles.invoiceCard}>
                <View style={{flexDirection:'row', alignItems:'center', marginBottom:10}}>
                    <FileText size={20} color="#4F46E5" />
                    <Text style={styles.invoiceTitle}>DATE FACTURĂ (OBLIGATORIU)</Text>
                </View>
                <View style={{flexDirection:'row', gap:10}}>
                    <View style={{flex:1}}>
                        <Text style={styles.inputLabel}>Serie</Text>
                        <TextInput
                            style={styles.invoiceInput}
                            placeholder="Ex: B"
                            value={invoiceSeries}
                            onChangeText={setInvoiceSeries}
                        />
                    </View>
                    <View style={{flex:2}}>
                        <Text style={styles.inputLabel}>Număr</Text>
                        <TextInput
                            style={styles.invoiceInput}
                            placeholder="Ex: 10234"
                            value={invoiceNumber}
                            onChangeText={setInvoiceNumber}
                            keyboardType="numeric"
                        />
                    </View>
                </View>
            </View>

            {/* CAUTARE */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBox}>
                    <Search size={20} color="#9ca3af" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Caută produs..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={() => findProduct(searchQuery)}
                    />
                </View>
                <TouchableOpacity style={styles.scanBtn} onPress={openScanner}>
                    <Barcode size={24} color="white" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={orderItems}
                keyExtractor={item => item.uniqueId.toString()}
                contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View style={{flex:1}}>
                            <Text style={styles.prodName}>{item.nume}</Text>
                            <Text style={styles.prodDetails}>
                                {item.cantitate_totala} buc x {item.pret_unitar_fara_tva} RON
                            </Text>
                        </View>
                        <View style={{alignItems:'flex-end'}}>
                            <Text style={styles.lineTotal}>{item.valoare_linie.toFixed(2)} RON</Text>
                            <TouchableOpacity onPress={() => setOrderItems(orderItems.filter(i => i.uniqueId !== item.uniqueId))} style={{marginTop: 5}}>
                                <Trash2 size={20} color="#ef4444" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>Coșul este gol.</Text>}
            />

            <View style={styles.footer}>
                <View>
                    <Text style={styles.totalLabel}>Total Estimat</Text>
                    <Text style={styles.totalValue}>
                        {orderItems.reduce((acc, i) => acc + i.valoare_linie, 0).toFixed(2)} RON
                    </Text>
                </View>
                <TouchableOpacity style={styles.submitBtn} onPress={submitOrder}>
                    <Send size={20} color="white" />
                    <Text style={{color:'white', fontWeight:'bold'}}>Trimite</Text>
                </TouchableOpacity>
            </View>

            {/* MODAL PRODUS */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <ScrollView>
                            <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom:20}}>
                                <Text style={styles.modalTitle}>{currentProduct?.nume}</Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)}><X size={24} color="#374151"/></TouchableOpacity>
                            </View>

                            <Text style={styles.sectionTitle}>Cantitate</Text>
                            <View style={styles.row}>
                                <View style={{flex:1}}>
                                    <Text style={styles.label}>Baxuri</Text>
                                    <TextInput style={styles.input} keyboardType="numeric" placeholder="0" value={packs} onChangeText={setPacks} />
                                </View>
                                <Text style={{marginTop:20}}>X</Text>
                                <View style={{flex:1}}>
                                    <Text style={styles.label}>Buc/Bax</Text>
                                    <TextInput style={styles.input} keyboardType="numeric" placeholder="0" value={perPack} onChangeText={setPerPack} />
                                </View>
                                <Text style={{marginTop:20}}>+</Text>
                                <View style={{flex:1}}>
                                    <Text style={styles.label}>Vrac</Text>
                                    <TextInput style={styles.input} keyboardType="numeric" placeholder="0" value={looseQty} onChangeText={setLooseQty} />
                                </View>
                            </View>

                            <Text style={styles.sectionTitle}>Preț (Fără TVA)</Text>
                            <TextInput style={styles.input} keyboardType="numeric" placeholder="0.00" value={priceNoVat} onChangeText={setPriceNoVat} />

                            <Text style={[styles.label, {marginTop:10}]}>Cotă TVA</Text>
                            <View style={styles.vatRow}>
                                {[11, 21].map((r) => (
                                    <TouchableOpacity key={r} style={[styles.vatBtn, vatRate === r && styles.vatBtnActive]} onPress={() => setVatRate(r)}>
                                        <Text style={[styles.vatText, vatRate === r && {color:'white'}]}>{r}%</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TouchableOpacity style={styles.addBtn} onPress={addItemToOrder}>
                                <Text style={{color:'white', fontWeight:'bold'}}>Adaugă</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <Modal visible={scannerVisible}><CameraView style={StyleSheet.absoluteFill} onBarcodeScanned={({data})=>{setScannerVisible(false); findProduct(data)}}/><TouchableOpacity style={styles.closeCam} onPress={()=>setScannerVisible(false)}><X size={30} color="white"/></TouchableOpacity></Modal>
            {loading && <ActivityIndicator style={styles.loading} size="large" color="#0284c7" />}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { padding: 20, backgroundColor: 'white', flexDirection: 'row', gap: 15, alignItems: 'center', elevation: 2 },
    title: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
    subtitle: { fontSize: 12, color: '#6b7280' },

    // STYLE NOU PENTRU FACTURA
    invoiceCard: { margin: 15, padding: 15, backgroundColor: '#e0e7ff', borderRadius: 10, borderWidth: 1, borderColor: '#c7d2fe' },
    invoiceTitle: { fontWeight: 'bold', color: '#3730a3', marginLeft: 8 },
    inputLabel: { fontSize: 12, color: '#4338ca', marginBottom: 4, fontWeight:'600' },
    invoiceInput: { backgroundColor: 'white', borderWidth: 1, borderColor: '#a5b4fc', borderRadius: 6, padding: 8, color: '#1f2937' },

    searchContainer: { flexDirection: 'row', paddingHorizontal: 15, gap: 10, marginBottom:10 },
    searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 10, paddingHorizontal: 10, borderWidth: 1, borderColor: '#e5e7eb' },
    searchInput: { flex: 1, padding: 10 },
    scanBtn: { backgroundColor: '#0284c7', width: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

    card: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', marginHorizontal:15 },
    prodName: { fontWeight: 'bold', fontSize: 16, color: '#1f2937' },
    prodDetails: { fontSize: 12, color: '#6b7280' },
    lineTotal: { fontWeight:'bold', fontSize:14, color:'#1f2937' },

    footer: { padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderColor: '#e5e7eb', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalLabel: { fontSize: 12, color: '#6b7280' },
    totalValue: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
    submitBtn: { backgroundColor: '#0284c7', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, flexDirection: 'row', gap: 8, alignItems: 'center' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    sectionTitle: { fontWeight: 'bold', color: '#374151', marginBottom: 10, marginTop: 10 },
    row: { flexDirection: 'row', gap: 10 },
    label: { fontSize: 12, color: '#6b7280', marginBottom: 5 },
    input: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, textAlign: 'center' },
    vatRow: { flexDirection: 'row', gap: 15 },
    vatBtn: { flex: 1, padding: 12, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, alignItems: 'center' },
    vatBtnActive: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
    vatText: { fontWeight: 'bold', color: '#374151' },
    addBtn: { backgroundColor: '#0284c7', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 20 },
    closeCam: { position: 'absolute', top: 50, right: 25 },
    loading: { position: 'absolute', top: '50%', left: '50%' },
    emptyText: { textAlign:'center', marginTop:20, color:'#999' }
});