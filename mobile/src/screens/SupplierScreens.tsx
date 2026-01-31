import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { ArrowLeft, Truck, ClipboardCheck } from 'lucide-react-native';

// --- ECRAN 1: COMENZI CĂTRE FURNIZOR (OUTBOUND) ---
export function OutboundOrdersScreen({ navigation }: any) {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.title}>Comenzi Către Furnizori</Text>
            </View>
            <View style={styles.center}>
                <Truck size={64} color="#d97706" />
                <Text style={styles.text}>Aici vei crea cereri de aprovizionare.</Text>
            </View>
        </SafeAreaView>
    );
}

// --- ECRAN 2: COMENZI DE LA FURNIZOR (INBOUND / RECEPȚII) ---
export function InboundOrdersScreen({ navigation }: any) {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.title}>Recepție Marfă</Text>
            </View>
            <View style={styles.center}>
                <ClipboardCheck size={64} color="#059669" />
                <Text style={styles.text}>Aici vei valida marfa sosită de la furnizori (NIR).</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: 'white' },
    backBtn: { marginRight: 15 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    text: { marginTop: 20, fontSize: 16, color: '#6B7280', textAlign: 'center' }
});