import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ActivityIndicator, SafeAreaView, Modal, Alert, ScrollView
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '../lib/supabase';
import {
    Search, ArrowLeft, Camera, X, ClipboardList, CheckCircle2, AlertTriangle
} from 'lucide-react-native';

export default function InventoryAuditScreen({ navigation }) {
    const [query, setQuery] = useState('');
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(false);

    // Inventar Logic
    const [location, setLocation] = useState('depozit'); // 'depozit' sau 'magazin'
    const [physicalCount, setPhysicalCount] = useState('');
    const [submitLoading, setSubmitLoading] = useState(false);

    // Scanner
    const [permission, requestPermission] = useCameraPermissions();
    const [scannerVisible, setScannerVisible] = useState(false);

    const openScanner = async () => {
        if (!permission?.granted) await requestPermission();
        setScannerVisible(true);
    };

    const handleSearch = async (term) => {
        if (!term || term.length < 3) return;
        setLoading(true);
        setProduct(null);
        setPhysicalCount('');

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
        const faptic = parseInt(physicalCount);
        if (isNaN(faptic) || faptic < 0) return Alert.alert("Eroare", "Introduceți o cantitate validă (>= 0).");

        // Calculăm diferența doar pentru afișare în alertă
        const scriptic = location === 'depozit' ? product.stoc_depozit : product.stoc_magazin;
        const diff = faptic - scriptic;

        // Confirmare suplimentară dacă diferența e mare
        if (Math.abs(diff) > 10) {
            Alert.alert(
                "Atenție Diferență Mare",
                `Scriptic: ${scriptic}\nFaptic: ${faptic}\nDiferență: ${diff > 0 ? '+' : ''}${diff}\n\nSigur actualizezi?`,
                [
                    { text: "Anulează", style: "cancel" },
                    { text: "Confirmă", onPress: executeUpdate }
                ]
            );
        } else {
            executeUpdate();
        }
    };

    const executeUpdate = async () => {
        setSubmitLoading(true);
        try {
            const { error } = await supabase.rpc('reglare_inventar', {
                p_produs_id: product.id,
                p_locatie: location,
                p_stoc_faptic: parseInt(physicalCount)
            });

            if (error) throw error;

            Alert.alert("Succes", "Inventar actualizat!");
            // Resetăm pentru următorul produs
            setProduct(null);
            setQuery('');
            setPhysicalCount('');
        } catch (error) {
            Alert.alert("Eroare", error.message);
        } finally {
            setSubmitLoading(false);
        }
    };

    // Calculăm stocul curent pe care îl arătăm utilizatorului
    const currentSystemStock = product ? (location === 'depozit' ? product.stoc_depozit : product.stoc_magazin) : 0;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft size={24} color="#1f2937" /></TouchableOpacity>
                <Text style={styles.title}>Inventar Rapid</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* 1. SELECȚIE LOCAȚIE */}
                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[styles.toggleBtn, location === 'depozit' && styles.activeDepozit]}
                        onPress={() => setLocation('depozit')}
                    >
                        <Text style={[styles.toggleText, location === 'depozit' && styles.activeText]}>DEPOZIT</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleBtn, location === 'magazin' && styles.activeMagazin]}
                        onPress={() => setLocation('magazin')}
                    >
                        <Text style={[styles.toggleText, location === 'magazin' && styles.activeText]}>RAFT (MAGAZIN)</Text>
                    </TouchableOpacity>
                </View>

                {/* 2. CĂUTARE */}
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

                {loading && <ActivityIndicator size="large" color="#7c3aed" />}

                {product && (
                    <View style={styles.card}>
                        <Text style={styles.prodName}>{product.nume}</Text>
                        <Text style={styles.prodCode}>{product.cod_bare}</Text>

                        <View style={styles.comparisonRow}>
                            <View style={styles.infoBlock}>
                                <Text style={styles.label}>SCRIPTIC (Sistem)</Text>
                                <Text style={styles.systemValue}>{currentSystemStock}</Text>
                            </View>

                            <View style={styles.arrowBlock}>
                                <Text style={{fontSize: 24, color: '#9ca3af'}}>→</Text>
                            </View>

                            <View style={styles.inputBlock}>
                                <Text style={styles.label}>FAPTIC (Numărat)</Text>
                                <TextInput
                                    style={styles.countInput}
                                    keyboardType="numeric"
                                    placeholder="0"
                                    value={physicalCount}
                                    onChangeText={setPhysicalCount}
                                    autoFocus={true}
                                />
                            </View>
                        </View>

                        {/* PREVIZUALIZARE DIFERENȚĂ */}
                        {physicalCount !== '' && (
                            <View style={[
                                styles.diffBadge,
                                (parseInt(physicalCount) - currentSystemStock) === 0 ? styles.diffZero :
                                    (parseInt(physicalCount) - currentSystemStock) < 0 ? styles.diffNegative : styles.diffPositive
                            ]}>
                                <Text style={styles.diffText}>
                                    Diferență: {(parseInt(physicalCount) - currentSystemStock) > 0 ? '+' : ''}
                                    {parseInt(physicalCount) - currentSystemStock} buc
                                </Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={styles.submitBtn}
                            onPress={handleSubmit}
                            disabled={submitLoading}
                        >
                            {submitLoading ? <ActivityIndicator color="white" /> : (
                                <>
                                    <CheckCircle2 size={20} color="white" />
                                    <Text style={styles.submitText}>CONFIRMĂ REGLAREA</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <View style={styles.infoNote}>
                            <AlertTriangle size={14} color="#6b7280" />
                            <Text style={styles.noteText}>Această acțiune va actualiza stocul și va fi înregistrată.</Text>
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

    // Toggle
    toggleContainer: { flexDirection: 'row', backgroundColor: '#e5e7eb', borderRadius: 10, padding: 4, marginBottom: 20 },
    toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    activeDepozit: { backgroundColor: '#3b82f6', elevation: 2 },
    activeMagazin: { backgroundColor: '#10b981', elevation: 2 },
    toggleText: { fontWeight: '700', color: '#6b7280' },
    activeText: { color: 'white' },

    searchSection: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    input: { flex: 1, backgroundColor: 'white', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb' },
    scanBtn: { backgroundColor: '#7c3aed', width: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

    // Card
    card: { backgroundColor: 'white', padding: 20, borderRadius: 16, elevation: 3 },
    prodName: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', color: '#1f2937' },
    prodCode: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginBottom: 20 },

    comparisonRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    infoBlock: { alignItems: 'center', flex: 1 },
    systemValue: { fontSize: 24, fontWeight: 'bold', color: '#6b7280', marginTop: 5 },
    inputBlock: { alignItems: 'center', flex: 1 },
    countInput: {
        backgroundColor: '#f3f4f6', fontSize: 24, fontWeight: 'bold', color: '#111827',
        padding: 10, width: '80%', textAlign: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db'
    },
    label: { fontSize: 10, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' },

    // Diffs
    diffBadge: { padding: 8, borderRadius: 8, marginBottom: 20, alignItems: 'center' },
    diffZero: { backgroundColor: '#f3f4f6' },
    diffNegative: { backgroundColor: '#fee2e2' }, // Lipsă
    diffPositive: { backgroundColor: '#dcfce7' }, // Plus
    diffText: { fontWeight: 'bold', color: '#374151' },

    submitBtn: { backgroundColor: '#7c3aed', padding: 18, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    submitText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

    infoNote: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 15, gap: 5 },
    noteText: { fontSize: 11, color: '#6b7280' },
    closeCam: { position: 'absolute', top: 50, right: 25, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 25, padding: 5 }
});