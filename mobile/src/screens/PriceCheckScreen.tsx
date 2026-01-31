import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '../lib/supabase';
import { X, ScanLine, CheckCircle2, AlertCircle } from 'lucide-react-native';

export default function PriceCheckScreen({ navigation }: any) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);
    const [product, setProduct] = useState<any>(null);
    const [notFound, setNotFound] = useState(false);

    // Verificare permisiuni
    if (!permission) return <View style={styles.center}><ActivityIndicator /></View>;
    if (!permission.granted) {
        return (
            <View style={styles.center}>
                <Text style={{ marginBottom: 10 }}>Camera este necesară pentru verificare.</Text>
                <TouchableOpacity style={styles.btnPerm} onPress={requestPermission}>
                    <Text style={{ color: 'white' }}>Permite Accesul</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleBarCodeScanned = async ({ data }: { data: string }) => {
        setScanned(true);
        setLoading(true);
        setNotFound(false);
        setProduct(null);

        try {
            const { data: foundProduct, error } = await supabase
                .from('produse')
                .select('*')
                .eq('cod_bare', data)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            if (foundProduct) {
                setProduct(foundProduct);
            } else {
                setNotFound(true);
            }

        } catch (err: any) {
            Alert.alert("Eroare", err.message);
            setScanned(false);
        } finally {
            setLoading(false);
        }
    };

    const resetScan = () => {
        setScanned(false);
        setProduct(null);
        setNotFound(false);
    };

    // --- MODUL CAMERA (SCANARE) ---
    if (!scanned) {
        return (
            <View style={styles.container}>
                <CameraView
                    style={StyleSheet.absoluteFillObject}
                    onBarcodeScanned={handleBarCodeScanned}
                    barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "qr", "upc_a"] }}
                />

                <SafeAreaView style={styles.overlayHeader}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
                        <X color="white" size={28} />
                    </TouchableOpacity>
                    <Text style={styles.overlayTitle}>Verificator Preț</Text>
                </SafeAreaView>

                <View style={styles.scanGuide}>
                    <ScanLine color="white" size={200} strokeWidth={1} />
                    <Text style={styles.guideText}>Scanează codul de bare</Text>
                </View>
            </View>
        );
    }

    // --- MODUL LOADING ---
    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={{ marginTop: 20, fontSize: 18 }}>Căutăm produsul...</Text>
            </View>
        );
    }

    // --- MODUL REZULTAT (GĂSIT) ---
    if (product) {
        return (
            <SafeAreaView style={[styles.resultContainer, { backgroundColor: '#f0fdf4' }]}>
                <View style={styles.contentCard}>
                    <CheckCircle2 size={64} color="#16a34a" style={{ marginBottom: 20 }} />

                    <Text style={styles.label}>Produs:</Text>
                    <Text style={styles.productName}>{product.nume}</Text>

                    <View style={styles.divider} />

                    <Text style={styles.label}>Preț Vânzare:</Text>
                    <Text style={styles.priceText}>{product.pret_vanzare} RON</Text>

                    <View style={styles.stockBadge}>
                        <Text style={styles.stockText}>Stoc actual: {product.stoc_curent} {product.unitate_masura}</Text>
                    </View>

                    <Text style={styles.barcodeText}>Cod: {product.cod_bare}</Text>
                </View>

                <TouchableOpacity style={styles.scanAgainBtn} onPress={resetScan}>
                    <ScanLine color="white" size={24} />
                    <Text style={styles.btnText}>Scanează Următorul</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Text style={{ color: '#6b7280', fontSize: 16 }}>Înapoi la meniu</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    // --- MODUL REZULTAT (NU EXISTĂ) ---
    if (notFound) {
        return (
            <SafeAreaView style={[styles.resultContainer, { backgroundColor: '#fef2f2' }]}>
                <View style={styles.contentCard}>
                    <AlertCircle size={64} color="#dc2626" style={{ marginBottom: 20 }} />
                    <Text style={[styles.productName, { color: '#dc2626' }]}>Produs Necunoscut</Text>
                    <Text style={{ textAlign: 'center', marginTop: 10, color: '#4b5563' }}>
                        Acest cod de bare nu există în baza de date.
                    </Text>
                </View>

                <TouchableOpacity style={[styles.scanAgainBtn, { backgroundColor: '#dc2626' }]} onPress={resetScan}>
                    <Text style={styles.btnText}>Scanează Altul</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Text style={{ color: '#6b7280' }}>Renunță</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return null;
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' },
    btnPerm: { backgroundColor: '#2563eb', padding: 12, borderRadius: 8, marginTop: 10 },

    overlayHeader: { position: 'absolute', top: 0, left: 0, right: 0, padding: 20, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
    closeBtn: { padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
    overlayTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginLeft: 20, textShadowColor: 'black', textShadowRadius: 5 },
    scanGuide: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    guideText: { color: 'white', marginTop: 20, fontSize: 18, fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 20, paddingVertical: 5, borderRadius: 10 },

    resultContainer: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' },
    contentCard: { backgroundColor: 'white', width: '100%', borderRadius: 20, padding: 30, alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
    label: { fontSize: 14, color: '#6b7280', textTransform: 'uppercase', marginTop: 10 },
    productName: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', color: '#1f2937', marginBottom: 5 },
    divider: { width: '100%', height: 1, backgroundColor: '#e5e7eb', marginVertical: 20 },
    priceText: { fontSize: 48, fontWeight: '900', color: '#2563eb' },
    stockBadge: { backgroundColor: '#f3f4f6', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginTop: 15 },
    stockText: { fontSize: 16, fontWeight: '600', color: '#374151' },
    barcodeText: { marginTop: 20, color: '#9ca3af', fontSize: 12 },

    scanAgainBtn: { marginTop: 40, backgroundColor: '#2563eb', paddingVertical: 18, paddingHorizontal: 40, borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 10, elevation: 3 },
    btnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    backBtn: { marginTop: 20, padding: 10 },
});