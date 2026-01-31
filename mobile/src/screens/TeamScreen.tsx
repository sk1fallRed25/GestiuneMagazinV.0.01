import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, SafeAreaView, ActivityIndicator,
    TouchableOpacity, Modal, TextInput, Alert, Platform, KeyboardAvoidingView, ScrollView
} from 'react-native';
import { supabase } from '../lib/supabase';
import { ArrowLeft, User, Phone, Briefcase, Plus, X, Trash2, Mail } from 'lucide-react-native';

// Model adaptat exact la tabela ta 'Utilizatori'
type Utilizator = {
    id: number;
    nume: string;
    email: string;
    rol: string;
    telefon?: string; // Poate fi null la început
    aprobat: boolean; // Folosim 'aprobat' în loc de 'activ'
};

export default function TeamScreen({ navigation }: any) {
    const [team, setTeam] = useState<Utilizator[]>([]);
    const [loading, setLoading] = useState(true);

    // State Formular
    const [modalVisible, setModalVisible] = useState(false);
    const [newNume, setNewNume] = useState('');
    const [newEmail, setNewEmail] = useState(''); // Necesar pentru tabela ta
    const [newRol, setNewRol] = useState('');
    const [newTelefon, setNewTelefon] = useState('');

    // 1. Fetch Date
    const fetchTeam = async () => {
        try {
            // ATENȚIE: Verifică dacă tabela ta începe cu literă mare sau mică în Supabase
            // În poza ta apare 'Utilizatori' (cu U mare)
            const { data, error } = await supabase
                .from('Utilizatori')
                .select('*')
                .eq('aprobat', true) // Luăm doar userii aprobați (echivalent activi)
                .order('id', { ascending: true });

            if (error) {
                // Fallback: Dacă dă eroare, încercăm cu litera mică 'utilizatori'
                console.log("Încercare cu litera mică...", error.message);
                const retry = await supabase
                    .from('utilizatori')
                    .select('*')
                    .eq('aprobat', true);

                if (retry.data) setTeam(retry.data as Utilizator[]);
            } else if (data) {
                setTeam(data as Utilizator[]);
            }
        } catch (err) {
            console.log(err);
        } finally {
            setLoading(false);
        }
    };

    // 2. Adăugare Membru (User Nou)
    const addMember = async () => {
        if (!newNume || !newEmail || !newRol) {
            Alert.alert('Lipsesc date', 'Numele, Email-ul și Rolul sunt obligatorii.');
            return;
        }

        try {
            // Inserăm în tabela Utilizatori
            // OBS: Punem o parolă default '123456' pentru că probabil coloana e NOT NULL
            const table = 'Utilizatori'; // Sau 'utilizatori'

            const payload = {
                nume: newNume,
                email: newEmail,
                rol: newRol,
                telefon: newTelefon,
                parola: '123456', // Parolă temporară
                aprobat: true,
                data_inregistrare: new Date().toISOString()
            };

            const { error } = await supabase.from(table).insert([payload]);

            if (error) throw error;

            Alert.alert('Succes', 'Utilizator creat! Parola implicită: 123456');
            setModalVisible(false);
            resetForm();
            fetchTeam(); // Refresh manual
        } catch (error: any) {
            Alert.alert('Eroare', error.message);
        }
    };

    // 3. Dezactivare (Soft Delete)
    const deactivateMember = async (id: number) => {
        Alert.alert(
            "Confirmare",
            "Ești sigur că vrei să dezactivezi acest membru?",
            [
                { text: "Nu", style: "cancel" },
                {
                    text: "Da",
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Setăm aprobat = false
                            const { error } = await supabase
                                .from('Utilizatori') // Verifică litera mare/mică
                                .update({ aprobat: false })
                                .eq('id', id);

                            if (error) throw error;
                            fetchTeam();
                        } catch (err: any) {
                            Alert.alert("Eroare", err.message);
                        }
                    }
                }
            ]
        );
    };

    const resetForm = () => {
        setNewNume('');
        setNewEmail('');
        setNewRol('');
        setNewTelefon('');
    };

    useEffect(() => {
        fetchTeam();
    }, []);

    // Randare Card Angajat
    const renderItem = ({ item }: { item: Utilizator }) => (
        <View style={styles.card}>
            <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                    {item.nume ? item.nume.charAt(0).toUpperCase() : 'U'}
                </Text>
            </View>

            <View style={styles.infoContainer}>
                <Text style={styles.name}>{item.nume}</Text>

                <View style={styles.rowInfo}>
                    <Briefcase size={14} color="#6B7280" />
                    <Text style={styles.role}>{item.rol}</Text>
                </View>

                {item.email ? (
                    <View style={styles.rowInfo}>
                        <Mail size={14} color="#6B7280" />
                        <Text style={styles.detailsText}>{item.email}</Text>
                    </View>
                ) : null}

                {item.telefon ? (
                    <View style={styles.rowInfo}>
                        <Phone size={14} color="#6B7280" />
                        <Text style={styles.detailsText}>{item.telefon}</Text>
                    </View>
                ) : null}
            </View>

            <TouchableOpacity onPress={() => deactivateMember(item.id)} style={styles.deleteBtn}>
                <Trash2 size={20} color="#EF4444" />
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.title}>Echipa</Text>
                <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn}>
                    <Plus size={24} color="#FFF" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={team}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>Nu există utilizatori activi.</Text>
                    }
                />
            )}

            {/* Modal Adăugare */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Adaugă Coleg</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            <Text style={styles.label}>Nume</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ex: Ion Popescu"
                                value={newNume}
                                onChangeText={setNewNume}
                            />

                            <Text style={styles.label}>Email (Login)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ex: ion@test.com"
                                value={newEmail}
                                onChangeText={setNewEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />

                            <Text style={styles.label}>Rol</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ex: vanzatori / gestionari"
                                value={newRol}
                                onChangeText={setNewRol}
                                autoCapitalize="none"
                            />

                            <Text style={styles.label}>Telefon (Opțional)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="07xx xxx xxx"
                                value={newTelefon}
                                onChangeText={setNewTelefon}
                                keyboardType="phone-pad"
                            />

                            <TouchableOpacity style={styles.saveBtn} onPress={addMember}>
                                <Text style={styles.saveBtnText}>Salvează Utilizator</Text>
                            </TouchableOpacity>

                            <Text style={styles.hintText}>* Parola implicită va fi: 123456</Text>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 20, backgroundColor: '#FFF', paddingTop: Platform.OS === 'android' ? 40 : 20
    },
    backBtn: { padding: 5 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
    addBtn: { backgroundColor: '#4F46E5', padding: 8, borderRadius: 8 },

    listContent: { padding: 16 },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#9CA3AF' },

    card: {
        backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12,
        flexDirection: 'row', alignItems: 'center',
        shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
    },
    avatarContainer: {
        width: 48, height: 48, borderRadius: 24, backgroundColor: '#EEF2FF',
        justifyContent: 'center', alignItems: 'center', marginRight: 16
    },
    avatarText: { fontSize: 20, fontWeight: 'bold', color: '#4F46E5' },
    infoContainer: { flex: 1 },
    name: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
    rowInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
    role: { fontSize: 13, color: '#4B5563', marginLeft: 6, fontWeight:'500' },
    detailsText: { fontSize: 13, color: '#6B7280', marginLeft: 6 },
    deleteBtn: { padding: 8 },

    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, height: '70%'
    },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20
    },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    label: { fontSize: 14, fontWeight:'600', color:'#374151', marginBottom:5, marginTop: 10},
    input: {
        backgroundColor: '#F3F4F6', borderRadius: 8, padding: 12,
        fontSize: 16, color: '#1F2937'
    },
    saveBtn: {
        backgroundColor: '#4F46E5', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 25
    },
    saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
    hintText: { textAlign:'center', marginTop: 10, color:'#9CA3AF', fontSize: 12 }
});