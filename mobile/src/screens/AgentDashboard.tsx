import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, Alert, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Produs, AgentProfil } from '../types';
import { Send, LogOut, RefreshCcw } from 'lucide-react-native';

export default function AgentDashboard({ navigation, route }: any) {
    // Primim ID-ul userului logat din App.js
    const { userId } = route.params || {};

    const [agent, setAgent] = useState<AgentProfil | null>(null);
    const [produse, setProduse] = useState<Produs[]>([]);
    const [loading, setLoading] = useState(true);

    // State pentru input-urile din fiecare card (mapare id_produs -> valoare)
    const [cantitati, setCantitati] = useState<{[key: number]: string}>({});
    const [preturi, setPreturi] = useState<{[key: number]: string}>({});

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Găsim profilul agentului pe baza User ID-ului din Auth
            // Presupunem că în tabela 'agenti' ai o coloană 'user_id' legată de auth.users
            // Dacă nu ai, trebuie să facem legătura altfel. Momentan caut după email (dacă e setat)

            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !user.email) throw new Error("Nu ești autentificat.");

            const { data: agentData, error: agentError } = await supabase
                .from('agenti')
                .select('*')
                .eq('email', user.email) // Sau .eq('user_id', user.id) dacă ai coloana
                .single();

            if (agentError || !agentData) {
                Alert.alert("Eroare", "Profilul de agent nu a fost găsit.");
                return;
            }
            setAgent(agentData);

            // 2. Luăm produsele alocate acestui agent
            const { data: relatii } = await supabase
                .from('agent_produse')
                .select('produs_id')
                .eq('agent_id', agentData.id);

            if (relatii && relatii.length > 0) {
                const ids = relatii.map((r: any) => r.produs_id);
                const { data: produseData } = await supabase
                    .from('produse')
                    .select('id, nume, stoc_depozit, stoc_minim_depozit, prag_optim, tva_procent, unitate_masura')
                    .in('id', ids)
                    .order('nume');

                if (produseData) setProduse(produseData);
            } else {
                setProduse([]);
            }

        } catch (error: any) {
            Alert.alert("Eroare", error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOrder = async (produs: Produs) => {
        const qty = parseFloat(cantitati[produs.id] || '0');
        const priceWithTva = parseFloat(preturi[produs.id] || '0');

        if (qty <= 0 || priceWithTva <= 0) {
            Alert.alert("Atenție", "Introdu cantitatea și prețul (cu TVA).");
            return;
        }

        if (!agent?.furnizor_id) {
            Alert.alert("Eroare", "Nu ai un furnizor asociat.");
            return;
        }

        try {
            const pretFaraTVA = priceWithTva / (1 + produs.tva_procent / 100);

            // 1. Creare antet comandă
            const { data: comanda, error: errComanda } = await supabase
                .from('comenzi_agenti')
                .insert({
                    agent_id: agent.id,
                    furnizor_id: agent.furnizor_id,
                    total_valoare: qty * pretFaraTVA,
                    status: 'pending_admin'
                })
                .select()
                .single();

            if (errComanda) throw errComanda;

            // 2. Creare detaliu
            const { error: errDetaliu } = await supabase
                .from('comenzi_agenti_detalii')
                .insert({
                    comanda_id: comanda.id,
                    produs_id: produs.id,
                    cantitate: qty,
                    pret_unitar: pretFaraTVA
                });

            if (errDetaliu) throw errDetaliu;

            Alert.alert("Succes", "Comanda a fost trimisă!");

            // Reset input fields
            setCantitati(prev => ({...prev, [produs.id]: ''}));
            setPreturi(prev => ({...prev, [produs.id]: ''}));

        } catch (err: any) {
            Alert.alert("Eroare la trimitere", err.message);
        }
    };

    const renderProdus = ({ item }: { item: Produs }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.produsNume}>{item.nume}</Text>
                <View style={[styles.badge, item.stoc_depozit < item.stoc_minim_depozit ? styles.bgRed : styles.bgGreen]}>
                    <Text style={styles.badgeText}>Stoc: {item.stoc_depozit} {item.unitate_masura}</Text>
                </View>
            </View>

            <Text style={styles.subText}>Ideal: {item.prag_optim} | TVA: {item.tva_procent}%</Text>

            <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Cantitate</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        placeholder="0"
                        value={cantitati[item.id]}
                        onChangeText={(text) => setCantitati({...cantitati, [item.id]: text})}
                    />
                </View>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Preț Final (RON)</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        placeholder="0.00"
                        value={preturi[item.id]}
                        onChangeText={(text) => setPreturi({...preturi, [item.id]: text})}
                    />
                </View>
                <TouchableOpacity style={styles.sendButton} onPress={() => handleOrder(item)}>
                    <Send color="white" size={20} />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Portal Agent</Text>
                    <Text style={styles.headerSubtitle}>{agent?.nume || 'Se încarcă...'}</Text>
                </View>
                <View style={{flexDirection: 'row', gap: 15}}>
                    <TouchableOpacity onPress={fetchData}>
                        <RefreshCcw color="#374151" size={24} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => supabase.auth.signOut()}>
                        <LogOut color="#ef4444" size={24} />
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#2563eb" style={{marginTop: 50}} />
            ) : (
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex:1}}>
                    <FlatList
                        data={produse}
                        keyExtractor={item => item.id.toString()}
                        renderItem={renderProdus}
                        contentContainerStyle={{padding: 16}}
                        ListEmptyComponent={<Text style={{textAlign:'center', marginTop: 20}}>Niciun produs alocat.</Text>}
                    />
                </KeyboardAvoidingView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    header: { padding: 20, backgroundColor: 'white', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
    headerSubtitle: { fontSize: 14, color: '#6b7280' },

    card: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 },
    produsNume: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', flex: 1, marginRight: 10 },
    subText: { fontSize: 12, color: '#9ca3af', marginBottom: 15 },

    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
    badgeText: { fontSize: 10, fontWeight: 'bold' },
    bgGreen: { backgroundColor: '#dcfce7' }, // text-green-700 handled implicitly usually or add color style
    bgRed: { backgroundColor: '#fee2e2' },

    inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
    inputGroup: { flex: 1 },
    label: { fontSize: 10, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' },
    input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 8, fontSize: 14, backgroundColor: '#f9fafb' },
    sendButton: { backgroundColor: '#2563eb', width: 44, height: 44, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 1 } // Align with input
});