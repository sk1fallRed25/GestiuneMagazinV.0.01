import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity, Alert,
    ActivityIndicator, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Save, ArrowLeft, Trash2 } from 'lucide-react-native';

export default function EditProductScreen({ route, navigation }: any) {
    // Primim produsul selectat prin parametri
    const { product } = route.params;

    const [loading, setLoading] = useState(false);
    const [nume, setNume] = useState(product.nume);
    const [pret, setPret] = useState(product.pret_vanzare?.toString() || '');
    const [stoc, setStoc] = useState(product.stoc_curent?.toString() || '');
    const [categorie, setCategorie] = useState(product.categorie_principala || 'General');

    const handleUpdate = async () => {
        if (!nume || !pret || !stoc) {
            Alert.alert("Eroare", "Toate câmpurile sunt obligatorii.");
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from('produse')
                .update({
                    nume: nume,
                    pret_vanzare: parseFloat(pret),
                    stoc_curent: parseInt(stoc),
                    stoc_depozit: parseInt(stoc), // Păstrăm sincronizat
                    categorie_principala: categorie
                })
                .eq('id', product.id);

            if (error) throw error;

            Alert.alert("Succes", "Produsul a fost actualizat!", [
                { text: "OK", onPress: () => navigation.goBack() }
            ]);
        } catch (err: any) {
            Alert.alert("Eroare Actualizare", err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = () => {
        Alert.alert("Ștergere Produs", "Ești sigur că vrei să îl ștergi definitiv?", [
            { text: "Nu", style: "cancel" },
            {
                text: "Da, Șterge",
                style: 'destructive',
                onPress: async () => {
                    const { error } = await supabase.from('produse').delete().eq('id', product.id);
                    if (!error) navigation.goBack();
                    else Alert.alert("Eroare", error.message);
                }
            }
        ]);
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{flexDirection:'row', alignItems:'center'}}>
                        <ArrowLeft color="#374151" size={24} />
                        <Text style={styles.headerTitle}> Editare Produs</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
                        <Trash2 color="#ef4444" size={24} />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.formContainer}>
                    <Text style={styles.prodId}>COD BARE: {product.cod_bare}</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Nume Produs</Text>
                        <TextInput
                            style={styles.input}
                            value={nume}
                            onChangeText={setNume}
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Preț (RON)</Text>
                            <TextInput
                                style={styles.input}
                                value={pret}
                                onChangeText={setPret}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Stoc Curent</Text>
                            <TextInput
                                style={styles.input}
                                value={stoc}
                                onChangeText={setStoc}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Categorie</Text>
                        <TextInput
                            style={styles.input}
                            value={categorie}
                            onChangeText={setCategorie}
                        />
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
    header: { padding: 20, backgroundColor: 'white', flexDirection:'row', justifyContent:'space-between', alignItems:'center', borderBottomWidth: 1, borderColor: '#e5e7eb', paddingTop: Platform.OS === 'android' ? 40 : 20 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginLeft: 10 },
    deleteBtn: { padding: 5 },
    formContainer: { padding: 20 },
    prodId: { textAlign: 'center', color: '#9ca3af', marginBottom: 20, fontSize: 14, fontWeight:'bold', letterSpacing:1 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 12, fontWeight: 'bold', color: '#6b7280', marginBottom: 5, textTransform: 'uppercase' },
    input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16 },
    row: { flexDirection: 'row', gap: 15 },
    saveButton: { backgroundColor: '#2563eb', padding: 18, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 20, elevation: 3 },
    saveText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});