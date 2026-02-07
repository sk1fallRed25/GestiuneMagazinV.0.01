import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, Alert, SafeAreaView
} from 'react-native';
import { supabase } from '../lib/supabase';
import { User, Shield, Trash2, Mail, UserPlus } from 'lucide-react-native';

export default function TeamScreen({ navigation }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTeam();
    }, []);

    const fetchTeam = async () => {
        try {
            // Luăm toți utilizatorii din tabelul public 'utilizatori'
            const { data, error } = await supabase
                .from('utilizatori')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error("Eroare la incarcare echipa:", error.message);
            Alert.alert("Eroare", "Nu am putut încărca lista de utilizatori.");
        } finally {
            setLoading(false);
        }
    };

    const deleteUser = async (userId, userName) => {
        Alert.alert(
            "Ștergere Utilizator",
            `Ești sigur că vrei să ștergi accesul pentru ${userName}?`,
            [
                { text: "Anulează", style: "cancel" },
                {
                    text: "DA, Șterge",
                    style: "destructive",
                    onPress: async () => {
                        // Ștergem doar din tabelul public (accesul în app).
                        // Ștergerea din Auth (login efectiv) necesită funcții speciale de admin server-side,
                        // dar ștergerea de aici îi va bloca accesul la date datorită RLS.
                        const { error } = await supabase.from('utilizatori').delete().eq('id', userId);
                        if (error) {
                            Alert.alert("Eroare", error.message);
                        } else {
                            fetchTeam(); // Reîmprospătăm lista
                        }
                    }
                }
            ]
        );
    };

    const renderUserItem = ({ item }) => {
        const isAdmin = item.rol === 'admin';

        return (
            <View style={styles.card}>
                <View style={styles.avatarBox}>
                    {isAdmin ? <Shield size={24} color="#4F46E5" /> : <User size={24} color="#059669" />}
                </View>

                <View style={styles.infoBox}>
                    <Text style={styles.nameText}>{item.nume || 'Utilizator Fără Nume'}</Text>
                    <View style={styles.row}>
                        <Mail size={12} color="#6b7280" />
                        <Text style={styles.emailText}>{item.email}</Text>
                    </View>
                    <View style={[styles.badge, isAdmin ? styles.badgeAdmin : styles.badgeUser]}>
                        <Text style={[styles.badgeText, isAdmin ? {color:'#4F46E5'} : {color:'#059669'}]}>
                            {item.rol ? item.rol.toUpperCase() : 'GESTIONAR'}
                        </Text>
                    </View>
                </View>

                {/* Buton Ștergere (doar dacă nu e adminul curent - logică simplificată) */}
                <TouchableOpacity onPress={() => deleteUser(item.id, item.nume)} style={styles.deleteBtn}>
                    <Trash2 size={20} color="#ef4444" />
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {loading ? (
                <ActivityIndicator size="large" color="#4F46E5" style={{marginTop: 50}} />
            ) : (
                <FlatList
                    data={users}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderUserItem}
                    contentContainerStyle={{ padding: 20 }}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>Nu există alți utilizatori în echipă.</Text>
                    }
                />
            )}

            {/* Buton plutitor pentru adăugare user (opțional, te duce la Register) */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => {
                    Alert.alert("Info", "Pentru a adăuga un membru nou, acesta trebuie să își creeze cont din ecranul de start (Register), iar tu îl vei vedea aici.");
                }}
            >
                <UserPlus size={24} color="white" />
                <Text style={styles.fabText}>Adaugă</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    card: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
        padding: 15, borderRadius: 12, marginBottom: 12,
        elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5
    },
    avatarBox: {
        width: 50, height: 50, borderRadius: 25, backgroundColor: '#f1f5f9',
        justifyContent: 'center', alignItems: 'center', marginRight: 15
    },
    infoBox: { flex: 1 },
    nameText: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
    emailText: { fontSize: 12, color: '#6b7280' },

    badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 5 },
    badgeAdmin: { backgroundColor: '#e0e7ff' },
    badgeUser: { backgroundColor: '#d1fae5' },
    badgeText: { fontSize: 10, fontWeight: 'bold' },

    deleteBtn: { padding: 10 },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#9ca3af' },

    fab: {
        position: 'absolute', bottom: 30, right: 20,
        backgroundColor: '#4F46E5', flexDirection: 'row', alignItems: 'center',
        paddingVertical: 12, paddingHorizontal: 20, borderRadius: 30,
        elevation: 4, gap: 8
    },
    fabText: { color: 'white', fontWeight: 'bold' }
});