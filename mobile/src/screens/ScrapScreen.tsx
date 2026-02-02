import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ActivityIndicator, SafeAreaView, Modal, Alert, ScrollView
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '../lib/supabase';
import {
    Search, ArrowLeft, Camera, X, AlertOctagon, Trash2
} from 'lucide-react-native';

export default function ScrapScreen({ navigation }) {
    const [query, setQuery] = useState('');
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(false);

    // Formular Deteriorare
    const [qty, setQty] = useState('');
    const [reason, setReason] = useState('Spart'); // Motiv default
    const [source, setSource] = useState('depozit'); // Sursa default

    const [permission, requestPermission] = useCameraPermissions();
    const [scannerVisible, setScannerVisible] = useState(false);

    const reasons = ['Spart', 'Expirat', 'Desigilat', 'Defect Fabrica', 'Consum Protocol'];

    const openScanner = async () => {
        if (!permission?.granted) await requestPermission();
        setScannerVisible(true);
    };

    const handleSearch = async (term) => {
        if (!term || term.length < 3) return;
        setLoading(true);
        setProduct(null);
        try {
            const { data, error } = await supabase
                .from('produse')
                .select('id, nume, cod_bare, stoc_depozit, stoc_magazin')
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

    const handleSubmit = async () => {
        const quantity = parseInt(qty);
        if (!quantity || quantity <= 0) return Alert.alert("Eroare", "Introduceți cantitatea.");

        // Verificare stoc disponibil
        const currentStock = source === 'depozit' ? product.stoc_depozit : product.stoc_magazin;
        if (quantity > currentStock) return Alert.alert("Eroare", `Nu poți scădea ${quantity} buc. Ai doar ${currentStock}.`);

        setLoading(true);
        try {
            const { error } = await supabase.rpc('inregistreaza_pierdere', {
                p_produs_id: product.id,
                p_cantitate: quantity,
                p_motiv: reason,
                p_sursa: source
            });

            if (error) throw error;

            Alert.alert("Succes", "Produsul a fost scos din stoc.");
            navigation.goBack();
        } catch (error) {
            Alert.alert("Eroare", error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft size={24} color="#1f2937" /></TouchableOpacity>
                <Text style={styles.title}>Raportare Deteriorări</Text>
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

                {loading && <ActivityIndicator size="large" color="#ef4444" />}

                {product && (
                    <View style={styles.card}>
                        <Text style={styles.prodName}>{product.nume}</Text>
                        <View style={styles.stockRow}>
                            <Text style={styles.stockText}>Depozit: {product.stoc_depozit}</Text>
                            <Text style={styles.stockText}>Raft: {product.stoc_magazin}</Text>
                        </View>

                        <Text style={styles.label}>1. De unde provine produsul?</Text>
                        <View style={styles.toggleRow}>
                            <TouchableOpacity
                                style={[styles.toggleBtn, source === 'depozit' && styles.activeDepozit]}
                                onPress={() => setSource('depozit')}
                            >
                                <Text style={[styles.toggleText, source === 'depozit' && styles.activeText]}>DEPOZIT</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.toggleBtn, source === 'magazin' && styles.activeMagazin]}
                                onPress={() => setSource('magazin')}
                            >
                                <Text style={[styles.toggleText, source === 'magazin' && styles.activeText]}>RAFT</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>2. Cantitate (Bucăți)</Text>
                        <TextInput
                            style={styles.qtyInput}
                            keyboardType="numeric"
                            placeholder="0"
                            value={qty}
                            onChangeText={setQty}
                        />

                        <Text style={styles.label}>3. Motivul</Text>
                        <View style={styles.reasonsGrid}>
                            {reasons.map((r) => (
                                <TouchableOpacity
                                    key={r}
                                    style={[styles.reasonChip, reason === r && styles.activeReason]}
                                    onPress={() => setReason(r)}
                                >
                                    <Text style={[styles.reasonText, reason === r && styles.activeReasonText]}>{r}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                            <Trash2 size={24} color="white" />
                            <Text style={styles.submitText}>CONFIRMĂ PIERDEREA</Text>
                        </TouchableOpacity>
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
    container: { flex: 1, backgroundColor: '#fef2f2' }, // Fundal roșcat pentru alertă
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 15, backgroundColor: 'white' },
    title: { fontSize: 20, fontWeight: 'bold', color: '#991b1b' },
    content: { padding: 20 },
    searchSection: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    input: { flex: 1, backgroundColor: 'white', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb' },
    scanBtn: { backgroundColor: '#ef4444', width: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    card: { backgroundColor: 'white', padding: 20, borderRadius: 16, elevation: 3 },
    prodName: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
    stockRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20, borderBottomWidth: 1, borderColor: '#f3f4f6', paddingBottom: 10 },
    stockText: { fontWeight: '600', color: '#6b7280' },
    label: { fontWeight: 'bold', color: '#374151', marginTop: 15, marginBottom: 8 },
    toggleRow: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 8, padding: 4 },
    toggleBtn: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 6 },
    activeDepozit: { backgroundColor: '#3b82f6' },
    activeMagazin: { backgroundColor: '#10b981' },
    activeText: { color: 'white', fontWeight: 'bold' },
    toggleText: { color: '#6b7280', fontWeight: '600' },
    qtyInput: { backgroundColor: '#fef2f2', padding: 15, borderRadius: 10, fontSize: 20, textAlign: 'center', fontWeight: 'bold', color: '#991b1b', borderWidth: 1, borderColor: '#fecaca' },
    reasonsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    reasonChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6' },
    activeReason: { backgroundColor: '#ef4444' },
    reasonText: { color: '#374151', fontSize: 12 },
    activeReasonText: { color: 'white', fontWeight: 'bold' },
    submitBtn: { backgroundColor: '#b91c1c', marginTop: 25, padding: 18, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    submitText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    closeCam: { position: 'absolute', top: 50, right: 25, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 25, padding: 5 }
});