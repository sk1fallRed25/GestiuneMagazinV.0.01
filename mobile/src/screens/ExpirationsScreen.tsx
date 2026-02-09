import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, SafeAreaView, Alert
} from 'react-native';
import { supabase } from '../lib/supabase';
import {
    ArrowLeft, CalendarClock, AlertTriangle, Trash2,
    Tag, Package, Store
} from 'lucide-react-native';

export default function ExpirationsScreen({ navigation }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchExpirations();
    }, []);

    const fetchExpirations = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('view_expirari')
                .select('*');

            if (error) throw error;
            setItems(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getDaysLeft = (dateString) => {
        const today = new Date();
        const expDate = new Date(dateString);
        const diffTime = expDate - today;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const handleAction = (item, type) => {
        if (type === 'SCRAP') {
            // --- MODIFICARE: Navigare directă cu parametrii produsului ---
            // Trimitem ID-ul produsului către ecranul de Pierderi
            navigation.navigate('ScrapScreen', {
                preSelectedId: item.produs_id,
                preSelectedName: item.nume
            });
        } else if (type === 'PROMO') {
            Alert.alert("Promoție", "Pune o etichetă de reducere la raft!");
        }
    };

    const renderItem = ({ item }) => {
        const daysLeft = getDaysLeft(item.data_expirare);

        let statusColor = '#eab308';
        let statusLabel = 'Expiră curând';
        let isExpired = false;

        if (daysLeft < 0) {
            statusColor = '#ef4444';
            statusLabel = `EXPIRAT DE ${Math.abs(daysLeft)} ZILE`;
            isExpired = true;
        } else if (daysLeft <= 7) {
            statusColor = '#f97316';
            statusLabel = `CRITIC: ${daysLeft} ZILE`;
        } else {
            statusLabel = `${daysLeft} Zile rămase`;
        }

        return (
            <View style={[styles.card, { borderLeftColor: statusColor, borderLeftWidth: 5 }]}>
                <View style={styles.headerRow}>
                    <Text style={styles.prodName}>{item.nume}</Text>
                    <View style={[styles.badge, { backgroundColor: statusColor + '20' }]}>
                        <CalendarClock size={12} color={statusColor} />
                        <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
                    </View>
                </View>

                <Text style={styles.dateText}>
                    Data Expirare: <Text style={{fontWeight:'bold'}}>{new Date(item.data_expirare).toLocaleDateString('ro-RO')}</Text>
                </Text>

                <View style={styles.stockInfo}>
                    <View style={{flexDirection:'row', alignItems:'center', gap:5}}>
                        <Store size={14} color="#6b7280"/>
                        <Text style={styles.stockText}>Raft: {item.stoc_magazin}</Text>
                    </View>
                    <View style={{flexDirection:'row', alignItems:'center', gap:5}}>
                        <Package size={14} color="#6b7280"/>
                        <Text style={styles.stockText}>Depozit: {item.stoc_depozit}</Text>
                    </View>
                </View>

                {/* Butoane Acțiune */}
                <View style={styles.actions}>
                    {isExpired ? (
                        <TouchableOpacity style={[styles.btn, {backgroundColor:'#fee2e2'}]} onPress={() => handleAction(item, 'SCRAP')}>
                            <Trash2 size={16} color="#dc2626" />
                            <Text style={{color:'#dc2626', fontWeight:'bold', fontSize:12}}>Scoatere (Pierderi)</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={[styles.btn, {backgroundColor:'#ffedd5'}]} onPress={() => handleAction(item, 'PROMO')}>
                            <Tag size={16} color="#ea580c" />
                            <Text style={{color:'#ea580c', fontWeight:'bold', fontSize:12}}>Aplică Reducere</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ArrowLeft size={24} color="#374151" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.title}>Monitorizare Expirări</Text>
                    <Text style={styles.subtitle}>Loturi cu probleme</Text>
                </View>
            </View>

            {loading ? <ActivityIndicator size="large" color="#ef4444" style={{marginTop:50}} /> : (
                <FlatList
                    data={items}
                    keyExtractor={item => item.receptie_detaliu_id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 20 }}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <AlertTriangle size={64} color="#10b981" />
                            <Text style={styles.emptyTitle}>Niciun risc!</Text>
                            <Text style={styles.emptyText}>Nu ai produse care expiră în următoarele 30 de zile.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fef2f2' },
    header: { padding: 20, backgroundColor: 'white', flexDirection: 'row', gap: 15, alignItems: 'center', elevation: 2 },
    title: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
    subtitle: { fontSize: 12, color: '#6b7280' },

    card: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 15, elevation: 2 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    prodName: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', flex:1, marginRight:10 },

    badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    badgeText: { fontSize: 11, fontWeight: 'bold' },

    dateText: { color: '#374151', marginBottom: 10 },

    stockInfo: { flexDirection:'row', gap:15, marginBottom:15, backgroundColor:'#f9fafb', padding:8, borderRadius:6 },
    stockText: { fontSize:13, color:'#4b5563', fontWeight:'600' },

    actions: { flexDirection:'row', justifyContent:'flex-end', gap:10, borderTopWidth:1, borderColor:'#f3f4f6', paddingTop:10 },
    btn: { flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:12, paddingVertical:8, borderRadius:8 },

    emptyState: { alignItems: 'center', marginTop: 50, padding:20 },
    emptyTitle: { fontSize:18, fontWeight:'bold', color:'#374151', marginTop:15 },
    emptyText: { textAlign: 'center', marginTop: 5, color: '#6b7280' }
});