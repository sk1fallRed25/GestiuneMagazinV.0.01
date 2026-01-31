import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar,
    ScrollView, Alert, ActivityIndicator, Platform // ✅ IMPORT CORECTAT
} from 'react-native';
import { supabase } from '../lib/supabase';
import {
    LogOut, Package, Zap, BarChart3, Users, Settings, Search, Truck, ClipboardCheck
} from 'lucide-react-native';

export default function DashboardScreen({ navigation }: any) {
    const [userData, setUserData] = useState({ email: '', role: '' });
    const [loading, setLoading] = useState(true);
    const [pendingCount, setPendingCount] = useState(0); // ✅ BADGE PENTRU CERERI

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // 1. Preluare sesiune
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const email = user.email || '';
                let role = 'angajat';

                // 2. Verificare Admin de test
                if (email === 'admin@admin.com') {
                    role = 'admin';
                } else {
                    const { data: roleData } = await supabase
                        .from('user_roles')
                        .select('role')
                        .eq('user_id', user.id)
                        .single();
                    if (roleData) role = roleData.role;
                }

                setUserData({ email, role });

                // 3. ✅ VERIFICARE CERERI NOI (BADGE LIVE)
                if (role === 'admin') {
                    const { count, error } = await supabase
                        .from('utilizatori')
                        .select('*', { count: 'exact', head: true })
                        .eq('aprobat', false);

                    if (!error && count !== null) setPendingCount(count);
                }

            } catch (error) {
                console.log('Eroare dashboard:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();

        // ✅ REÎMPROSPĂTARE AUTOMATĂ DACĂ APAR CERERI NOI
        const subscription = supabase
            .channel('db-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'utilizatori' }, () => {
                fetchDashboardData();
            })
            .subscribe();

        return () => { supabase.removeChannel(subscription); };
    }, []);

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) Alert.alert("Eroare", error.message);
    };

    const ALL_MENU_ITEMS = [
        {
            title: "Adăugare Rapidă",
            subtitle: "Scanare & Intrare",
            icon: <Zap size={28} color="#d97706" />,
            bg: "#fef3c7",
            route: "AddProduct",
            adminOnly: false
        },
        {
            title: "Gestiune Stoc",
            subtitle: "Listă & Editare",
            icon: <Package size={28} color="#2563eb" />,
            bg: "#dbeafe",
            route: "ProductsList",
            adminOnly: false
        },
        {
            title: "Echipa & Acces",
            subtitle: "Aprobă Cereri",
            icon: <Users size={28} color="#db2777" />,
            bg: "#fce7f3",
            route: "Team",
            adminOnly: true,
            hasBadge: pendingCount > 0 // ✅ INDICATOR NOTIFICARE
        },
        {
            title: "Către Furnizor",
            subtitle: "Comenzi Noi",
            icon: <Truck size={28} color="#0891b2" />,
            bg: "#cffafe",
            route: "OutboundOrders",
            adminOnly: true
        },
        {
            title: "De la Furnizor",
            subtitle: "Recepție Marfă",
            icon: <ClipboardCheck size={28} color="#059669" />,
            bg: "#d1fae5",
            route: "InboundOrders",
            adminOnly: true
        },
        {
            title: "Verificator Preț",
            subtitle: "Check Rapid",
            icon: <Search size={28} color="#059669" />,
            bg: "#d1fae5",
            route: "PriceCheck",
            adminOnly: false
        },
        {
            title: "Rapoarte",
            subtitle: "Vânzări Azi",
            icon: <BarChart3 size={28} color="#7c3aed" />,
            bg: "#ede9fe",
            route: "Reports",
            adminOnly: false
        },
        {
            title: "Setări",
            subtitle: "Cont & App",
            icon: <Settings size={28} color="#4b5563" />,
            bg: "#f3f4f6",
            route: "Settings",
            adminOnly: false
        }
    ];

    const visibleMenuItems = ALL_MENU_ITEMS.filter(item => {
        if (userData.role === 'admin') return true;
        return !item.adminOnly;
    });

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#4F46E5" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="white" />

            <View style={styles.header}>
                <View>
                    <Text style={styles.welcomeText}>Sistem Gestiune,</Text>
                    <Text style={styles.userText}>
                        {userData.email.split('@')[0]}
                        <Text style={styles.roleText}> ({userData.role})</Text>
                    </Text>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                    <LogOut size={22} color="#ef4444" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.gridContainer}>
                {visibleMenuItems.map((item, index) => (
                    <TouchableOpacity
                        key={index}
                        style={styles.card}
                        onPress={() => item.route ? navigation.navigate(item.route) : null}
                    >
                        <View style={[styles.iconCircle, { backgroundColor: item.bg }]}>
                            {item.icon}
                        </View>

                        {/* ✅ BADGE NOTIFICARE */}
                        {item.hasBadge && (
                            <View style={styles.badgeCount}>
                                <Text style={styles.badgeTextCount}>{pendingCount}</Text>
                            </View>
                        )}

                        <Text style={styles.cardTitle}>{item.title}</Text>
                        <Text style={styles.cardSubtitle}>{item.subtitle}</Text>

                        {item.adminOnly && (
                            <View style={styles.adminBadge}>
                                <Text style={styles.adminBadgeText}>ADMIN</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        padding: 25,
        backgroundColor: 'white',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderColor: '#f3f4f6',
        marginTop: Platform.OS === 'android' ? 30 : 0
    },
    welcomeText: { color: '#6b7280', fontSize: 14 },
    userText: { color: '#111827', fontSize: 18, fontWeight: 'bold', textTransform: 'capitalize' },
    roleText: { fontSize: 12, color: '#4F46E5', fontWeight: 'normal' },
    logoutBtn: { padding: 10, backgroundColor: '#fee2e2', borderRadius: 12 },
    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', padding: 15, justifyContent: 'space-between' },
    card: {
        width: '48%',
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 20,
        marginBottom: 15,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5,
        position: 'relative'
    },
    iconCircle: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#1f2937', marginBottom: 2, textAlign: 'center' },
    cardSubtitle: { fontSize: 10, color: '#9ca3af', textAlign: 'center' },
    adminBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 4
    },
    adminBadgeText: { fontSize: 7, color: '#6b7280', fontWeight: 'bold' },
    // ✅ STILURI BADGE
    badgeCount: {
        position: 'absolute',
        top: 15,
        right: 35,
        backgroundColor: '#ef4444',
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'white'
    },
    badgeTextCount: { color: 'white', fontSize: 10, fontWeight: 'bold' }
});