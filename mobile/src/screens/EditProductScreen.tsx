import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity, Alert,
    ActivityIndicator, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Save, ArrowLeft } from 'lucide-react-native';

export default function EditProductScreen({ route, navigation }: any) {
    const { product } = route.params;

    const [loading, setLoading] = useState(false);
    const [nume, setNume] = useState(product.nume);
    const [pret, setPret] = useState(product.pret_vanzare?.toString() || '');

    // FOLOSIM stoc_magazin
    const [stocMagazin, setStocMagazin] = useState(product.stoc_magazin?.toString() || '0');
    const [stocDepozit, setStocDepozit] = useState(product.stoc_depozit?.toString() || '0');

    const handleUpdate = async () => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('produse')
                .update({
                    nume: nume,
                    pret_vanzare: parseFloat(pret),
                    stoc_magazin: parseInt(stocMagazin), // <--- UPDATE CORECT
                    stoc_depozit: parseInt(stocDepozit)
                })
                .eq('id', product.id);

            if (error) throw error;
            navigation.goBack();
        } catch (err: any) {
            Alert.alert("Eroare", err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft color="#374151" size={24} /></TouchableOpacity>
                    <Text style={styles.headerTitle}>Editare Stocuri</Text>
                </View>

                <ScrollView contentContainerStyle={styles.formContainer}>
                    <Text style={styles.prodId}>Produs: {product.nume}</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Preț Vânzare (RON)</Text>
                        <TextInput style={styles.input} value={pret} onChangeText={setPret} keyboardType="numeric" />
                    </View>

                    <View style={styles.stockSection}>
                        <Text style={styles.sectionTitle}>Gestiune Stocuri</Text>

                        <View style={styles.row}>
                            <View style={{flex:1}}>
                                <Text style={[styles.label, {color:'#1e40af'}]}>🏠 Raft (Magazin)</Text>
                                <TextInput
                                    style={[styles.input, {backgroundColor:'#dbeafe', borderColor:'#93c5fd'}]}
                                    value={stocMagazin}
                                    onChangeText={setStocMagazin}
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={{flex:1}}>
                                <Text style={[styles.label, {color:'#92400e'}]}>🏭 Depozit (Spate)</Text>
                                <TextInput
                                    style={[styles.input, {backgroundColor:'#fef3c7', borderColor:'#fcd34d'}]}
                                    value={stocDepozit}
                                    onChangeText={setStocDepozit}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.saveButton} onPress={handleUpdate} disabled={loading}>
                        {loading ? <ActivityIndicator color="white" /> : (
                            <>
                                <Save color="white" size={20} />
                                <Text style={styles.saveText}>Salvează Modificările</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    header: { padding: 20, backgroundColor: 'white', flexDirection:'row', alignItems:'center', paddingTop: 40 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 15 },
    formContainer: { padding: 20 },
    prodId: { textAlign: 'center', fontSize: 18, fontWeight:'bold', marginBottom: 20 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 12, fontWeight: 'bold', color: '#6b7280', marginBottom: 5, textTransform: 'uppercase' },
    input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16 },
    row: { flexDirection: 'row', gap: 15 },
    stockSection: { backgroundColor:'white', padding:15, borderRadius:12, marginBottom:20 },
    sectionTitle: { fontWeight:'bold', marginBottom:15, fontSize:16 },
    saveButton: { backgroundColor: '#2563eb', padding: 18, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, elevation: 3 },
    saveText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});