import React, { createContext, useContext, useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';

// --- Stripe Configuration ---
// TO DO: Replace with your actual Stripe Publishable Key from the dashboard
const STRIPE_PUBLISHABLE_KEY = 'pk_test_...';
const PRO_PRODUCT_ID = 'prod_TeYRKzd8oQwdRb';
const CREDITS_PRODUCT_ID = 'prod_TeYkVg9qcBukgt';

// Price IDs from Stripe Dashboard
const PRO_MONTHLY_PRICE_ID = 'price_1ShFKeK8miO3FOA7tcXteivO';
const CREDITS_50_PRICE_ID = 'price_1ShFckK8miO3FOA77SnFuIjt';

export type UserTier = 'free' | 'pro';

interface SubscriptionContextType {
    userTier: UserTier;
    credits: number;
    isSubscriptionActive: boolean;
    isFeatureLocked: (feature: string) => boolean;
    upgradeToPro: () => Promise<void>;
    buyCredits: (amount: number) => Promise<void>;
    spendCredit: () => void;
    resetCredits: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [userTier, setUserTier] = useState<UserTier>('free');
    const [credits, setCredits] = useState(10); // 10 gift credits for new users

    // Persist state to local storage for demo purposes
    useEffect(() => {
        const saved = localStorage.getItem('visionally_sub_state');
        // Check for "success" in URL to simulate payment completion
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('payment') === 'success') {
            const plan = urlParams.get('plan');
            if (plan === 'pro') {
                setUserTier('pro');
                // Remove the param from URL without reloading
                window.history.replaceState({}, document.title, window.location.pathname);
            } else if (plan === 'credits') {
                setCredits(prev => prev + 50);
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }

        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setUserTier(parsed.tier || 'free');
                setCredits(parsed.credits ?? (urlParams.get('payment') === 'success' ? parsed.credits : 10));
            } catch (e) {
                console.error("Error loading subscription state", e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('visionally_sub_state', JSON.stringify({ tier: userTier, credits }));
    }, [userTier, credits]);

    const upgradeToPro = async () => {
        const stripe = await loadStripe(STRIPE_PUBLISHABLE_KEY);
        if (!stripe) return;

        // In a production app, you would typically call your backend 
        // to create a Checkout Session and get a sessionId back.
        // For a client-only demo using Stripe Checkout:
        const { error } = await stripe.redirectToCheckout({
            lineItems: [{ price: PRO_MONTHLY_PRICE_ID, quantity: 1 }],
            mode: 'subscription',
            successUrl: `${window.location.origin}${window.location.pathname}?payment=success&plan=pro`,
            cancelUrl: `${window.location.origin}${window.location.pathname}?payment=cancel`,
        });

        if (error) console.error("Stripe Error:", error);
    };

    const buyCredits = async (amount: number) => {
        const stripe = await loadStripe(STRIPE_PUBLISHABLE_KEY);
        if (!stripe) return;

        const { error } = await stripe.redirectToCheckout({
            lineItems: [{ price: CREDITS_50_PRICE_ID, quantity: 1 }],
            mode: 'payment',
            successUrl: `${window.location.origin}${window.location.pathname}?payment=success&plan=credits`,
            cancelUrl: `${window.location.origin}${window.location.pathname}?payment=cancel`,
        });

        if (error) console.error("Stripe Error:", error);
    };

    const spendCredit = () => {
        if (userTier === 'pro') return;
        setCredits(prev => Math.max(0, prev - 1));
    };

    const resetCredits = () => {
        setCredits(10);
        setUserTier('free');
    };

    const isFeatureLocked = (featureId: string) => {
        if (userTier === 'pro') return false;

        // Core features are ALWAYS free
        const coreFeatures = ['search', 'location', 'edge', 'privacy'];
        if (coreFeatures.includes(featureId)) return false;

        // Safety features (Phase 3) have limited free use or are also free for survival
        // But for this strategy, we'll lock Phase 4+ lifestyle/complex features
        const premiumFeatures = ['social', 'kitchen', 'transit', 'laundry', 'appliance', 'pathfinder'];

        if (premiumFeatures.includes(featureId)) {
            return credits <= 0;
        }

        return false;
    };

    return (
        <SubscriptionContext.Provider value={{
            userTier,
            credits,
            isSubscriptionActive: userTier === 'pro',
            isFeatureLocked,
            upgradeToPro,
            buyCredits,
            spendCredit,
            resetCredits
        }}>
            {children}
        </SubscriptionContext.Provider>
    );
};

export const useSubscription = () => {
    const context = useContext(SubscriptionContext);
    if (!context) {
        throw new Error('useSubscription must be used within a SubscriptionProvider');
    }
    return context;
};
