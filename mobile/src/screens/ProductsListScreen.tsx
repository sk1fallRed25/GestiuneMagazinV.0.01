import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, SafeAreaView, TextInput, Modal, Alert, ScrollView
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '../lib/supabase';
import { Search, ArrowLeft, Package, X, Save, Trash2, Edit3, ScanBarcode } from 'lucide-react-native';

export default function ProductsListScreen({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [search, setSearch] = useState('');

    // --- STATE PENTRU SCANARE ---
    const [permission, requestPermission] = useCameraPermissions();
    const [isScanning, setIsScanning] = useState(false);

    // --- STATE PENTRU EDITARE ---
    const [modalVisible, setModalVisible] = useState(false);
    const [editForm, setEditForm] = useState({
        id: null,
        nume: '',
        cod_bare: '',
        pret_vanzare: '',
        stoc_depozit: '',
        stoc_magazin: ''
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('produse')
            .select('*')
            .order('nume', { ascending: true });

        if (error) {
            Alert.alert("Eroare", "Nu s-au putut încărca produsele.");
        } else {
            setProducts(data || []);
            setFilteredProducts(data || []);
        }
        setLoading(false);
    };

    // --- LOGICĂ CĂUTARE & SCANARE ---
    const handleSearch = (text) => {
        setSearch(text);
        if (text) {
            const lowerText = text.toLowerCase();
            const filtered = products.filter(p =>
                p.nume.toLowerCase().includes(lowerText) ||
                p.cod_bare.includes(text)
            );
            setFilteredProducts(filtered);
        } else {
            setFilteredProducts(products);
        }
    };

    const startScan = async () => {
        if (!permission?.granted) {
            const result = await requestPermission();
            if (!result.granted) {
                Alert.alert("Permisiune refuzată", "Avem nevoie de acces la cameră pentru scanare.");
                return;
            }
        }
        setIsScanning(true);
    };

    const handleBarCodeScanned = ({ data }) => {
        setIsScanning(false);
        setSearch(data); // Punem codul în bara de căutare
        handleSearch(data); // Filtrăm lista
    };

    // --- LOGICA DE EDITARE ---
    const openEditModal = (product) => {
        setEditForm({
            id: product.id,
            nume: product.nume,
            cod_bare: product.cod_bare,
            pret_vanzare: product.pret_vanzare?.toString() || '0',
            stoc_depozit: product.stoc_depozit?.toString() || '0',
            stoc_magazin: product.stoc_magazin?.toString() || '0'
        });
        setModalVisible(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('produse')
                .update({
                    nume: editForm.nume,
                    pret_vanzare: parseFloat(editForm.pret_vanzare) || 0,
                    stoc_depozit: parseInt(editForm.stoc_depozit) || 0,
                    stoc_magazin: parseInt(editForm.stoc_magazin) || 0
                })
                .eq('id', editForm.id);

            if (error) throw error;

            Alert.alert("Succes", "Produs actualizat!");
            setModalVisible(false);
            fetchProducts();
        } catch (err) {
            Alert.alert("Eroare", "Nu s-a putut salva modificarea.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        Alert.alert(
            "Ștergere Produs",
            "Ești sigur? Această acțiune este ireversibilă.",
            [
                { text: "Anulează", style: "cancel" },
                {
                    text: "DA, Șterge",
                    style: "destructive",
                    onPress: async () => {
                        const { error } = await supabase.from('produse').delete().eq('id', editForm.id);
                        if (!error) {
                            setModalVisible(false);
                            fetchProducts();
                        } else {
                            Alert.alert("Eroare", "Nu poți șterge un produs care are istoric (recepții/vânzări).");
                        }
                    }
                }
            ]
        );
    };

    const renderProduct = ({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => openEditModal(item)}>
            <View style={styles.iconBox}>
                <Package size={24} color="#4F46E5" />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.prodName}>{item.nume}</Text>
                <Text style={styles.prodCode}>Cod: {item.cod_bare}</Text>
                <View style={styles.stockRow}>
                    <Text style={styles.stockText}>Depozit: {item.stoc_depozit}</Text>
                    <Text style={styles.stockText}> | </Text>
                    <Text style={styles.stockText}>Raft: {item.stoc_magazin}</Text>
                </View>
            </View>
            <View style={styles.priceBadge}>
                <Text style={styles.priceText}>{item.pret_vanzare} RON</Text>
                <Edit3 size={12} color="#059669" style={{marginTop: 2}}/>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ArrowLeft size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.title}>Listă Produse</Text>
            </View>

            {/* BARA DE CĂUTARE CU SCANNER */}
            <View style={styles.searchContainer}>
                <Search size={20} color="#9ca3af" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Caută sau scanează..."
                    value={search}
                    onChangeText={handleSearch}
                />
                <TouchableOpacity onPress={startScan} style={styles.scanBtn}>
                    <ScanBarcode size={22} color="#4F46E5" />
                </TouchableOpacity>
            </View>

            {loading ? <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 50 }} /> : (
                <FlatList
                    data={filteredProducts}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderProduct}
                    contentContainerStyle={{ padding: 20 }}
                    ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 50, color: '#9ca3af' }}>Niciun produs găsit.</Text>}
                />
            )}

            {/* --- MODAL EDITARE --- */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Editare Produs</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Nume Produs</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editForm.nume}
                                    onChangeText={t => setEditForm({...editForm, nume: t})}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Cod Bare (Info)</Text>
                                <TextInput
                                    style={[styles.input, {backgroundColor:'#f3f4f6', color:'#6b7280'}]}
                                    value={editForm.cod_bare}
                                    editable={false}
                                />
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.formGroup, {flex:1}]}>
                                    <Text style={[styles.label, {color:'#059669'}]}>PREȚ (RON)</Text>
                                    <TextInput
                                        style={[styles.input, {borderColor:'#059669', borderWidth:2, fontSize:18, fontWeight:'bold'}]}
                                        value={editForm.pret_vanzare}
                                        keyboardType="numeric"
                                        onChangeText={t => setEditForm({...editForm, pret_vanzare: t})}
                                    />
                                </View>
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.formGroup, {flex:1}]}>
                                    <Text style={styles.label}>Stoc Depozit</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={editForm.stoc_depozit}
                                        keyboardType="numeric"
                                        onChangeText={t => setEditForm({...editForm, stoc_depozit: t})}
                                    />
                                </View>
                                <View style={[styles.formGroup, {flex:1}]}>
                                    <Text style={styles.label}>Stoc Raft</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={editForm.stoc_magazin}
                                        keyboardType="numeric"
                                        onChangeText={t => setEditForm({...editForm, stoc_magazin: t})}
                                    />
                                </View>
                            </View>

                            <View style={styles.modalActions}>
                                <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                                    <Trash2 size={20} color="#ef4444" />
                                    <Text style={{color: '#ef4444', fontWeight:'bold'}}>Șterge</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                                    {saving ? <ActivityIndicator color="white"/> : (
                                        <>
                                            <Save size={20} color="white" />
                                            <Text style={{color: 'white', fontWeight:'bold'}}>SALVEAZĂ</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* --- MODAL CAMERA (SCANARE) --- */}
            <Modal visible={isScanning} animationType="slide">
                <View style={{ flex: 1, backgroundColor: 'black' }}>
                    <CameraView
                        style={StyleSheet.absoluteFill}
                        onBarcodeScanned={isScanning ? handleBarCodeScanned : undefined}
                    />

                    <View style={styles.scanOverlay}>
                        <View style={styles.scanFrame} />
                        <Text style={styles.scanText}>Scanează pentru căutare...</Text>
                    </View>

                    <TouchableOpacity style={styles.closeCam} onPress={() => setIsScanning(false)}>
                        <X size={35} color="white" />
                    </TouchableOpacity>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: { padding: 20, backgroundColor: 'white', flexDirection: 'row', gap: 15, alignItems: 'center', elevation: 2 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },

    // Search & Scan
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', margin: 20, borderRadius: 10, paddingLeft: 10, borderWidth: 1, borderColor: '#e5e7eb' },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, paddingVertical: 12, fontSize: 16 },
    scanBtn: { padding: 12, borderLeftWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f3f4f6', borderTopRightRadius: 10, borderBottomRightRadius: 10 },

    // Card
    card: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 15, elevation: 1 },
    iconBox: { width: 40, height: 40, backgroundColor: '#e0e7ff', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    prodName: { fontWeight: 'bold', fontSize: 16, color: '#1f2937' },
    prodCode: { color: '#6b7280', fontSize: 12 },
    stockRow: { flexDirection: 'row', marginTop: 4 },
    stockText: { fontSize: 11, color: '#4b5563', fontWeight: '600' },

    priceBadge: { backgroundColor: '#d1fae5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignItems:'center' },
    priceText: { color: '#059669', fontWeight: 'bold', fontSize: 14 },

    // Edit Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 25, height: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#111827' },

    formGroup: { marginBottom: 15 },
    label: { fontSize: 12, fontWeight: 'bold', color: '#374151', marginBottom: 5, textTransform: 'uppercase' },
    input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16 },
    row: { flexDirection: 'row', gap: 15 },

    modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30, alignItems: 'center' },
    saveBtn: { backgroundColor: '#4F46E5', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 10, flexDirection: 'row', gap: 8, alignItems: 'center' },
    deleteBtn: { flexDirection: 'row', gap: 8, padding: 10, alignItems: 'center' },

    // Camera Styles
    closeCam: { position: 'absolute', top: 50, right: 25, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 25, padding: 5 },
    scanOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scanFrame: { width: 250, height: 250, borderWidth: 2, borderColor: '#4F46E5', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)' },
    scanText: { color: 'white', marginTop: 20, fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 8 }
});