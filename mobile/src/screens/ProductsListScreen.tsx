import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
    Alert, ActivityIndicator, SafeAreaView, RefreshControl, Modal
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Search, Trash2, Package, ArrowLeft, Filter, AlertTriangle, ScanLine, X } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function ProductsListScreen({ navigation }: any) {
    // --- STATE ---
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [showLowStockOnly, setShowLowStockOnly] = useState(false);

    // --- CAMERA STATE ---
    const [isScanning, setIsScanning] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();

    // --- FETCH PRODUSE ---
    const fetchProducts = async () => {
        try {
            let query = supabase
                .from('produse')
                .select('*')
                .order('id', { ascending: false });

            if (search) {
                query = query.or(`nume.ilike.%${search}%,cod_bare.ilike.%${search}%`);
            }

            if (showLowStockOnly) {
                query = query.lte('stoc_curent', 5);
            }

            const { data, error } = await query;
            if (error) throw error;
            setProducts(data || []);
        } catch (err: any) {
            Alert.alert("Eroare", err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchProducts();
        }, [search, showLowStockOnly])
    );

    // --- DELETE LOGIC ---
    const handleDelete = (id: string, nume: string) => {
        Alert.alert(
            "Confirmare Ștergere",
            `Produs: ${nume}\nAceastă acțiune este ireversibilă.`,
            [
                { text: "Anulează", style: "cancel" },
                {
                    text: "DA, Șterge",
                    style: 'destructive',
                    onPress: async () => {
                        const { error } = await supabase.from('produse').delete().eq('id', id);
                        if (error) Alert.alert("Eroare", error.message);
                        else fetchProducts();
                    }
                }
            ]
        );
    };

    // --- SEARCH SCANNER LOGIC ---
    const handleScanBtnPress = async () => {
        if (!permission?.granted) {
            const { granted } = await requestPermission();
            if (!granted) {
                Alert.alert("Permisiune refuzată", "Avem nevoie de cameră pentru a scana.");
                return;
            }
        }
        setIsScanning(true);
    };

    const handleBarCodeScanned = ({ data }: { data: string }) => {
        setIsScanning(false); // Închidem camera
        setSearch(data);      // Punem codul în search (declanșează automat căutarea)
    };

    // --- RENDER ITEM ---
    const renderItem = ({ item }: any) => {
        const isCritical = item.stoc_curent <= 5;
        return (
            <TouchableOpacity
                style={[styles.card, isCritical ? styles.cardCritical : {}]}
                onPress={() => navigation.navigate('EditProduct', { product: item })}
            >
                <View style={styles.cardHeader}>
                    <View style={{flex: 1}}>
                        <Text style={styles.prodNume}>{item.nume}</Text>
                        <View style={{flexDirection:'row', alignItems:'center', gap: 5}}>
                            <Text style={styles.prodCod}>{item.cod_bare}</Text>
                            {isCritical && (
                                <View style={styles.badgeCritical}>
                                    <Text style={styles.badgeText}>Stoc Mic</Text>
                                </View>
                            )}
                        </View>
                    </View>
                    <TouchableOpacity onPress={() => handleDelete(item.id, item.nume)} style={styles.deleteBtn}>
                        <Trash2 size={20} color="#ef4444" />
                    </TouchableOpacity>
                </View>

                <View style={styles.divider} />

                <View style={styles.cardFooter}>
                    <View>
                        <Text style={styles.label}>Stoc</Text>
                        <Text style={[styles.value, isCritical ? {color:'#dc2626', fontWeight:'900'} : {}]}>
                            {item.stoc_curent} {item.unitate_masura}
                        </Text>
                    </View>
                    <View>
                        <Text style={styles.label}>Preț Vânzare</Text>
                        <Text style={styles.value}>{item.pret_vanzare} RON</Text>
                    </View>
                    <View style={{justifyContent:'flex-end'}}>
                        <Text style={{color:'#2563eb', fontSize:12, fontWeight:'bold'}}>Editează &gt;</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    // --- MODUL CAMERA (FULL SCREEN) ---
    if (isScanning) {
        return (
            <View style={{flex:1, backgroundColor:'black'}}>
                <CameraView
                    style={StyleSheet.absoluteFillObject}
                    onBarcodeScanned={handleBarCodeScanned}
                    barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "qr", "upc_a"] }}
                />
                <View style={styles.overlay}>
                    <Text style={styles.overlayText}>Scanează pentru a căuta</Text>
                    <View style={styles.scanFrame} />
                    <TouchableOpacity style={styles.closeCamBtn} onPress={() => setIsScanning(false)}>
                        <X color="white" size={24} />
                        <Text style={styles.closeText}>Anulează</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // --- UI PRINCIPAL ---
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.title}>Gestiune Inventar</Text>
            </View>

            <View style={styles.controlsContainer}>
                {/* Search Bar cu buton Scan */}
                <View style={styles.searchContainer}>
                    <Search size={20} color="#9ca3af" />
                    <TextInput
                        style={styles.input}
                        placeholder="Nume sau Scanează..."
                        value={search}
                        onChangeText={setSearch}
                        autoCapitalize="none"
                    />
                    {/* BUTON SCANARE ÎN SEARCH */}
                    <TouchableOpacity onPress={handleScanBtnPress} style={styles.scanIconBtn}>
                        <ScanLine size={20} color="#2563eb" />
                    </TouchableOpacity>
                </View>

                {/* Filter Button */}
                <TouchableOpacity
                    style={[styles.filterBtn, showLowStockOnly ? styles.filterBtnActive : {}]}
                    onPress={() => setShowLowStockOnly(!showLowStockOnly)}
                >
                    {showLowStockOnly ? <AlertTriangle size={20} color="white" /> : <Filter size={20} color="#374151" />}
                </TouchableOpacity>
            </View>

            {loading && !refreshing ? (
                <ActivityIndicator size="large" color="#2563eb" style={{marginTop: 50}} />
            ) : (
                <FlatList
                    data={products}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 15, paddingBottom: 80 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchProducts();}} />}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Package size={64} color="#e5e7eb" />
                            <Text style={{color: '#9ca3af', marginTop: 10, fontSize:16}}>
                                {showLowStockOnly ? "Niciun produs cu stoc critic." : "Nu s-au găsit produse."}
                            </Text>
                        </View>
                    }
                />
            )}

            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('AddProduct')}
            >
                <Text style={{color:'white', fontSize:30, marginTop:-2}}>+</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#e5e7eb', paddingTop: 40 },
    backBtn: { marginRight: 15 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#111827' },

    controlsContainer: { flexDirection: 'row', padding: 15, gap: 10 },
    searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 15, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', height: 50 },
    input: { flex: 1, paddingVertical: 10, marginLeft: 10, fontSize: 16 },
    scanIconBtn: { padding: 10, borderLeftWidth: 1, borderColor: '#e5e7eb' }, // Stil buton scan

    filterBtn: { width: 50, height: 50, backgroundColor: 'white', borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
    filterBtnActive: { backgroundColor: '#dc2626', borderColor: '#dc2626' },

    card: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 12, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#2563eb' },
    cardCritical: { backgroundColor: '#fef2f2', borderLeftColor: '#dc2626' },

    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    prodNume: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', width: '85%' },
    prodCod: { fontSize: 12, color: '#6b7280', marginTop: 2 },

    badgeCritical: { backgroundColor: '#fee2e2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
    badgeText: { color: '#dc2626', fontSize: 10, fontWeight: 'bold' },

    deleteBtn: { padding: 5 },
    divider: { height: 1, backgroundColor: '#00000010', marginVertical: 10 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems:'flex-end' },
    label: { fontSize: 10, color: '#6b7280', textTransform: 'uppercase', marginBottom: 2 },
    value: { fontSize: 14, fontWeight: '600', color: '#374151' },

    center: { alignItems: 'center', marginTop: 80 },
    fab: { position: 'absolute', bottom: 20, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center', elevation: 5 },

    // Styles pentru Camera Overlay
    overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    overlayText: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 40 },
    scanFrame: { width: 280, height: 280, borderWidth: 2, borderColor: '#fff', borderRadius: 20 },
    closeCamBtn: { position: 'absolute', bottom: 50, flexDirection:'row', gap:10, backgroundColor:'#dc2626', padding:15, borderRadius:30 },
    closeText: { color:'white', fontWeight:'bold' },
});