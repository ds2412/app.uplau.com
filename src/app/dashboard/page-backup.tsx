'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function DashboardPage() {
    const [user, setUser] = useState<any>(null);
    const [subscription, setSubscription] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [billingInfo, setBillingInfo] = useState<any>(null);
    const [activeSection, setActiveSection] = useState('home');

    useEffect(() => {
        // Sprawdź czy to redirect z Stripe
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');
        
        if (sessionId) {
            console.log('🎉 Płatność udana! Session ID:', sessionId);
            // Wyczyść URL
            window.history.replaceState({}, '', '/dashboard');
            
            // Ustaw flagę płatności
            localStorage.setItem('paymentSuccess', 'true');
        }
        
        setTimeout(() => {
            checkUserAndSubscription();
        }, 1000); // Daj chwilę na załadowanie sesji
    }, []);

    const checkUserAndSubscription = async () => {
        try {
            // Sprawdź czy user jest zalogowany
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            
            console.log('Dashboard - sprawdzam usera:', user, userError);
            
            if (userError || !user) {
                console.log('Brak usera, przekierowuję do logowania');
                // Sprawdź czy to redirect z Stripe
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('session_id')) {
                    // To redirect z Stripe - spróbuj ponownie za chwilę
                    console.log('Redirect z Stripe - czekam na sesję...');
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                    return;
                }
                window.location.href = '/login';
                return;
            }

            setUser(user);

            console.log('📅 User metadata:', user.user_metadata);
            console.log('📅 Created at:', user.created_at);
            
            // Sprawdź czy to nowy użytkownik (utworzony < 5 minut temu)
            const userCreated = new Date(user.created_at);
            const now = new Date();
            const isNewUser = (now.getTime() - userCreated.getTime()) < 5 * 60 * 1000; // 5 minut
            
            console.log('🆕 Is new user?', isNewUser, { userCreated, now });

            // Sprawdź status subskrypcji
            const { data: subData, error: subError } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (subError) {
                console.error('Błąd pobierania subskrypcji:', JSON.stringify(subError, null, 2));
                
                // Jeśli użytkownik nie ma subskrypcji
                if (subError.code === 'PGRST116' || subError.message?.includes('No rows')) {
                    // SPRAWDŹ CZY TO POWRÓT Z PŁATNOŚCI
                    const paymentSuccess = localStorage.getItem('paymentSuccess');
                    if (paymentSuccess) {
                        console.log('💳 Powrót z udanej płatności - nie przekierowuję do planu');
                        localStorage.removeItem('paymentSuccess');
                        // Pokaż komunikat że płatność się przetwarza
                        alert('Płatność zakończona pomyślnie! Twoja subskrypcja zostanie aktywowana w ciągu kilku minut.');
                        setLoading(false);
                        return;
                    }
                    
                    // NOWY UŻYTKOWNIK → przekieruj do wyboru planu
                    if (isNewUser) {
                        console.log('🆕 Nowy użytkownik bez subskrypcji → przekierowanie do wyboru planu');
                        window.location.href = '/register/plan';
                        return;
                    }
                    
                    // STARY UŻYTKOWNIK → stwórz FREE subskrypcję
                    console.log('🆓 Stary użytkownik bez subskrypcji → tworzę FREE');
                    
                    try {
                        // Użyj API endpoint żeby ominaść RLS
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
                        
                        if (response.ok) {
                            console.log('✅ FREE subskrypcja utworzona:', result.subscription);
                            setSubscription(result.subscription);
                        } else {
                            console.error('Błąd tworzenia FREE subskrypcji:', result.error);
                        }
                    } catch (insertError) {
                        console.error('Exception podczas tworzenia FREE subskrypcji:', insertError);
                    }
                }
            } else {
                setSubscription(subData);
                
                // Sprawdź czy subskrypcja jest aktywna
                if (subData && subData.status !== 'active' && subData.plan_id !== 'free') {
                    alert('Twoja subskrypcja nie jest aktywna. Przekierowujemy do płatności.');
                    window.location.href = '/register/payment';
                    return;
                }
            }
        } catch (error) {
            console.error('Błąd sprawdzania użytkownika:', error);
            window.location.href = '/login';
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        window.location.href = '/login';
    };

    const fetchBillingInfo = async () => {
        if (!user) return;
        
        try {
            const response = await fetch(`/api/stripe/billing-info?userId=${user.id}`);
            const data = await response.json();
            setBillingInfo(data);
        } catch (error) {
            console.error('Błąd pobierania billing info:', error);
        }
    };

    const handleManageSubscription = async () => {
        if (!user) return;
        
        try {
            const response = await fetch('/api/stripe/customer-portal', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.id,
                    returnUrl: window.location.origin + '/dashboard'
                }),
            });

            const data = await response.json();
            
            if (response.ok && data.portalUrl) {
                window.location.href = data.portalUrl;
            } else {
                alert('Błąd: ' + (data.error || 'Nie można otworzyć portalu billing'));
            }
        } catch (error) {
            console.error('Błąd portalu billing:', error);
            alert('Wystąpił błąd podczas otwierania portalu billing');
        }
    };

    // Pobierz billing info gdy user się załaduje
    useEffect(() => {
        if (user) {
            fetchBillingInfo();
        }
    }, [user]);

    // Early return - DOPIERO PO wszystkich hookach
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Sprawdzamy Twoją subskrypcję...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Left Sidebar */}
            <div className="w-64 bg-white shadow-sm border-r border-gray-200">
                {/* Logo */}
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                        <img 
                            src="/logo.png" 
                            alt="uplau logo" 
                            className="w-8 h-8 rounded-lg"
                        />
                        <span className="text-xl font-bold text-blue-600">uplau</span>
                    </div>
                    {/* Status subskrypcji */}
                    <div className="mt-3 text-xs">
                        {subscription ? (
                            <div className={`px-2 py-1 rounded-full text-center ${
                                subscription.status === 'active' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                            }`}>
                                {subscription.plan_id?.toUpperCase() || 'FREE'} - {
                                    subscription.status === 'active' ? 'AKTYWNY' : 'NIEAKTYWNY'
                                }
                            </div>
                        ) : (
                            <div className="px-2 py-1 rounded-full text-center bg-gray-100 text-gray-800">
                                FREE
                            </div>
                        )}
                    </div>
                </div>

                {/* Create New Button */}
                <div className="p-4">
                    <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                        Stwórz nowy
                    </button>
                </div>

                {/* Navigation */}
                <nav className="px-4 space-y-1">
                    <button 
                        onClick={() => setActiveSection('home')}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg ${
                            activeSection === 'home' 
                                ? 'bg-blue-50 text-blue-700 font-medium' 
                                : 'text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                        <span>🏠</span>
                        <span>Home</span>
                    </button>
                    <button className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100">
                        <span>🔗</span>
                        <span>Linki</span>
                    </button>
                    <button className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100">
                        <span>📱</span>
                        <span>QR Codes</span>
                        <span className="ml-auto bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">SPRÓBUJ</span>
                    </button>
                    <button className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100">
                        <span>📄</span>
                        <span>Strony</span>
                        <span className="ml-auto bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">SPRÓBUJ</span>
                    </button>
                    <button className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100">
                        <span>📊</span>
                        <span>Analityka</span>
                        <span className="ml-auto bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">SPRÓBUJ</span>
                    </button>
                    <button className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100">
                        <span>📢</span>
                        <span>Kampanie</span>
                    </button>
                    <button className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100">
                        <span>🌐</span>
                        <span>Własne domeny</span>
                    </button>
                    <button 
                        onClick={() => setActiveSection('billing')}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg ${
                            activeSection === 'billing' 
                                ? 'bg-blue-50 text-blue-700 font-medium' 
                                : 'text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                        <span>💳</span>
                        <span>Billing</span>
                    </button>
                    <button className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100">
                        <span>⚙️</span>
                        <span>Ustawienia</span>
                    </button>
                </nav>

                {/* Bottom Section */}
                <div className="absolute bottom-4 left-4 right-4">
                    <button 
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Wyloguj się
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-8">
                {activeSection === 'home' && (
                    <>
                        {/* Header */}
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                Twoja Platforma z Połączeniami
                            </h1>
                            <div className="flex items-center space-x-2 text-sm text-blue-600">
                                <span>✨</span>
                                <span>Uzyskaj własne linki i darmową domenę.</span>
                                <a href="#" className="underline">Ulepsz teraz</a>
                            </div>
                        </div>

                        {/* Quick Create */}
                        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Szybkie tworzenie</h2>
                            <p className="text-gray-600 mb-4">Możesz stworzyć 3 więcej krótkich linków w tym miesiącu</p>
                            
                            <div className="flex space-x-4 mb-6">
                                <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                    <span>🔗</span>
                                    <span>Krótki link</span>
                                </button>
                                <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                                    <span>📱</span>
                                    <span>QR Code</span>
                                </button>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Domena: uplau.ly 🔒
                                </label>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Wpisz swój docelowy URL
                                </label>
                                <input 
                                    type="url" 
                                    placeholder="https://example.com/my-long-url"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                                />
                            </div>

                            <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                                Stwórz swój uplau link
                            </button>

                            <p className="text-sm text-gray-500 mt-4">
                                Również stwórz QR code dla tego linku
                            </p>
                        </div>

                        {/* Getting Started */}
                        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold text-gray-900">Pierwsze kroki z uplau</h2>
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-600">20%</span>
                                    <div className="w-20 h-2 bg-gray-200 rounded-full">
                                        <div className="w-4 h-2 bg-blue-600 rounded-full"></div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-start space-x-4">
                                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mt-1">
                                        <span className="text-white text-xs">✓</span>
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-900">Stwórz uplau Link.</h3>
                                        <button className="mt-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg text-sm hover:bg-blue-50">
                                            Stwórz link
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-4">
                                    <div className="w-6 h-6 border-2 border-gray-300 rounded-full mt-1"></div>
                                    <div>
                                        <h3 className="font-medium text-gray-900">Stwórz uplau Code.</h3>
                                        <button className="mt-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg text-sm hover:bg-blue-50">
                                            Stwórz QR Code
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-4">
                                    <div className="w-6 h-6 border-2 border-gray-300 rounded-full mt-1"></div>
                                    <div>
                                        <h3 className="font-medium text-gray-900">Kliknij, zeskanuj lub udostępnij.</h3>
                                        <div className="mt-2 space-x-2">
                                            <button className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg text-sm hover:bg-blue-50">
                                                Zobacz swoje linki
                                            </button>
                                            <button className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg text-sm hover:bg-blue-50">
                                                Zobacz swoje QR Codes
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-4">
                                    <div className="w-6 h-6 border-2 border-gray-300 rounded-full mt-1"></div>
                                    <div>
                                        <h3 className="font-medium text-gray-900">Sprawdź uplau Analitykę.</h3>
                                        <div className="mt-2 space-x-2">
                                            <button className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg text-sm hover:bg-blue-50">
                                                Zobacz demo analityki
                                            </button>
                                            <button className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg text-sm hover:bg-blue-50">
                                                Zobacz plany
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {activeSection === 'billing' && (
                    <>
                        {/* Billing Header */}
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                Billing & Subskrypcja
                            </h1>
                            <p className="text-gray-600">
                                Zarządzaj swoją subskrypcją i metodami płatności
                            </p>
                        </div>

                        {/* Current Plan */}
                        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Aktualny Plan</h2>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center space-x-3 mb-2">
                                        <span className="text-2xl font-bold text-blue-600">
                                            {billingInfo?.plan?.toUpperCase() || 'FREE'}
                                        </span>
                                        <span className={`px-2 py-1 rounded-full text-xs ${
                                            billingInfo?.status === 'active' 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-red-100 text-red-800'
                                        }`}>
                                            {billingInfo?.status === 'active' ? 'AKTYWNY' : 'NIEAKTYWNY'}
                                        </span>
                                    </div>
                                    <p className="text-gray-600 text-sm">
                                        {billingInfo?.billing_cycle === 'yearly' ? 'Płatność roczna' : 'Płatność miesięczna'}
                                    </p>
                                </div>
                                <div className="text-right">
                                    {billingInfo?.plan !== 'free' && (
                                        <button 
                                            onClick={handleManageSubscription}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                        >
                                            Zarządzaj Subskrypcją
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Payment Method */}
                        {billingInfo?.payment_method && (
                            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-6">
                                <h2 className="text-xl font-semibold text-gray-900 mb-4">Metoda Płatności</h2>
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-8 bg-gray-100 rounded flex items-center justify-center">
                                        <span className="text-xs font-medium text-gray-600">
                                            {billingInfo.payment_method.brand?.toUpperCase()}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">
                                            **** **** **** {billingInfo.payment_method.last4}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            Wygasa {billingInfo.payment_method.exp_month}/{billingInfo.payment_method.exp_year}
                                        </p>
                                    </div>
                                    <div className="ml-auto">
                                        <button 
                                            onClick={handleManageSubscription}
                                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                        >
                                            Zmień Kartę
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Upgrade Options for FREE users */}
                        {billingInfo?.plan === 'free' && (
                            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
                                <h2 className="text-xl font-semibold text-gray-900 mb-2">Ulepsz swój plan</h2>
                                <p className="text-gray-600 mb-4">
                                    Odblokuj więcej funkcji i zwiększ limity linków
                                </p>
                                <button 
                                    onClick={() => window.location.href = '/register/plan'}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Zobacz Plany
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}