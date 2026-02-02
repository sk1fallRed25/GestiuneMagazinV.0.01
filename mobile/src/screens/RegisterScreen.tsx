import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, SafeAreaView, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { UserPlus, Mail, Lock, User, ArrowLeft } from 'lucide-react-native';

export default function RegisterScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleRegister() {
        if (!email || !password || !fullName) {
            Alert.alert('Eroare', 'Vă rugăm să completați toate câmpurile.');
            return;
        }

        setLoading(true);
        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { full_name: fullName } }
            });

            if (authError) throw authError;

            if (authData.user) {
                const { error: profileError } = await supabase.from('utilizatori').insert([
                    {
                        id: authData.user.id,
                        email: email,
                        nume: fullName,
                        rol: 'gestionar',
                        tip_cont: 'angajat',
                        aprobat: false
                    }
                ]);

                if (profileError) throw profileError;

                Alert.alert('Succes', 'Cont creat! Așteptați aprobarea administratorului.', [{ text: 'OK', onPress: () => navigation.navigate('Login') }]);
            }
        } catch (error) {
            Alert.alert('Eroare', error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={{ padding: 25 }}>
                <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft size={24} color="#4F46E5" /></TouchableOpacity>
                <View style={styles.header}>
                    <UserPlus size={50} color="#4F46E5" />
                    <Text style={styles.title}>Creează Cont Nou</Text>
                </View>

                <View style={styles.form}>
                    <TextInput style={styles.input} placeholder="Nume Complet" value={fullName} onChangeText={setFullName} />
                    <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" value={email} onChangeText={setEmail} />
                    <TextInput style={styles.input} placeholder="Parolă" secureTextEntry value={password} onChangeText={setPassword} />

                    <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
                        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Trimite Cerere</Text>}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' },
    header: { alignItems: 'center', marginVertical: 30 },
    title: { fontSize: 24, fontWeight: 'bold', marginTop: 10 },
    form: { gap: 15 },
    input: { backgroundColor: '#f3f4f6', padding: 15, borderRadius: 12, fontSize: 16 },
    button: { backgroundColor: '#4F46E5', padding: 18, borderRadius: 12, alignItems: 'center' },
    buttonText: { color: 'white', fontWeight: 'bold' }
});