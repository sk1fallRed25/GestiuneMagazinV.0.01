import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ActivityIndicator, SafeAreaView, Modal, Alert, ScrollView
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '../lib/supabase';
import {
    Search, ArrowLeft, Camera, X, ArrowRightLeft, MoveRight
} from 'lucide-react-native';

export default function StockCheckScreen({ navigation }) {
    const [query, setQuery] = useState('');
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(false);

    // Transfer Logic
    const [transferQty, setTransferQty] = useState('');
    const [transferLoading, setTransferLoading] = useState(false);

    // Scanner
    const [permission, requestPermission] = useCameraPermissions();
    const [scannerVisible, setScannerVisible] = useState(false);

    // --- REALTIME LISTENER ---
    useEffect(() => {
        if (!product) return;

        const channel = supabase.channel(`product-live-${product.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'produse',
                    filter: `id=eq.${product.id}`
                },
                (payload) => {
                    console.log("⚡ Stoc actualizat live!", payload.new);
                    setProduct(current => ({ ...current, ...payload.new }));
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [product?.id]);

    const openScanner = async () => {
        if (!permission?.granted) await requestPermission();
        setScannerVisible(true);
    };

    const handleSearch = async (term) => {
        if (!term || term.length < 3) return;
        setLoading(true);
        setProduct(null);
        setTransferQty('');

        try {
            const { data, error } = await supabase
                .from('produse')
                .select('*')
                .or(`cod_bare.eq.${term},nume.ilike.%${term}%`)
                .maybeSingle();

            if (error) throw error;
            if (data) setProduct(data);
            else Alert.alert("Info", "Produsul nu a fost găsit.");
        } catch (err) {
            Alert.alert("Eroare", "Problemă la căutare.");
        } finally {
            setLoading(false);
            setScannerVisible(false);
        }
    };

    const handleTransfer = async () => {
        const qty = parseInt(transferQty);
        if (isNaN(qty) || qty <= 0) return Alert.alert("Eroare", "Cantitate invalidă.");
        if (qty > product.stoc_depozit) return Alert.alert("Eroare", "Stoc insuficient în depozit.");

        setTransferLoading(true);
        try {
            const { error } = await supabase.rpc('transfer_stoc_depozit_magazin', {
                p_produs_id: product.id,
                p_cantitate: qty
            });

            if (error) throw error;
            Alert.alert("Succes", "Transfer realizat!");
            setTransferQty('');
            // Nu mai e nevoie de refetch manual, Realtime-ul va actualiza stocul automat
        } catch (err) {
            Alert.alert("Eroare", err.message);
        } finally {
            setTransferLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft size={24} color="#1f2937" /></TouchableOpacity>
                <Text style={styles.title}>Verificare & Transfer</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.searchSection}>
                    <TextInput
                        style={styles.input}
                        placeholder="Caută sau scanează..."
                        value={query}
                        onChangeText={setQuery}
                        onSubmitEditing={() => handleSearch(query)}
                    />
                    <TouchableOpacity onPress={openScanner} style={styles.scanBtn}>
                        <Camera size={24} color="white" />
                    </TouchableOpacity>
                </View>

                {loading && <ActivityIndicator size="large" color="#4F46E5" />}

                {product && (
                    <View style={styles.card}>
                        <Text style={styles.prodName}>{product.nume}</Text>
                        <Text style={styles.prodCode}>{product.cod_bare}</Text>

                        <View style={styles.stockRow}>
                            <View style={[styles.stockBox, {backgroundColor: '#eff6ff'}]}>
                                <Text style={styles.stockLabel}>DEPOZIT</Text>
                                <Text style={styles.stockValue}>{product.stoc_depozit}</Text>
                            </View>

                            <ArrowRightLeft size={24} color="#9ca3af" />

                            <View style={[styles.stockBox, {backgroundColor: '#f0fdf4'}]}>
                                <Text style={styles.stockLabel}>RAFT (MAGAZIN)</Text>
                                <Text style={styles.stockValue}>{product.stoc_magazin}</Text>
                            </View>
                        </View>

                        <View style={styles.transferSection}>
                            <Text style={styles.sectionTitle}>Mută la Raft</Text>
                            <View style={styles.transferRow}>
                                <TextInput
                                    style={styles.transferInput}
                                    placeholder="Cantitate"
                                    keyboardType="numeric"
                                    value={transferQty}
                                    onChangeText={setTransferQty}
                                />
                                <TouchableOpacity
                                    style={styles.transferBtn}
                                    onPress={handleTransfer}
                                    disabled={transferLoading}
                                >
                                    {transferLoading ? <ActivityIndicator color="white" /> : (
                                        <>
                                            <Text style={{color:'white', fontWeight:'bold'}}>TRANSFERĂ</Text>
                                            <MoveRight size={20} color="white" />
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>

            <Modal visible={scannerVisible} animationType="slide">
                <View style={{ flex: 1, backgroundColor: 'black' }}>
                    <CameraView
                        style={StyleSheet.absoluteFill}
                        onBarcodeScanned={scannerVisible ? ({data}) => { setQuery(data); handleSearch(data); } : undefined}
                    />
                    <TouchableOpacity style={styles.closeCam} onPress={() => setScannerVisible(false)}><X size={35} color="white" /></TouchableOpacity>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 15, backgroundColor: 'white', elevation: 2 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
    content: { padding: 20 },
    searchSection: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    input: { flex: 1, backgroundColor: 'white', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb' },
    scanBtn: { backgroundColor: '#4F46E5', width: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

    card: { backgroundColor: 'white', padding: 20, borderRadius: 16, elevation: 3 },
    prodName: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', color: '#1f2937' },
    prodCode: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginBottom: 20 },

    stockRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
    stockBox: { flex: 1, alignItems: 'center', padding: 15, borderRadius: 12 },
    stockLabel: { fontSize: 10, fontWeight: '700', color: '#6b7280', marginBottom: 5 },
    stockValue: { fontSize: 24, fontWeight: '900', color: '#1f2937' },

    transferSection: { borderTopWidth: 1, borderColor: '#f3f4f6', paddingTop: 20 },
    sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#4b5563', marginBottom: 15 },
    transferRow: { flexDirection: 'row', gap: 10 },
    transferInput: { flex: 1, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 16, fontWeight: 'bold' },
    transferBtn: { backgroundColor: '#4F46E5', paddingHorizontal: 20, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
    closeCam: { position: 'absolute', top: 50, right: 25, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 25, padding: 5 }
});