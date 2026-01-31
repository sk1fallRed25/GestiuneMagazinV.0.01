import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Modal, Alert,
    ActivityIndicator, SafeAreaView, StatusBar, Platform
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '../lib/supabase';
import { Scan, LogOut, Package, X, Search, Zap } from 'lucide-react-native';

export default function DashboardScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [loading, setLoading] = useState(false);
    const [productData, setProductData] = useState<any>(null);

    // --- LOGICA DE SCANARE ---
    const handleBarCodeScanned = async ({ data }: { data: string }) => {
        setScanned(true);
        setShowScanner(false);
        setLoading(true);
        setProductData(null); // Resetăm datele vechi

        try {
            // Căutăm produsul în baza de date
            const { data: produs, error } = await supabase
                .from('produse')
                .select('*')
                .eq('cod_bare', data)
                .single();

            if (error || !produs) {
                Alert.alert(
                    "Produs Necunoscut",
                    `Codul ${data} nu există în sistem.\nVrei să îl adaugi?`,
                    [
                        { text: "Nu", style: "cancel" },
                        { text: "Adaugă Rapid", onPress: () => Alert.alert("Info", "Modulul Fast Add va fi implementat curând.") }
                    ]
                );
            } else {
                setProductData(produs);
            }
        } catch (err: any) {
            Alert.alert("Eroare", err.message);
        } finally {
            setLoading(false);
        }
    };

    // --- LOGICA LOGOUT ---
    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) Alert.alert("Eroare", error.message);
    };

    // --- PERMISIUNI CAMERĂ ---
    if (!permission) {
        return <View style={styles.center}><ActivityIndicator /></View>;
    }

    if (!permission.granted) {
        return (
            <View style={styles.center}>
                <Text style={styles.permText}>Este necesar accesul la cameră pentru scanare.</Text>
                <TouchableOpacity style={styles.btnPerm} onPress={requestPermission}>
                    <Text style={styles.btnText}>Oferă Permisiune</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#f3f4f6" />

            {/* HEADER */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Panou Gestiune</Text>
                    <Text style={styles.headerSubtitle}>Admin / Gestionar</Text>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                    <LogOut color="#ef4444" size={24} />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>

                {/* GRILA DE ACȚIUNI */}
                <View style={styles.grid}>
                    {/* Buton Scanare */}
                    <TouchableOpacity style={styles.card} onPress={() => { setScanned(false); setShowScanner(true); }}>
                        <View style={[styles.iconCircle, { backgroundColor: '#dbeafe' }]}>
                            <Scan size={32} color="#2563eb" />
                        </View>
                        <Text style={styles.cardText}>Verificare Stoc</Text>
                        <Text style={styles.cardSubText}>Scanează cod de bare</Text>
                    </TouchableOpacity>

                    {/* Buton Adăugare Rapidă (Viitor) */}
                    <TouchableOpacity style={styles.card} onPress={() => Alert.alert("Info", "Modulul de adaugare rapida va fi implementat in etapa urmatoare.")}>
                        <View style={[styles.iconCircle, { backgroundColor: '#fef3c7' }]}>
                            <Zap size={32} color="#d97706" />
                        </View>
                        <Text style={styles.cardText}>Adăugare Rapidă</Text>
                        <Text style={styles.cardSubText}>Folosind camera</Text>
                    </TouchableOpacity>
                </View>

                {/* LOADING */}
                {loading && <ActivityIndicator size="large" color="#2563eb" style={{ marginVertical: 30 }} />}

                {/* REZULTAT PRODUS */}
                {productData && !loading && (
                    <View style={styles.resultCard}>
                        <View style={styles.resultHeader}>
                            <Package size={24} color="#4b5563" />
                            <Text style={styles.resultTitle}>Rezultat Scanare</Text>
                        </View>

                        <View style={styles.divider} />

                        <Text style={styles.productName}>{productData.nume}</Text>

                        <View style={styles.statsRow}>
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>Stoc Curent</Text>
                                <Text style={[styles.statValue, productData.stoc_curent <= productData.stoc_minim_depozit ? styles.textRed : styles.textGreen]}>
                                    {productData.stoc_curent} <Text style={{fontSize:12, color:'gray'}}>{productData.unitate_masura || 'buc'}</Text>
                                </Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>Preț Vânzare</Text>
                                <Text style={styles.statValue}>{productData.pret_vanzare} <Text style={{fontSize:12, color:'gray'}}>RON</Text></Text>
                            </View>
                        </View>

                        <View style={styles.statsRow}>
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>Cod Bare</Text>
                                <Text style={styles.statSmall}>{productData.cod_bare}</Text>
                            </View>
                        </View>
                    </View>
                )}
            </View>

            {/* MODAL CAMERĂ */}
            <Modal visible={showScanner} animationType="slide" presentationStyle="fullScreen">
                <View style={styles.cameraContainer}>
                    <CameraView
                        style={StyleSheet.absoluteFillObject}
                        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                        barcodeScannerSettings={{
                            barcodeTypes: ["ean13", "ean8", "qr", "upc_a", "code128"],
                        }}
                    />

                    <View style={styles.overlay}>
                        <Text style={styles.overlayText}>Încadrează codul în chenar</Text>
                        <View style={styles.scanFrame} />
                        <TouchableOpacity style={styles.closeBtn} onPress={() => setShowScanner(false)}>
                            <X color="white" size={24} />
                            <Text style={styles.closeText}>Închide Camera</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6', paddingTop: Platform.OS === 'android' ? 30 : 0 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },

    // Header
    header: { padding: 20, backgroundColor: 'white', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
    headerSubtitle: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
    logoutBtn: { padding: 8, backgroundColor: '#fee2e2', borderRadius: 8 },

    content: { padding: 20 },

    // Grid Buttons
    grid: { flexDirection: 'row', gap: 15, marginBottom: 20 },
    card: { flex: 1, backgroundColor: 'white', padding: 15, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    iconCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    cardText: { fontSize: 14, fontWeight: 'bold', color: '#1f2937', textAlign: 'center' },
    cardSubText: { fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 2 },

    // Result Card
    resultCard: { backgroundColor: 'white', borderRadius: 16, padding: 20, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
    resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    resultTitle: { fontSize: 16, fontWeight: 'bold', color: '#4b5563' },
    divider: { height: 1, backgroundColor: '#e5e7eb', marginBottom: 15 },
    productName: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 20, textAlign: 'center' },

    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    statBox: { flex: 1, backgroundColor: '#f9fafb', padding: 12, borderRadius: 10, alignItems: 'center' },
    statLabel: { fontSize: 11, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', fontWeight: 'bold' },
    statValue: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
    statSmall: { fontSize: 14, fontWeight: '600', color: '#374151' },

    textGreen: { color: '#059669' },
    textRed: { color: '#dc2626' },

    // Permissions
    permText: { fontSize: 16, textAlign: 'center', marginBottom: 20, color: '#374151' },
    btnPerm: { backgroundColor: '#2563eb', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
    btnText: { color: 'white', fontWeight: 'bold' },

    // Camera Overlay
    cameraContainer: { flex: 1, backgroundColor: 'black' },
    overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
    overlayText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 30, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 5 },
    scanFrame: { width: 260, height: 260, borderWidth: 2, borderColor: '#fff', borderRadius: 20, backgroundColor: 'transparent' },
    closeBtn: { position: 'absolute', bottom: 60, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#dc2626', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 30 },
    closeText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});