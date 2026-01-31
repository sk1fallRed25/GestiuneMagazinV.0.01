import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';

export default function LoginScreen({ navigation }: any) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    async function signInWithEmail() {
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            Alert.alert('Eroare', error.message);
        }
        // Dacă nu e eroare, App.js va detecta automat sesiunea și va schimba ecranul
        setLoading(false);
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Magazin Mobile</Text>
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Parola"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                />
            </View>
            <TouchableOpacity style={styles.button} onPress={signInWithEmail} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Autentificare</Text>}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f3f4f6' },
    title: { fontSize: 32, fontWeight: 'bold', color: '#111827', marginBottom: 40, textAlign: 'center' },
    inputContainer: { backgroundColor: 'white', borderRadius: 12, padding: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
    input: { height: 50, borderColor: '#e5e7eb', borderWidth: 1, borderRadius: 8, paddingHorizontal: 15, marginBottom: 15, fontSize: 16 },
    button: { backgroundColor: '#2563eb', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
    buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});