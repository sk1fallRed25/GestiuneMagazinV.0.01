import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, Modal, Alert, ActivityIndicator, SafeAreaView
} from 'react-native';
import { supabase } from '../lib/supabase';
import {
    Package, Plus, Search, X, Edit2,
    Trash2, Save, Truck
} from 'lucide-react-native';

export default function ProductsListScreen() {
    const [products, setProducts] = useState([]);
    const [suppliers, setSuppliers] = useState([]); // Lista de furnizori
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);

    // Form State
    const [name, setName] = useState('');
    const [barcode, setBarcode] = useState('');
    const [price, setPrice] = useState('');
    const [stock, setStock] = useState('');
    const [selectedSupplierId, setSelectedSupplierId] = useState(null); // ID Furnizor selectat

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Luăm produsele și includem numele furnizorului
            const { data: prodData, error: prodError } = await supabase
                .from('produse')
                .select(`*, furnizori (id, nume)`)
                .order('nume');

            if (prodError) throw prodError;
            setProducts(prodData || []);

            // 2. Luăm lista de furnizori pentru dropdown
            const { data: supData, error: supError } = await supabase
                .from('furnizori')
                .select('*')
                .order('nume');

            if (supError) throw supError;
            setSuppliers(supData || []);

        } catch (err) {
            Alert.alert("Eroare", err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!name || !barcode) {
            Alert.alert("Eroare", "Numele și Codul de bare sunt obligatorii!");
            return;
        }

        const payload = {
            nume: name,
            cod_bare: barcode,
            ultimul_pret_achizitie: parseFloat(price) || 0,
            stoc_depozit: parseInt(stock) || 0,
            furnizor_id: selectedSupplierId // Salvăm legătura
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
            fetchData(); // Reîmprospătăm lista
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
            setStock(prod.stoc_depozit?.toString() || '');
            setSelectedSupplierId(prod.furnizor_id);
        } else {
            setIsEditing(false);
            setEditId(null);
            setName('');
            setBarcode('');
            setPrice('');
            setStock('');
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

            {loading ? <ActivityIndicator size="large" color="#4F46E5" style={{marginTop:50}} /> : (
                <FlatList
                    data={filteredProducts}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={{padding: 20}}
                    renderItem={({item}) => (
                        <TouchableOpacity style={styles.card} onPress={() => openModal(item)}>
                            <View style={styles.iconBox}>
                                <Package size={24} color="#4F46E5" />
                            </View>
                            <View style={{flex:1}}>
                                <Text style={styles.prodName}>{item.nume}</Text>
                                <Text style={styles.prodCode}>{item.cod_bare}</Text>
                                {/* Afișăm furnizorul dacă există */}
                                {item.furnizori ? (
                                    <View style={styles.supplierBadge}>
                                        <Truck size={12} color="#059669" />
                                        <Text style={styles.supplierText}>{item.furnizori.nume}</Text>
                                    </View>
                                ) : (
                                    <Text style={{fontSize:10, color:'#ef4444'}}>Fără Furnizor</Text>
                                )}
                            </View>
                            <View style={{alignItems:'flex-end'}}>
                                <Text style={styles.price}>{item.ultimul_pret_achizitie} RON</Text>
                                <Text style={styles.stock}>Stoc: {item.stoc_depozit}</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            )}

            {/* MODAL ADĂUGARE / EDITARE */}
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
                        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ex: Apa Plata 2L" />

                        <Text style={styles.label}>Cod de Bare</Text>
                        <TextInput style={styles.input} value={barcode} onChangeText={setBarcode} placeholder="Scanat sau manual" keyboardType="numeric" />

                        <View style={styles.row}>
                            <View style={{flex:1}}>
                                <Text style={styles.label}>Preț Achiziție</Text>
                                <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="0.00" />
                            </View>
                            <View style={{flex:1}}>
                                <Text style={styles.label}>Stoc Inițial</Text>
                                <TextInput style={styles.input} value={stock} onChangeText={setStock} keyboardType="numeric" placeholder="0" />
                            </View>
                        </View>

                        {/* SELECTOR FURNIZOR */}
                        <Text style={[styles.label, {marginTop:15}]}>Asociază Furnizor</Text>
                        <View style={{height: 120}}>
                            <FlatList
                                data={suppliers}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                keyExtractor={item => item.id.toString()}
                                renderItem={({item}) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.supChip,
                                            selectedSupplierId === item.id && styles.supChipActive
                                        ]}
                                        onPress={() => setSelectedSupplierId(item.id)}
                                    >
                                        <Text style={[
                                            styles.supChipText,
                                            selectedSupplierId === item.id && {color:'white'}
                                        ]}>{item.nume}</Text>
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

    supplierBadge: { flexDirection:'row', alignItems:'center', gap:4, backgroundColor:'#ecfdf5', alignSelf:'flex-start', paddingHorizontal:6, paddingVertical:2, borderRadius:4, marginTop:4 },
    supplierText: { fontSize:10, color:'#047857', fontWeight:'bold' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, height: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold' },

    label: { fontWeight: 'bold', color: '#374151', marginBottom: 5, marginTop: 10 },
    input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16 },
    row: { flexDirection: 'row', gap: 15 },

    supChip: { padding: 10, backgroundColor: 'white', borderWidth:1, borderColor:'#e5e7eb', borderRadius: 20, marginRight: 10, height: 40, justifyContent:'center' },
    supChipActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
    supChipText: { color: '#374151', fontWeight:'600' },

    actionRow: { flexDirection: 'row', marginTop: 30, gap: 15 },
    deleteBtn: { padding: 15, backgroundColor: '#fee2e2', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    saveBtn: { flex: 1, backgroundColor: '#4F46E5', padding: 15, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10 },
    saveText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});