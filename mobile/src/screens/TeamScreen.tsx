import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, ActivityIndicator,
    TouchableOpacity, Modal, Alert, Platform, ScrollView
} from 'react-native';
import { supabase } from '../lib/supabase';
import {
    ArrowLeft, User, XCircle, Shield, Briefcase, Truck,
    Building2, Hash, MapPin, Store, Clock
} from 'lucide-react-native';

type Utilizator = {
    id: number;
    nume: string;
    email: string;
    rol: string;
    aprobat: boolean;
    tip_cont: 'angajat' | 'furnizor';
    nume_firma?: string;
    cui?: string;
    adresa_firma?: string;
    cod_magazin?: string;
};

const AVAILABLE_ROLES = [
    { label: 'Admin', value: 'admin', icon: <Shield size={18} color="white"/>, color: '#dc2626' },
    { label: 'Gestionar', value: 'gestionar', icon: <Briefcase size={18} color="white"/>, color: '#2563eb' },
    { label: 'Casier', value: 'casier', icon: <User size={18} color="white"/>, color: '#059669' },
    { label: 'Agent', value: 'agent', icon: <User size={18} color="white"/>, color: '#d97706' },
    { label: 'Furnizor', value: 'furnizor', icon: <Truck size={18} color="white"/>, color: '#7c3aed' },
];

export default function TeamScreen({ navigation }: any) {
    const [activeUsers, setActiveUsers] = useState<Utilizator[]>([]);
    const [pendingUsers, setPendingUsers] = useState<Utilizator[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState<Utilizator | null>(null);
    const [selectedRole, setSelectedRole] = useState<string>('');

    const fetchTeam = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('utilizatori')
                .select('*')
                .order('id', { ascending: false });

            if (error) throw error;
            if (data) {
                setActiveUsers(data.filter((u: Utilizator) => u.aprobat === true));
                setPendingUsers(data.filter((u: Utilizator) => u.aprobat === false));
            }
        } catch (err: any) {
            console.log('Eroare fetch:', err.message);
        } finally {
            setLoading(false);
        }
    };

    const approveUser = async () => {
        if (!selectedUser || !selectedRole) {
            Alert.alert("Atenție", "Selectați un rol pentru aprobare.");
            return;
        }
        try {
            const { error } = await supabase
                .from('utilizatori')
                .update({ aprobat: true, rol: selectedRole })
                .eq('id', selectedUser.id);
            if (error) throw error;
            setModalVisible(false);
            fetchTeam();
        } catch (err: any) {
            Alert.alert("Eroare", err.message);
        }
    };

    useEffect(() => {
        fetchTeam();
        const channel = supabase.channel('team-updates').on('postgres_changes', { event: '*', schema: 'public', table: 'utilizatori' }, fetchTeam).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    const renderPendingItem = (item: Utilizator) => {
        const isFurnizor = item.tip_cont === 'furnizor';
        return (
            <View key={item.id} style={[styles.card, styles.pendingCard, isFurnizor && styles.furnizorPendingBorder]}>
                <View style={styles.infoContainer}>
                    <View style={styles.cardHeader}>
                        <Text style={[styles.name, { color: isFurnizor ? '#7c3aed' : '#d97706' }]}>{item.nume || 'Utilizator Nou'}</Text>
                        <View style={[styles.typeBadge, { backgroundColor: isFurnizor ? '#7c3aed' : '#d97706' }]}>
                            <Text style={styles.typeBadgeText}>{isFurnizor ? 'FURNIZOR' : 'ANGAJAT'}</Text>
                        </View>
                    </View>
                    <Text style={styles.subText}>{item.email}</Text>
                    {isFurnizor && (
                        <View style={styles.detailsBox}>
                            <View style={styles.detailRow}><Building2 size={12} color="#6b7280"/><Text style={styles.detailText}>{item.nume_firma}</Text></View>
                            <View style={styles.detailRow}><Hash size={12} color="#6b7280"/><Text style={styles.detailText}>CUI: {item.cui}</Text></View>
                        </View>
                    )}
                </View>
                <TouchableOpacity onPress={() => { setSelectedUser(item); setModalVisible(true); }} style={[styles.approveBtn, isFurnizor && {backgroundColor:'#7c3aed'}]}>
                    <Text style={styles.approveText}>Aprobă</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft size={24} color="#111827" /></TouchableOpacity>
                <Text style={styles.title}>Gestiune Acces</Text>
                <View style={{width: 24}} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* SECȚIUNEA CERERI - MEREU VIZIBILĂ */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>⚠️ Cereri în Așteptare</Text>
                    <View style={styles.pendingBoxContainer}>
                        {pendingUsers.length > 0 ? (
                            pendingUsers.map(u => renderPendingItem(u))
                        ) : (
                            <View style={styles.emptyPendingState}>
                                <Clock size={32} color="#9ca3af" />
                                <Text style={styles.emptyPendingText}>Nu există cereri noi momentan.</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* SECȚIUNEA ECHIPĂ ACTIVĂ */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>✅ Utilizatori Activi</Text>
                    {activeUsers.map(item => (
                        <View key={item.id} style={styles.card}>
                            <View style={styles.avatar}><Text style={styles.avatarText}>{item.nume?.[0] || 'U'}</Text></View>
                            <View style={styles.infoContainer}>
                                <Text style={styles.name}>{item.nume}</Text>
                                <Text style={styles.subText}>{item.rol.toUpperCase()}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>

            {/* MODAL ROL */}
            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Selectează Rolul</Text>
                        <View style={styles.rolesGrid}>
                            {AVAILABLE_ROLES.map(r => (
                                <TouchableOpacity key={r.value} onPress={() => setSelectedRole(r.value)} style={[styles.roleBtn, {backgroundColor: selectedRole === r.value ? r.color : '#f3f4f6'}]}>
                                    <Text style={{color: selectedRole === r.value ? 'white' : '#374151'}}>{r.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.btnCancel}><Text>Închide</Text></TouchableOpacity>
                            <TouchableOpacity onPress={approveUser} style={styles.btnConfirm}><Text style={{color:'white'}}>Confirmă</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#e5e7eb', paddingTop: Platform.OS === 'ios' ? 50 : 20 },
    title: { fontSize: 18, fontWeight: 'bold' },
    scrollContent: { padding: 16 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#6b7280', marginBottom: 12, textTransform: 'uppercase' },
    pendingBoxContainer: { backgroundColor: '#f3f4f6', borderRadius: 12, padding: 8, borderStyle: 'dashed', borderWidth: 1, borderColor: '#d1d5db' },
    emptyPendingState: { padding: 32, alignItems: 'center' },
    emptyPendingText: { marginTop: 8, color: '#9ca3af', fontSize: 14 },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 12, borderRadius: 10, marginBottom: 8, elevation: 1 },
    pendingCard: { borderLeftWidth: 4, borderLeftColor: '#d97706', backgroundColor: '#fffbeb' },
    furnizorPendingBorder: { borderLeftColor: '#7c3aed', backgroundColor: '#faf5ff' },
    infoContainer: { flex: 1, marginLeft: 12 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    name: { fontSize: 15, fontWeight: 'bold' },
    subText: { fontSize: 12, color: '#6b7280' },
    typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    typeBadgeText: { color: 'white', fontSize: 9, fontWeight: 'bold' },
    detailsBox: { marginTop: 4 },
    detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
    detailText: { fontSize: 11, marginLeft: 4, color: '#4b5563' },
    approveBtn: { backgroundColor: '#d97706', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
    approveText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e0e7ff', justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#4338ca', fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: 'white', borderRadius: 16, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
    rolesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
    roleBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, minWidth: '45%', alignItems: 'center' },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
    btnCancel: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 8 },
    btnConfirm: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#10b981', borderRadius: 8 }
});