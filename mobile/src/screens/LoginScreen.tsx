import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { supabase } from '../lib/supabase';
import { User, Lock, Building2, MapPin, Hash, Briefcase, Mail, UserPlus } from 'lucide-react-native';

export default function LoginScreen({ navigation }: any) {
    const [loading, setLoading] = useState(false);
    const [isLogin, setIsLogin] = useState(true);
    const [userType, setUserType] = useState<'angajat' | 'furnizor'>('angajat');

    // State-uri Formular
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');

    // Date specifice Angajat
    const [storeCode, setStoreCode] = useState('');

    // Date specifice Furnizor
    const [companyName, setCompanyName] = useState('');
    const [cui, setCui] = useState('');
    const [address, setAddress] = useState('');

    // --- LOGICA AUTENTIFICARE (LOGIN) ---
    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Eroare', 'Vă rugăm să introduceți email-ul și parola.');
            return;
        }
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password,
        });

        if (error) {
            Alert.alert('Eroare Autentificare', error.message);
            setLoading(false);
        }
    };

    // --- LOGICA ÎNREGISTRARE (SIGN UP) ---
    const handleSignUp = async () => {
        // 1. Validări Frontend
        if (!email || !password || !fullName) {
            Alert.alert('Lipsesc date', 'Email, Parola și Numele sunt obligatorii.');
            return;
        }

        if (userType === 'angajat' && !storeCode) {
            Alert.alert('Eroare', 'Codul Magazinului este obligatoriu pentru angajați.');
            return;
        }

        if (userType === 'furnizor' && (!companyName || !cui || !address)) {
            Alert.alert('Eroare', 'Toate datele firmei sunt obligatorii pentru furnizori.');
            return;
        }

        setLoading(true);

        try {
            // 2. Creare Utilizator în Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: email.trim(),
                password: password,
            });

            if (authError) throw authError;

            if (authData.user) {
                // 3. Inserare în tabela publică 'utilizatori'
                const { error: dbError } = await supabase
                    .from('utilizatori')
                    .insert([{
                        email: email.trim(),
                        nume: fullName,
                        tip_cont: userType,
                        rol: userType === 'furnizor' ? 'furnizor' : 'user',
                        aprobat: false, // Necesită aprobare admin
                        parola: 'auth_managed', // Rezolvă constrângerea NOT NULL
                        cod_magazin: userType === 'angajat' ? storeCode : null,
                        nume_firma: userType === 'furnizor' ? companyName : null,
                        cui: userType === 'furnizor' ? cui : null,
                        adresa_firma: userType === 'furnizor' ? address : null,
                    }]);

                if (dbError) throw dbError;

                Alert.alert(
                    'Cont Creat cu Succes!',
                    'Cererea a fost trimisă. Un administrator trebuie să vă aprobe contul.'
                );
                setIsLogin(true);
            }
        } catch (error: any) {
            // Prinde erori de tip Rate Limit (429) sau Constrângeri (400)
            Alert.alert('Eroare la înregistrare', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

                <View style={styles.header}>
                    <View style={styles.logoBox}>
                        <Briefcase size={40} color="#4F46E5" />
                    </View>
                    <Text style={styles.title}>System Magazin</Text>
                    <Text style={styles.subtitle}>
                        {isLogin ? 'Bine ai revenit!' : 'Creează un cont nou'}
                    </Text>
                </View>

                {/* SWITCH LOGIN / SIGNUP */}
                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[styles.toggleBtn, isLogin && styles.toggleBtnActive]}
                        onPress={() => setIsLogin(true)}
                    >
                        <Text style={[styles.toggleText, isLogin && styles.toggleTextActive]}>Login</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleBtn, !isLogin && styles.toggleBtnActive]}
                        onPress={() => setIsLogin(false)}
                    >
                        <Text style={[styles.toggleText, !isLogin && styles.toggleTextActive]}>Sign Up</Text>
                    </TouchableOpacity>
                </View>

                {/* SELECTOR TIP CONT (DOAR LA SIGNUP) */}
                {!isLogin && (
                    <View style={styles.typeSelector}>
                        <TouchableOpacity
                            style={[styles.typeBtn, userType === 'angajat' && styles.typeBtnActive]}
                            onPress={() => setUserType('angajat')}
                        >
                            <User size={18} color={userType === 'angajat' ? '#FFF' : '#4F46E5'} />
                            <Text style={[styles.typeText, userType === 'angajat' && styles.typeTextActive]}>Angajat</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.typeBtn, userType === 'furnizor' && styles.typeBtnActive]}
                            onPress={() => setUserType('furnizor')}
                        >
                            <Building2 size={18} color={userType === 'furnizor' ? '#FFF' : '#4F46E5'} />
                            <Text style={[styles.typeText, userType === 'furnizor' && styles.typeTextActive]}>Furnizor</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.form}>
                    {!isLogin && (
                        <View style={styles.inputContainer}>
                            <UserPlus size={20} color="#9CA3AF" style={styles.icon} />
                            <TextInput style={styles.input} placeholder="Nume Complet" value={fullName} onChangeText={setFullName} />
                        </View>
                    )}

                    <View style={styles.inputContainer}>
                        <Mail size={20} color="#9CA3AF" style={styles.icon} />
                        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
                    </View>

                    <View style={styles.inputContainer}>
                        <Lock size={20} color="#9CA3AF" style={styles.icon} />
                        <TextInput style={styles.input} placeholder="Parolă" value={password} onChangeText={setPassword} secureTextEntry />
                    </View>

                    {/* CÂMPURI DINAMICE SIGNUP */}
                    {!isLogin && userType === 'angajat' && (
                        <View style={styles.inputContainer}>
                            <Hash size={20} color="#9CA3AF" style={styles.icon} />
                            <TextInput style={styles.input} placeholder="COD MAGAZIN" value={storeCode} onChangeText={setStoreCode} keyboardType="numeric" />
                        </View>
                    )}

                    {!isLogin && userType === 'furnizor' && (
                        <View style={styles.furnizorFields}>
                            <Text style={styles.labelSection}>Date Firmă Obligatorii</Text>
                            <View style={styles.inputContainer}>
                                <Building2 size={20} color="#9CA3AF" style={styles.icon} />
                                <TextInput style={styles.input} placeholder="Denumire Firmă" value={companyName} onChangeText={setCompanyName} />
                            </View>
                            <View style={styles.inputContainer}>
                                <Hash size={20} color="#9CA3AF" style={styles.icon} />
                                <TextInput style={styles.input} placeholder="CUI" value={cui} onChangeText={setCui} keyboardType="numeric" />
                            </View>
                            <View style={styles.inputContainer}>
                                <MapPin size={20} color="#9CA3AF" style={styles.icon} />
                                <TextInput style={styles.input} placeholder="Adresă Sediu" value={address} onChangeText={setAddress} />
                            </View>
                        </View>
                    )}

                    <TouchableOpacity
                        style={styles.mainBtn}
                        onPress={isLogin ? handleLogin : handleSignUp}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#FFF" /> : (
                            <Text style={styles.mainBtnText}>{isLogin ? 'Autentificare' : 'Trimite Cerere'}</Text>
                        )}
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    scrollContent: { flexGrow: 1, padding: 25, justifyContent: 'center' },
    header: { alignItems: 'center', marginBottom: 30 },
    logoBox: { width: 70, height: 70, backgroundColor: '#E0E7FF', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
    subtitle: { fontSize: 14, color: '#6B7280' },
    toggleContainer: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 10, padding: 4, marginBottom: 25 },
    toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    toggleBtnActive: { backgroundColor: '#FFF', elevation: 2 },
    toggleText: { fontWeight: 'bold', color: '#6B7280' },
    toggleTextActive: { color: '#4F46E5' },
    typeSelector: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#4F46E5' },
    typeBtnActive: { backgroundColor: '#4F46E5' },
    typeText: { marginLeft: 8, fontWeight: 'bold', color: '#4F46E5' },
    typeTextActive: { color: '#FFF' },
    form: { width: '100%' },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 15, paddingHorizontal: 15, height: 50 },
    icon: { marginRight: 10 },
    input: { flex: 1, fontSize: 15 },
    labelSection: { fontSize: 12, fontWeight: 'bold', color: '#4F46E5', marginBottom: 8, textTransform: 'uppercase' },
    furnizorFields: { marginTop: 5 },
    mainBtn: { backgroundColor: '#4F46E5', borderRadius: 10, height: 55, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
    mainBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});