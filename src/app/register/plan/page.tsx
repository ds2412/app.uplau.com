'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function PlanSelectionPage() {
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    
    useEffect(() => {
        checkExistingUser();
    }, []);

    const checkExistingUser = async () => {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            
            if (user) {
                // Sprawdź czy ma już subskrypcję
                const { data: subscription } = await supabase
                    .from('subscriptions')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                if (subscription && subscription.status === 'active') {
                    // Ma aktywną subskrypcję - redirect do dashboard
                    window.location.href = '/dashboard';
                }
            }
        } catch (error) {
            console.error('Błąd sprawdzania użytkownika:', error);
        }
    };
    const [selectedPlan, setSelectedPlan] = useState('free');
    const [loading, setLoading] = useState(false);

    const handleContinue = async () => {
        if (loading) return; // Zapobiegaj wielokrotnym kliknięciom
        
        setLoading(true);
        
        if (selectedPlan === 'free') {
            // Free plan - stwórz FREE subskrypcję przez API (omijając RLS)
            try {
                console.log('🆓 PLAN: Tworzę FREE subskrypcję przez API...');
                
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    throw new Error('Brak użytkownika');
                }
                
                // Użyj API endpoint zamiast bezpośredniego Supabase
                const response = await fetch('/api/auth/create-free-subscription', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        userId: user.id,
                        userEmail: user.email
                    }),
                });

                const result = await response.json();
                
                if (!response.ok) {
                    throw new Error(result.error || 'Błąd API');
                }
                
                console.log('✅ FREE subskrypcja utworzona przez API:', result);
                
                // Pokaż success modal dla FREE
                console.log('✅ Pokazuję modal sukcesu');
                setSuccessMessage('Plan FREE został aktywowany! Przekierowuję do dashboardu...');
                setShowSuccess(true);
                
                // Krótki timeout i natychmiastowe przekierowanie
                console.log('⏰ Ustawiam timeout na przekierowanie...');
                setTimeout(() => {
                    console.log('🚀 TIMEOUT: Przekierowuję teraz do dashboard!');
                    window.location.href = '/dashboard';
                }, 1500);
                
                // BACKUP: Jeśli timeout nie zadziała
                setTimeout(() => {
                    console.log('🚨 BACKUP REDIRECT: Wymuszam przekierowanie!');
                    window.location.replace('/dashboard');
                }, 3000);
                
            } catch (error) {
                console.error('❌ Błąd tworzenia FREE subskrypcji:', error);
                console.log('🚀 Przekierowuję do dashboard pomimo błędu...');
                setLoading(false);
                alert('Wystąpił błąd, ale przekierowujemy Cię do dashboardu: ' + (error as Error).message);
                window.location.href = '/dashboard';
            }
        } else {
            // Płatny plan - od razu do Stripe!
            try {
                console.log('🚀 PLAN: Przekierowuję do Stripe dla planu:', selectedPlan);
                
                // Pobierz dane użytkownika z Supabase (zamiast localStorage)
                const { data: { user } } = await supabase.auth.getUser();
                
                if (!user || !user.email) {
                    throw new Error('Brak danych użytkownika - zaloguj się ponownie');
                }
                
                const userEmail = user.email;
                const userId = user.id;
                
                console.log('✅ PLAN: Dane użytkownika pobrane:', { userEmail, userId });
                
                // Wywołaj API do stworzenia Stripe Checkout
                const response = await fetch('/api/stripe/create-subscription', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        planId: selectedPlan,
                        billingCycle: billingCycle,
                        userId: userId,
                        userEmail: userEmail,
                    }),
                });

                const data = await response.json();
                
                if (response.ok && (data.checkoutUrl || data.checkout_url)) {
                    const checkoutUrl = data.checkoutUrl || data.checkout_url;
                    console.log('🚀 PLAN: Przekierowuję do Stripe:', checkoutUrl);
                    
                    // ZAPISZ TIMESTAMP PRÓBY PŁATNOŚCI I WYBRANY PLAN
                    localStorage.setItem('lastPaymentAttempt', new Date().getTime().toString());
                    localStorage.setItem('selectedPlan', selectedPlan);
                    localStorage.setItem('selectedBillingCycle', billingCycle);
                    console.log('💾 Zapisuję timestamp próby płatności:', new Date().getTime());
                    console.log('💾 Zapisuję wybrany plan:', selectedPlan, billingCycle);
                    
                    // Pokaż komunikat o przekierowaniu i przekieruj
                    setSuccessMessage('Przekierowuję do płatności...');
                    setShowSuccess(true);
                    
                    setTimeout(() => {
                        window.location.href = checkoutUrl;
                    }, 1500);
                } else {
                    throw new Error(data.error || 'Błąd podczas tworzenia płatności');
                }
                
            } catch (error) {
                console.error('Błąd płatności:', error);
                alert('Wystąpił błąd podczas przygotowywania płatności: ' + (error as Error).message);
            }
        }
    };

    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

    const plans = [
        {
            id: 'free',
            name: '🆓 FREE',
            monthlyPrice: 0,
            yearlyPrice: 0,
            features: ['100 linków/miesiąc', 'Podstawowe analytics', 'Standardowe domeny'],
            popular: false
        },
        {
            id: 'starter', 
            name: '⭐ STARTER',
            monthlyPrice: 9.99,
            yearlyPrice: 99.99, // 2 miesiące gratis
            features: ['1,000 linków/miesiąc', 'Zaawansowane analytics', 'Custom short domains'],
            popular: true
        },
        {
            id: 'pro',
            name: '🚀 PRO', 
            monthlyPrice: 29.99,
            yearlyPrice: 299.99, // 2 miesiące gratis
            features: ['10,000 linków/miesiąc', 'Bulk operations', 'API access', 'Team collaboration (3 users)'],
            popular: false
        },
        {
            id: 'business',
            name: '💼 BUSINESS',
            monthlyPrice: 99.99,
            yearlyPrice: 999.99, // 2 miesiące gratis
            features: ['100,000 linków/miesiąc', 'White-label branding', 'Advanced integrations', 'Unlimited team', 'Priority support'],
            popular: false
        },
        {
            id: 'enterprise',
            name: '🏢 ENTERPRISE',
            monthlyPrice: null,
            yearlyPrice: null,
            features: ['Unlimited everything', 'Dedykowany server', 'SLA 99.9%', 'Custom integrations', 'Account manager'],
            popular: false
        }
    ];

    const getCurrentPrice = (plan: typeof plans[0]) => {
        if (plan.monthlyPrice === null) return 'Dedykowana cena';
        if (plan.monthlyPrice === 0) return '0zł';
        
        const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
        const period = billingCycle === 'monthly' ? '/miesiąc' : '/rok';
        
        return `${price}zł${period}`;
    };

    const getSavings = (plan: typeof plans[0]) => {
        if (plan.monthlyPrice === null || plan.monthlyPrice === 0 || billingCycle === 'monthly') return null;
        
        const monthlyCost = plan.monthlyPrice * 12;
        const yearlyCost = plan.yearlyPrice;
        const savings = monthlyCost - yearlyCost;
        
        return `Oszczędzasz ${savings}zł`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            {/* Success Modal */}
            {showSuccess && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Gotowe! 🎉</h3>
                        <p className="text-gray-600 mb-4">
                            {successMessage}
                        </p>
                        <div className="text-sm text-gray-500">
                            Przekierowanie za chwilę...
                        </div>
                    </div>
                </div>
            )}
            
            <div className="max-w-4xl w-full space-y-8">
                <div className="text-center">
                    <div className="flex justify-center mb-6">
                        <Image 
                            src="/logo.png" 
                            alt="Logo" 
                            width={60}
                            height={60}
                            className="rounded-xl shadow-lg"
                        />
                    </div>
                    
                    {/* Progress indicator */}
                    <div className="mb-8">
                        <div className="flex items-center justify-center space-x-4">
                            <div className="flex items-center">
                                <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">✓</div>
                                <span className="ml-2 text-sm font-medium text-green-600">Konto</span>
                            </div>
                            <div className="w-8 h-px bg-green-600"></div>
                            <div className="flex items-center">
                                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">2</div>
                                <span className="ml-2 text-sm font-medium text-blue-600">Plan</span>
                            </div>
                        </div>
                    </div>

                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                        Wybierz plan
                    </h2>
                    <p className="text-gray-600 text-sm">
                        Krok 2 z 2: Wybierz odpowiedni plan dla siebie
                    </p>
                    
                    {/* Billing cycle toggle */}
                    <div className="flex items-center justify-center mt-8 mb-6">
                        <div className="bg-gray-100 rounded-lg p-1 flex">
                            <button
                                onClick={() => setBillingCycle('monthly')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                    billingCycle === 'monthly'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                Miesięcznie
                            </button>
                            <button
                                onClick={() => setBillingCycle('yearly')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                    billingCycle === 'yearly'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                Rocznie
                                <span className="ml-1 text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                                    -17%
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Plans grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                    {plans.map((plan) => (
                        <div 
                            key={plan.id}
                            className={`relative bg-white rounded-2xl border-2 p-6 cursor-pointer transition-all duration-200 ${
                                selectedPlan === plan.id 
                                    ? 'border-blue-500 shadow-lg scale-105' 
                                    : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                            } ${plan.popular ? 'ring-2 ring-blue-500' : ''}`}
                            onClick={() => setSelectedPlan(plan.id)}
                        >
                            {plan.popular && (
                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                    <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                                        Najpopularniejszy
                                    </span>
                                </div>
                            )}
                            
                            <div className="text-center mb-4">
                                <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                                <div className="text-2xl font-bold text-blue-600 mb-2">{getCurrentPrice(plan)}</div>
                                {getSavings(plan) && (
                                    <div className="text-sm text-green-600 font-medium">{getSavings(plan)}</div>
                                )}
                            </div>
                            
                            <ul className="space-y-3 mb-6">
                                {plan.features.map((feature, index) => (
                                    <li key={index} className="flex items-center text-sm text-gray-600">
                                        <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                            
                            <div className="text-center">
                                <div className={`w-6 h-6 rounded-full border-2 mx-auto ${
                                    selectedPlan === plan.id 
                                        ? 'bg-blue-500 border-blue-500' 
                                        : 'border-gray-300'
                                }`}>
                                    {selectedPlan === plan.id && (
                                        <svg className="w-4 h-4 text-white m-0.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Continue button */}
                <div className="text-center mt-8">
                    <button 
                        onClick={handleContinue}
                        disabled={loading}
                        className={`font-semibold py-3 px-8 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg ${
                            loading 
                                ? 'bg-gray-400 cursor-not-allowed' 
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                    >
                        {loading ? 'Ładowanie...' : (selectedPlan === 'free' ? 'Rozpocznij za darmo' : 'Kontynuuj do płatności')}
                    </button>
                    <p className="text-xs text-gray-500 mt-2">
                        {selectedPlan === 'free' ? 'Brak opłat, możesz anulować w każdej chwili' : 'Możesz anulować w każdej chwili'}
                    </p>
                </div>
            </div>
        </div>
    );
}