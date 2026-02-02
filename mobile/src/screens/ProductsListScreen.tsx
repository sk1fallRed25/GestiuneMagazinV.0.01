import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { Package, Info } from 'lucide-react-native';

export default function ProductsListScreen() {
    const [products, setProducts] = useState<any[]>([]);
    const [userRole, setUserRole] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            // 1. Preluăm rolul utilizatorului
            const { data: { user } } = await supabase.auth.getUser();
            const { data: profile } = await supabase.from('utilizatori').select('rol').eq('id', user?.id).single();
            setUserRole(profile?.rol || 'gestionar');

            // 2. Preluăm produsele
            const { data: prodData } = await supabase.from('produse').select('*').order('nume', { ascending: true });
            setProducts(prodData || []);
            setLoading(false);
        };
        fetchData();
    }, []);

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4F46E5" /></View>;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}><Text style={styles.headerTitle}>Gestiune Stoc</Text></View>
            <FlatList
                data={products}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({ item }) => (
                    <View style={styles.productCard}>
                        <View style={styles.iconBox}><Package size={22} color="#4F46E5" /></View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.prodName}>{item.nume}</Text>
                            <Text style={styles.prodStock}>Disponibil: {item.stoc_actual} unități</Text>
                        </View>

                        {/* RESTRICȚIE PREȚ: DOAR PENTRU ADMIN */}
                        {userRole === 'admin' && (
                            <View style={styles.priceBox}>
                                <Text style={styles.priceText}>{item.pret_vanzare} RON</Text>
                            </View>
                        )}
                    </View>
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { padding: 20, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#e5e7eb' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    productCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 1 },
    iconBox: { padding: 10, backgroundColor: '#f0f4ff', borderRadius: 10 },
    prodName: { fontSize: 15, fontWeight: 'bold', color: '#1f2937' },
    prodStock: { fontSize: 12, color: '#6b7280', marginTop: 2 },
    priceBox: { backgroundColor: '#d1fae5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
    priceText: { color: '#059669', fontWeight: 'bold', fontSize: 13 }
});