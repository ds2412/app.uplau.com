'use client';

import { useEffect, useState } from 'react';

export default function PaymentSuccessPage() {
    const [countdown, setCountdown] = useState(3);
    
    useEffect(() => {
        // Krótsze odliczanie - 3 sekundy
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    // Przekieruj na login
                    window.location.href = '/login';
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        
        return () => clearInterval(timer);
    }, []);
    
    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
                {/* Success Icon */}
                <div className="mb-6">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-bounce">
                        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                </div>
                
                {/* Heading */}
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    Płatność zakończona! 🎉
                </h1>
                
                <p className="text-lg text-gray-600 mb-6">
                    Twoja subskrypcja została aktywowana pomyślnie!
                </p>
                
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
                    <p className="text-blue-900 font-medium mb-2">
                        ✅ Webhook Stripe zapisał Twoją subskrypcję
                    </p>
                    <p className="text-sm text-blue-700">
                        Zaloguj się tym samym kontem Google którym płaciłeś, aby zobaczyć swoją nową subskrypcję PRO!
                    </p>
                </div>
                
                {/* Countdown */}
                <div className="mb-6">
                    <p className="text-gray-500 text-sm mb-2">
                        Automatyczne przekierowanie za:
                    </p>
                    <div className="text-6xl font-bold text-blue-600 animate-pulse">
                        {countdown}
                    </div>
                </div>
                
                {/* Manual Link */}
                <div className="space-y-3">
                    <a 
                        href="/login"
                        className="block w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
                    >
                        Zaloguj się teraz →
                    </a>
                    
                    <p className="text-xs text-gray-500 border-t pt-3">
                        💡 Użyj tego samego konta Google co przy płatności
                    </p>
                </div>
            </div>
        </div>
    );
}
