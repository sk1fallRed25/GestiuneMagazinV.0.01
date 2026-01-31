import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '../lib/supabase';
import { X, ScanLine, CheckCircle2, AlertCircle, Home } from 'lucide-react-native';

export default function PriceCheckScreen({ navigation }: any) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);
    const [product, setProduct] = useState<any>(null);
    const [notFound, setNotFound] = useState(false);

    if (!permission?.granted) {
        return (
            <View style={styles.center}>
                <Text style={{marginBottom:20, fontSize:16}}>Avem nevoie de cameră.</Text>
                <TouchableOpacity style={styles.btnPerm} onPress={requestPermission}>
                    <Text style={{ color: 'white', fontWeight:'bold' }}>Permite Accesul</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{marginTop:20}} onPress={() => navigation.goBack()}>
                    <Text style={{color:'#6b7280'}}>Anulează</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleBarCodeScanned = async ({ data }: { data: string }) => {
        setScanned(true);
        setLoading(true);
        setNotFound(false);
        try {
            const { data: foundProduct, error } = await supabase
                .from('produse')
                .select('*')
                .eq('cod_bare', data)
                .single();

            if (foundProduct) setProduct(foundProduct);
            else setNotFound(true);
        } catch (err) {
            setNotFound(true);
        } finally {
            setLoading(false);
        }
    };

    const resetScan = () => { setScanned(false); setProduct(null); setNotFound(false); };
    const goHome = () => navigation.navigate('DashboardScreen');

    if (!scanned) {
        return (
            <View style={styles.container}>
                <CameraView style={StyleSheet.absoluteFillObject} onBarcodeScanned={handleBarCodeScanned} />
                <SafeAreaView style={styles.overlayHeader}>
                    <TouchableOpacity onPress={goHome} style={styles.closeBtn}><X color="white" size={28} /></TouchableOpacity>
                    <Text style={styles.overlayTitle}>Verificator Preț</Text>
                </SafeAreaView>
                <View style={styles.scanGuide}>
                    <ScanLine color="white" size={200} />
                    <Text style={styles.guideText}>Încadrează codul de bare</Text>
                </View>
            </View>
        );
    }

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

    if (product) {
        // CALCUL TOTAL
        const total = (product.stoc_magazin || 0) + (product.stoc_depozit || 0);
        return (
            <SafeAreaView style={[styles.resultContainer, { backgroundColor: '#f0fdf4' }]}>
                <View style={styles.contentCard}>
                    <CheckCircle2 size={50} color="#16a34a" style={{ marginBottom: 10 }} />
                    <Text style={styles.productName}>{product.nume}</Text>
                    <Text style={styles.priceText}>{product.pret_vanzare} RON</Text>
                    <View style={styles.divider} />

                    <View style={{flexDirection:'row', gap:10, width:'100%', marginBottom: 10}}>
                        <View style={[styles.stockBox, {backgroundColor:'#dbeafe'}]}>
                            <Text style={styles.stockLabel}>RAFT</Text>
                            <Text style={[styles.stockValue, {color:'#1e40af'}]}>{product.stoc_magazin}</Text>
                        </View>
                        <View style={[styles.stockBox, {backgroundColor:'#fef3c7'}]}>
                            <Text style={styles.stockLabel}>DEPOZIT</Text>
                            <Text style={[styles.stockValue, {color:'#92400e'}]}>{product.stoc_depozit}</Text>
                        </View>
                    </View>

                    <Text style={{fontWeight:'bold', fontSize:16}}>Total: {total} {product.unitate_masura}</Text>
                    <Text style={styles.barcodeText}>Cod: {product.cod_bare}</Text>
                </View>

                <TouchableOpacity style={styles.primaryBtn} onPress={resetScan}>
                    <ScanLine color="white" size={20} />
                    <Text style={styles.btnTextWhite}>Scanează Următorul</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryBtn} onPress={goHome}>
                    <Home color="#4b5563" size={20} />
                    <Text style={styles.btnTextGray}>Meniu Principal</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.resultContainer, { backgroundColor: '#fef2f2' }]}>
            <View style={styles.contentCard}>
                <AlertCircle size={64} color="#dc2626" />
                <Text style={[styles.productName, { color: '#dc2626', marginTop:10 }]}>Produs Necunoscut</Text>
                <Text style={{textAlign:'center', color:'#6b7280', marginTop:5}}>Acest cod nu există.</Text>
            </View>
            <TouchableOpacity style={[styles.primaryBtn, {backgroundColor:'#dc2626'}]} onPress={resetScan}>
                <ScanLine color="white" size={20} />
                <Text style={styles.btnTextWhite}>Încearcă din nou</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={goHome}>
                <Home color="#4b5563" size={20} />
                <Text style={styles.btnTextGray}>Meniu Principal</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' },
    btnPerm: { backgroundColor: '#2563eb', padding: 15, borderRadius: 10 },
    overlayHeader: { position: 'absolute', top: 0, left: 0, padding: 20, flexDirection: 'row', alignItems: 'center', marginTop:20 },
    closeBtn: { padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
    overlayTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginLeft: 20 },
    scanGuide: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    guideText: { color: 'white', marginTop: 20, fontSize: 18, fontWeight: 'bold' },
    resultContainer: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' },
    contentCard: { backgroundColor: 'white', width: '100%', borderRadius: 20, padding: 25, alignItems: 'center', elevation: 5 },
    productName: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 5 },
    priceText: { fontSize: 40, fontWeight: '900', color: '#2563eb' },
    divider: { width: '100%', height: 1, backgroundColor: '#e5e7eb', marginVertical: 15 },
    barcodeText: { marginTop: 15, color: '#9ca3af', fontSize: 12 },
    stockBox: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center', justifyContent:'center' },
    stockLabel: { fontSize: 10, fontWeight:'bold', marginBottom: 5, opacity: 0.7 },
    stockValue: { fontSize: 22, fontWeight: 'bold' },
    primaryBtn: { marginTop: 30, backgroundColor: '#2563eb', width: '100%', paddingVertical: 16, borderRadius: 12, flexDirection:'row', justifyContent:'center', alignItems:'center', gap: 10, elevation: 3 },
    btnTextWhite: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    secondaryBtn: { marginTop: 15, backgroundColor: 'white', width: '100%', paddingVertical: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    btnTextGray: { color: '#4b5563', fontSize: 16, fontWeight: '600' }
});