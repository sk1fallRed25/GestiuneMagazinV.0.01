import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
    ScrollView, ActivityIndicator, Dimensions, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import {
    LogOut, Package, ClipboardCheck, SearchCheck,
    AlertOctagon, ClipboardList, Settings, UserCircle,
    Users, Truck, BarChart3, FileWarning, ScrollText, ScanBarcode
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }) {
    const [userData, setUserData] = useState({ email: '', role: '', name: '' });
    const [loading, setLoading] = useState(true);

    // --- 1. ÎNCĂRCARE PROFIL ---
    useFocusEffect(
        useCallback(() => {
            fetchUserProfile();
        }, [])
    );

    const fetchUserProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from('utilizatori')
                    .select('rol, nume')
                    .eq('id', user.id)
                    .maybeSingle();

                setUserData({
                    email: user.email,
                    role: data?.rol || 'gestionar',
                    name: data?.nume || user.email.split('@')[0]
                });
            }
        } catch (error) {
            console.error("Eroare profil:", error.message);
        } finally {
            setLoading(false);
        }
    };

    const isAdmin = userData.role === 'admin';

    // --- 2. NOTIFICĂRI ADMIN (Realtime) ---
    useEffect(() => {
        if (!isAdmin) return;

        const channel = supabase.channel('dashboard-alerts')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'receptii' },
                async (payload) => {
                    let providerName = 'Necunoscut';
                    try {
                        const { data } = await supabase
                            .from('furnizori')
                            .select('nume')
                            .eq('id', payload.new.furnizor_id)
                            .single();
                        if (data) providerName = data.nume;
                    } catch (e) {}

                    Alert.alert(
                        "📦 Recepție Nouă!",
                        `S-a finalizat o recepție.\n\nFurnizor: ${providerName}\nFactura: ${payload.new.serie_factura || ''} ${payload.new.numar_factura}`,
                        [
                            { text: "Vezi Istoric", onPress: () => navigation.navigate('ReceiptsHistoryScreen') },
                            { text: "OK" }
                        ]
                    );
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [isAdmin]);

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4F46E5" /></View>;

    return (
        <SafeAreaView style={styles.container}>
            {/* HEADER */}
            <View style={styles.header}>
                <View style={styles.userInfo}>
                    <View style={styles.avatar}>
                        <UserCircle size={32} color={isAdmin ? "#4F46E5" : "#059669"} />
                    </View>
                    <View>
                        <Text style={styles.welcomeText}>Bine ai venit,</Text>
                        <Text style={styles.userName}>{userData.name}</Text>
                        <View style={[styles.badge, { backgroundColor: isAdmin ? '#4F46E5' : '#059669' }]}>
                            <Text style={styles.badgeText}>{userData.role.toUpperCase()}</Text>
                        </View>
                    </View>
                </View>
                <TouchableOpacity onPress={() => supabase.auth.signOut()} style={styles.logoutBtn}>
                    <LogOut size={22} color="#ef4444" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* --- FLUX OPERAȚIONAL (GESTIONAR & ADMIN) --- */}
                <Text style={styles.sectionTitle}>Gestiune Depozit</Text>
                <View style={styles.grid}>

                    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('InventoryReceipt')}>
                        <View style={[styles.iconBox, { backgroundColor: '#d1fae5' }]}>
                            <ClipboardCheck size={32} color="#059669" />
                        </View>
                        <Text style={styles.cardTitle}>Recepție</Text>
                        <Text style={styles.cardSubtitle}>Intrare Marfă</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('StockCheckScreen')}>
                        <View style={[styles.iconBox, { backgroundColor: '#e0e7ff' }]}>
                            <SearchCheck size={32} color="#4338ca" />
                        </View>
                        <Text style={styles.cardTitle}>Verificare</Text>
                        <Text style={styles.cardSubtitle}>Transfer Raft</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ScrapScreen')}>
                        <View style={[styles.iconBox, { backgroundColor: '#fee2e2' }]}>
                            <AlertOctagon size={32} color="#dc2626" />
                        </View>
                        <Text style={styles.cardTitle}>Pierderi</Text>
                        <Text style={styles.cardSubtitle}>Deteriorate</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('InventoryAuditScreen')}>
                        <View style={[styles.iconBox, { backgroundColor: '#f3e8ff' }]}>
                            <ClipboardList size={32} color="#7c3aed" />
                        </View>
                        <Text style={styles.cardTitle}>Inventar</Text>
                        <Text style={styles.cardSubtitle}>Corecție Stoc</Text>
                    </TouchableOpacity>

                </View>

                {/* --- ZONA ADMIN --- */}
                {isAdmin && (
                    <View style={styles.adminSection}>
                        <Text style={styles.sectionTitle}>Panou Administrator</Text>
                        <View style={styles.grid}>

                            {/* BUTON NOU: SCANARE RAPIDĂ */}
                            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('AdminQuickAddScreen')}>
                                <View style={[styles.iconBox, { backgroundColor: '#e0e7ff' }]}>
                                    <ScanBarcode size={28} color="#4F46E5" />
                                </View>
                                <Text style={styles.cardTitle}>Scanare Rapidă</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ProductsList')}>
                                <View style={[styles.iconBox, { backgroundColor: '#f1f5f9' }]}>
                                    <Package size={28} color="#475569" />
                                </View>
                                <Text style={styles.cardTitle}>Listă Produse</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ReportsScreen')}>
                                <View style={[styles.iconBox, { backgroundColor: '#dcfce7' }]}>
                                    <BarChart3 size={28} color="#15803d" />
                                </View>
                                <Text style={styles.cardTitle}>Rapoarte</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ReceiptsHistoryScreen')}>
                                <View style={[styles.iconBox, { backgroundColor: '#ffedd5' }]}>
                                    <ScrollText size={28} color="#ea580c" />
                                </View>
                                <Text style={styles.cardTitle}>Istoric Recepții</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('AdminLogsScreen')}>
                                <View style={[styles.iconBox, { backgroundColor: '#fee2e2' }]}>
                                    <FileWarning size={28} color="#dc2626" />
                                </View>
                                <Text style={styles.cardTitle}>Jurnal Probleme</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('TeamScreen')}>
                                <View style={[styles.iconBox, { backgroundColor: '#fef3c7' }]}>
                                    <Users size={28} color="#d97706" />
                                </View>
                                <Text style={styles.cardTitle}>Echipă</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('SupplierScreens')}>
                                <View style={[styles.iconBox, { backgroundColor: '#ccfbf1' }]}>
                                    <Truck size={28} color="#0d9488" />
                                </View>
                                <Text style={styles.cardTitle}>Furnizori</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('SettingsScreen')}>
                                <View style={[styles.iconBox, { backgroundColor: '#f1f5f9' }]}>
                                    <Settings size={28} color="#475569" />
                                </View>
                                <Text style={styles.cardTitle}>Setări</Text>
                            </TouchableOpacity>

                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: {
        padding: 20, backgroundColor: 'white', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        borderBottomWidth: 1, borderColor: '#e2e8f0', elevation: 2
    },
    userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 45, height: 45, borderRadius: 25, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
    welcomeText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
    userName: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 4, alignSelf: 'flex-start' },
    badgeText: { color: 'white', fontSize: 10, fontWeight: '800' },
    logoutBtn: { padding: 10, backgroundColor: '#fff1f2', borderRadius: 12 },

    scrollContent: { padding: 20, paddingBottom: 50 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 15, marginTop: 10, marginLeft: 5 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },

    card: {
        width: (width - 55) / 2,
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 20,
        marginBottom: 15,
        alignItems: 'center',
        borderWidth: 1, borderColor: '#f1f5f9',
        shadowColor: '#64748b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2
    },
    iconBox: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#334155', textAlign: 'center' },
    cardSubtitle: { fontSize: 11, color: '#94a3b8', marginTop: 2, textAlign: 'center' },

    adminSection: { marginTop: 20, paddingTop: 10, borderTopWidth: 1, borderColor: '#e2e8f0' }
});