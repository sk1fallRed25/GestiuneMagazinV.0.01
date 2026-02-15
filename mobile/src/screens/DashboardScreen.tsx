import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
    ScrollView, ActivityIndicator, Dimensions, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import {
    LogOut, Package, ClipboardCheck, SearchCheck,
    AlertOctagon, ClipboardList, Settings, UserCircle,
    Users, Truck, BarChart3, FileWarning, ScrollText,
    ScanBarcode, RotateCcw, FileCheck, BrainCircuit, AlertTriangle,
    ArrowRightLeft, CalendarClock, PlusCircle,
    Printer // <--- IMPORT NOU PENTRU IMPRIMANTĂ
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }) {
    const [userData, setUserData] = useState({ email: '', role: '', name: '' });
    const [loading, setLoading] = useState(true);

    // AI Alerts State
    const [aiAlerts, setAiAlerts] = useState({ count: 0, critical: 0 });

    useFocusEffect(
        useCallback(() => {
            fetchUserProfile();
        }, [])
    );

    const fetchUserProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from('utilizatori')
                    .select('rol, nume')
                    .eq('id', user.id)
                    .maybeSingle();

                const role = data?.rol || '';

                setUserData({
                    email: user.email,
                    role: role,
                    name: data?.nume || user.email.split('@')[0]
                });

                if (role === 'admin') {
                    runBackgroundAiCheck();
                }
            }
        } catch (error) {
            console.error("Eroare profil:", error.message);
        } finally {
            setLoading(false);
        }
    };

    const runBackgroundAiCheck = async () => {
        try {
            const { data: products } = await supabase.from('produse').select('id, stoc_depozit, stoc_magazin');
            const { data: history } = await supabase.from('view_daily_usage').select('*');

            let criticalCount = 0;
            let warningCount = 0;

            if (products && history) {
                products.forEach(prod => {
                    const totalStock = (prod.stoc_depozit || 0) + (prod.stoc_magazin || 0);
                    const prodHistory = history.filter(h => h.produs_id === prod.id);

                    if (prodHistory.length > 0) {
                        const totalQty = prodHistory.reduce((sum, h) => sum + h.cantitate, 0);
                        const avgDaily = totalQty / prodHistory.length;

                        if (totalStock === 0) criticalCount++;
                        else if (totalStock < avgDaily * 7) warningCount++;
                    }
                });
            }
            setAiAlerts({ count: warningCount + criticalCount, critical: criticalCount });
        } catch (err) {
            console.error("AI Check Error:", err);
        }
    };

    const isAdmin = userData.role === 'admin';
    const isGestionar = userData.role === 'gestionar';
    const isAgent = userData.role && userData.role.toLowerCase().includes('agent');
    const canViewWarehouse = isAdmin || isGestionar;

    const getBadgeColor = () => {
        if (isAdmin) return '#4F46E5';
        if (isGestionar) return '#059669';
        if (isAgent) return '#0ea5e9';
        return '#6b7280';
    };

    // Componentă Helper pentru Carduri
    const MenuCard = ({ title, icon: Icon, color, onPress, bg, sub, fullWidth }) => (
        <TouchableOpacity
            style={[styles.card, fullWidth ? {width: '100%'} : {width: (width - 55) / 2}]}
            onPress={onPress}
        >
            <View style={[styles.iconBox, { backgroundColor: bg }]}>
                <Icon size={32} color={color} />
            </View>
            <Text style={styles.cardTitle}>{title}</Text>
            {sub && <Text style={styles.cardSubtitle}>{sub}</Text>}
        </TouchableOpacity>
    );

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4F46E5" /></View>;

    return (
        <SafeAreaView style={styles.container}>
            {/* HEADER */}
            <View style={styles.header}>
                <View style={styles.userInfo}>
                    <View style={styles.avatar}>
                        <UserCircle size={32} color={getBadgeColor()} />
                    </View>
                    <View>
                        <Text style={styles.welcomeText}>Bine ai venit,</Text>
                        <Text style={styles.userName}>{userData.name}</Text>
                        <View style={[styles.badge, { backgroundColor: getBadgeColor() }]}>
                            <Text style={styles.badgeText}>{userData.role ? userData.role.toUpperCase() : 'UTILIZATOR'}</Text>
                        </View>
                    </View>
                </View>
                <TouchableOpacity onPress={() => supabase.auth.signOut()} style={styles.logoutBtn}>
                    <LogOut size={22} color="#ef4444" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* --- BANNER AI --- */}
                {isAdmin && aiAlerts.count > 0 && (
                    <TouchableOpacity
                        style={styles.aiBanner}
                        onPress={() => navigation.navigate('AdminSmartRestockScreen')}
                    >
                        <View style={{flexDirection:'row', alignItems:'center', gap:10}}>
                            <View style={styles.aiIconPulse}>
                                <BrainCircuit size={24} color="#fff" />
                            </View>
                            <View>
                                <Text style={styles.aiBannerTitle}>Consultant AI Activ</Text>
                                <Text style={styles.aiBannerText}>
                                    {aiAlerts.critical > 0
                                        ? `⚠️ ${aiAlerts.critical} produse necesită atenție urgentă!`
                                        : `ℹ️ ${aiAlerts.count} optimizări disponibile.`}
                                </Text>
                            </View>
                        </View>
                        <AlertTriangle size={20} color="#fff" style={{opacity:0.8}}/>
                    </TouchableOpacity>
                )}

                {/* --- GESTIUNE DEPOZIT --- */}
                {canViewWarehouse && (
                    <>
                        <Text style={styles.sectionTitle}>Gestiune Depozit</Text>
                        <View style={styles.grid}>
                            <MenuCard
                                title="Recepție"
                                icon={ClipboardCheck}
                                color="#059669"
                                bg="#d1fae5"
                                sub="Intrare Marfă"
                                onPress={() => navigation.navigate('InventoryReceipt')}
                            />

                            {/* --- AICI AM SCHIMBAT "VERIFICARE" CU "ETICHETE" (DOAR ADMIN) --- */}
                            {isAdmin ? (
                                <MenuCard
                                    title="Etichete"
                                    icon={Printer}
                                    color="#7c3aed" // Violet
                                    bg="#f3e8ff"    // Violet deschis
                                    sub="Printare Raft"
                                    onPress={() => Alert.alert("Funcție în lucru", "Modulul de imprimantă va fi disponibil curând.")}
                                />
                            ) : (
                                // Opțional: Dacă nu e admin, poți lăsa un spațiu gol sau altceva.
                                // Momentan nu afișăm nimic, deci grila se va rearanja.
                                null
                            )}

                            <MenuCard
                                title="Transfer"
                                icon={ArrowRightLeft}
                                color="#0891b2"
                                bg="#cffafe"
                                sub="Depozit → Raft"
                                onPress={() => navigation.navigate('TransferScreen')}
                            />

                            <MenuCard
                                title="Expirări"
                                icon={CalendarClock}
                                color="#d97706"
                                bg="#fef3c7"
                                sub="Monitorizare"
                                onPress={() => navigation.navigate('ExpirationsScreen')}
                            />

                            <MenuCard
                                title="Pierderi"
                                icon={AlertOctagon}
                                color="#dc2626"
                                bg="#fee2e2"
                                sub="Deteriorate"
                                onPress={() => navigation.navigate('ScrapScreen')}
                            />

                            <MenuCard
                                title="Inventar"
                                icon={ClipboardList}
                                color="#7c3aed"
                                bg="#f3e8ff"
                                sub="Corecție Stoc"
                                onPress={() => navigation.navigate('InventoryAuditScreen')}
                            />
                        </View>
                    </>
                )}

                {/* --- PANOU AGENT --- */}
                {isAgent && (
                    <View style={styles.adminSection}>
                        <Text style={styles.sectionTitle}>Panou Agent</Text>
                        <View style={styles.grid}>
                            <MenuCard title="Comandă Nouă" icon={Package} color="#0284c7" bg="#e0f2fe" onPress={() => navigation.navigate('AgentSupplyOrderScreen')} />
                            <MenuCard title="Istoric Comenzi" icon={ScrollText} color="#ea580c" bg="#ffedd5" onPress={() => navigation.navigate('AgentSupplyHistoryScreen')} />
                        </View>
                    </View>
                )}

                {/* --- PANOU ADMINISTRATOR --- */}
                {isAdmin && (
                    <View style={styles.adminSection}>
                        <Text style={styles.sectionTitle}>Panou Administrator</Text>
                        <View style={styles.grid}>

                            {/* Buton Adăugare Rapidă (Creat anterior) */}
                            <MenuCard
                                title="Adăugare Rapidă"
                                icon={PlusCircle}
                                color="#2563eb"
                                bg="#bfdbfe"
                                onPress={() => navigation.navigate('AddProduct')}
                            />

                            {/* Scanare Rapidă */}
                            <MenuCard
                                title="Scanare Rapidă"
                                icon={ScanBarcode}
                                color="#7c3aed"
                                bg="#f3e8ff"
                                onPress={() => navigation.navigate('AdminQuickAddScreen')}
                            />

                            <MenuCard title="Comenzi Agenți" icon={FileCheck} color="#d97706" bg="#fef3c7" onPress={() => navigation.navigate('AdminSupplyOrdersScreen')} />
                            <MenuCard title="AI Consultant" icon={BrainCircuit} color="#4F46E5" bg="#e0e7ff" sub="Strategie" onPress={() => navigation.navigate('AdminSmartRestockScreen')} />
                            <MenuCard title="Listă Produse" icon={Package} color="#475569" bg="#f1f5f9" onPress={() => navigation.navigate('ProductsList')} />
                            <MenuCard title="Retur Furnizor" icon={RotateCcw} color="#ef4444" bg="#fee2e2" onPress={() => navigation.navigate('SupplierReturnsScreen')} />
                            <MenuCard title="Rapoarte" icon={BarChart3} color="#15803d" bg="#dcfce7" onPress={() => navigation.navigate('ReportsScreen')} />
                            <MenuCard title="Istoric Recepții" icon={ScrollText} color="#ea580c" bg="#ffedd5" onPress={() => navigation.navigate('ReceiptsHistoryScreen')} />
                            <MenuCard title="Jurnal Erori" icon={FileWarning} color="#dc2626" bg="#fee2e2" onPress={() => navigation.navigate('AdminLogsScreen')} />
                            <MenuCard title="Echipă" icon={Users} color="#d97706" bg="#fef3c7" onPress={() => navigation.navigate('TeamScreen')} />
                            <MenuCard title="Furnizori" icon={Truck} color="#0d9488" bg="#ccfbf1" onPress={() => navigation.navigate('SupplierScreens')} />
                            <MenuCard title="Setări" icon={Settings} color="#475569" bg="#f1f5f9" onPress={() => navigation.navigate('SettingsScreen')} fullWidth />
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { padding: 20, backgroundColor: 'white', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: '#e2e8f0', elevation: 2 },
    userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 45, height: 45, borderRadius: 25, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
    welcomeText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
    userName: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 4, alignSelf: 'flex-start' },
    badgeText: { color: 'white', fontSize: 10, fontWeight: '800' },
    logoutBtn: { padding: 10, backgroundColor: '#fff1f2', borderRadius: 12 },
    scrollContent: { padding: 20, paddingBottom: 50 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 15, marginTop: 10, marginLeft: 5 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },

    // Stiluri Card
    card: {
        width: (width - 55) / 2,
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 20,
        marginBottom: 15,
        alignItems: 'center',
        borderWidth: 1, borderColor: '#f1f5f9',
        shadowColor: '#64748b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2
    },
    iconBox: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#334155', textAlign: 'center' },
    cardSubtitle: { fontSize: 11, color: '#94a3b8', marginTop: 2, textAlign: 'center' },
    adminSection: { marginTop: 20, paddingTop: 10, borderTopWidth: 1, borderColor: '#e2e8f0' },

    // Stiluri AI Banner
    aiBanner: {
        backgroundColor: '#4F46E5', borderRadius: 12, padding: 15, marginBottom: 20,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        shadowColor: '#4F46E5', shadowOffset: {width:0, height:4}, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4
    },
    aiIconPulse: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 20 },
    aiBannerTitle: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    aiBannerText: { color: '#e0e7ff', fontSize: 12, marginTop: 2 }
});