import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; // Asigură-te că calea e corectă (.)
import {
    ArrowLeft, BrainCircuit, Activity, Hourglass,
    Package, Store, CalendarClock, ShoppingCart,
    CheckCircle2, ClipboardList, AlertTriangle
} from 'lucide-react';
import './AiConsultant.css'; // Importăm stilurile CSS

// Definim tipurile pentru a evita erorile de TypeScript
interface ProductAnalysis {
    id: number;
    nume: string;
    stocDepozit: number;
    stocMagazin: number;
    totalStock: number;
    daysActive: number;
    riskLevel: string;
    riskLabel: string;
    actionType: string;
    recommendedOrder: number;
    phaseLabel: string;
    productClass: string;
    isWeekendPrep: boolean;
}

// ATENȚIE: Aici este "export default" care lipsea
export default function AiConsultant() {
    const [predictions, setPredictions] = useState<ProductAnalysis[]>([]);
    const [loading, setLoading] = useState(true);

    // --- CONFIGURARE CELE 3 ETAPE (Logica rămâne neschimbată) ---
    const PHASE_1_SILENT_DAYS = 30;
    const PHASE_2_PROPOSAL_DAYS = 60;
    const STAGNATION_THRESHOLD_DAYS = 120;

    useEffect(() => {
        runAdvancedAiAnalysis();
    }, []);

    const runAdvancedAiAnalysis = async () => {
        setLoading(true);
        try {
            // 1. Luăm produsele + PREȚ
            const { data: products, error: prodError } = await supabase
                .from('produse')
                .select('id, nume, stoc_depozit, stoc_magazin, created_at, ultimul_pret_achizitie');

            if (prodError) throw prodError;

            // 2. Luăm istoricul (view_daily_usage) și pierderile (view_recent_losses)
            // NOTĂ: Asigură-te că ai aceste view-uri create în Supabase.
            // Dacă nu le ai, codul va da eroare aici.
            // Dacă nu ai view-uri, poți comenta liniile de mai jos și folosi date dummy temporar.
            const { data: historyData } = await supabase.from('view_daily_usage').select('*');
            const { data: lossData } = await supabase.from('view_recent_losses').select('*');

            if (!products) {
                setLoading(false);
                return;
            }

            // Fallback dacă nu avem date de istoric (pentru a nu crăpa aplicația)
            const safeHistory = historyData || [];
            const safeLoss = lossData || [];

            // --- A. ANALIZA ABC (Calcul venituri) ---
            let productRevenues: {id: any, revenue: number}[] = [];
            products.forEach(prod => {
                const prodHistory = safeHistory.filter((h: any) => h.produs_id === prod.id);
                const totalQtySold = prodHistory.reduce((acc: number, h: any) => acc + h.cantitate, 0);
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
                const prodHistory = safeHistory.filter((h: any) => h.produs_id === prod.id);
                let daysActive = 0;
                const today = new Date();

                if (prodHistory.length > 0) {
                    const dates = prodHistory.map((h: any) => new Date(h.data_zi).getTime());
                    const firstSale = new Date(Math.min(...dates));
                    daysActive = Math.ceil(Math.abs(today.getTime() - firstSale.getTime()) / (1000 * 60 * 60 * 24));
                } else if (prod.created_at) {
                    const createdDate = new Date(prod.created_at);
                    daysActive = Math.ceil(Math.abs(today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
                }
                if (daysActive === 0) daysActive = 1;

                // 3. Statistici Recente
                const recentSales = prodHistory
                    .filter((h: any) => {
                        const d = new Date(h.data_zi);
                        return Math.abs(today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24) <= 14;
                    })
                    .reduce((acc: number, h: any) => acc + h.cantitate, 0);

                const quantities = prodHistory.map((h: any) => h.cantitate);
                const sum = quantities.reduce((a: number, b: number) => a + b, 0);
                const avgDaily = quantities.length > 0 ? sum / quantities.length : 0;

                const prodLoss = safeLoss.find((l: any) => l.produs_id === prod.id);
                const lostQty = prodLoss ? prodLoss.total_pierderi : 0;

                // --- 4. LOGICA ETAPELOR ---
                let riskLevel = 'Ok';
                let riskLabel = 'Stoc Optim';
                let actionType = 'NONE';
                let finalOrder = 0;
                let isWeekendPrep = false;
                let salesNeed = 0;
                let safetyMargin = 0;
                let phaseLabel = "";

                // ETAPA 1
                if (daysActive < PHASE_1_SILENT_DAYS) {
                    phaseLabel = "Etapa 1: Învățare";
                    if (totalStock > 0) {
                        riskLevel = 'Learning';
                        riskLabel = 'Monitorizare...';
                        actionType = 'LEARN';
                    } else {
                        riskLevel = 'Critical';
                        riskLabel = 'Epuizat (Nou)';
                        actionType = 'ORDER';
                        finalOrder = 10;
                    }
                }
                // ETAPA 2
                else if (daysActive < PHASE_2_PROPOSAL_DAYS) {
                    phaseLabel = "Etapa 2: Propunere";
                    const leadTimeDays = 7;
                    salesNeed = Math.ceil(avgDaily * leadTimeDays);
                    safetyMargin = Math.ceil(salesNeed * 0.10) + Math.ceil(lostQty * 0.5);
                    const totalNeed = salesNeed + safetyMargin;
                    const orderNow = Math.max(0, totalNeed - totalStock);

                    if (totalStock === 0) {
                        riskLevel = 'Critical';
                        riskLabel = 'Epuizat';
                        actionType = 'ORDER';
                        finalOrder = orderNow;
                    } else if (orderNow > 0) {
                        riskLevel = 'Trial';
                        riskLabel = 'Propunere';
                        actionType = 'ORDER';
                        finalOrder = orderNow;
                    }
                }
                // ETAPA 3
                else {
                    phaseLabel = "Etapa 3: Expert";
                    if (daysActive > STAGNATION_THRESHOLD_DAYS && recentSales < 2 && totalStock > 0) {
                        riskLevel = 'Stagnant';
                        riskLabel = 'Blocaj';
                        actionType = 'REPLACE';
                    } else if (recentSales === 0 && totalStock > 0) {
                        riskLevel = 'Stopped';
                        riskLabel = 'Vânzare Oprită';
                        actionType = 'WARNING';
                    } else {
                        const todayDay = new Date().getDay();
                        let weekendMultiplier = 1.0;
                        if (todayDay === 4 || todayDay === 5) {
                            weekendMultiplier = 1.25;
                            isWeekendPrep = true;
                        }
                        const leadTimeDays = 7;
                        salesNeed = Math.ceil((avgDaily * leadTimeDays) * weekendMultiplier);
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
                    recommendedOrder: finalOrder,
                    riskLevel, riskLabel, actionType,
                    daysActive, productClass, isWeekendPrep, phaseLabel
                };
            })
                .filter((item: any) => item.riskLevel !== 'Ok');

            // Sortare
            const riskOrder: any = {
                'Critical': 7, 'High': 6, 'Trial': 5, 'Stagnant': 4,
                'Stopped': 3, 'Medium': 2, 'Learning': 1, 'Ok': 0
            };
            aiResults.sort((a, b) => riskOrder[b.riskLevel] - riskOrder[a.riskLevel]);

            setPredictions(aiResults);

        } catch (err) {
            console.error("Eroare AI:", err);
        } finally {
            setLoading(false);
        }
    };

    const getRiskColor = (item: any) => {
        if (item.riskLevel === 'Critical') return '#ef4444';
        if (item.riskLevel === 'Stagnant') return '#8b5cf6';
        if (item.riskLevel === 'Stopped') return '#64748b';
        if (item.riskLevel === 'Learning') return '#94a3b8';
        if (item.riskLevel === 'Trial') return '#f59e0b';
        if (item.actionType === 'ORDER') {
            if (item.productClass === 'A') return '#0ea5e9';
            return '#3b82f6';
        }
        return '#10b981';
    };

    if (loading) return <div className="loading-container"><div className="spinner"></div><p>AI-ul analizează datele...</p></div>;

    return (
        <div className="ai-dashboard-container">
            <header className="ai-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => window.history.back()}>
                        <ArrowLeft size={24} />
                    </button>
                    <div className="title-group">
                        <div className="main-title">
                            <BrainCircuit size={28} color="#0ea5e9" />
                            <h1>AI Consultant</h1>
                        </div>
                        <p className="subtitle">Sistem Maturitate: 30 / 60 Zile</p>
                    </div>
                </div>
            </header>

            {predictions.length === 0 ? (
                <div className="empty-state">
                    <CheckCircle2 size={64} color="#10b981" />
                    <h2>Sistem Optimizat</h2>
                    <p>Toate produsele sunt în parametri. Nu sunt necesare acțiuni urgente.</p>
                </div>
            ) : (
                <div className="predictions-grid">
                    {predictions.map((item) => {
                        const riskColor = getRiskColor(item);
                        const isLearning = item.actionType === 'LEARN';
                        const isStagnant = item.actionType === 'REPLACE';
                        const isStopped = item.actionType === 'WARNING';
                        const isOrder = item.actionType === 'ORDER';
                        const isTrialPhase = item.riskLevel === 'Trial';

                        return (
                            <div key={item.id} className="prediction-card" style={{ borderLeftColor: riskColor }}>
                                <div className="card-header">
                                    <div className="prod-info">
                                        <h3>{item.nume}</h3>
                                        <span className="phase-label" style={{ color: riskColor }}>
                                            {item.phaseLabel} ({item.daysActive} zile)
                                        </span>
                                    </div>
                                    <div className="badge" style={{ backgroundColor: riskColor + '15', borderColor: riskColor, color: riskColor }}>
                                        {isLearning ? <Hourglass size={14} /> : isTrialPhase ? <ClipboardList size={14} /> : <Activity size={14} />}
                                        <span>{item.riskLabel.toUpperCase()}</span>
                                    </div>
                                </div>

                                <div className="stock-info">
                                    <div className="stock-item">
                                        <Store size={16} className="icon-gray" />
                                        <span>Raft: <strong>{item.stocMagazin}</strong></span>
                                    </div>
                                    <span className="divider">|</span>
                                    <div className="stock-item">
                                        <Package size={16} className="icon-gray" />
                                        <span>Depozit: <strong>{item.stocDepozit}</strong></span>
                                    </div>
                                </div>

                                {isLearning && (
                                    <div className="learning-bar-container">
                                        <div className="learning-info">
                                            <Hourglass size={14} className="icon-gray" />
                                            <span>Colectăm date... ({item.daysActive}/{PHASE_1_SILENT_DAYS})</span>
                                        </div>
                                        <div className="progress-bar-bg">
                                            <div
                                                className="progress-bar-fill"
                                                style={{ width: `${Math.min(100, (item.daysActive / PHASE_1_SILENT_DAYS) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {isOrder && (
                                    <div className="order-section">
                                        {isTrialPhase && (
                                            <div className="insight-box trial">
                                                <ClipboardList size={14} />
                                                <span>Propunere bazată pe medie.</span>
                                            </div>
                                        )}
                                        {item.isWeekendPrep && (
                                            <div className="insight-box weekend">
                                                <CalendarClock size={14} />
                                                <span>Weekend boost (+25%) activat.</span>
                                            </div>
                                        )}

                                        <div className="recommendation-box">
                                            <div className="rec-text">
                                                <span>{isTrialPhase ? 'Propunere:' : 'Estimare Expert:'}</span>
                                                <span className="rec-value">+{item.recommendedOrder} buc</span>
                                            </div>
                                            <button
                                                className="action-btn"
                                                style={{ backgroundColor: riskColor }}
                                                onClick={() => alert(`Adăugat în lista de comenzi: ${item.recommendedOrder} buc pentru ${item.nume}`)}
                                            >
                                                <ShoppingCart size={18} />
                                                Adaugă
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {isStagnant && (
                                    <div className="alert-box purple">
                                        <AlertTriangle size={16} style={{display:'inline', marginRight:5}}/>
                                        Bani blocați. Rulaj lent.
                                    </div>
                                )}
                                {isStopped && <div className="alert-box gray">⚠️ Vânzări oprite brusc.</div>}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}