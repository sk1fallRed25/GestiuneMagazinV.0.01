import React from 'react';

interface PosLockScreenProps {
    onOpenShiftClick: () => void;
    loading: boolean;
}

export const PosLockScreen: React.FC<PosLockScreenProps> = ({ onOpenShiftClick, loading }) => {
    return (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md rounded-3xl p-6 text-center animate-fadeIn">
            <div className="max-w-md w-full bg-slate-900 border border-slate-700/80 rounded-3xl p-8 shadow-2xl shadow-indigo-950/50 space-y-6 transform animate-scaleUp">
                {/* Icon Container */}
                <div className="w-20 h-20 bg-gradient-to-tr from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                    <svg className="w-10 h-10 text-indigo-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>

                {/* Text Content */}
                <div className="space-y-2">
                    <h3 className="text-2xl font-extrabold text-white tracking-tight">POS Blocat — Tură Închisă</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        Pentru a efectua vânzări, înregistra produse și încasa bani, este necesar să deschizi o tură de casier activă pe magazinul curent.
                    </p>
                </div>

                {/* Action Button */}
                <div className="pt-2">
                    <button
                        onClick={onOpenShiftClick}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-4 px-6 rounded-2xl shadow-xl shadow-indigo-600/30 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-3 disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Se verifică starea...</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-base tracking-wide font-extrabold">Deschide Tură Nouă</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Footer note */}
                <div className="text-xs text-slate-500 flex items-center justify-center space-x-1.5">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Conform normelor fiscale, tranzacțiile necesită trasabilitate per casier.</span>
                </div>
            </div>
        </div>
    );
};
