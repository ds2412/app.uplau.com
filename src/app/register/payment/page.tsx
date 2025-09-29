'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function PaymentPage() {
    console.log('🎯 PAYMENT PAGE: Komponent się ładuje!');
    
    const [selectedPlan, setSelectedPlan] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [cardNumber, setCardNumber] = useState('');
    const [expiryDate, setExpiryDate] = useState('');

    // Formatowanie numeru karty - dodaje spacje co 4 cyfry
    const formatCardNumber = (value: string) => {
        // Usuń wszystkie nie-cyfry
        const numbers = value.replace(/\D/g, '');
        // Ograniczy do 16 cyfr
        const limited = numbers.substring(0, 16);
        // Dodaj spacje co 4 cyfry
        const formatted = limited.replace(/(\d{4})(?=\d)/g, '$1 ');
        return formatted;
    };

    // Formatowanie daty ważności - dodaje slash po 2 cyfrach
    const formatExpiryDate = (value: string) => {
        // Usuń wszystkie nie-cyfry
        const numbers = value.replace(/\D/g, '');
        // Ograniczy do 4 cyfr (MMYY)
        const limited = numbers.substring(0, 4);
        // Dodaj slash po 2 cyfrach
        if (limited.length >= 2) {
            return limited.substring(0, 2) + '/' + limited.substring(2);
        }
        return limited;
    };

    const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatCardNumber(e.target.value);
        setCardNumber(formatted);
    };

    const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatExpiryDate(e.target.value);
        setExpiryDate(formatted);
    };

    useEffect(() => {
        console.log('🔄 PAYMENT: useEffect - sprawdzam localStorage...');
        
        // Pobierz wybrany plan z localStorage
        const plan = localStorage.getItem('selectedPlan');
        const userEmail = localStorage.getItem('userEmail');
        const userId = localStorage.getItem('userId');
        
        console.log('💾 PAYMENT: localStorage values:', { plan, userEmail, userId });
        
        if (plan) {
            setSelectedPlan(plan);
        } else {
            // Jeśli brak planu, wróć do wyboru
            window.location.href = '/register/plan';
        }
    }, []);

    const planDetails = {
        starter: { name: '⭐ STARTER', price: '9.99zł', features: '1,000 linków/miesiąc' },
        pro: { name: '🚀 PRO', price: '29.99zł', features: '10,000 linków/miesiąc' },
        business: { name: '💼 BUSINESS', price: '99.99zł', features: '100,000 linków/miesiąc' },
        enterprise: { name: '🏢 ENTERPRISE', price: 'Cena dedykowana', features: 'Unlimited' }
    };

    const currentPlan = planDetails[selectedPlan as keyof typeof planDetails];

    const handlePayment = async () => {
        console.log('🚀 PAYMENT: Rozpoczynam proces płatności...');
        setLoading(true);
        
        try {
            console.log('🔍 PAYMENT: Pobieram dane użytkownika z Supabase...');
            
            // Pobierz dane użytkownika z Supabase z retry
            let user = null;
            let userError = null;
            
            // Pierwsze sprawdzenie
            // DODATKOWE DEBUG: sprawdź localStorage
            const storedEmail = localStorage.getItem('userEmail');
            const storedUserId = localStorage.getItem('userId');
            console.log('💾 PAYMENT: localStorage data:', { email: storedEmail, userId: storedUserId });
            
            console.log('🔍 PAYMENT: Pierwsze sprawdzenie sesji...');
            const result1 = await supabase.auth.getUser();
            user = result1.data.user;
            userError = result1.error;
            console.log('🔍 PAYMENT: Wynik pierwszego sprawdzenia:', { user: user?.email, userError });
            
            // Jeśli nie ma usera, spróbuj ponownie
            if (!user || userError) {
                console.log('⚠️ PAYMENT: Pierwsze sprawdzenie bez usera, próbuję ponownie...');
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                console.log('🔍 PAYMENT: Drugie sprawdzenie sesji...');
                const result2 = await supabase.auth.getUser();
                user = result2.data.user;
                userError = result2.error;
                console.log('🔍 PAYMENT: Wynik drugiego sprawdzenia:', { user: user?.email, userError });
            }
            
            console.log('✅ PAYMENT: Final user:', { email: user?.email, id: user?.id, userError });
            const billingCycle = localStorage.getItem('billingCycle') || 'monthly';
            console.log('💰 PAYMENT: BillingCycle z localStorage:', billingCycle);
            
            // Jeśli sesja Supabase nie działa, spróbuj użyć danych z localStorage
            if (userError || !user) {
                console.warn('⚠️ PAYMENT: Sesja Supabase nie działa, próbuję localStorage...');
                const storedEmail = localStorage.getItem('userEmail');
                const storedUserId = localStorage.getItem('userId');
                
                if (storedEmail && storedUserId) {
                    console.log('✅ PAYMENT: Używam danych z localStorage:', { storedEmail, storedUserId });
                    // Symuluj user object z localStorage
                    user = { email: storedEmail, id: storedUserId } as any;
                } else {
                    console.error('❌ PAYMENT: Brak danych w localStorage');
                    alert('Błąd: Problem z sesją użytkownika. Spróbuj ponownie.');
                    setLoading(false);
                    return;
                }
            }

            const userEmail = user.email;
            const userId = user.id;

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

            console.log('🔍 PAYMENT: Received response status:', response.status);
            console.log('🔍 PAYMENT: Response headers:', response.headers);
            
            // Sprawdź czy response to JSON
            let data;
            try {
                const responseText = await response.text();
                console.log('📄 PAYMENT: Raw response text:', responseText);
                
                data = JSON.parse(responseText);
                console.log('✅ PAYMENT: Parsed JSON:', data);
            } catch (jsonError) {
                console.error('❌ PAYMENT: Response nie jest JSON:', jsonError);
                throw new Error('Błąd serwera - nieprawidłowy format odpowiedzi');
            }
            
            console.log('🎯 PAYMENT: Final API Response:', data);
            console.log('🎯 PAYMENT: Response status:', response.status);
            
            if (response.ok && (data.checkoutUrl || data.checkout_url)) {
                const checkoutUrl = data.checkoutUrl || data.checkout_url;
                console.log('🚀 PAYMENT: Przekierowuję do Stripe:', checkoutUrl);
                
                // Pokaż komunikat o przekierowaniu
                setShowSuccess(true);
                setTimeout(() => {
                    // Przekieruj do Stripe Checkout
                    window.location.href = checkoutUrl;
                }, 2000);
            } else {
                throw new Error(data.error || `Błąd API (${response.status}): ${JSON.stringify(data)}`);
            }
        } catch (error) {
            console.error('Błąd płatności:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            alert('Wystąpił błąd podczas przygotowywania płatności: ' + (error as Error).message);
            setLoading(false);
        }
    };

    const handleBackToPlan = () => {
        window.location.href = '/register/plan';
    };

    if (!currentPlan) {
        return <div>Ładowanie...</div>;
    }

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
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Przekierowujemy do płatności! 💳</h3>
                        <p className="text-gray-600 mb-4">
                            Za chwilę zostaniesz przekierowany do bezpiecznej strony płatności Stripe.
                            <br />Po opłaceniu otrzymasz email z potwierdzeniem.
                        </p>
                        <div className="text-sm text-gray-500">
                            Przekierowanie za 2 sekundy...
                        </div>
                    </div>
                </div>
            )}
            
            <div className="max-w-2xl w-full space-y-8">
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
                                <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">✓</div>
                                <span className="ml-2 text-sm font-medium text-green-600">Plan</span>
                            </div>
                            <div className="w-8 h-px bg-green-600"></div>
                            <div className="flex items-center">
                                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">3</div>
                                <span className="ml-2 text-sm font-medium text-blue-600">Płatność</span>
                            </div>
                        </div>
                    </div>

                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                        Finalizuj zamówienie
                    </h2>
                    <p className="text-gray-600 text-sm">
                        Krok 3 z 3: Uzupełnij dane płatności
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    {/* Podsumowanie zamówienia */}
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Podsumowanie zamówienia</h3>
                        <div className="flex justify-between items-center">
                            <div>
                                <span className="font-medium text-gray-900">{currentPlan.name}</span>
                                <p className="text-sm text-gray-600">{currentPlan.features}</p>
                            </div>
                            <div className="text-right">
                                <span className="text-2xl font-bold text-blue-600">{currentPlan.price}</span>
                                {currentPlan.price !== 'Cena dedykowana' && (
                                    <p className="text-sm text-gray-500">miesięcznie</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Formularz płatności */}
                    <div className="px-6 py-6">
                        <div className="space-y-6">
                            {/* Dane karty */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-2">
                                    Numer karty
                                </label>
                                <input 
                                    type="text" 
                                    placeholder="1234 5678 9012 3456"
                                    value={cardNumber}
                                    onChange={handleCardNumberChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                    maxLength={19}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                                        Data ważności
                                    </label>
                                    <input 
                                        type="text" 
                                        placeholder="MM/RR"
                                        value={expiryDate}
                                        onChange={handleExpiryDateChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                        maxLength={5}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                                        CVV
                                    </label>
                                    <input 
                                        type="text" 
                                        placeholder="123"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                        maxLength={4}
                                    />
                                </div>
                            </div>

                            {/* Imię i nazwisko */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-2">
                                    Imię i nazwisko na karcie
                                </label>
                                <input 
                                    type="text" 
                                    placeholder="Jan Kowalski"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                />
                            </div>

                            {/* Kraj */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-2">
                                    Kraj
                                </label>
                                <select className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200">
                                    <option value="PL">🇵🇱 Polska</option>
                                    <option value="DE">🇩🇪 Niemcy</option>
                                    <option value="US">🇺🇸 USA</option>
                                    <option value="GB">🇬🇧 Wielka Brytania</option>
                                </select>
                            </div>

                            {/* Bezpieczeństwo */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-center">
                                    <svg className="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-sm text-blue-700 font-medium">
                                        Bezpieczne płatności przez Stripe SSL
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Przyciski */}
                    <div className="bg-gray-50 px-6 py-4 flex space-x-4">
                        <button 
                            onClick={handleBackToPlan}
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200"
                        >
                            ← Wróć do planów
                        </button>
                        <button 
                            onClick={handlePayment}
                            disabled={loading}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
                        >
                            {loading ? 'Przetwarzanie...' : `Zapłać ${currentPlan.price}`}
                        </button>
                    </div>
                </div>

                {/* Trust badges */}
                <div className="text-center text-xs text-gray-500">
                    <p>🔒 Płatności zabezpieczone przez Stripe</p>
                    <p>💳 Akceptujemy Visa, Mastercard, BLIK</p>
                    <p>🚫 Możesz anulować w każdej chwili</p>
                </div>
            </div>
        </div>
    );
}