import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, Alert, Platform
} from 'react-native';
import { supabase } from '../lib/supabase';
import {
    LogOut, ClipboardList, Truck, PackageCheck, MessageSquare, Building2, Bell
} from 'lucide-react-native';

export default function SupplierDashboard({ navigation }: any) {
    const [supplierInfo, setSupplierInfo] = useState({ email: '', nume_firma: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSupplierData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data, error } = await supabase
                    .from('utilizatori')
                    .select('email, nume_firma')
                    .eq('id', user.id)
                    .single();

                if (data) setSupplierInfo({ email: data.email, nume_firma: data.nume_firma });
            } catch (error) {
                console.log('Eroare date furnizor:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSupplierData();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const MENU_ITEMS = [
        { title: "Comenzi Primite", sub: "Comenzi de la magazin", icon: <ClipboardList size={26} color="#4F46E5" />, bg: "#EEF2FF", route: "SupplierOrders" },
        { title: "Livrări Active", sub: "Urmărire transport", icon: <Truck size={26} color="#059669" />, bg: "#D1FAE5", route: "SupplierShipments" },
        { title: "Catalog Produse", sub: "Gestiune listă prețuri", icon: <PackageCheck size={26} color="#D97706" />, bg: "#FEF3C7", route: "SupplierCatalog" },
        { title: "Suport / Chat", sub: "Contact administrator", icon: <MessageSquare size={26} color="#7C3AED" />, bg: "#EDE9FE", route: "SupportChat" }
    ];

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4F46E5" /></View>;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.welcomeText}>Panou Furnizor,</Text>
                    <Text style={styles.companyText}>{supplierInfo.nume_firma || supplierInfo.email}</Text>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                    <LogOut size={22} color="#EF4444" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.grid}>
                {MENU_ITEMS.map((item, index) => (
                    <TouchableOpacity key={index} style={styles.card} onPress={() => navigation.navigate(item.route)}>
                        <View style={[styles.iconBox, { backgroundColor: item.bg }]}>{item.icon}</View>
                        <Text style={styles.cardTitle}>{item.title}</Text>
                        <Text style={styles.cardSub}>{item.sub}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { padding: 20, backgroundColor: 'white', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: '#E5E7EB', paddingTop: Platform.OS === 'android' ? 40 : 20 },
    welcomeText: { color: '#6B7280', fontSize: 13 },
    companyText: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    logoutBtn: { padding: 10, backgroundColor: '#FEE2E2', borderRadius: 10 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 15, justifyContent: 'space-between' },
    card: { width: '48%', backgroundColor: 'white', padding: 15, borderRadius: 15, marginBottom: 15, alignItems: 'center', elevation: 2 },
    iconBox: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    cardTitle: { fontSize: 14, fontWeight: 'bold', textAlign: 'center' },
    cardSub: { fontSize: 10, color: '#9CA3AF', textAlign: 'center', marginTop: 2 }
});