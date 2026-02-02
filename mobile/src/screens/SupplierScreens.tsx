import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, SafeAreaView, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, ArrowLeft, Building2 } from 'lucide-react-native';

export default function SupplierScreens({ navigation }) {
    const [suppliers, setSuppliers] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [newSupplier, setNewSupplier] = useState({ nume: '', cui: '', telefon: '' });

    useEffect(() => { fetchSuppliers(); }, []);

    const fetchSuppliers = async () => {
        const { data, error } = await supabase.from('furnizori').select('*').order('id', { ascending: false });
        if (!error) setSuppliers(data);
    };

    const addSupplier = async () => {
        if (!newSupplier.nume) return Alert.alert("Eroare", "Numele este obligatoriu.");
        const { error } = await supabase.from('furnizori').insert([newSupplier]);
        if (!error) {
            setModalVisible(false);
            setNewSupplier({ nume: '', cui: '', telefon: '' });
            fetchSuppliers();
        } else {
            Alert.alert("Eroare", error.message);
        }
    };

    const deleteSupplier = async (id) => {
        Alert.alert("Ștergere", "Sigur ștergi acest furnizor?", [
            { text: "Nu", style: "cancel" },
            { text: "Da", onPress: async () => {
                    await supabase.from('furnizori').delete().eq('id', id);
                    fetchSuppliers();
                }}
        ]);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft size={24} color="#1f2937" /></TouchableOpacity>
                <Text style={styles.title}>Furnizori</Text>
                <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn}><Plus size={24} color="white" /></TouchableOpacity>
            </View>

            <FlatList
                data={suppliers}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={{padding: 20}}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View style={styles.iconBox}><Building2 size={24} color="#ea580c" /></View>
                        <View style={{flex: 1, marginLeft: 15}}>
                            <Text style={styles.name}>{item.nume}</Text>
                            <Text style={styles.details}>CUI: {item.cui || '-'}</Text>
                            <Text style={styles.details}>Tel: {item.telefon || '-'}</Text>
                        </View>
                        <TouchableOpacity onPress={() => deleteSupplier(item.id)}><Trash2 size={20} color="#ef4444" /></TouchableOpacity>
                    </View>
                )}
            />

            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Furnizor Nou</Text>
                        <TextInput style={styles.input} placeholder="Nume Firmă" value={newSupplier.nume} onChangeText={t => setNewSupplier({...newSupplier, nume: t})} />
                        <TextInput style={styles.input} placeholder="CUI" value={newSupplier.cui} onChangeText={t => setNewSupplier({...newSupplier, cui: t})} />
                        <TextInput style={styles.input} placeholder="Telefon" value={newSupplier.telefon} onChangeText={t => setNewSupplier({...newSupplier, telefon: t})} />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.btnCancel} onPress={() => setModalVisible(false)}><Text>Anulează</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.btnSave} onPress={addSupplier}><Text style={{color: 'white'}}>Salvează</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: { padding: 20, backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 2 },
    title: { fontSize: 20, fontWeight: 'bold' },
    addBtn: { backgroundColor: '#ea580c', padding: 8, borderRadius: 8 },
    card: { backgroundColor: 'white', padding: 15, marginBottom: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', elevation: 1 },
    iconBox: { backgroundColor: '#ffedd5', padding: 10, borderRadius: 10 },
    name: { fontWeight: 'bold', fontSize: 16 },
    details: { color: '#6b7280', fontSize: 12 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: 'white', padding: 20, borderRadius: 15 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
    input: { backgroundColor: '#f3f4f6', padding: 12, borderRadius: 8, marginBottom: 10 },
    modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    btnCancel: { padding: 15 },
    btnSave: { backgroundColor: '#ea580c', padding: 15, borderRadius: 8 }
});