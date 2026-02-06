import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ActivityIndicator, SafeAreaView, Modal, Alert, Keyboard
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Camera, CheckCircle, X, EyeOff, Eye } from 'lucide-react-native';

export default function InventoryAuditScreen({ navigation }) {
    const [activeTab, setActiveTab] = useState('depozit'); // 'depozit' sau 'magazin'
    const [query, setQuery] = useState('');
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(false);

    // Logică Inventar
    const [countedQty, setCountedQty] = useState('');
    const [processing, setProcessing] = useState(false);

    // Scanner
    const [permission, requestPermission] = useCameraPermissions();
    const [scannerVisible, setScannerVisible] = useState(false);

    // --- ROL UTILIZATOR ---
    const [userRole, setUserRole] = useState(null); // 'admin' sau 'gestionar'

    useEffect(() => {
        fetchUserRole();
    }, []);

    const fetchUserRole = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from('utilizatori')
                    .select('rol')
                    .eq('id', user.id)
                    .single();
                setUserRole(data?.rol || 'gestionar');
            }
        } catch (error) {
            console.log("Eroare role:", error);
        }
    };

    const openScanner = async () => {
        if (!permission?.granted) await requestPermission();
        setScannerVisible(true);
    };

    const handleSearch = async (term) => {
        if (!term || term.length < 3) return;
        setLoading(true);
        setProduct(null);
        setCountedQty('');
        Keyboard.dismiss();

        try {
            const { data, error } = await supabase
                .from('produse')
                .select('*')
                .or(`cod_bare.eq.${term},nume.ilike.%${term}%`)
                .maybeSingle();

            if (error) throw error;
            if (data) {
                setProduct(data);
            } else {
                Alert.alert("Info", "Produsul nu a fost găsit.");
            }
        } catch (err) {
            Alert.alert("Eroare", "Problemă la căutare.");
        } finally {
            setLoading(false);
            setScannerVisible(false);
        }
    };

    const confirmInventory = async () => {
        if (!product || countedQty === '') return;

        const faptic = parseInt(countedQty);
        if (isNaN(faptic) || faptic < 0) return Alert.alert("Eroare", "Cantitate invalidă.");

        setProcessing(true);
        try {
            const currentStock = activeTab === 'depozit' ? product.stoc_depozit : product.stoc_magazin;
            const difference = faptic - currentStock;

            const { data: { user } } = await supabase.auth.getUser();

            // 1. Logăm diferența (chiar dacă e 0, e bine să avem istoric că s-a numărat)
            const { error: logError } = await supabase
                .from('istoric_inventar')
                .insert([{
                    produs_id: product.id,
                    user_id: user.id,
                    locatie: activeTab,
                    stoc_vechi: currentStock,
                    stoc_nou: faptic,
                    diferenta: difference
                }]);

            if (logError) throw logError;

            // 2. Actualizăm stocul DOAR dacă e diferit
            if (difference !== 0) {
                const updateField = activeTab === 'depozit' ? 'stoc_depozit' : 'stoc_magazin';
                const { error: updateError } = await supabase
                    .from('produse')
                    .update({ [updateField]: faptic })
                    .eq('id', product.id);

                if (updateError) throw updateError;
            }

            Alert.alert("Succes", "Inventar actualizat!");
            setProduct(null);
            setCountedQty('');
            setQuery('');

        } catch (err) {
            Alert.alert("Eroare", err.message);
        } finally {
            setProcessing(false);
        }
    };

    // Helper pentru afișarea stocului
    const getCurrentStock = () => {
        if (!product) return 0;
        return activeTab === 'depozit' ? product.stoc_depozit : product.stoc_magazin;
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft size={24} color="#1f2937" /></TouchableOpacity>
                <Text style={styles.title}>Inventar Rapid</Text>
            </View>

            {/* TABS */}
            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'depozit' && styles.activeTab]}
                    onPress={() => { setActiveTab('depozit'); setProduct(null); }}
                >
                    <Text style={[styles.tabText, activeTab === 'depozit' && styles.activeTabText]}>DEPOZIT</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'magazin' && styles.activeTab]}
                    onPress={() => { setActiveTab('magazin'); setProduct(null); }}
                >
                    <Text style={[styles.tabText, activeTab === 'magazin' && styles.activeTabText]}>RAFT (MAGAZIN)</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
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
                    <View style={styles.auditCard}>
                        <Text style={styles.prodName}>{product.nume}</Text>
                        <Text style={styles.prodCode}>{product.cod_bare}</Text>

                        <View style={styles.auditRow}>
                            {/* --- ZONA SCRIPTIC (MODIFICATĂ) --- */}
                            <View style={[styles.auditBox, {backgroundColor: '#f9fafb', borderColor: '#e5e7eb'}]}>
                                <Text style={styles.boxLabel}>SCRIPTIC (SISTEM)</Text>

                                {userRole === 'admin' ? (
                                    // Adminul vede cifra
                                    <Text style={[styles.boxValue, {color:'#6b7280'}]}>
                                        {getCurrentStock()}
                                    </Text>
                                ) : (
                                    // Gestionarul vede "ASCUNS"
                                    <View style={{alignItems:'center', marginTop:5}}>
                                        <EyeOff size={32} color="#cbd5e1" />
                                        <Text style={{fontSize:12, color:'#94a3b8', fontWeight:'bold', marginTop:2}}>
                                            ASCUNS
                                        </Text>
                                    </View>
                                )}
                            </View>

                            <ArrowLeft size={20} color="#9ca3af" style={{transform:[{rotate:'180deg'}]}}/>

                            {/* --- ZONA FAPTIC --- */}
                            <View style={[styles.auditBox, {backgroundColor: 'white', borderColor: '#4F46E5', elevation:2}]}>
                                <Text style={[styles.boxLabel, {color: '#4F46E5'}]}>FAPTIC (NUMĂRAT)</Text>
                                <TextInput
                                    style={styles.qtyInput}
                                    placeholder="0"
                                    keyboardType="numeric"
                                    value={countedQty}
                                    onChangeText={setCountedQty}
                                    autoFocus={true}
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.confirmBtn}
                            onPress={confirmInventory}
                            disabled={processing}
                        >
                            {processing ? <ActivityIndicator color="white" /> : (
                                <>
                                    <CheckCircle size={20} color="white" />
                                    <Text style={styles.confirmText}>CONFIRMĂ REGLAREA</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <Text style={styles.warningText}>
                            ⚠️ Această acțiune va actualiza stocul și va fi înregistrată.
                        </Text>
                    </View>
                )}
            </View>

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

    tabsContainer: { flexDirection: 'row', padding: 10, gap: 10 },
    tab: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#e5e7eb', alignItems: 'center' },
    activeTab: { backgroundColor: '#3b82f6' },
    tabText: { fontWeight: 'bold', color: '#6b7280' },
    activeTabText: { color: 'white' },

    content: { padding: 20 },
    searchSection: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    input: { flex: 1, backgroundColor: 'white', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb' },
    scanBtn: { backgroundColor: '#8b5cf6', width: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

    auditCard: { backgroundColor: 'white', padding: 20, borderRadius: 16, elevation: 3 },
    prodName: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', color: '#1f2937' },
    prodCode: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginBottom: 20 },

    auditRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, gap: 10 },
    auditBox: { flex: 1, height: 100, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center', padding: 5 },

    boxLabel: { fontSize: 10, fontWeight: 'bold', color: '#6b7280', marginBottom: 5, textTransform: 'uppercase', textAlign: 'center' },
    boxValue: { fontSize: 28, fontWeight: '900' },
    qtyInput: { fontSize: 28, fontWeight: 'bold', color: '#111827', textAlign: 'center', width: '100%' },

    confirmBtn: { backgroundColor: '#8b5cf6', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 15 },
    confirmText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    warningText: { textAlign: 'center', fontSize: 11, color: '#6b7280' },

    closeCam: { position: 'absolute', top: 50, right: 25, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 25, padding: 5 }
});