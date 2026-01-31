import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { ArrowLeft, LogOut, User, Shield } from 'lucide-react-native';

export default function SettingsScreen({ navigation }: any) {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('Se încarcă...');

    useEffect(() => {
        async function getData() {
            const { data } = await supabase.auth.getUser();
            if (data.user) {
                setEmail(data.user.email || '');
                if (data.user.email === 'admin@magazin.ro') setRole('Administrator');
                else setRole('Utilizator');
            }
        }
        getData();
    }, []);

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) Alert.alert("Eroare", error.message);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ArrowLeft color="#374151" size={24} />
                </TouchableOpacity>
                <Text style={styles.title}>Setări Cont</Text>
                <View style={{width: 24}} />
            </View>

            <View style={styles.content}>
                <View style={styles.card}>
                    <View style={styles.row}>
                        <User color="#2563eb" size={24} />
                        <View>
                            <Text style={styles.label}>Email Conectat</Text>
                            <Text style={styles.value}>{email}</Text>
                        </View>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.row}>
                        <Shield color="#d97706" size={24} />
                        <View>
                            <Text style={styles.label}>Tip Cont</Text>
                            <Text style={styles.value}>{role}</Text>
                        </View>
                    </View>
                </View>

                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <LogOut color="#ef4444" size={20} />
                    <Text style={styles.logoutText}>Deconectare</Text>
                </TouchableOpacity>

                <Text style={styles.version}>Versiune Aplicație: 1.0.0</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    header: { padding: 20, backgroundColor: 'white', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 40 },
    title: { fontSize: 18, fontWeight: 'bold' },
    content: { padding: 20 },
    card: { backgroundColor: 'white', borderRadius: 12, padding: 20, marginBottom: 20 },
    row: { flexDirection: 'row', gap: 15, alignItems: 'center', marginVertical: 10 },
    label: { fontSize: 12, color: '#6b7280' },
    value: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
    divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 10 },
    logoutBtn: { flexDirection: 'row', backgroundColor: '#fee2e2', padding: 15, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 10 },
    logoutText: { color: '#ef4444', fontWeight: 'bold', fontSize: 16 },
    version: { textAlign: 'center', marginTop: 30, color: '#9ca3af', fontSize: 12 }
});