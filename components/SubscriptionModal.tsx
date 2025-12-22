import React, { useState } from 'react';
import { useSubscription } from './SubscriptionContext';
import { Zap, Shield, ShoppingCart, Check, X, Star } from 'lucide-react';

interface SubscriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    featureName?: string;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose, featureName }) => {
    const { userTier, upgradeToPro, buyCredits } = useSubscription();
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleUpgrade = async () => {
        setLoading(true);
        await upgradeToPro();
        setLoading(false);
        onClose();
    };

    const handleBuyCredits = async () => {
        setLoading(true);
        await buyCredits(50);
        setLoading(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <div className="relative w-full max-w-2xl bg-zinc-900 border-4 border-zinc-700 rounded-[3rem] p-8 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Background Accents */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-3 bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors z-10"
                >
                    <X size={32} />
                </button>

                <div className="flex flex-col items-center text-center space-y-6 relative z-10">
                    <div className="p-4 bg-amber-500/20 rounded-full mb-2">
                        <Star size={64} className="text-amber-500 fill-amber-500" />
                    </div>

                    <h2 className="text-5xl font-black text-white tracking-tight leading-tight">
                        {featureName ? `Unlock ${featureName}` : "Upgrade VisionAlly"}
                    </h2>

                    <p className="text-2xl text-zinc-400 font-medium max-w-lg">
                        {featureName
                            ? `The ${featureName} mode requires Pro access or Advanced Credits.`
                            : "Expand your independent living with our full suite of Intelligent Life Assistant features."}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mt-8">
                        {/* Pro Tier Card */}
                        <div className="bg-zinc-800/50 border-4 border-amber-500/30 rounded-[2.5rem] p-6 flex flex-col justify-between hover:border-amber-500/60 transition-all group">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <span className="bg-amber-500 text-black font-black px-4 py-1 rounded-full text-sm uppercase tracking-widest">Popular</span>
                                    <span className="text-amber-500 group-hover:scale-125 transition-transform"><Zap size={32} /></span>
                                </div>
                                <div className="text-left mb-6">
                                    <h3 className="text-3xl font-black text-white mb-2">Pro Ally</h3>
                                    <p className="text-zinc-400 font-semibold mb-4 leading-snug">Unlimited AI Reasoning & No Daily Limits</p>
                                    <div className="text-4xl font-black text-white">$9.99<span className="text-xl text-zinc-500">/mo</span></div>
                                </div>
                            </div>
                            <button
                                onClick={handleUpgrade}
                                disabled={loading}
                                className="w-full bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:bg-zinc-700 text-black font-black py-5 rounded-2xl text-xl transition-all shadow-lg shadow-amber-500/20"
                            >
                                {loading ? "Connecting..." : "Start Free Trial"}
                            </button>
                        </div>

                        {/* Credits Card */}
                        <div className="bg-zinc-800/50 border-4 border-zinc-700 rounded-[2.5rem] p-6 flex flex-col justify-between hover:border-zinc-600 transition-all group">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <span className="bg-zinc-700 text-zinc-300 font-black px-4 py-1 rounded-full text-sm uppercase tracking-widest">One-Time</span>
                                    <span className="text-zinc-400 group-hover:scale-125 transition-transform"><ShoppingCart size={32} /></span>
                                </div>
                                <div className="text-left mb-6">
                                    <h3 className="text-3xl font-black text-white mb-2">50 Credits</h3>
                                    <p className="text-zinc-400 font-semibold mb-4 leading-snug">Ideal for occasional specialized tasks</p>
                                    <div className="text-4xl font-black text-white">$5.00</div>
                                </div>
                            </div>
                            <button
                                onClick={handleBuyCredits}
                                disabled={loading}
                                className="w-full bg-zinc-600 hover:bg-zinc-500 active:scale-95 disabled:bg-zinc-800 text-white font-black py-5 rounded-2xl text-xl transition-all"
                            >
                                {loading ? "Connecting..." : "Buy 50 Credits"}
                            </button>
                        </div>
                    </div>

                    <div className="pt-6 flex flex-col items-center gap-2">
                        <div className="flex items-center gap-3 text-zinc-500 font-bold">
                            <Check className="text-green-500" size={24} />
                            <span>Cancel anytime • Secure with Stripe</span>
                        </div>
                        <p className="text-sm text-zinc-600 font-medium">
                            Free basic safety features remain accessible for all users.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
