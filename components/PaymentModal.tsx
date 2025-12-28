import React, { useState } from 'react';
import { CreditCard, CheckCircle, Lock, X, ExternalLink } from 'lucide-react';

interface PaymentModalProps {
    onSuccess: () => void;
    onClose: () => void;
    paymentLink: string;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ onSuccess, onClose, paymentLink }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handlePay = () => {
        setLoading(true);
        if (paymentLink.includes("placeholder")) {
            alert("DEVELOPER NOTE: You must replace the Stripe Link in App.tsx with your actual Stripe Payment Link.");
            setLoading(false);
            return;
        }
        window.location.href = paymentLink;
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 relative shadow-2xl animate-in fade-in zoom-in-95 leading-normal">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white"
                >
                    <X size={24} />
                </button>

                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
                        <Lock size={32} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Unlock Full Access</h2>
                    <p className="text-gray-400">
                        You've used your free attempts. Upgrade to VisionAlly <span className="text-purple-400 font-bold">Premium</span> for unlimited scans and detailed analysis.
                    </p>
                </div>

                <div className="space-y-3 mb-8">
                    <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                        <CheckCircle className="text-green-500" size={20} />
                        <span className="text-gray-200">Unlimited Environment Scans</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                        <CheckCircle className="text-green-500" size={20} />
                        <span className="text-gray-200">Real-time Danger Alerts</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                        <CheckCircle className="text-green-500" size={20} />
                        <span className="text-gray-200">Advanced Step Distance Estimation</span>
                    </div>
                </div>

                <button
                    onClick={handlePay}
                    disabled={loading}
                    className="w-full bg-[#635BFF] hover:bg-[#5851E1] text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <span className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></span>
                    ) : (
                        <>
                            <span>Proceed to Checkout</span>
                            <ExternalLink size={20} />
                        </>
                    )}
                </button>

                <div className="mt-4 text-center">
                    <p className="text-xs text-gray-500">
                        Secured by <span className="font-bold text-white">Stripe</span>. Cancel anytime.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;
