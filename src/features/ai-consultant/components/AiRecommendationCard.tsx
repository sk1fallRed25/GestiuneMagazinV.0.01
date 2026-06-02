import React from 'react';
import { Link } from 'react-router-dom';
import { AiRecommendation } from '../types';
import { AlertCircle, AlertTriangle, Info, ArrowUpRight } from 'lucide-react';

interface AiRecommendationCardProps {
    recommendation: AiRecommendation;
}

interface EnrichedDetails {
    title: string;
    description: string;
    operationalImpact: string;
    recommendedAction: string;
    actionLabel: string;
    pathname: string;
    state?: Record<string, any>;
}

const getRecommendationDetails = (id: string, originalTitle: string, originalDescription: string): EnrichedDetails => {
    switch (id) {
        case 'low-stock':
            return {
                title: 'Stoc scăzut la produse active',
                description: originalDescription || 'Există produse cu stoc sub pragul de siguranță.',
                operationalImpact: 'Risc iminent de pierdere a vânzărilor din cauza indisponibilității mărfurilor la raft.',
                recommendedAction: 'Verifică produsele cu stoc sub 5 bucăți și pregătește o nouă recepție sau comandă de reaprovizionare.',
                actionLabel: 'Deschide lista cu stoc scăzut',
                pathname: '/produse',
                state: { aiFilter: 'low_stock' }
            };
        case 'no-stock':
            return {
                title: 'Produse cu stoc zero',
                description: originalDescription || 'Există produse active care au stocul complet epuizat.',
                operationalImpact: 'Pierderi active de vânzări zilnice și scăderea satisfacției clienților.',
                recommendedAction: 'Refă stocul prin comenzi urgente sau marchează produsele ca inactive în catalog dacă nu se mai comercializează.',
                actionLabel: 'Vezi produse epuizate',
                pathname: '/produse',
                state: { aiFilter: 'no_stock' }
            };
        case 'expiry-risk':
            return {
                title: 'Produse cu risc de expirare',
                description: originalDescription || 'Există loturi de produse active aproape de data expirării.',
                operationalImpact: 'Pierderi financiare directe prin degradare de mărfuri și riscuri legale de conformitate.',
                recommendedAction: 'Verifică loturile cu valabilitate redusă, organizează raftul conform regulii FIFO sau aplică reduceri agresive de preț.',
                actionLabel: 'Vezi produse cu risc expirare',
                pathname: '/expirari',
                state: {}
            };
        case 'dead-stock':
            return {
                title: 'Produse fără mișcare (Dead Stock)',
                description: originalDescription || 'Ai produse cu stoc care nu s-au vândut deloc în ultimele 30 de zile.',
                operationalImpact: 'Capital de lucru blocat în stocuri ineficiente și ocuparea spațiului valoros de depozitare.',
                recommendedAction: 'Evaluează prețul de vânzare, poziționarea la raft sau creează o promoție specială de lichidare.',
                actionLabel: 'Vezi produse fără vânzare',
                pathname: '/produse',
                state: { aiFilter: 'dead_stock' }
            };
        case 'no-sales':
            return {
                title: 'Inactivitate vânzări detectată',
                description: originalDescription || 'Nu s-au înregistrat tranzacții finalizate în perioada analizată.',
                operationalImpact: 'Lipsă de rulaj financiar pe magazinul selectat.',
                recommendedAction: 'Asigură-te că terminalul POS funcționează normal și că tranzacțiile zilnice se înregistrează corect.',
                actionLabel: 'Vezi rapoarte comerciale',
                pathname: '/rapoarte',
                state: { section: 'top_products' }
            };
        default:
            return {
                title: originalTitle,
                description: originalDescription,
                operationalImpact: 'Poate influența performanța comercială și starea generală a stocurilor.',
                recommendedAction: 'Verifică detaliile corespunzătoare în panourile secundare ale magazinului.',
                actionLabel: 'Vezi stocuri',
                pathname: '/produse',
                state: {}
            };
    }
};

export const AiRecommendationCard: React.FC<AiRecommendationCardProps> = ({
    recommendation
}) => {
    const config = {
        critical: { 
            bg: 'from-red-50/70 to-red-100/10', 
            border: 'border-red-200 dark:border-red-900/50',
            text: 'text-red-900',
            subText: 'text-red-700/80',
            iconColor: 'text-red-600', 
            badge: 'CRITICAL',
            icon: <AlertCircle size={22} />
        },
        warning: { 
            bg: 'from-orange-50/70 to-orange-100/10', 
            border: 'border-orange-200 dark:border-orange-900/50',
            text: 'text-orange-900', 
            subText: 'text-orange-700/80',
            iconColor: 'text-orange-600', 
            badge: 'ATENȚIE',
            icon: <AlertTriangle size={22} />
        },
        info: { 
            bg: 'from-indigo-50/70 to-indigo-100/10', 
            border: 'border-indigo-200 dark:border-indigo-900/50',
            text: 'text-indigo-900', 
            subText: 'text-indigo-700/80',
            iconColor: 'text-indigo-600', 
            badge: 'INFO',
            icon: <Info size={22} />
        }
    };

    const style = config[recommendation.severity as keyof typeof config] || config.info;
    const details = getRecommendationDetails(recommendation.id, recommendation.title, recommendation.description);

    return (
        <div className={`bg-white bg-gradient-to-br ${style.bg} border ${style.border} p-6 rounded-3xl shadow-sm transition-all duration-300 hover:shadow-md flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6`}>
            <div className="flex items-start gap-4 min-w-0 flex-1">
                <div className={`w-11 h-11 rounded-2xl ${style.iconColor} bg-white flex items-center justify-center shrink-0 shadow-sm border border-slate-100`}>
                    {style.icon}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 mb-1">
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black tracking-wider ${style.iconColor} border border-current bg-white/80`}>
                            {style.badge}
                        </span>
                    </div>
                    <h3 className={`text-lg font-black tracking-tight ${style.text} truncate`}>{details.title}</h3>
                    <p className={`text-sm font-semibold ${style.text} opacity-90 mt-1 leading-relaxed`}>{details.description}</p>
                    
                    {/* Operational Impact and Action */}
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200/50 text-xs">
                        <div>
                            <span className="font-black uppercase tracking-tighter text-[9px] opacity-60 block">Impact Operațional:</span>
                            <span className={`font-semibold ${style.subText}`}>{details.operationalImpact}</span>
                        </div>
                        <div>
                            <span className="font-black uppercase tracking-tighter text-[9px] opacity-60 block">Acțiune Recomandată:</span>
                            <span className={`font-semibold ${style.subText}`}>{details.recommendedAction}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <Link 
                to={details.pathname}
                state={details.state}
                className="w-full xl:w-auto shrink-0 px-5 py-3.5 bg-white text-slate-800 hover:text-indigo-600 font-black text-xs rounded-xl border border-slate-200 hover:border-indigo-500 shadow-sm transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
            >
                {details.actionLabel}
                <ArrowUpRight size={14} />
            </Link>
        </div>
    );
};

