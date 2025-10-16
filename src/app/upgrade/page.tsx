'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function UpgradePage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [processingPlan, setProcessingPlan] = useState<string | null>(null);
    const [currentPlan, setCurrentPlan] = useState<string | null>(null);
    const [planStatus, setPlanStatus] = useState<string | null>(null);

    useEffect(() => {
        checkUser();
    }, []);

    const fetchBilling = async (uid: string) => {
        try {
            const res = await fetch(`/api/stripe/billing-info?userId=${uid}`);
            const data = await res.json();
            if (res.ok) {
                setCurrentPlan((data.plan || 'free').toLowerCase());
                setPlanStatus(data.status || null);
            } else {
                setCurrentPlan('free');
            }
        } catch (e) {
            setCurrentPlan('free');
        }
    };

    const checkUser = async () => {
        console.log('🔍 UPGRADE - Sprawdzam usera...');
        const { data: { user }, error } = await supabase.auth.getUser();
        
        console.log('🔍 UPGRADE - User:', user?.email || 'BRAK', 'Error:', error);

        // Naprawa pętli logowania: gdy JWT wskazuje na usuniętego usera
        const errMsg = (error as any)?.message || '';
        if (errMsg.includes('User from sub claim in JWT does not exist')) {
            console.warn('⚠️ UPGRADE - Stara sesja JWT. Czyszczę i kieruję do rejestracji.');
            try { await supabase.auth.signOut(); } catch {}
            try { sessionStorage.clear(); } catch {}
            try { localStorage.clear(); } catch {}
            window.location.href = '/register?reason=relogin';
            return;
        }
        
        if (!user) {
            console.error('❌ UPGRADE - Brak usera, przekierowuję do /login');
            alert('Sesja wygasła. Zaloguj się ponownie.');
            window.location.href = '/login';
            return;
        }
        
        console.log('✅ UPGRADE - User zalogowany:', user.email);
        setUser(user);
        await fetchBilling(user.id);
        setLoading(false);
    };

    const handleSelectPlan = async (planId: string, planName: string, price: number) => {
        if (!user) return;

        // Nie pozwalaj kupować tego samego planu ponownie
        if (currentPlan && (currentPlan === planId || (planId === 'business' && ['business','enterprise'].includes(currentPlan)))) {
            alert('Masz już aktywny ten plan.');
            return;
        }

        setProcessingPlan(planId);

        try {
            // Pobierz aktualną sesję z access_token
            console.log('🔄 Pobieram access token przed płatnością...');
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError || !session) {
                console.error('Błąd pobierania sesji:', sessionError);
                alert('Sesja wygasła. Zaloguj się ponownie.');
                window.location.href = '/login';
                return;
            }
            
            const accessToken = session.access_token;
            const refreshToken = session.refresh_token;
            
            console.log('✅ Mam tokeny, zapisuję do sessionStorage (przetrwa redirect)...');
            // sessionStorage przetrwa przekierowanie do Stripe!
            sessionStorage.setItem('payment_access_token', accessToken);
            sessionStorage.setItem('payment_refresh_token', refreshToken);
            
            const response = await fetch('/api/stripe/create-subscription', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.id,
                    userEmail: user.email,
                    planId: planId,
                }),
            });

            const data = await response.json();

            console.log('API Response:', { status: response.status, data });

            if (response.ok && data.checkout_url) {
                // Przekieruj do Stripe Checkout
                console.log('🚀 Przekierowuję do Stripe...');
                window.location.href = data.checkout_url;
            } else {
                console.error('Błąd API:', data);
                alert(data.error || 'Nie udało się utworzyć sesji płatności');
                setProcessingPlan(null);
            }
        } catch (error) {
            console.error('Błąd wyboru planu:', error);
            alert('Wystąpił błąd połączenia');
            setProcessingPlan(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        Ulepsz swój plan 🚀
                    </h1>
                    <p className="text-xl text-gray-600">
                        Wybierz plan i odblokuj pełnię możliwości
                    </p>
                    {currentPlan && (
                        <p className="mt-3 text-gray-600">
                            Twój obecny plan: <span className="font-semibold uppercase">{currentPlan}</span>
                            {planStatus ? <span className="ml-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 align-middle">{planStatus}</span> : null}
                        </p>
                    )}
                </div>

                {/* Plans Grid */}
                <div className="grid md:grid-cols-3 gap-8 mb-8">
                    
                    {/* STARTER */}
                    <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-gray-200 hover:border-blue-500 transition-all">
                        <div className="text-center mb-6">
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Starter</h3>
                            <div className="flex items-baseline justify-center gap-2">
                                <span className="text-4xl font-bold text-blue-600">9.99zł</span>
                                <span className="text-gray-500">/miesiąc</span>
                            </div>
                            {currentPlan === 'starter' && (
                                <div className="mt-2">
                                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Twój plan</span>
                                </div>
                            )}
                        </div>

                        <ul className="space-y-3 mb-8">
                            <li className="flex items-start gap-2">
                                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-gray-700"><strong>100 linków</strong>/miesiąc</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-gray-700">Podstawowe analytics</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-gray-700">Standardowe domeny</span>
                            </li>
                        </ul>

                        <button
                            onClick={() => handleSelectPlan('starter', 'Starter', 9.99)}
                            disabled={processingPlan === 'starter' || currentPlan === 'starter'}
                            className="w-full py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {currentPlan === 'starter' ? 'Obecny plan' : (processingPlan === 'starter' ? 'Przetwarzanie...' : 'Wybierz Starter')}
                        </button>
                    </div>

                    {/* PRO - POPULAR */}
                    <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-2xl p-8 border-2 border-blue-600 transform scale-105 relative">
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-gray-900 px-4 py-1 rounded-full text-sm font-bold">
                            Najpopularniejszy
                        </div>

                        <div className="text-center mb-6">
                            <h3 className="text-2xl font-bold text-white mb-2">PRO</h3>
                            <div className="flex items-baseline justify-center gap-2">
                                <span className="text-4xl font-bold text-white">29.99zł</span>
                                <span className="text-blue-100">/miesiąc</span>
                            </div>
                            {currentPlan === 'pro' && (
                                <div className="mt-2">
                                    <span className="px-2 py-1 text-xs rounded-full bg-yellow-200 text-gray-900">Twój plan</span>
                                </div>
                            )}
                        </div>

                        <ul className="space-y-3 mb-8">
                            <li className="flex items-start gap-2">
                                <svg className="w-5 h-5 text-yellow-300 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-white"><strong>1,000 linków</strong>/miesiąc</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <svg className="w-5 h-5 text-yellow-300 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-white">Zaawansowana analytics</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <svg className="w-5 h-5 text-yellow-300 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-white">Własne domeny</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <svg className="w-5 h-5 text-yellow-300 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-white">Wsparcie priorytetowe</span>
                            </li>
                        </ul>

                        <button
                            onClick={() => handleSelectPlan('pro', 'Pro', 29.99)}
                            disabled={processingPlan === 'pro' || currentPlan === 'pro'}
                            className="w-full py-3 px-6 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {currentPlan === 'pro' ? 'Obecny plan' : (processingPlan === 'pro' ? 'Przetwarzanie...' : 'Wybierz PRO')}
                        </button>
                    </div>

                    {/* ENTERPRISE */}
                    <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-gray-200 hover:border-purple-500 transition-all">
                        <div className="text-center mb-6">
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Enterprise</h3>
                            <div className="flex items-baseline justify-center gap-2">
                                <span className="text-4xl font-bold text-purple-600">99.99zł</span>
                                <span className="text-gray-500">/miesiąc</span>
                            </div>
                            {(['business','enterprise'] as const).includes(currentPlan as any) && (
                                <div className="mt-2">
                                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Twój plan</span>
                                </div>
                            )}
                        </div>

                        <ul className="space-y-3 mb-8">
                            <li className="flex items-start gap-2">
                                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-gray-700"><strong>∞ No limit</strong> (Unlimited) linków</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-gray-700">Dedykowany serwer</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-gray-700">White-label branding</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-gray-700">API access</span>
                            </li>
                        </ul>

                        <button
                            onClick={() => handleSelectPlan('business', 'Business', 99.99)}
                            disabled={processingPlan === 'business' || ['business','enterprise'].includes(currentPlan || '')}
                            className="w-full py-3 px-6 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {(['business','enterprise'].includes(currentPlan || '')) ? 'Obecny plan' : (processingPlan === 'business' ? 'Przetwarzanie...' : 'Wybierz Enterprise')}
                        </button>
                    </div>
                </div>

                {/* Back to dashboard */}
                <div className="text-center">
                    <a 
                        href="/dashboard" 
                        className="text-gray-600 hover:text-gray-900 underline"
                    >
                        ← Wróć do dashboardu
                    </a>
                </div>
            </div>
        </div>
    );
}
