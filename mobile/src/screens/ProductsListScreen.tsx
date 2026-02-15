import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, ActivityIndicator, SafeAreaView, Alert, Modal, ScrollView
} from 'react-native';
import { supabase } from '../lib/supabase';
import {
    Package, Search, AlertTriangle, Filter, X, Check
} from 'lucide-react-native';

export default function ProductsListScreen() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [expiringIds, setExpiringIds] = useState(new Set());

    // --- STATE FILTRARE ---
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedSubcategory, setSelectedSubcategory] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: prodData, error: prodError } = await supabase
                .from('produse')
                .select('*')
                .order('nume');

            if (prodError) throw prodError;
            setProducts(prodData || []);

            const { data: expData } = await supabase.from('view_expirari').select('produs_id');
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

    // --- LOGICA DE FILTRARE DINAMICĂ ---

    // 1. Extragem categoriile unice
    const categories = useMemo(() => {
        const cats = products.map(p => p.categorie_principala).filter(Boolean);
        return [...new Set(cats)].sort();
    }, [products]);

    // 2. Extragem subcategoriile dependente de categoria selectată
    const subcategories = useMemo(() => {
        if (!selectedCategory) return [];
        const subs = products
            .filter(p => p.categorie_principala === selectedCategory)
            .map(p => p.categorie_secundara)
            .filter(Boolean);
        return [...new Set(subs)].sort();
    }, [products, selectedCategory]);

    // 3. Aplicăm filtrele (Căutare + Categorie + Subcategorie)
    const filteredProducts = products.filter(p => {
        const matchesSearch = p.nume.toLowerCase().includes(search.toLowerCase()) ||
            (p.cod_bare && p.cod_bare.includes(search));

        const matchesCategory = selectedCategory ? p.categorie_principala === selectedCategory : true;
        const matchesSubcategory = selectedSubcategory ? p.categorie_secundara === selectedSubcategory : true;

        return matchesSearch && matchesCategory && matchesSubcategory;
    });

    // Resetare filtre
    const clearFilters = () => {
        setSelectedCategory(null);
        setSelectedSubcategory(null);
        setFilterModalVisible(false);
    };

    const renderItem = ({ item }) => {
        const hasExpirationIssue = expiringIds.has(item.id);

        return (
            <View style={[styles.card, hasExpirationIssue && { borderLeftWidth: 4, borderLeftColor: '#f97316' }]}>
                {/* Iconiță */}
                <View style={[styles.iconBox, hasExpirationIssue && { backgroundColor: '#ffedd5' }]}>
                    <Package size={24} color={hasExpirationIssue ? '#f97316' : '#4F46E5'} />
                </View>

                {/* Detalii Produs */}
                <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.prodName}>{item.nume}</Text>
                        {hasExpirationIssue && <AlertTriangle size={14} color="#f97316" />}
                    </View>

                    <Text style={styles.prodCode}>{item.cod_bare}</Text>

                    {/* CATEGORIE SI SUBCATEGORIE */}
                    <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 5}}>
                        {item.categorie_principala && (
                            <Text style={styles.catTag}>{item.categorie_principala}</Text>
                        )}
                        {item.categorie_secundara && (
                            <Text style={styles.subCatTag}>{item.categorie_secundara}</Text>
                        )}
                    </View>
                </View>

                {/* Preț și Stocuri */}
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Text style={styles.price}>{item.pret_vanzare} RON</Text>

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <Text style={styles.stockText}>
                            Dep: <Text style={{fontWeight:'bold', color:'#374151'}}>{item.stoc_depozit}</Text>
                        </Text>
                        <Text style={{color:'#cbd5e1'}}>|</Text>
                        <Text style={[styles.stockText, {color:'#4F46E5'}]}>
                            Mag: <Text style={{fontWeight:'bold'}}>{item.stoc_magazin || 0}</Text>
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header cu Search si Filtru */}
            <View style={styles.header}>
                <View style={styles.searchRow}>
                    <View style={styles.searchBox}>
                        <Search size={20} color="#9ca3af" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Caută produs..."
                            value={search}
                            onChangeText={setSearch}
                        />
                        {search.length > 0 && (
                            <TouchableOpacity onPress={() => setSearch('')}>
                                <X size={18} color="#9ca3af" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* BUTON FILTRU */}
                    <TouchableOpacity
                        style={[styles.filterBtn, (selectedCategory || selectedSubcategory) && styles.filterBtnActive]}
                        onPress={() => setFilterModalVisible(true)}
                    >
                        <Filter size={24} color={(selectedCategory || selectedSubcategory) ? "white" : "#4F46E5"} />
                    </TouchableOpacity>
                </View>

                {/* Indicator filtre active */}
                {(selectedCategory || selectedSubcategory) && (
                    <View style={{flexDirection:'row', gap:10, marginTop:10}}>
                        <Text style={{fontSize:12, color:'#6b7280'}}>Filtrat după:</Text>
                        {selectedCategory && <Text style={styles.activeFilterText}>{selectedCategory}</Text>}
                        {selectedSubcategory && <Text style={styles.activeFilterText}>/ {selectedSubcategory}</Text>}
                        <TouchableOpacity onPress={clearFilters}>
                            <Text style={{fontSize:12, color:'#ef4444', fontWeight:'bold', marginLeft:5}}>Șterge</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={filteredProducts}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                    renderItem={renderItem}
                    ListEmptyComponent={
                        <Text style={{ textAlign: 'center', marginTop: 50, color: '#9ca3af' }}>
                            Nu au fost găsite produse.
                        </Text>
                    }
                />
            )}

            {/* --- MODAL FILTRARE --- */}
            <Modal visible={filterModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Filtrare Produse</Text>
                            <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                                <X size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Sectiunea Categorie */}
                            <Text style={styles.filterLabel}>Categorie Principală</Text>
                            <View style={styles.chipsContainer}>
                                {categories.map(cat => (
                                    <TouchableOpacity
                                        key={cat}
                                        style={[styles.chip, selectedCategory === cat && styles.chipActive]}
                                        onPress={() => {
                                            setSelectedCategory(cat === selectedCategory ? null : cat);
                                            setSelectedSubcategory(null); // Reset subcat cand schimbi cat
                                        }}
                                    >
                                        <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>{cat}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Sectiunea Subcategorie (Doar daca avem Categorie selectata) */}
                            {selectedCategory && subcategories.length > 0 && (
                                <>
                                    <Text style={[styles.filterLabel, {marginTop: 20}]}>Subcategorie</Text>
                                    <View style={styles.chipsContainer}>
                                        {subcategories.map(sub => (
                                            <TouchableOpacity
                                                key={sub}
                                                style={[styles.chip, selectedSubcategory === sub && styles.chipActive]}
                                                onPress={() => setSelectedSubcategory(sub === selectedSubcategory ? null : sub)}
                                            >
                                                <Text style={[styles.chipText, selectedSubcategory === sub && styles.chipTextActive]}>{sub}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </>
                            )}
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
                                <Text style={styles.clearBtnText}>Resetează</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.applyBtn} onPress={() => setFilterModalVisible(false)}>
                                <Check size={20} color="white" />
                                <Text style={styles.applyBtnText}>Aplică</Text>
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

    // Header
    header: { padding: 20, backgroundColor: 'white', elevation: 2, borderBottomWidth: 1, borderColor: '#e5e7eb' },
    searchRow: { flexDirection: 'row', gap: 10 },
    searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 15, height: 50 },
    searchInput: { flex: 1, padding: 10, fontSize: 16, color: '#1f2937' },
    filterBtn: { width: 50, height: 50, backgroundColor: '#e0e7ff', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    filterBtnActive: { backgroundColor: '#4F46E5' },
    activeFilterText: { fontSize:12, fontWeight:'bold', color:'#4F46E5', backgroundColor:'#e0e7ff', paddingHorizontal:6, borderRadius:4, overflow:'hidden' },

    // Card Produs
    card: { flexDirection: 'row', padding: 15, backgroundColor: 'white', marginBottom: 10, borderRadius: 12, alignItems: 'center', gap: 15, elevation: 1, borderWidth: 1, borderColor: '#f1f5f9' },
    iconBox: { width: 45, height: 45, backgroundColor: '#e0e7ff', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    prodName: { fontWeight: 'bold', fontSize: 15, color: '#1f2937' },
    prodCode: { color: '#6b7280', fontSize: 12 },

    // Tag-uri Categorii
    catTag: { fontSize: 10, color: '#0369a1', backgroundColor: '#e0f2fe', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden', fontWeight:'600' },
    subCatTag: { fontSize: 10, color: '#7c3aed', backgroundColor: '#f3e8ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden', fontWeight:'600' },

    price: { fontWeight: 'bold', color: '#059669', fontSize: 15 },
    stockText: { fontSize: 12, color: '#6b7280' },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
    filterLabel: { fontSize: 14, fontWeight: 'bold', color: '#6b7280', marginBottom: 10 },

    chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
    chipActive: { backgroundColor: '#e0e7ff', borderColor: '#4F46E5' },
    chipText: { fontSize: 14, color: '#4b5563' },
    chipTextActive: { color: '#4F46E5', fontWeight: 'bold' },

    modalActions: { flexDirection: 'row', marginTop: 30, gap: 15 },
    clearBtn: { flex: 1, padding: 15, alignItems: 'center', justifyContent: 'center' },
    clearBtnText: { color: '#ef4444', fontWeight: 'bold' },
    applyBtn: { flex: 2, backgroundColor: '#4F46E5', padding: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
    applyBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});