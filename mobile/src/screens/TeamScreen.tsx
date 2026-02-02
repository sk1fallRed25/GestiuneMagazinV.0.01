import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, SafeAreaView } from 'react-native';
import { supabase } from '../lib/supabase';
import { UserCheck, UserX, Shield, Trash2, ArrowLeft } from 'lucide-react-native';

export default function TeamScreen({ navigation }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchTeam(); }, []);

    const fetchTeam = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('utilizatori').select('*').order('created_at', { ascending: false });
        if (!error) setUsers(data);
        setLoading(false);
    };

    const toggleApprove = async (id, currentStatus) => {
        const { error } = await supabase.from('utilizatori').update({ aprobat: !currentStatus }).eq('id', id);
        if (!error) fetchTeam();
    };

    const toggleRole = async (id, currentRole) => {
        const newRole = currentRole === 'admin' ? 'gestionar' : 'admin';
        const { error } = await supabase.from('utilizatori').update({ rol: newRole }).eq('id', id);
        if (!error) fetchTeam();
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={{flex: 1}}>
                <Text style={styles.name}>{item.nume || 'Utilizator Nou'}</Text>
                <Text style={styles.email}>{item.email}</Text>
                <View style={{flexDirection: 'row', gap: 5, marginTop: 5}}>
                    <View style={[styles.badge, { backgroundColor: item.rol === 'admin' ? '#4F46E5' : '#6b7280' }]}>
                        <Text style={styles.badgeText}>{item.rol.toUpperCase()}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: item.aprobat ? '#059669' : '#dc2626' }]}>
                        <Text style={styles.badgeText}>{item.aprobat ? 'ACTIV' : 'PENDING'}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity onPress={() => toggleApprove(item.id, item.aprobat)} style={[styles.iconBtn, {backgroundColor: item.aprobat ? '#fee2e2' : '#dcfce7'}]}>
                    {item.aprobat ? <UserX size={20} color="#dc2626" /> : <UserCheck size={20} color="#166534" />}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => toggleRole(item.id, item.rol)} style={[styles.iconBtn, {backgroundColor: '#e0e7ff'}]}>
                    <Shield size={20} color="#4338ca" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft size={24} color="#1f2937" /></TouchableOpacity>
                <Text style={styles.title}>Gestionare Echipă</Text>
            </View>
            {loading ? <ActivityIndicator size="large" color="#4F46E5" style={{marginTop: 20}} /> :
                <FlatList
                    data={users}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{padding: 20}}
                />
            }
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: { padding: 20, backgroundColor: 'white', flexDirection: 'row', gap: 15, alignItems: 'center', elevation: 2 },
    title: { fontSize: 20, fontWeight: 'bold' },
    card: { backgroundColor: 'white', padding: 15, marginBottom: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', elevation: 1 },
    name: { fontWeight: 'bold', fontSize: 16 },
    email: { color: '#6b7280', fontSize: 12 },
    badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    actions: { flexDirection: 'row', gap: 10 },
    iconBtn: { padding: 10, borderRadius: 8 }
});