import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
    Alert, ActivityIndicator, SafeAreaView, RefreshControl
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Search, Trash2, Package, ArrowLeft, Filter, AlertTriangle, ScanLine, X } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function ProductsListScreen({ navigation }: any) {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [showLowStockOnly, setShowLowStockOnly] = useState(false);

    const [isScanning, setIsScanning] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();

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
                // Filtrăm după stoc_magazin
                query = query.lte('stoc_magazin', 5);
            }

            const { data, error } = await query;
            if (error) throw error;
            setProducts(data || []);
        } catch (err: any) {
            console.log("Eroare:", err.message);
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

    // REALTIME
    useEffect(() => {
        const channel = supabase
            .channel('public:produse')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'produse' },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setProducts((prev) => [payload.new, ...prev]);
                    } else if (payload.eventType === 'DELETE') {
                        setProducts((prev) => prev.filter(p => p.id != payload.old.id));
                    } else if (payload.eventType === 'UPDATE') {
                        setProducts((prev) => prev.map(p =>
                            p.id == payload.new.id ? { ...p, ...payload.new } : p
                        ));
                    }
                }
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    const handleScanBtnPress = async () => {
        if (!permission?.granted) {
            const { granted } = await requestPermission();
            if (!granted) return;
        }
        setIsScanning(true);
    };

    const handleBarCodeScanned = ({ data }: { data: string }) => {
        setIsScanning(false);
        setSearch(data);
    };

    const handleDelete = (id: string, nume: string) => {
        Alert.alert("Ștergere", `Ștergi produsul ${nume}?`, [
            { text: "Nu", style: "cancel" },
            { text: "Da", style: 'destructive', onPress: async () => {
                    await supabase.from('produse').delete().eq('id', id);
                }}
        ]);
    };

    const renderItem = ({ item }: any) => {
        // CITIM DIN stoc_magazin
        const stocRaft = item.stoc_magazin || 0;
        const stocDepozit = item.stoc_depozit || 0;
        const total = stocRaft + stocDepozit;

        const isCritical = total <= 5;

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
                                <View style={styles.badgeCritical}><Text style={styles.badgeText}>Critic</Text></View>
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
                        <Text style={styles.label}>STOC TOTAL (Magazin + Depozit)</Text>
                        <Text style={[styles.value, isCritical ? {color:'#dc2626'} : {}]}>
                            {total} {item.unitate_masura}
                        </Text>
                        <Text style={styles.subText}>
                            🏠 Raft: {stocRaft}  |  🏭 Depozit: {stocDepozit}
                        </Text>
                    </View>
                    <View>
                        <Text style={styles.label}>Preț</Text>
                        <Text style={styles.value}>{item.pret_vanzare} RON</Text>
                    </View>
                    <View style={{justifyContent:'flex-end'}}>
                        <Text style={{color:'#2563eb', fontSize:12, fontWeight:'bold'}}>Editează &gt;</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (isScanning) {
        return (
            <View style={{flex:1, backgroundColor:'black'}}>
                <CameraView style={StyleSheet.absoluteFillObject} onBarcodeScanned={handleBarCodeScanned} />
                <TouchableOpacity style={styles.closeCamBtn} onPress={() => setIsScanning(false)}>
                    <Text style={styles.closeText}>ÎNCHIDE CAMERA</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.title}>Inventar Total</Text>
            </View>

            <View style={styles.controlsContainer}>
                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.input} placeholder="Caută..." value={search} onChangeText={setSearch}
                    />
                    <TouchableOpacity onPress={handleScanBtnPress} style={styles.scanIconBtn}>
                        <ScanLine size={20} color="#2563eb" />
                    </TouchableOpacity>
                </View>
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
                    contentContainerStyle={{ padding: 15 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchProducts();}} />}
                    ListEmptyComponent={<Text style={{textAlign:'center', marginTop:20, color:'#9ca3af'}}>Nu am găsit produse.</Text>}
                />
            )}
            <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddProduct')}>
                <Text style={{color:'white', fontSize:30}}>+</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: 'white', paddingTop: 40 },
    backBtn: { marginRight: 15 },
    title: { fontSize: 20, fontWeight: 'bold' },
    controlsContainer: { flexDirection: 'row', padding: 15, gap: 10 },
    searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 10, paddingHorizontal: 10, height: 50 },
    input: { flex: 1, fontSize: 16 },
    scanIconBtn: { padding: 10 },
    filterBtn: { width: 50, height: 50, backgroundColor: 'white', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    filterBtnActive: { backgroundColor: '#dc2626' },
    card: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#2563eb' },
    cardCritical: { backgroundColor: '#fef2f2', borderLeftColor: '#dc2626' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    prodNume: { fontSize: 16, fontWeight: 'bold' },
    prodCod: { fontSize: 12, color: '#6b7280' },
    badgeCritical: { backgroundColor: '#fee2e2', paddingHorizontal: 6, borderRadius: 4, marginLeft: 8 },
    badgeText: { color: '#dc2626', fontSize: 10, fontWeight: 'bold' },
    deleteBtn: { padding: 5 },
    divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    label: { fontSize: 10, color: '#6b7280', fontWeight:'bold' },
    value: { fontSize: 15, fontWeight: 'bold' },
    subText: { fontSize: 11, color: '#4b5563', marginTop: 2 },
    fab: { position: 'absolute', bottom: 20, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center' },
    closeCamBtn: { position: 'absolute', bottom: 50, alignSelf:'center', backgroundColor:'red', padding:15, borderRadius:20 },
    closeText: { color:'white', fontWeight:'bold' }
});