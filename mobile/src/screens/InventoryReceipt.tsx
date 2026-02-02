import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ActivityIndicator, SafeAreaView, Modal, Alert, ScrollView
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '../lib/supabase';
import {
    ArrowLeft, Camera, X, CheckCircle2, AlertTriangle, Eye, EyeOff, Search
} from 'lucide-react-native';

export default function InventoryAuditScreen({ navigation }) {
    const [query, setQuery] = useState('');
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(false);

    // State Inventar
    const [location, setLocation] = useState('depozit');
    const [physicalCount, setPhysicalCount] = useState('');

    // VARIABILA DE VIZIBILITATE
    const [showResult, setShowResult] = useState(false);

    const [submitLoading, setSubmitLoading] = useState(false);

    // Scanner
    const [permission, requestPermission] = useCameraPermissions();
    const [scannerVisible, setScannerVisible] = useState(false);

    // --- FIX CRITIC: RESETARE AUTOMATĂ ---
    // De fiecare dată când se încarcă un produs nou, ASCUNDEM imediat stocul
    useEffect(() => {
        if (product) {
            setShowResult(false);
            setPhysicalCount('');
        }
    }, [product]);

    const openScanner = async () => {
        if (!permission?.granted) await requestPermission();
        setScannerVisible(true);
    };

    const handleSearch = async (term) => {
        if (!term || term.length < 3) return;
        setLoading(true);
        // Resetăm starea înainte de a începe căutarea
        setProduct(null);
        setShowResult(false);

        try {
            const { data, error } = await supabase
                .from('produse')
                .select('id, nume, cod_bare, stoc_depozit, stoc_magazin')
                .or(`cod_bare.eq.${term},nume.ilike.%${term}%`)
                .maybeSingle();

            if (error) throw error;
            if (data) {
                setProduct(data);
                // setShowResult(false) va fi apelat automat de useEffect
            }
            else Alert.alert("Info", "Produsul nu a fost găsit.");
        } catch (err) {
            Alert.alert("Eroare", "Problemă la căutare.");
        } finally {
            setLoading(false);
            setScannerVisible(false);
        }
    };

    // Dezvăluie rezultatul DOAR la cerere
    const handleCompare = () => {
        if (!physicalCount || physicalCount.trim() === '') {
            Alert.alert("Atenție", "Trebuie să introduci cantitatea numărată!");
            return;
        }
        setShowResult(true);
    };

    const handleSubmit = async () => {
        const faptic = parseInt(physicalCount);
        const scriptic = location === 'depozit' ? product.stoc_depozit : product.stoc_magazin;
        const diff = faptic - scriptic;

        if (Math.abs(diff) > 5) {
            Alert.alert(
                "Diferență Semnificativă",
                `Scriptic: ${scriptic} vs Faptic: ${faptic}\nConfirmi actualizarea stocului?`,
                [
                    { text: "Nu", style: "cancel" },
                    { text: "Da, Actualizează", onPress: executeUpdate }
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
            setProduct(null); // Resetează ecranul
            setQuery('');
        } catch (error) {
            Alert.alert("Eroare", error.message);
        } finally {
            setSubmitLoading(false);
        }
    };

    // Valoarea curentă din sistem (calculată, dar ascunsă de UI)
    const currentSystemStock = product ? (location === 'depozit' ? product.stoc_depozit : product.stoc_magazin) : 0;
    const currentDiff = parseInt(physicalCount || '0') - currentSystemStock;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft size={24} color="#1f2937" /></TouchableOpacity>
                <Text style={styles.title}>Inventar Rapid (Orb)</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* SELECȚIE LOCAȚIE */}
                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[styles.toggleBtn, location === 'depozit' && styles.activeDepozit]}
                        onPress={() => { setLocation('depozit'); setShowResult(false); }}
                    >
                        <Text style={[styles.toggleText, location === 'depozit' && styles.activeText]}>DEPOZIT</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleBtn, location === 'magazin' && styles.activeMagazin]}
                        onPress={() => { setLocation('magazin'); setShowResult(false); }}
                    >
                        <Text style={[styles.toggleText, location === 'magazin' && styles.activeText]}>RAFT</Text>
                    </TouchableOpacity>
                </View>

                {/* CĂUTARE */}
                <View style={styles.searchSection}>
                    <TextInput
                        style={styles.input}
                        placeholder="Caută sau scanează..."
                        value={query}
                        onChangeText={setQuery}
                        onSubmitEditing={() => handleSearch(query)}
                    />
                    <TouchableOpacity onPress={() => handleSearch(query)} style={styles.searchIconBtn}>
                        <Search size={20} color="#6b7280" />
                    </TouchableOpacity>
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

                            {/* --- ZONA CRITICĂ: SCRIPTIC (STOC SISTEM) --- */}
                            <View style={[styles.infoBlock, !showResult && styles.hiddenBlock]}>
                                <Text style={styles.label}>SCRIPTIC (Sistem)</Text>

                                {showResult === true ? (
                                    // Dacă showResult e TRUE, arătăm numărul
                                    <Text style={styles.systemValue}>{currentSystemStock}</Text>
                                ) : (
                                    // Dacă showResult e FALSE, arătăm ???
                                    <View style={styles.hiddenContent}>
                                        <EyeOff size={24} color="#9ca3af" />
                                        <Text style={styles.hiddenText}>???</Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.arrowBlock}>
                                <Text style={{fontSize: 24, color: '#9ca3af'}}>→</Text>
                            </View>

                            {/* --- ZONA INPUT: FAPTIC (NUMĂRAT) --- */}
                            <View style={styles.inputBlock}>
                                <Text style={styles.label}>FAPTIC (Numărat)</Text>
                                <TextInput
                                    style={styles.countInput}
                                    keyboardType="numeric"
                                    placeholder="?"
                                    value={physicalCount}
                                    onChangeText={(t) => {
                                        setPhysicalCount(t);
                                        // Dacă modifică cifra, ascundem din nou rezultatul pentru a preveni trișarea
                                        setShowResult(false);
                                    }}
                                    autoFocus={true}
                                />
                            </View>
                        </View>

                        {/* REZULTAT (Apare doar după Verificare) */}
                        {showResult && (
                            <View style={[
                                styles.diffBadge,
                                currentDiff === 0 ? styles.diffZero :
                                    currentDiff < 0 ? styles.diffNegative : styles.diffPositive
                            ]}>
                                <Text style={styles.diffText}>
                                    {currentDiff === 0 ? "Perfect! Nicio diferență." :
                                        `Diferență: ${currentDiff > 0 ? '+' : ''}${currentDiff} buc`}
                                </Text>
                            </View>
                        )}

                        {/* BUTOANE */}
                        {!showResult ? (
                            <TouchableOpacity style={styles.verifyBtn} onPress={handleCompare}>
                                <Eye size={20} color="white" />
                                <Text style={styles.submitText}>VERIFICĂ</Text>
                            </TouchableOpacity>
                        ) : (
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
                        )}

                        {!showResult && (
                            <View style={styles.infoNote}>
                                <AlertTriangle size={14} color="#6b7280" />
                                <Text style={styles.noteText}>Numără produsele înainte de a vedea stocul din sistem.</Text>
                            </View>
                        )}
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

    toggleContainer: { flexDirection: 'row', backgroundColor: '#e5e7eb', borderRadius: 10, padding: 4, marginBottom: 20 },
    toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    activeDepozit: { backgroundColor: '#3b82f6', elevation: 2 },
    activeMagazin: { backgroundColor: '#10b981', elevation: 2 },
    toggleText: { fontWeight: '700', color: '#6b7280' },
    activeText: { color: 'white' },

    searchSection: { flexDirection: 'row', gap: 10, marginBottom: 20, position:'relative' },
    input: { flex: 1, backgroundColor: 'white', padding: 12, paddingRight: 40, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb' },
    searchIconBtn: { position:'absolute', right: 60, top: 12, padding: 5 },
    scanBtn: { backgroundColor: '#7c3aed', width: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

    card: { backgroundColor: 'white', padding: 20, borderRadius: 16, elevation: 3 },
    prodName: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', color: '#1f2937' },
    prodCode: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginBottom: 20 },

    comparisonRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },

    infoBlock: { alignItems: 'center', flex: 1, padding: 10, borderRadius: 10, minHeight: 80, justifyContent: 'center' },
    hiddenBlock: { backgroundColor: '#f3f4f6', borderWidth: 2, borderColor: '#e5e7eb', borderStyle: 'dotted' },

    systemValue: { fontSize: 28, fontWeight: '900', color: '#374151', marginTop: 5 },
    hiddenContent: { alignItems: 'center', marginTop: 5 },
    hiddenText: { color: '#9ca3af', fontWeight: 'bold', fontSize: 20 },

    inputBlock: { alignItems: 'center', flex: 1 },
    countInput: {
        backgroundColor: '#f3f4f6', fontSize: 24, fontWeight: 'bold', color: '#111827',
        padding: 10, width: '90%', textAlign: 'center', borderRadius: 8, borderWidth: 2, borderColor: '#4F46E5'
    },
    label: { fontSize: 10, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', marginBottom: 5 },

    diffBadge: { padding: 12, borderRadius: 8, marginBottom: 20, alignItems: 'center' },
    diffZero: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
    diffNegative: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
    diffPositive: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
    diffText: { fontWeight: 'bold', color: '#374151' },

    verifyBtn: { backgroundColor: '#4b5563', padding: 18, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    submitBtn: { backgroundColor: '#7c3aed', padding: 18, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    submitText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

    infoNote: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 15, gap: 5 },
    noteText: { fontSize: 11, color: '#6b7280' },
    closeCam: { position: 'absolute', top: 50, right: 25, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 25, padding: 5 }
});