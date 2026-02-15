import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Modal,
    TextInput, Alert, ActivityIndicator, Keyboard, ScrollView
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '../lib/supabase';
import { ArrowLeft, X, Save, Barcode, AlertTriangle } from 'lucide-react-native';

export default function AdminQuickAddScreen({ navigation }) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);

    // Modal & Formular
    const [modalVisible, setModalVisible] = useState(false);
    const [formData, setFormData] = useState({
        id: null,
        nume: '',
        cod_bare: '',
        pret_vanzare: '',
        stoc_depozit: '0',
        stoc_magazin: '0'
    });

    useEffect(() => {
        if (!permission?.granted) requestPermission();
    }, []);

    const handleBarCodeScanned = async ({ data }) => {
        if (scanned) return;
        setScanned(true);
        setLoading(true);

        try {
            // Căutăm produsul în baza de date
            const { data: existing, error } = await supabase
                .from('produse')
                .select('*')
                .eq('cod_bare', data)
                .maybeSingle();

            if (existing) {
                // --- CAZ 1: PRODUS GĂSIT -> DESCHIDEM EDITAREA ---
                setFormData({
                    id: existing.id,
                    nume: existing.nume,
                    cod_bare: existing.cod_bare,
                    pret_vanzare: existing.pret_vanzare?.toString() || '0',
                    stoc_depozit: existing.stoc_depozit?.toString() || '0',
                    stoc_magazin: existing.stoc_magazin?.toString() || '0'
                });
                setModalVisible(true);
            } else {
                // --- CAZ 2: PRODUSUL NU EXISTĂ -> ALERTĂ ---
                Alert.alert(
                    "Produs Necunoscut",
                    "Acest produs nu există în gestiune.\n\nTe rog folosește butonul 'Adăugare Rapidă' (cel albastru) pentru a-l introduce în sistem.",
                    [
                        {
                            text: "OK",
                            onPress: () => setScanned(false) // Repornim scanarea după ce apasă OK
                        }
                    ]
                );
            }
        } catch (err) {
            Alert.alert("Eroare", "Nu s-a putut verifica codul de bare.");
            setScanned(false);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        // Această funcție face acum DOAR update, nu insert
        if (!formData.nume || !formData.pret_vanzare) {
            Alert.alert("Atenție", "Numele și Prețul sunt obligatorii.");
            return;
        }

        setLoading(true);
        try {
            // UPDATE EXCLUSIV
            const { error } = await supabase.from('produse').update({
                nume: formData.nume,
                pret_vanzare: parseFloat(formData.pret_vanzare),
                stoc_depozit: parseInt(formData.stoc_depozit),
                stoc_magazin: parseInt(formData.stoc_magazin)
            }).eq('id', formData.id);

            if (error) throw error;

            Alert.alert("Succes", "Informațiile au fost actualizate!");
            closeModal();
        } catch (err) {
            Alert.alert("Eroare", err.message);
        } finally {
            setLoading(false);
        }
    };

    const closeModal = () => {
        setModalVisible(false);
        setScanned(false); // Repornim scanarea
    };

    if (!permission) return <View />;
    if (!permission.granted) {
        return (
            <View style={styles.center}>
                <Text>Avem nevoie de permisiunea camerei.</Text>
                <TouchableOpacity onPress={requestPermission} style={styles.btn}><Text style={{color:'white'}}>Permite</Text></TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header Transparent */}
            <View style={styles.overlayHeader}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.overlayTitle}>Scanare Rapidă</Text>
            </View>

            <CameraView
                style={StyleSheet.absoluteFill}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            />

            {/* Cadran Scanare */}
            <View style={styles.scanOverlay}>
                <View style={styles.scanFrame} />
                <Text style={styles.scanText}>Încadrează codul de bare</Text>
                {loading && <ActivityIndicator size="large" color="white" style={{marginTop: 20}} />}
            </View>

            {/* --- MODAL EDITARE (DOAR DACĂ EXISTĂ) --- */}
            <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                DETALII PRODUS
                            </Text>
                            <TouchableOpacity onPress={closeModal}><X size={24} color="#374151" /></TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={{paddingBottom: 20}}>
                            <View style={styles.codeBox}>
                                <Barcode size={20} color="#4F46E5" />
                                <Text style={styles.codeText}>{formData.cod_bare}</Text>
                            </View>

                            <Text style={styles.label}>Denumire Produs</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.nume}
                                placeholder="Nume Produs"
                                onChangeText={t => setFormData({...formData, nume: t})}
                            />

                            <Text style={[styles.label, {color:'#059669', marginTop:10}]}>PREȚ VÂNZARE (RON)</Text>
                            <TextInput
                                style={[styles.input, styles.priceInput]}
                                value={formData.pret_vanzare}
                                keyboardType="numeric"
                                placeholder="0.00"
                                onChangeText={t => setFormData({...formData, pret_vanzare: t})}
                            />

                            <View style={{flexDirection:'row', gap:15, marginTop:15}}>
                                <View style={{flex:1}}>
                                    <Text style={styles.label}>Stoc Depozit</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={formData.stoc_depozit}
                                        keyboardType="numeric"
                                        onChangeText={t => setFormData({...formData, stoc_depozit: t})}
                                    />
                                </View>
                                <View style={{flex:1}}>
                                    <Text style={styles.label}>Stoc Raft</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={formData.stoc_magazin}
                                        keyboardType="numeric"
                                        onChangeText={t => setFormData({...formData, stoc_magazin: t})}
                                    />
                                </View>
                            </View>

                            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                                {loading ? <ActivityIndicator color="white" /> : (
                                    <>
                                        <Save size={20} color="white" />
                                        <Text style={styles.saveText}>ACTUALIZEAZĂ</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    btn: { backgroundColor: '#4F46E5', padding: 10, borderRadius: 5, marginTop: 10 },

    overlayHeader: { position: 'absolute', top: 50, left: 20, right: 20, zIndex: 10, flexDirection: 'row', alignItems: 'center', gap: 15 },
    backBtn: { backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 20 },
    overlayTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', textShadowColor: 'black', textShadowRadius: 5 },

    scanOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scanFrame: { width: 280, height: 280, borderWidth: 2, borderColor: '#4F46E5', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)' },
    scanText: { color: 'white', marginTop: 20, fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 8 },

    // Modal
    modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, height: '70%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '900', color: '#111827' },

    codeBox: { flexDirection: 'row', backgroundColor: '#e0e7ff', padding: 10, borderRadius: 8, alignItems: 'center', gap: 10, alignSelf: 'flex-start', marginBottom: 20 },
    codeText: { fontWeight: 'bold', color: '#374151' },

    label: { fontSize: 12, fontWeight: 'bold', color: '#6b7280', marginBottom: 5, textTransform: 'uppercase' },
    input: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 5 },
    priceInput: { borderColor: '#059669', borderWidth: 2, color: '#059669', fontWeight: 'bold', fontSize: 20 },

    saveBtn: { backgroundColor: '#4F46E5', padding: 18, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 30 },
    saveText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});