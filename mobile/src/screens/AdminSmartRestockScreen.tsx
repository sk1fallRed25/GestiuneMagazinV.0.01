import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, SafeAreaView
} from 'react-native';
import { supabase } from '../lib/supabase';
import {
    ArrowLeft, BrainCircuit, Activity, ShieldCheck, ShoppingCart,
    CheckCircle2, RefreshCcw, PauseCircle,
    Hourglass, Package, Store, CalendarClock, TrendingUp, ClipboardList
} from 'lucide-react-native';

export default function AdminSmartRestockScreen({ navigation }) {
    const [predictions, setPredictions] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- CONFIGURARE CELE 3 ETAPE ---
    const PHASE_1_SILENT_DAYS = 30;   // 0-30 zile: Tăcere
    const PHASE_2_PROPOSAL_DAYS = 60; // 30-60 zile: Propuneri (Calibrare)
    // Peste 60 zile: Expert (Estimare)

    const STAGNATION_THRESHOLD_DAYS = 120;

    useEffect(() => {
        runAdvancedAiAnalysis();
    }, []);

    const runAdvancedAiAnalysis = async () => {
        setLoading(true);
        try {
            // 1. Luăm produsele + PREȚ (pentru a calcula importanța financiară - ABC)
            const { data: products } = await supabase
                .from('produse')
                .select('id, nume, stoc_depozit, stoc_magazin, created_at, ultimul_pret_achizitie');

            const { data: historyData } = await supabase.from('view_daily_usage').select('*');
            const { data: lossData } = await supabase.from('view_recent_losses').select('*');

            // --- A. ANALIZA ABC (Doar pentru faza EXPERT) ---
            let productRevenues = [];
            products.forEach(prod => {
                const prodHistory = historyData.filter(h => h.produs_id === prod.id);
                const totalQtySold = prodHistory.reduce((acc, h) => acc + h.cantitate, 0);
                const estimatedRevenue = totalQtySold * (prod.ultimul_pret_achizitie || 1);
                productRevenues.push({ id: prod.id, revenue: estimatedRevenue });
            });
            productRevenues.sort((a, b) => b.revenue - a.revenue);

            const countA = Math.ceil(productRevenues.length * 0.2);
            const countB = Math.ceil(productRevenues.length * 0.5);

            const aiResults = products.map(prod => {
                const stocDepozit = prod.stoc_depozit || 0;
                const stocMagazin = prod.stoc_magazin || 0;
                const totalStock = stocDepozit + stocMagazin;

                // 1. Clasa ABC
                const rankIndex = productRevenues.findIndex(p => p.id === prod.id);
                let productClass = 'C';
                if (rankIndex !== -1) {
                    if (rankIndex < countA) productClass = 'A';
                    else if (rankIndex < countB) productClass = 'B';
                }

                // 2. Vechime (Zile Active)
                const prodHistory = historyData.filter(h => h.produs_id === prod.id);
                let daysActive = 0;
                if (prodHistory.length > 0) {
                    const dates = prodHistory.map(h => new Date(h.data_zi).getTime());
                    const firstSale = new Date(Math.min(...dates));
                    const today = new Date();
                    daysActive = Math.ceil(Math.abs(today - firstSale) / (1000 * 60 * 60 * 24));
                } else if (prod.created_at) {
                    const createdDate = new Date(prod.created_at);
                    const today = new Date();
                    daysActive = Math.ceil(Math.abs(today - createdDate) / (1000 * 60 * 60 * 24));
                }
                if (daysActive === 0) daysActive = 1;

                // 3. Statistici
                const recentSales = prodHistory
                    .filter(h => {
                        const d = new Date(h.data_zi);
                        const today = new Date();
                        return Math.abs(today - d) / (1000 * 60 * 60 * 24) <= 14;
                    })
                    .reduce((acc, h) => acc + h.cantitate, 0);

                const quantities = prodHistory.map(h => h.cantitate);
                const sum = quantities.reduce((a, b) => a + b, 0);
                const avgDaily = quantities.length > 0 ? sum / quantities.length : 0;

                const prodLoss = lossData.find(l => l.produs_id === prod.id);
                const lostQty = prodLoss ? prodLoss.total_pierderi : 0;

                // --- 4. LOGICA PE CELE 3 ETAPE ---
                let riskLevel = 'Ok';
                let riskLabel = 'Stoc Optim';
                let actionType = 'NONE';
                let finalOrder = 0;
                let isWeekendPrep = false;
                let salesNeed = 0;
                let safetyMargin = 0;
                let phaseLabel = ""; // Textul etapei

                // =========================================================
                // ETAPA 1: SILENT (0 - 30 Zile)
                // =========================================================
                if (daysActive < PHASE_1_SILENT_DAYS) {
                    phaseLabel = "Etapa 1: Învățare";
                    if (totalStock > 0) {
                        riskLevel = 'Learning';
                        riskLabel = 'Monitorizare...';
                        actionType = 'LEARN';
                        finalOrder = 0; // TĂCERE TOTALĂ
                    } else {
                        riskLevel = 'Critical';
                        riskLabel = 'Epuizat (Nou)';
                        actionType = 'ORDER';
                        finalOrder = 10;
                    }
                }

                    // =========================================================
                    // ETAPA 2: PROPUNERE / CALIBRARE (30 - 60 Zile)
                // =========================================================
                else if (daysActive < PHASE_2_PROPOSAL_DAYS) {
                    phaseLabel = "Etapa 2: Propunere";

                    // Calcul simplu (Matematică pură, fără strategii complexe)
                    const leadTimeDays = 7;
                    salesNeed = Math.ceil(avgDaily * leadTimeDays);
                    safetyMargin = Math.ceil(salesNeed * 0.10) + Math.ceil(lostQty * 0.5); // Marjă standard 10%

                    const totalNeed = salesNeed + safetyMargin;
                    const orderNow = Math.max(0, totalNeed - totalStock);

                    if (totalStock === 0) {
                        riskLevel = 'Critical';
                        riskLabel = 'Epuizat';
                        actionType = 'ORDER';
                        finalOrder = orderNow;
                    } else if (orderNow > 0) {
                        riskLevel = 'Trial'; // Nivel special "Trial"
                        riskLabel = 'Propunere';
                        actionType = 'ORDER';
                        finalOrder = orderNow;
                    }
                }

                    // =========================================================
                    // ETAPA 3: EXPERT / ESTIMARE (60+ Zile)
                // =========================================================
                else {
                    phaseLabel = "Etapa 3: Expert";

                    // Verificări Avansate (Blocaje)
                    if (daysActive > STAGNATION_THRESHOLD_DAYS && recentSales < 2 && totalStock > 0) {
                        riskLevel = 'Stagnant';
                        riskLabel = 'Blocaj';
                        actionType = 'REPLACE';
                    }
                    else if (recentSales === 0 && totalStock > 0) {
                        riskLevel = 'Stopped';
                        riskLabel = 'Vânzare Oprită';
                        actionType = 'WARNING';
                    }
                    else {
                        // Strategie Complexă (Weekend + ABC)
                        const todayDay = new Date().getDay();
                        let weekendMultiplier = 1.0;
                        if (todayDay === 4 || todayDay === 5) {
                            weekendMultiplier = 1.25;
                            isWeekendPrep = true;
                        }

                        const leadTimeDays = 7;
                        salesNeed = Math.ceil((avgDaily * leadTimeDays) * weekendMultiplier);

                        // Marjă dinamică
                        let safetyFactor = 0.1;
                        if (productClass === 'A') safetyFactor = 0.3;
                        if (productClass === 'B') safetyFactor = 0.2;

                        safetyMargin = Math.ceil(salesNeed * safetyFactor) + Math.ceil(lostQty * 0.5);
                        const totalNeed = salesNeed + safetyMargin;
                        const orderNow = Math.max(0, totalNeed - totalStock);

                        if (totalStock === 0) {
                            riskLevel = 'Critical';
                            riskLabel = 'EPUIZAT';
                            actionType = 'ORDER';
                            finalOrder = orderNow;
                        } else if (orderNow > 0) {
                            if (productClass === 'A') {
                                riskLevel = 'High';
                                riskLabel = 'Prioritate VIP';
                            } else {
                                riskLevel = 'Medium';
                                riskLabel = 'Estimare Optimă';
                            }
                            actionType = 'ORDER';
                            finalOrder = orderNow;
                        }
                    }
                }

                return {
                    ...prod,
                    totalStock, stocDepozit, stocMagazin,
                    salesNeed, safetyMargin,
                    recommendedOrder: finalOrder,
                    riskLevel, riskLabel, actionType,
                    daysActive, productClass, isWeekendPrep,
                    phaseLabel // Trimitem și eticheta etapei
                };
            })
                .filter(item => item.riskLevel !== 'Ok');

            // Sortare complexă
            const riskOrder = {
                'Critical': 7,
                'High': 6,
                'Trial': 5, // Propunerile sunt importante
                'Stagnant': 4,
                'Stopped': 3,
                'Medium': 2,
                'Learning': 1,
                'Ok': 0
            };
            aiResults.sort((a, b) => riskOrder[b.riskLevel] - riskOrder[a.riskLevel]);

            setPredictions(aiResults);

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getRiskColor = (item) => {
        if (item.riskLevel === 'Critical') return '#ef4444'; // Roșu
        if (item.riskLevel === 'Stagnant') return '#8b5cf6'; // Violet
        if (item.riskLevel === 'Stopped') return '#64748b';  // Gri Albăstrui
        if (item.riskLevel === 'Learning') return '#94a3b8'; // Gri
        if (item.riskLevel === 'Trial') return '#f59e0b';    // Portocaliu (Propunere)

        // Comenzi Expert
        if (item.actionType === 'ORDER') {
            if (item.productClass === 'A') return '#0ea5e9'; // Albastru Intens
            return '#3b82f6'; // Albastru
        }
        return '#10b981';
    };

    const renderPredictionItem = ({ item }) => {
        const riskColor = getRiskColor(item);

        const isLearning = item.actionType === 'LEARN';
        const isStagnant = item.actionType === 'REPLACE';
        const isStopped = item.actionType === 'WARNING';
        const isOrder = item.actionType === 'ORDER';

        // Verificăm dacă e faza 2 (Propunere)
        const isTrialPhase = item.riskLevel === 'Trial';

        return (
            <View style={[styles.card, { borderLeftColor: riskColor, borderLeftWidth: 4 }]}>
                {/* ANTET */}
                <View style={styles.headerRow}>
                    <View style={{flex:1}}>
                        <Text style={styles.prodName}>{item.nume}</Text>
                        <Text style={[styles.phaseText, {color: riskColor}]}>
                            {item.phaseLabel} ({item.daysActive} zile)
                        </Text>
                    </View>

                    <View style={[styles.badge, { backgroundColor: riskColor + '15', borderColor: riskColor }]}>
                        {isLearning ? <Hourglass size={12} color={riskColor}/> :
                            isTrialPhase ? <ClipboardList size={12} color={riskColor}/> :
                                <Activity size={12} color={riskColor} />}
                        <Text style={[styles.badgeText, { color: riskColor }]}>{item.riskLabel.toUpperCase()}</Text>
                    </View>
                </View>

                {/* INFO STOC */}
                <View style={styles.stockContainer}>
                    <View style={styles.stockItem}>
                        <Store size={14} color="#6b7280" />
                        <Text style={styles.stockText}>Raft: <Text style={{fontWeight:'bold'}}>{item.stocMagazin}</Text></Text>
                    </View>
                    <Text style={{color:'#cbd5e1'}}>|</Text>
                    <View style={styles.stockItem}>
                        <Package size={14} color="#6b7280" />
                        <Text style={styles.stockText}>Depozit: <Text style={{fontWeight:'bold'}}>{item.stocDepozit}</Text></Text>
                    </View>
                </View>

                {/* --- ETAPA 1: ÎNVĂȚARE (0-30 zile) --- */}
                {isLearning && (
                    <View style={styles.learningContainer}>
                        <Hourglass size={14} color="#9ca3af" />
                        <Text style={styles.learningText}>Colectăm date... ({item.daysActive}/{PHASE_1_SILENT_DAYS})</Text>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, {width: `${Math.min(100, (item.daysActive / PHASE_1_SILENT_DAYS) * 100)}%`}]} />
                        </View>
                    </View>
                )}

                {/* --- ETAPA 2 & 3: COMANDĂ --- */}
                {isOrder && (
                    <View style={styles.orderSection}>
                        {/* Mesaj special pentru Etapa 2 */}
                        {isTrialPhase && (
                            <View style={[styles.insightBox, {backgroundColor:'#fffbeb'}]}>
                                <ClipboardList size={14} color="#d97706" />
                                <Text style={[styles.insightText, {color:'#b45309'}]}>
                                    Aceasta este o propunere bazată pe medie. Te rugăm să verifici.
                                </Text>
                            </View>
                        )}

                        {/* Mesaje Expert Etapa 3 */}
                        {item.isWeekendPrep && (
                            <View style={styles.insightBox}>
                                <CalendarClock size={14} color="#0369a1" />
                                <Text style={styles.insightText}>Weekend boost (+25%) activat.</Text>
                            </View>
                        )}

                        <View style={styles.recommendationBox}>
                            <View>
                                <Text style={styles.recLabel}>
                                    {isTrialPhase ? 'Propunere:' : 'Estimare Expert:'}
                                </Text>
                                <Text style={styles.recValue}>+{item.recommendedOrder} buc</Text>
                            </View>
                            <TouchableOpacity style={[styles.actionBtn, {backgroundColor: riskColor}]} onPress={() => alert(`Adăugat ${item.recommendedOrder} buc`)}>
                                <ShoppingCart size={20} color="white" />
                                <Text style={styles.btnText}>Adaugă</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* --- ALERTE SPECIALE --- */}
                {isStagnant && (
                    <View style={styles.alertBoxPurple}>
                        <Text style={styles.alertTextPurple}>Bani blocați. Rulaj lent.</Text>
                    </View>
                )}
                {isStopped && (
                    <View style={styles.alertBoxGray}>
                        <Text style={{fontSize:12, color:'#475569'}}>⚠️ Vânzări oprite brusc.</Text>
                    </View>
                )}

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
                    <View style={{flexDirection:'row', alignItems:'center', gap:8}}>
                        <BrainCircuit size={24} color="#0ea5e9" />
                        <Text style={styles.title}>AI Consultant</Text>
                    </View>
                    <Text style={styles.subtitle}>Sistem Maturitate: 30 / 60 Zile</Text>
                </View>
            </View>

            {loading ? <ActivityIndicator size="large" color="#0ea5e9" style={{marginTop:50}} /> : (
                <FlatList
                    data={predictions}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderPredictionItem}
                    contentContainerStyle={{ padding: 20 }}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <CheckCircle2 size={64} color="#10b981" />
                            <Text style={styles.emptyTitle}>Sistem Optimizat</Text>
                            <Text style={styles.emptyText}>Toate produsele sunt în parametri.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { padding: 20, backgroundColor: 'white', flexDirection: 'row', gap: 15, alignItems: 'center', elevation: 1 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
    subtitle: { fontSize: 13, color: '#64748b' },

    card: { backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 12, elevation: 2, shadowColor:'#64748b', shadowOpacity:0.08, shadowRadius:4 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    prodName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', flex:1, marginRight:10 },
    phaseText: { fontSize:11, fontStyle:'italic', marginTop:2, fontWeight:'600' },

    badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth:1 },
    badgeText: { fontSize:10, fontWeight:'bold' },

    stockContainer: { flexDirection:'row', alignItems:'center', gap:12, marginBottom:12 },
    stockItem: { flexDirection:'row', alignItems:'center', gap:6 },
    stockText: { fontSize:13, color:'#475569' },

    insightBox: { flexDirection:'row', gap:8, alignItems:'center', backgroundColor:'#f0f9ff', padding:8, borderRadius:6, marginBottom:10 },
    insightText: { fontSize:11, color:'#0369a1', fontStyle:'italic', flex:1 },

    alertBoxPurple: { backgroundColor: '#faf5ff', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e9d5ff' },
    alertTextPurple: { fontSize: 12, color: '#6b21a8' },
    alertBoxGray: { backgroundColor: '#f1f5f9', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },

    learningContainer: { marginTop:5, alignItems:'center', flexDirection:'row', gap:10 },
    learningText: { fontSize:12, color:'#94a3b8', flex:1 },
    progressBarBg: { height:6, backgroundColor:'#f1f5f9', borderRadius:3, width:60 },
    progressBarFill: { height:'100%', backgroundColor:'#cbd5e1', borderRadius:3 },

    orderSection: { marginTop:5, paddingTop:10, borderTopWidth:1, borderColor:'#f1f5f9' },

    recommendationBox: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop:5, backgroundColor:'#f8fafc', padding:10, borderRadius:12 },
    recLabel: { fontSize:12, color:'#475569', fontWeight:'600' },
    recValue: { fontSize:18, fontWeight:'bold', color:'#0f172a' },

    actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal:16, borderRadius: 10, gap: 8 },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },

    emptyState: { alignItems: 'center', marginTop: 50, padding:20 },
    emptyTitle: { fontSize:18, fontWeight:'bold', color:'#334155', marginTop:15 },
    emptyText: { textAlign: 'center', marginTop: 5, color: '#94a3b8' }
});