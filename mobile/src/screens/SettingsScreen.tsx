import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
    Switch, ScrollView, Alert, ActivityIndicator, Modal, TextInput,
    KeyboardAvoidingView, Platform, Linking
} from 'react-native';
import { supabase } from '../lib/supabase';
import {
    ArrowLeft, LogOut, Shield, Bell, Printer,
    Lock, ChevronRight, HelpCircle, FileText, Smartphone, Key, X,
    MessageSquare, AlertTriangle, Lightbulb, Send
} from 'lucide-react-native';

export default function SettingsScreen({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState({ email: '', name: '', role: '', id: '' });

    // Setări Locale (Switch-uri)
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [expirationAlerts, setExpirationAlerts] = useState(true);
    const [printerConnected, setPrinterConnected] = useState(false);

    // --- MODAL PAROLĂ ---
    const [passwordModalVisible, setPasswordModalVisible] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loadingPass, setLoadingPass] = useState(false);

    // --- MODAL SUPORT (TICKET) ---
    const [supportModalVisible, setSupportModalVisible] = useState(false);
    const [ticketType, setTicketType] = useState('Intrebare');
    const [ticketMessage, setTicketMessage] = useState('');
    const [sendingTicket, setSendingTicket] = useState(false);

    useEffect(() => {
        fetchUserProfile();
    }, []);

    const fetchUserProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('utilizatori')
                    .select('nume, rol')
                    .eq('id', user.id)
                    .single();

                setUserData({
                    id: user.id,
                    email: user.email || '',
                    name: profile?.nume || 'Utilizator',
                    role: profile?.rol === 'admin' ? 'Administrator' : 'Operator'
                });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        Alert.alert("Deconectare", "Sigur vrei să ieși?", [
            { text: "Nu", style: "cancel" },
            { text: "Da", style: "destructive", onPress: async () => await supabase.auth.signOut() }
        ]);
    };

    // --- LOGICĂ SCHIMBARE PAROLĂ ---
    const handleChangePassword = async () => {
        if (newPassword.length < 6) return Alert.alert("Eroare", "Parola trebuie să aibă minim 6 caractere.");
        if (newPassword !== confirmPassword) return Alert.alert("Eroare", "Parolele nu coincid.");

        setLoadingPass(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            Alert.alert("Succes", "Parola a fost schimbată!");
            setPasswordModalVisible(false);
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            Alert.alert("Eroare", err.message);
        } finally {
            setLoadingPass(false);
        }
    };

    // --- LOGICĂ TRIMITERE TICHET ---
    const handleSendTicket = async () => {
        if (!ticketMessage.trim()) return Alert.alert("Eroare", "Te rog descrie problema.");

        setSendingTicket(true);
        try {
            const { error } = await supabase.from('suport_tichete').insert([{
                user_id: userData.id,
                nume_utilizator: userData.name,
                tip_tichet: ticketType,
                mesaj: ticketMessage
            }]);

            if (error) throw error;

            Alert.alert("Trimis", "Tichetul a fost înregistrat. Te vom contacta curând.");
            setSupportModalVisible(false);
            setTicketMessage('');
            setTicketType('Intrebare');

        } catch (err) {
            Alert.alert("Eroare", "Nu s-a putut trimite tichetul.");
        } finally {
            setSendingTicket(false);
        }
    };

    // --- LOGICĂ WHATSAPP ---
    const handleWhatsApp = async () => {

        const phoneNumber = '40754308452';
        const message = 'Salut, am o problemă în aplicația de gestiune: ';

        const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;

        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                await Linking.openURL(url);
            }
        } catch (err) {
            Alert.alert("Eroare", "Nu s-a putut deschide WhatsApp. Sună la: " + phoneNumber);
        }
    };

    // Componente Helper UI
    const TicketTypeBtn = ({ type, icon: Icon, label, color }) => (
        <TouchableOpacity
            style={[styles.typeBtn, ticketType === type && {borderColor: color, backgroundColor: color + '15'}]}
            onPress={() => setTicketType(type)}
        >
            <Icon size={20} color={ticketType === type ? color : '#9ca3af'} />
            <Text style={[styles.typeText, ticketType === type && {color: color, fontWeight:'bold'}]}>{label}</Text>
        </TouchableOpacity>
    );

    const SettingItem = ({ icon: Icon, label, value, type = 'arrow', onPress, color = '#374151' }) => (
        <TouchableOpacity style={styles.settingRow} onPress={onPress} disabled={type === 'switch'}>
            <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
                    <Icon color={color} size={20} />
                </View>
                <Text style={styles.settingLabel}>{label}</Text>
            </View>
            {type === 'switch' ? (
                <Switch
                    value={value} onValueChange={onPress}
                    trackColor={{ false: "#e5e7eb", true: "#bfdbfe" }} thumbColor={value ? "#2563eb" : "#f4f3f4"}
                />
            ) : type === 'text' ? ( <Text style={styles.settingValue}>{value}</Text> ) : ( <ChevronRight color="#9ca3af" size={20} /> )}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ArrowLeft color="#374151" size={24} />
                </TouchableOpacity>
                <Text style={styles.title}>Setări</Text>
                <View style={{width: 24}} />
            </View>

            {loading ? <ActivityIndicator size="large" color="#2563eb" style={{marginTop: 50}} /> : (
                <ScrollView contentContainerStyle={styles.scrollContent}>

                    {/* 1. PROFIL */}
                    <Text style={styles.sectionTitle}>CONTUL MEU</Text>
                    <View style={styles.card}>
                        <View style={styles.profileHeader}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{userData.name.charAt(0).toUpperCase()}</Text>
                            </View>
                            <View>
                                <Text style={styles.profileName}>{userData.name}</Text>
                                <Text style={styles.profileEmail}>{userData.email}</Text>
                                <View style={styles.roleBadge}>
                                    <Shield size={10} color="#059669" />
                                    <Text style={styles.roleText}>{userData.role.toUpperCase()}</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* 2. PREFERINȚE */}
                    <Text style={styles.sectionTitle}>PREFERINȚE</Text>
                    <View style={styles.card}>
                        <SettingItem icon={Bell} label="Notificări Stoc" type="switch" value={notificationsEnabled} onPress={() => setNotificationsEnabled(!notificationsEnabled)} color="#d97706" />
                        <View style={styles.divider} />
                        <SettingItem icon={FileText} label="Alerte Expirare" type="switch" value={expirationAlerts} onPress={() => setExpirationAlerts(!expirationAlerts)} color="#ea580c" />
                    </View>

                    {/* 3. HARDWARE */}
                    <Text style={styles.sectionTitle}>HARDWARE</Text>
                    <View style={styles.card}>
                        <SettingItem icon={Printer} label="Imprimantă Termică" type="switch" value={printerConnected} onPress={() => setPrinterConnected(!printerConnected)} color="#4f46e5" />
                        <View style={styles.divider} />
                        <SettingItem icon={Smartphone} label="Scanner Cameră" type="text" value="Activ" color="#0891b2" />
                    </View>

                    {/* 4. ASISTENȚĂ & SECURITATE */}
                    <Text style={styles.sectionTitle}>ASISTENȚĂ</Text>
                    <View style={styles.card}>
                        <SettingItem icon={Lock} label="Schimbă Parola" onPress={() => setPasswordModalVisible(true)} color="#dc2626" />
                        <View style={styles.divider} />
                        <SettingItem
                            icon={HelpCircle}
                            label="Ajutor & Raportare"
                            onPress={() => setSupportModalVisible(true)}
                            color="#6b7280"
                        />
                    </View>

                    <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                        <LogOut color="#ef4444" size={20} />
                        <Text style={styles.logoutText}>Deconectare</Text>
                    </TouchableOpacity>

                    <Text style={styles.version}>v2.5.0 (Build Final)</Text>
                    <View style={{height:30}}/>
                </ScrollView>
            )}

            {/* --- MODAL PAROLĂ --- */}
            <Modal visible={passwordModalVisible} transparent animationType="slide">
                <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Schimbare Parolă</Text>
                            <TouchableOpacity onPress={() => setPasswordModalVisible(false)}><X size={24} color="#374151" /></TouchableOpacity>
                        </View>
                        <View style={{alignItems:'center', marginBottom:20}}>
                            <View style={{backgroundColor:'#fee2e2', padding:15, borderRadius:40}}><Key size={32} color="#dc2626" /></View>
                            <Text style={{textAlign:'center', color:'#6b7280', marginTop:10, fontSize:13}}>Securizează contul cu o parolă nouă.</Text>
                        </View>
                        <Text style={styles.label}>Noua Parolă</Text>
                        <TextInput style={styles.input} secureTextEntry value={newPassword} onChangeText={setNewPassword} placeholder="Minim 6 caractere"/>
                        <Text style={styles.label}>Confirmă Parola</Text>
                        <TextInput style={styles.input} secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repetă parola"/>
                        <TouchableOpacity style={[styles.saveBtn, loadingPass && {opacity: 0.7}]} onPress={handleChangePassword}>
                            {loadingPass ? <ActivityIndicator color="white" /> : <Text style={styles.saveText}>Salvează Parola</Text>}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* --- MODAL SUPORT --- */}
            <Modal visible={supportModalVisible} transparent animationType="slide">
                <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={styles.modalOverlay}>
                    <View style={[styles.modalContent, {height:'auto'}]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Ai nevoie de ajutor?</Text>
                            <TouchableOpacity onPress={() => setSupportModalVisible(false)}><X size={24} color="#374151" /></TouchableOpacity>
                        </View>

                        <Text style={{fontSize:14, color:'#6b7280', marginBottom:15}}>
                            Selectează tipul problemei. Te vom ajuta rapid.
                        </Text>

                        {/* AICI ERA PROBLEMA ANTERIOARĂ, ACUM E CORECTATĂ */}
                        <View style={{flexDirection:'row', gap:10, marginBottom:20}}>
                            <TicketTypeBtn type="Intrebare" icon={MessageSquare} label="Întrebare" color="#2563eb" />
                            <TicketTypeBtn type="Eroare" icon={AlertTriangle} label="Bug" color="#dc2626" />
                            <TicketTypeBtn type="Sugestie" icon={Lightbulb} label="Sugestie" color="#d97706" />
                        </View>

                        <Text style={styles.label}>Mesajul Tău</Text>
                        <TextInput
                            style={[styles.input, {height: 100, textAlignVertical:'top'}]}
                            multiline
                            placeholder="Descrie aici problema sau sugestia..."
                            value={ticketMessage}
                            onChangeText={setTicketMessage}
                        />

                        <TouchableOpacity style={[styles.saveBtn, {backgroundColor:'#2563eb', flexDirection:'row', gap:10, justifyContent:'center'}]} onPress={handleSendTicket} disabled={sendingTicket}>
                            {sendingTicket ? <ActivityIndicator color="white" /> : (
                                <>
                                    <Send size={20} color="white" />
                                    <Text style={styles.saveText}>Trimite Tichet</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity style={{alignItems:'center', marginTop:15}} onPress={handleWhatsApp}>
                            <Text style={{color:'#16a34a', fontWeight:'bold', fontSize:13}}>Sau scrie-ne rapid pe WhatsApp 💬</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { padding: 20, backgroundColor: 'white', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: '#e5e7eb', paddingTop: 40 },
    title: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
    scrollContent: { padding: 20 },

    sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#6b7280', marginBottom: 8, marginTop: 10, marginLeft: 4 },
    card: { backgroundColor: 'white', borderRadius: 16, paddingVertical: 5, paddingHorizontal: 15, marginBottom: 15, borderWidth: 1, borderColor: '#e5e7eb' },

    profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 15 },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#bfdbfe' },
    avatarText: { fontSize: 20, fontWeight: 'bold', color: '#2563eb' },
    profileName: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
    profileEmail: { fontSize: 13, color: '#6b7280' },
    roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, alignSelf: 'flex-start', marginTop: 4 },
    roleText: { fontSize: 10, fontWeight: 'bold', color: '#166534' },

    settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
    settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconContainer: { padding: 8, borderRadius: 10 },
    settingLabel: { fontSize: 15, color: '#374151', fontWeight: '500' },
    settingValue: { fontSize: 14, color: '#6b7280' },
    divider: { height: 1, backgroundColor: '#f3f4f6', marginLeft: 50 },

    logoutBtn: { flexDirection: 'row', backgroundColor: '#fee2e2', padding: 15, borderRadius: 16, justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 10 },
    logoutText: { color: '#ef4444', fontWeight: 'bold', fontSize: 16 },
    version: { textAlign: 'center', marginTop: 20, color: '#94a3b8', fontSize: 12 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 25 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
    label: { fontWeight: 'bold', color: '#374151', marginBottom: 8, marginTop: 15 },
    input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, padding: 14, fontSize: 16, backgroundColor: '#f9fafb' },
    saveBtn: { backgroundColor: '#dc2626', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 30, marginBottom: 20 },
    saveText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

    typeBtn: { flex:1, padding:10, borderWidth:1, borderColor:'#e5e7eb', borderRadius:10, alignItems:'center', gap:5 },
    typeText: { fontSize:12, color:'#6b7280' }
});