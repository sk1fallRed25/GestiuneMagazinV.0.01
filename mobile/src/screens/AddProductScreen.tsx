import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity, Alert,
    ActivityIndicator, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '../lib/supabase';
import { X, Save, ScanLine, ArrowLeft, Globe } from 'lucide-react-native';

export default function AddProductScreen({ navigation }: any) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetchingInfo, setFetchingInfo] = useState(false);

    // --- STATE FORMULAR ---
    const [barcode, setBarcode] = useState('');
    const [nume, setNume] = useState('');
    const [categorie, setCategorie] = useState('');      // Categorie (NOU)
    const [subcategorie, setSubcategorie] = useState(''); // Subcategorie (NOU)
    const [pret, setPret] = useState('');
    const [stoc, setStoc] = useState('');

    // Valori Implicite
    const [tva, setTva] = useState('19');
    const [unitate, setUnitate] = useState('buc');

    // --- 1. SCANARE INTELIGENTĂ (RO) ---
    const handleBarCodeScanned = async ({ data }: { data: string }) => {
        setScanned(true);
        setBarcode(data);
        setFetchingInfo(true);

        try {
            // A. Verificăm duplicat în Supabase
            const { data: existing } = await supabase
                .from('produse')
                .select('nume')
                .eq('cod_bare', data)
                .single();

            if (existing) {
                setFetchingInfo(false);
                Alert.alert(
                    "Produs Existent",
                    `Acest produs este deja în stoc:\n"${existing.nume}"`,
                    [{ text: "Rescanează", onPress: () => { setScanned(false); setFetchingInfo(false); resetForm(); } }]
                );
                return;
            }

            // B. Căutăm pe Serverul ROMÂNESC OpenFoodFacts
            try {
                const response = await fetch(`https://ro.openfoodfacts.org/api/v0/product/${data}.json`);
                const json = await response.json();

                if (json.status === 1 && json.product) {
                    const p = json.product;

                    // 1. Nume
                    let numeFinal = p.product_name_ro || p.product_name || "";
                    if (p.brands && !numeFinal.toLowerCase().includes(p.brands.toLowerCase())) {
                        numeFinal = `${p.brands} ${numeFinal}`;
                    }
                    if (numeFinal) setNume(numeFinal);

                    // 2. Categorie și Subcategorie (Logic)
                    // API-ul returnează tag-uri ex: "en:beverages", "en:carbonated-drinks"
                    if (p.categories_tags && p.categories_tags.length > 0) {
                        const cleanTag = (tag: string) => {
                            if (!tag) return '';
                            // Ștergem prefixul de limbă (en:, ro:, fr:)
                            return tag.replace(/^[a-z]{2}:/, '').replace(/-/g, ' ');
                        };

                        // Setăm prima categorie găsită
                        const catRaw = cleanTag(p.categories_tags[0]);
                        setCategorie(catRaw.charAt(0).toUpperCase() + catRaw.slice(1));

                        // Dacă există a doua, o punem la subcategorie
                        if (p.categories_tags.length > 1) {
                            const subRaw = cleanTag(p.categories_tags[1]);
                            setSubcategorie(subRaw.charAt(0).toUpperCase() + subRaw.slice(1));
                        }
                    }

                    Alert.alert("Găsit!", `Am completat detaliile automat.`);
                }
            } catch (apiError) {
                console.log("Eroare API extern:", apiError);
            }

        } catch (err: any) {
            Alert.alert("Eroare", err.message);
        } finally {
            setFetchingInfo(false);
        }
    };

    // --- 2. SALVARE ---
    const handleSave = async () => {
        if (!nume || !pret || !stoc || !barcode) {
            Alert.alert("Date Incomplete", "Numele, Prețul și Stocul sunt obligatorii.");
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.from('produse').insert({
                nume: nume,
                cod_bare: barcode,
                categorie_principala: categorie || 'General', // Salvăm categoria
                categorie_secundara: subcategorie || 'Diverse', // Salvăm subcategoria
                pret_vanzare: parseFloat(pret),
                stoc_depozit: parseInt(stoc), // Se duce în depozit
                stoc_magazin: 0,
                // Valori default
                tva_procent: parseInt(tva),
                unitate_masura: unitate,
                stoc_minim_depozit: 5,
                prag_optim: 10
            });

            if (error) throw error;

            Alert.alert("Succes", "Produs adăugat!", [
                { text: "Adaugă Altul", onPress: resetForm },
                { text: "Înapoi la Dashboard", style: 'cancel', onPress: () => navigation.goBack() }
            ]);

        } catch (err: any) {
            Alert.alert("Eroare Salvare", err.message);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setScanned(false);
        setBarcode('');
        setNume('');
        setCategorie('');
        setSubcategorie('');
        setPret('');
        setStoc('');
        setTva('19');
        setUnitate('buc');
    };

    // --- UI ---
    if (!permission) return <View style={styles.center}><ActivityIndicator /></View>;
    if (!permission.granted) {
        return (
            <View style={styles.center}>
                <Text style={{marginBottom: 10}}>Camera necesară.</Text>
                <TouchableOpacity style={styles.btnPerm} onPress={requestPermission}>
                    <Text style={{color:'white'}}>Permite</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!scanned) {
        return (
            <View style={styles.cameraContainer}>
                <CameraView
                    style={StyleSheet.absoluteFillObject}
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                    barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "qr", "upc_a"] }}
                />
                <View style={styles.overlay}>
                    {fetchingInfo ? (
                        <View style={styles.loadingBox}>
                            <ActivityIndicator size="large" color="#2563eb" />
                            <Text style={{color:'white', marginTop:10}}>Se verifică produsul...</Text>
                        </View>
                    ) : (
                        <>
                            <Text style={styles.overlayText}>Scanează produsul</Text>
                            <View style={styles.scanFrame} />
                            <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
                                <X color="white" size={24} />
                                <Text style={styles.closeText}>Anulează</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => setScanned(false)} style={{flexDirection:'row', alignItems:'center'}}>
                        <ArrowLeft color="#374151" size={24} />
                        <Text style={styles.headerTitle}> Adăugare Rapidă</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.formContainer}>
                    <View style={styles.barcodeBox}>
                        <ScanLine color="#2563eb" size={24} />
                        <Text style={styles.barcodeText}>{barcode}</Text>
                    </View>

                    {/* Nume - Auto-completat */}
                    <View style={styles.inputGroup}>
                        <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                            <Text style={styles.label}>Nume Produs</Text>
                            {nume.length > 0 && <Globe size={14} color="green" />}
                        </View>
                        <TextInput style={styles.input} value={nume} onChangeText={setNume} placeholder="Nume Produs" />
                    </View>

                    {/* Categorie și Subcategorie - Noi */}
                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Categorie</Text>
                            <TextInput
                                style={styles.input}
                                value={categorie}
                                onChangeText={setCategorie}
                                placeholder="Ex: Băuturi"
                            />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Subcategorie</Text>
                            <TextInput
                                style={styles.input}
                                value={subcategorie}
                                onChangeText={setSubcategorie}
                                placeholder="Ex: Sucuri"
                            />
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Preț Vânzare (RON)</Text>
                            <TextInput style={styles.input} value={pret} onChangeText={setPret} keyboardType="numeric" placeholder="0.00" />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Stoc Depozit</Text>
                            <TextInput style={styles.input} value={stoc} onChangeText={setStoc} keyboardType="numeric" placeholder="0" />
                        </View>
                    </View>

                    <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
                        {loading ? <ActivityIndicator color="white" /> : (
                            <>
                                <Save color="white" size={20} />
                                <Text style={styles.saveText}>Salvează în Gestiune</Text>
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
    loadingBox: { alignItems:'center', justifyContent:'center', backgroundColor:'rgba(0,0,0,0.8)', padding:20, borderRadius:10 },
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