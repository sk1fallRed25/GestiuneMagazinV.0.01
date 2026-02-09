import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, Modal, Alert, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform
} from 'react-native';
import { supabase } from '../lib/supabase';
import {
    Package, Plus, Search, X, Edit2,
    Trash2, Save, ShoppingCart, CalendarClock, AlertTriangle
} from 'lucide-react-native';

export default function ProductsListScreen() {
    const [products, setProducts] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // --- LISTA PRODUSELOR CU PROBLEME (EXPIRĂRI) ---
    const [expiringIds, setExpiringIds] = useState(new Set());

    // Modal Editare
    const [modalVisible, setModalVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);

    // Form Editare
    const [name, setName] = useState('');
    const [barcode, setBarcode] = useState('');
    const [price, setPrice] = useState('');
    const [stockDepozit, setStockDepozit] = useState('');
    const [stockMagazin, setStockMagazin] = useState('');
    const [selectedSupplierId, setSelectedSupplierId] = useState(null);

    // Modal Vânzare
    const [sellModalVisible, setSellModalVisible] = useState(false);
    const [sellProduct, setSellProduct] = useState(null);
    const [sellQty, setSellQty] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Luăm produsele
            const { data: prodData, error: prodError } = await supabase
                .from('produse')
                .select(`*, furnizori (id, nume)`)
                .order('nume');

            if (prodError) throw prodError;
            setProducts(prodData || []);

            // 2. Luăm furnizorii
            const { data: supData } = await supabase.from('furnizori').select('*');
            setSuppliers(supData || []);

            // 3. --- NOU: VERIFICĂM CARE PRODUSE AU PROBLEME DE EXPIRARE ---
            // Interogăm vederea 'view_expirari' pe care am creat-o anterior
            const { data: expData } = await supabase
                .from('view_expirari')
                .select('produs_id');

            // Creăm un Set cu ID-urile produselor problematice pentru căutare rapidă
            if (expData) {
                const ids = new Set(expData.map(item => item.produs_id));
                setExpiringIds(ids);
            }

        } catch (err) {
            Alert.alert("Eroare", err.message);
        } finally {
            setLoading(false);
        }
    };

    // --- FUNCȚIA DE VÂNZARE FEFO (First Expired First Out) ---
    const openSellModal = (prod) => {
        setSellProduct(prod);
        setSellQty('');
        setSellModalVisible(true);
    };

    const handleQuickSell = async () => {
        const qty = parseInt(sellQty);
        if (!qty || qty <= 0) return Alert.alert("Eroare", "Cantitate invalidă");

        const totalStock = (sellProduct.stoc_magazin || 0) + (sellProduct.stoc_depozit || 0);
        if (qty > totalStock) {
            return Alert.alert("Stoc Insuficient", "Nu ai destulă marfă totală.");
        }

        setLoading(true);
        try {
            // APELĂM FUNCȚIA SQL FEFO
            const { error } = await supabase.rpc('vinde_produs_fefo', {
                p_produs_id: sellProduct.id,
                p_cantitate: qty
            });

            if (error) throw error;

            Alert.alert("Succes", `Vândut ${qty} buc. Loturile vechi au fost scăzute automat.`);
            setSellModalVisible(false);
            fetchData();
        } catch (err) {
            Alert.alert("Eroare Vânzare", err.message);
        } finally {
            setLoading(false);
        }
    };

    // Funcții standard (Save, Delete, OpenModal)
    const handleSave = async () => {
        if (!name || !barcode) {
            Alert.alert("Eroare", "Numele și Codul de bare sunt obligatorii!");
            return;
        }
        const payload = {
            nume: name,
            cod_bare: barcode,
            ultimul_pret_achizitie: parseFloat(price) || 0,
            stoc_depozit: parseInt(stockDepozit) || 0,
            stoc_magazin: parseInt(stockMagazin) || 0,
            furnizor_id: selectedSupplierId
        };
        try {
            if (isEditing) {
                const { error } = await supabase.from('produse').update(payload).eq('id', editId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('produse').insert([payload]);
                if (error) throw error;
            }
            setModalVisible(false);
            fetchData();
        } catch (err) {
            Alert.alert("Eroare Salvare", err.message);
        }
    };

    const handleDelete = (id) => {
        Alert.alert("Ștergere", "Sigur vrei să ștergi acest produs?", [
            { text: "Nu", style: "cancel" },
            { text: "Da", onPress: async () => {
                    const { error } = await supabase.from('produse').delete().eq('id', id);
                    if (!error) fetchData();
                }}
        ]);
    };

    const openModal = (prod = null) => {
        if (prod) {
            setIsEditing(true);
            setEditId(prod.id);
            setName(prod.nume);
            setBarcode(prod.cod_bare);
            setPrice(prod.ultimul_pret_achizitie?.toString() || '');
            setStockDepozit(prod.stoc_depozit?.toString() || '0');
            setStockMagazin(prod.stoc_magazin?.toString() || '0');
            setSelectedSupplierId(prod.furnizor_id);
        } else {
            setIsEditing(false);
            setEditId(null);
            setName('');
            setBarcode('');
            setPrice('');
            setStockDepozit('');
            setStockMagazin('');
            setSelectedSupplierId(null);
        }
        setModalVisible(true);
    };

    const filteredProducts = products.filter(p =>
        p.nume.toLowerCase().includes(search.toLowerCase()) ||
        p.cod_bare.includes(search)
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.searchBox}>
                    <Search size={20} color="#9ca3af" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Caută produse..."
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={() => openModal()}>
                    <Plus size={24} color="white" />
                </TouchableOpacity>
            </View>

            {loading && !sellModalVisible ? <ActivityIndicator size="large" color="#4F46E5" style={{marginTop:50}} /> : (
                <FlatList
                    data={filteredProducts}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={{padding: 20}}
                    renderItem={({item}) => {
                        // Verificăm dacă produsul are loturi expirate
                        const hasExpirationIssue = expiringIds.has(item.id);

                        return (
                            <View style={[styles.card, hasExpirationIssue && {borderLeftWidth:4, borderLeftColor:'#f97316'}]}>
                                <TouchableOpacity style={{flex:1, flexDirection:'row', alignItems:'center', gap:15}} onPress={() => openModal(item)}>
                                    <View style={[styles.iconBox, hasExpirationIssue && {backgroundColor:'#ffedd5'}]}>
                                        <Package size={24} color={hasExpirationIssue ? '#f97316' : '#4F46E5'} />
                                    </View>
                                    <View style={{flex:1}}>
                                        {/* Nume + Badge Expirare */}
                                        <View style={{flexDirection:'row', alignItems:'center', gap:6}}>
                                            <Text style={styles.prodName}>{item.nume}</Text>
                                            {hasExpirationIssue && (
                                                <View style={styles.expBadge}>
                                                    <AlertTriangle size={10} color="white" />
                                                    <Text style={styles.expText}>EXPIRĂ</Text>
                                                </View>
                                            )}
                                        </View>

                                        <Text style={styles.prodCode}>{item.cod_bare}</Text>
                                        {item.furnizori && <Text style={{fontSize:10, color:'#059669', fontWeight:'bold'}}>{item.furnizori.nume}</Text>}
                                    </View>
                                </TouchableOpacity>

                                <View style={{alignItems:'flex-end'}}>
                                    <Text style={styles.price}>{item.ultimul_pret_achizitie} RON</Text>
                                    <View style={{flexDirection:'row', gap:8, marginTop:4, marginBottom:8}}>
                                        <Text style={styles.stock}>Dep: {item.stoc_depozit}</Text>
                                        <Text style={{color:'#cbd5e1'}}>|</Text>
                                        <Text style={[styles.stock, {color:'#4F46E5'}]}>Mag: {item.stoc_magazin || 0}</Text>
                                    </View>

                                    <TouchableOpacity
                                        style={[styles.sellBtn, hasExpirationIssue && {backgroundColor:'#f97316'}]}
                                        onPress={() => openSellModal(item)}
                                    >
                                        <ShoppingCart size={14} color="white" />
                                        <Text style={styles.sellBtnText}>Vinde</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    }}
                />
            )}

            {/* MODAL EDITARE - NESCHIMBAT */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{isEditing ? 'Editare Produs' : 'Produs Nou'}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.label}>Nume Produs</Text>
                        <TextInput style={styles.input} value={name} onChangeText={setName} />
                        <Text style={styles.label}>Cod de Bare</Text>
                        <TextInput style={styles.input} value={barcode} onChangeText={setBarcode} keyboardType="numeric" />
                        <Text style={styles.label}>Preț Achiziție</Text>
                        <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="numeric" />
                        <Text style={[styles.label, {marginTop:15}]}>Stocuri</Text>
                        <View style={styles.row}>
                            <View style={{flex:1}}>
                                <Text style={{fontSize:12, color:'#6b7280'}}>Depozit</Text>
                                <TextInput style={styles.input} value={stockDepozit} onChangeText={setStockDepozit} keyboardType="numeric" />
                            </View>
                            <View style={{flex:1}}>
                                <Text style={{fontSize:12, color:'#4F46E5', fontWeight:'bold'}}>Magazin</Text>
                                <TextInput style={[styles.input, {borderColor:'#c7d2fe', backgroundColor:'#e0e7ff'}]} value={stockMagazin} onChangeText={setStockMagazin} keyboardType="numeric" />
                            </View>
                        </View>
                        <Text style={[styles.label, {marginTop:15}]}>Furnizor</Text>
                        <View style={{height: 60}}>
                            <FlatList
                                data={suppliers}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                keyExtractor={item => item.id.toString()}
                                renderItem={({item}) => (
                                    <TouchableOpacity
                                        style={[styles.supChip, selectedSupplierId === item.id && styles.supChipActive]}
                                        onPress={() => setSelectedSupplierId(item.id)}
                                    >
                                        <Text style={[styles.supChipText, selectedSupplierId === item.id && {color:'white'}]}>{item.nume}</Text>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                        <View style={styles.actionRow}>
                            {isEditing && (
                                <TouchableOpacity onPress={() => handleDelete(editId)} style={styles.deleteBtn}>
                                    <Trash2 size={24} color="#ef4444" />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                                <Save size={24} color="white" />
                                <Text style={styles.saveText}>Salvează</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* MODAL VÂNZARE RAPIDĂ */}
            <Modal visible={sellModalVisible} transparent animationType="fade">
                <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={styles.modalOverlay}>
                    <View style={[styles.modalContent, {height:'auto', paddingBottom:40}]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Simulare Vânzare (POS)</Text>
                            <TouchableOpacity onPress={() => setSellModalVisible(false)}>
                                <X size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        {/* AVERTIZARE ÎN MODAL DACĂ SUNT LOTURI EXPIRATE */}
                        {sellProduct && expiringIds.has(sellProduct.id) && (
                            <View style={{flexDirection:'row', alignItems:'center', gap:8, backgroundColor:'#ffedd5', padding:10, borderRadius:8, marginBottom:15}}>
                                <AlertTriangle size={20} color="#c2410c" />
                                <Text style={{color:'#9a3412', fontSize:13, fontWeight:'bold', flex:1}}>
                                    Atenție! Acest produs are loturi care expiră curând. Vor fi vândute prioritare.
                                </Text>
                            </View>
                        )}

                        <Text style={{fontSize:16, color:'#4b5563', marginBottom:20}}>
                            Produs: <Text style={{fontWeight:'bold'}}>{sellProduct?.nume}</Text>
                        </Text>
                        <Text style={styles.label}>Cantitate Vândută</Text>
                        <TextInput
                            style={[styles.input, {fontSize:24, textAlign:'center', height:60}]}
                            placeholder="0"
                            keyboardType="numeric"
                            value={sellQty}
                            onChangeText={setSellQty}
                            autoFocus
                        />
                        <TouchableOpacity style={[styles.saveBtn, {marginTop:20, backgroundColor: sellProduct && expiringIds.has(sellProduct.id) ? '#ea580c' : '#059669'}]} onPress={handleQuickSell}>
                            <ShoppingCart size={24} color="white" />
                            <Text style={styles.saveText}>Confirmă Vânzarea</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { padding: 20, flexDirection: 'row', gap: 10, backgroundColor: 'white', elevation: 2 },
    searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 10 },
    searchInput: { flex: 1, padding: 10 },
    addBtn: { backgroundColor: '#4F46E5', padding: 12, borderRadius: 10 },

    card: { flexDirection: 'row', padding: 15, backgroundColor: 'white', marginBottom: 10, borderRadius: 12, alignItems: 'center', gap: 15, elevation: 1 },
    iconBox: { width: 40, height: 40, backgroundColor: '#e0e7ff', borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    prodName: { fontWeight: 'bold', fontSize: 16, color: '#1f2937' },
    prodCode: { color: '#6b7280', fontSize: 12 },
    price: { fontWeight: 'bold', color: '#059669' },
    stock: { fontSize: 12, color: '#6b7280' },

    sellBtn: { flexDirection:'row', alignItems:'center', gap:5, backgroundColor:'#10b981', paddingHorizontal:10, paddingVertical:6, borderRadius:6 },
    sellBtnText: { color:'white', fontWeight:'bold', fontSize:12 },

    // Stiluri pentru Badge Expirare
    expBadge: { flexDirection:'row', alignItems:'center', gap:3, backgroundColor:'#f97316', paddingHorizontal:6, paddingVertical:2, borderRadius:4 },
    expText: { color:'white', fontSize:9, fontWeight:'bold' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, height: '90%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold' },

    label: { fontWeight: 'bold', color: '#374151', marginBottom: 5, marginTop: 10 },
    input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16 },
    row: { flexDirection: 'row', gap: 15 },
    supChip: { padding: 10, backgroundColor: 'white', borderWidth:1, borderColor:'#e5e7eb', borderRadius: 20, marginRight: 10, height: 40, justifyContent:'center' },
    supChipActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
    supChipText: { color: '#374151', fontWeight:'600' },
    actionRow: { flexDirection: 'row', marginTop: 30, gap: 15, marginBottom:20 },
    deleteBtn: { padding: 15, backgroundColor: '#fee2e2', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    saveBtn: { flex: 1, backgroundColor: '#4F46E5', padding: 15, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10 },
    saveText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});