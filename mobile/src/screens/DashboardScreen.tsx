import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, ScrollView, Alert
} from 'react-native';
import { supabase } from '../lib/supabase';
import {
    LogOut, Package, Zap, BarChart3, Users, Settings, Search
} from 'lucide-react-native';

export default function DashboardScreen({ navigation }: any) {
    const [userEmail, setUserEmail] = useState('');

    // Preluăm emailul utilizatorului la încărcare
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUserEmail(data.user?.email || 'Admin');
        });
    }, []);

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) Alert.alert("Eroare", error.message);
    };

    // --- CONFIGURAREA MENIULUI ---
    const MENU_ITEMS = [
        {
            title: "Adăugare Rapidă",
            subtitle: "Scanare & Intrare",
            icon: <Zap size={28} color="#d97706" />,
            bg: "#fef3c7",
            route: "AddProduct"
        },
        {
            title: "Gestiune Stoc",
            subtitle: "Listă & Editare",
            icon: <Package size={28} color="#2563eb" />,
            bg: "#dbeafe",
            route: "ProductsList"
        },
        {
            title: "Verificator Preț",
            subtitle: "Check Rapid",
            icon: <Search size={28} color="#059669" />,
            bg: "#d1fae5",
            route: "PriceCheck" // Conectat la PriceCheckScreen
        },
        {
            title: "Rapoarte",
            subtitle: "Vânzări Azi",
            icon: <BarChart3 size={28} color="#7c3aed" />,
            bg: "#ede9fe",
            route: "Reports"    // Conectat la ReportsScreen
        },
        {
            title: "Echipa",
            subtitle: "Utilizatori",
            icon: <Users size={28} color="#db2777" />,
            bg: "#fce7f3",
            route: null,
            action: () => Alert.alert("Info", "Gestionarea utilizatorilor este disponibilă doar în panoul Web.")
        },
        {
            title: "Setări",
            subtitle: "Cont & App",
            icon: <Settings size={28} color="#4b5563" />,
            bg: "#f3f4f6",
            route: "Settings"
        }
    ];

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="white" />

            {/* HEADER CU SALUT ȘI LOGOUT */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.welcomeText}>Bine ai venit,</Text>
                    <Text style={styles.userText}>
                        {userEmail.split('@')[0]}
                    </Text>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                    <LogOut size={22} color="#ef4444" />
                </TouchableOpacity>
            </View>

            {/* GRILA DE MENIU */}
            <ScrollView contentContainerStyle={styles.gridContainer}>
                {MENU_ITEMS.map((item, index) => (
                    <TouchableOpacity
                        key={index}
                        style={styles.card}
                        onPress={() => item.route ? navigation.navigate(item.route) : item.action && item.action()}
                    >
                        <View style={[styles.iconCircle, { backgroundColor: item.bg }]}>
                            {item.icon}
                        </View>
                        <Text style={styles.cardTitle}>{item.title}</Text>
                        <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },

    // Header Style
    header: {
        padding: 25,
        backgroundColor: 'white',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderColor: '#f3f4f6',
        marginTop: 25 // Spațiu pentru Notch/Status Bar
    },
    welcomeText: { color: '#6b7280', fontSize: 14 },
    userText: { color: '#111827', fontSize: 20, fontWeight: 'bold', textTransform: 'capitalize' },
    logoutBtn: { padding: 10, backgroundColor: '#fee2e2', borderRadius: 12 },

    // Grid Style
    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', padding: 15, justifyContent: 'space-between' },
    card: {
        width: '48%', // Două coloane
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 20,
        marginBottom: 15,
        alignItems: 'center',
        elevation: 2, // Umbră Android
        shadowColor: '#000', // Umbră iOS
        shadowOpacity: 0.05,
        shadowRadius: 5
    },
    iconCircle: { width: 55, height: 55, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#1f2937', marginBottom: 3 },
    cardSubtitle: { fontSize: 11, color: '#9ca3af' }
});