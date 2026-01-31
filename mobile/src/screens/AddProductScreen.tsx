import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity, Alert,
    ActivityIndicator, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '../lib/supabase';
import { X, Save, ScanLine, ArrowLeft } from 'lucide-react-native';

export default function AddProductScreen({ navigation }: any) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);

    // --- STATE FORMULAR ---
    const [barcode, setBarcode] = useState('');
    const [nume, setNume] = useState('');
    const [pret, setPret] = useState('');
    const [stoc, setStoc] = useState('');

    // Valori Implicite (Editable dacă vrei pe viitor)
    const [tva, setTva] = useState('19');
    const [unitate, setUnitate] = useState('buc');

    // --- 1. SCANARE ---
    const handleBarCodeScanned = async ({ data }: { data: string }) => {
        setScanned(true);
        setBarcode(data);

        // Verificăm rapid dacă există deja, ca să nu muncim degeaba
        const { data: existing } = await supabase
            .from('produse')
            .select('nume')
            .eq('cod_bare', data)
            .single();

        if (existing) {
            Alert.alert(
                "Produs Existent",
                `Acest cod de bare aparține produsului:\n"${existing.nume}"`,
                [{ text: "Rescanează", onPress: () => setScanned(false) }]
            );
        }
    };

    // --- 2. SALVARE ÎN SUPABASE ---
    const handleSave = async () => {
        // Validare simplă
        if (!nume || !pret || !stoc || !barcode) {
            Alert.alert("Date Incomplete", "Te rog completează Nume, Preț și Stoc.");
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.from('produse').insert({
                nume: nume,
                cod_bare: barcode,

                // Convertim string-urile din input în numere pentru DB
                pret_vanzare: parseFloat(pret),
                stoc_curent: parseInt(stoc),
                stoc_depozit: parseInt(stoc), // Inițial sunt egale

                // Detalii secundare
                tva_procent: parseInt(tva),
                unitate_masura: unitate,

                // Valori implicite (Hardcoded pentru Fast Add)
                stoc_minim_depozit: 5,
                prag_optim: 10,
                categorie_principala: 'General',
                categorie_secundara: 'Diverse'
            });

            if (error) throw error;

            // Succes
            Alert.alert("Succes", "Produs adăugat în sistem!", [
                {
                    text: "Adaugă Altul",
                    onPress: resetForm
                },
                {
                    text: "Înapoi la Dashboard",
                    style: 'cancel',
                    onPress: () => navigation.goBack()
                }
            ]);

        } catch (err: any) {
            Alert.alert("Eroare Salvare", err.message);
            console.log("Supabase Error:", err);
        } finally {
            setLoading(false);
        }
    };

    // --- 3. RESETARE FORMULAR ---
    const resetForm = () => {
        setScanned(false);
        setBarcode('');
        setNume('');
        setPret('');
        setStoc('');
        setTva('19');
        setUnitate('buc');
    };

    // --- PERMISIUNI ---
    if (!permission) return <View style={styles.center}><ActivityIndicator /></View>;
    if (!permission.granted) {
        return (
            <View style={styles.center}>
                <Text style={{marginBottom: 10, fontSize: 16}}>Camera este necesară pentru scanare.</Text>
                <TouchableOpacity style={styles.btnPerm} onPress={requestPermission}>
                    <Text style={{color:'white', fontWeight:'bold'}}>Permite Accesul</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // --- UI: MODUL 1 - CAMERA ---
    if (!scanned) {
        return (
            <View style={styles.cameraContainer}>
                <CameraView
                    style={StyleSheet.absoluteFillObject}
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                    barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "qr", "upc_a"] }}
                />
                <View style={styles.overlay}>
                    <Text style={styles.overlayText}>Scanează produsul nou</Text>
                    <View style={styles.scanFrame} />
                    <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
                        <X color="white" size={24} />
                        <Text style={styles.closeText}>Anulează</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // --- UI: MODUL 2 - FORMULAR ---
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

                {/* HEADER */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => setScanned(false)} style={{flexDirection:'row', alignItems:'center'}}>
                        <ArrowLeft color="#374151" size={24} />
                        <Text style={styles.headerTitle}> Detalii Produs</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.formContainer}>
                    {/* BARCODE READ-ONLY */}
                    <View style={styles.barcodeBox}>
                        <ScanLine color="#2563eb" size={24} />
                        <Text style={styles.barcodeText}>{barcode}</Text>
                    </View>

                    {/* INPUT NUME */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Nume Produs</Text>
                        <TextInput
                            style={styles.input}
                            value={nume}
                            onChangeText={setNume}
                            placeholder="Ex: Coca Cola 0.5L"
                            autoFocus={true}
                        />
                    </View>

                    {/* INPUTS ROW 1 */}
                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Preț Vânzare (RON)</Text>
                            <TextInput
                                style={styles.input}
                                value={pret}
                                onChangeText={setPret}
                                keyboardType="numeric"
                                placeholder="0.00"
                            />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Stoc Inițial</Text>
                            <TextInput
                                style={styles.input}
                                value={stoc}
                                onChangeText={setStoc}
                                keyboardType="numeric"
                                placeholder="0"
                            />
                        </View>
                    </View>

                    {/* INPUTS ROW 2 */}
                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>TVA (%)</Text>
                            <TextInput
                                style={styles.input}
                                value={tva}
                                onChangeText={setTva}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Unitate</Text>
                            <TextInput
                                style={styles.input}
                                value={unitate}
                                onChangeText={setUnitate}
                                placeholder="buc"
                            />
                        </View>
                    </View>

                    {/* BUTON SAVE */}
                    <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
                        {loading ? <ActivityIndicator color="white" /> : (
                            <>
                                <Save color="white" size={20} />
                                <Text style={styles.saveText}>Salvează Produs</Text>
                            </>
                        )}
                    </TouchableOpacity>

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    center: {flex:1, justifyContent:'center', alignItems:'center', padding:20},
    btnPerm: {backgroundColor:'#2563eb', padding:12, borderRadius:8},

    cameraContainer: { flex: 1, backgroundColor: 'black' },
    overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    overlayText: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 40 },
    scanFrame: { width: 280, height: 280, borderWidth: 2, borderColor: '#fff', borderRadius: 20 },
    closeBtn: { position: 'absolute', bottom: 50, flexDirection:'row', gap:10, backgroundColor:'#dc2626', padding:15, borderRadius:30 },
    closeText: { color:'white', fontWeight:'bold' },

    header: { padding: 20, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#e5e7eb', paddingTop: Platform.OS === 'android' ? 40 : 20 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginLeft: 10 },

    formContainer: { padding: 20 },
    barcodeBox: { flexDirection: 'row', backgroundColor: '#dbeafe', padding: 15, borderRadius: 10, alignItems: 'center', gap: 10, marginBottom: 20, justifyContent: 'center' },
    barcodeText: { fontSize: 18, fontWeight: 'bold', color: '#1e40af', letterSpacing: 1 },

    inputGroup: { marginBottom: 15 },
    label: { fontSize: 12, fontWeight: 'bold', color: '#6b7280', marginBottom: 5, textTransform: 'uppercase' },
    input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16 },

    row: { flexDirection: 'row', gap: 15 },

    saveButton: { backgroundColor: '#059669', padding: 18, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 10, elevation: 3 },
    saveText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});