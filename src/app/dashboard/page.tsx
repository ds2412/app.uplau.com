'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function DashboardPage() {
    const [user, setUser] = useState<any>(null);
    const [subscription, setSubscription] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [billingInfo, setBillingInfo] = useState<any>(null);
    const [activeSection, setActiveSection] = useState('home');
    
    // Nowe state dla linków
    const [links, setLinks] = useState<any[]>([]);
    const [linkUrl, setLinkUrl] = useState('');
    const [creatingLink, setCreatingLink] = useState(false);
    const [linkMessage, setLinkMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [lastShortUrl, setLastShortUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [monthlyUsage, setMonthlyUsage] = useState<any>(null);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [upgradeModalData, setUpgradeModalData] = useState<any>(null);
    // Links section state
    const [search, setSearch] = useState('');
    const [dateFilter, setDateFilter] = useState<'all' | '7' | '30' | 'month'>('all');
    const [selectedLinkIds, setSelectedLinkIds] = useState<string[]>([]);
    const [hiddenLinkIds, setHiddenLinkIds] = useState<string[]>([]);
    const [tagsById, setTagsById] = useState<Record<string, string[]>>({});
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState<{ open: boolean; link?: any }>({ open: false });
    const [showAnalyticsModal, setShowAnalyticsModal] = useState<{ open: boolean; link?: any; data?: any }>({ open: false });
    
    // Domena dla skróconych linków
    const shortDomain = process.env.NEXT_PUBLIC_SHORT_DOMAIN || 'http://localhost:3000';

    useEffect(() => {
        console.log('🔍 DASHBOARD useEffect - sprawdzam URL:', window.location.href);
        // Jeśli wróciliśmy ze Stripe przez success_url=/dashboard?payment_success=true
        try {
            const params = new URLSearchParams(window.location.search);
            const fromStripe = params.get('from') === 'stripe' || params.get('payment_success') === 'true';
            if (fromStripe) {
                localStorage.setItem('paymentSuccess', 'true');
                window.history.replaceState({}, '', '/dashboard');
            }
        } catch {}
        
        // 🔑 PRZYWRÓĆ SESJĘ z zapisanych tokenów (po powrocie ze Stripe)
        const restoreSession = async () => {
            const accessToken = sessionStorage.getItem('payment_access_token');
            const refreshToken = sessionStorage.getItem('payment_refresh_token');
            
            if (accessToken && refreshToken) {
                console.log('🔑 Znalazłem zapisane tokeny w sessionStorage - przywracam sesję...');
                
                try {
                    const { data, error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    });
                    
                    if (error) {
                        console.error('❌ Błąd przywracania sesji:', error);
                        // Wyczyść nieprawidłowe tokeny
                        sessionStorage.removeItem('payment_access_token');
                        sessionStorage.removeItem('payment_refresh_token');
                    } else {
                        console.log('✅ Sesja przywrócona!', data.user?.email);
                    }
                } catch (err) {
                    console.error('❌ Exception podczas przywracania sesji:', err);
                    // Wyczyść tokeny
                    sessionStorage.removeItem('payment_access_token');
                    sessionStorage.removeItem('payment_refresh_token');
                }
                
                // Wyczyść tokeny po użyciu
                sessionStorage.removeItem('payment_access_token');
                sessionStorage.removeItem('payment_refresh_token');
            } else {
                console.log('ℹ️ Brak tokenów w sessionStorage');
            }
        };
        
        restoreSession().then(() => {
            // Po przywróceniu sesji sprawdź usera
            setTimeout(() => {
                checkUserAndSubscription();
            }, 1000);
        });
        
        // 🧹 CACHE będzie sprawdzany AFTER pobrania usera, żeby użyć user_id jako klucza
        // To zapobiega mieszaniu danych między różnymi kontami
        const now = new Date().getTime();
        
        // Sprawdź czy to redirect z Stripe
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');
        const urlUserId = urlParams.get('user_id'); // ID usera z URL
        
        if (sessionId) {
            console.log('🎉 Płatność udana! Session ID:', sessionId, 'User ID:', urlUserId);
            console.log('💾 Ustawiam localStorage paymentSuccess = true');
            
            // Ustaw flagę płatności PRZED czyszczeniem URL
            localStorage.setItem('paymentSuccess', 'true');
            if (urlUserId) {
                localStorage.setItem('paymentUserId', urlUserId); // Zapisz ID usera który płacił
                console.log('💾 Zapisano paymentUserId:', urlUserId);
            }
            
            // Wyczyść cache bo mamy nową płatność
            localStorage.removeItem('cachedUser');
            localStorage.removeItem('cachedSubscription');
            localStorage.removeItem('cacheTime');
            
            // Wyczyść URL
            window.history.replaceState({}, '', '/dashboard');
            
            console.log('✅ localStorage ustawiony, cache wyczyszczony, URL wyczyszczony');
        }
        
        // Sprawdzamy usera ZAWSZE - cache będzie per-user w checkUserAndSubscription
        // Zwiększony czas oczekiwania na załadowanie sesji (szczególnie po powrocie ze Stripe)
        setTimeout(() => {
            checkUserAndSubscription();
        }, 3000); // 3 sekundy - daj więcej czasu na załadowanie sesji OAuth
    }, []);

    const checkUserAndSubscription = async () => {
        try {
            // Sprawdź czy user jest zalogowany
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            
            console.log('Dashboard - sprawdzam usera:', user, userError);
            
            // 🧹 WYCZYŚĆ localStorage jeśli to inny user niż poprzednio
            const lastUserId = localStorage.getItem('currentUserId');
            if (user && lastUserId && lastUserId !== user.id) {
                console.log('🔄 ZMIANA USERA! Poprzedni:', lastUserId, 'Aktualny:', user.id);
                console.log('🧹 Czyszczę localStorage z poprzedniej sesji...');
                localStorage.removeItem('paymentSuccess');
                localStorage.removeItem('paymentUserId');
                localStorage.removeItem('lastPaymentAttempt');
                localStorage.removeItem('lastPaymentUserId');
                localStorage.removeItem('cachedUser');
                localStorage.removeItem('cachedSubscription');
                localStorage.removeItem('cacheTime');
            }
            
            // Zapisz aktualnego usera
            if (user) {
                localStorage.setItem('currentUserId', user.id);
            }
            
            if (userError || !user) {
                // Specjalny przypadek: user został usunięty w Supabase, ale w przeglądarce zostały stare tokeny
                const userErrorMessage = (userError as any)?.message || '';
                if (userErrorMessage.includes('User from sub claim in JWT does not exist')) {
                    console.warn('⚠️ Supabase auth desync: token wskazuje na nieistniejącego usera. Czyszczę sesję…');
                    try {
                        await supabase.auth.signOut();
                    } catch {}
                    try { sessionStorage.clear(); } catch {}
                    try { localStorage.clear(); } catch {}
                    window.location.href = '/register?reason=relogin';
                    return;
                }

                console.log('Brak usera, przekierowuję do logowania');
                // Sprawdź czy to redirect z Stripe
                const urlParams = new URLSearchParams(window.location.search);
                const sessionId = urlParams.get('session_id');
                const fromPayment = urlParams.get('from_payment');
                
                if (sessionId || fromPayment) {
                    // To redirect z Stripe - sprawdź ile razy próbowaliśmy
                    const retryCount = parseInt(localStorage.getItem('auth_retry_count') || '0');
                    
                    if (retryCount < 3) {
                        // Spróbuj ponownie za chwilę
                        console.log(`🔄 Próba ${retryCount + 1}/3 - czekam na sesję...`);
                        localStorage.setItem('auth_retry_count', (retryCount + 1).toString());
                        
                        setTimeout(() => {
                            window.location.reload();
                        }, 2000); // Czekaj 2 sekundy i spróbuj ponownie
                        return;
                    } else {
                        // Po 3 próbach - zapisz session_id i przekieruj na login
                        console.log('❌ Sesja nie załadowała się po 3 próbach - przekierowuję na login');
                        localStorage.removeItem('auth_retry_count');
                        localStorage.setItem('stripe_session_id', sessionId || '');
                        window.location.href = '/login?from=stripe';
                        return;
                    }
                }
                
                window.location.href = '/login';
                return;
            }
            
            // Sesja załadowana - wyczyść retry counter
            localStorage.removeItem('auth_retry_count');

            setUser(user);

            console.log('📅 User metadata:', user.user_metadata);
            console.log('📅 Created at:', user.created_at);
            
            // Sprawdź czy to nowy użytkownik (utworzony < 5 minut temu)
            const userCreated = new Date(user.created_at);
            const now = new Date();
            const isNewUser = (now.getTime() - userCreated.getTime()) < 5 * 60 * 1000; // 5 minut (zwiększone dla OAuth)
            
            // Sprawdź czy to Google OAuth user (nowy, bez wcześniejszej subskrypcji)
            const isGoogleUser = user.app_metadata?.provider === 'google';
            
            console.log('🆕 Is new user?', isNewUser, { userCreated, now });
            console.log('🔍 Is Google user?', isGoogleUser, 'Provider:', user.app_metadata?.provider);
            
            // JEŚLI TO NOWY USER - WYCZYŚĆ LOCALSTORAGE (ale NIE jeśli mamy paymentSuccess z session_id!)
            if (isNewUser && !localStorage.getItem('paymentSuccess')) {
                console.log('🧹 NOWY USER bez paymentSuccess - czyszczę stare localStorage!');
                localStorage.removeItem('lastPaymentAttempt');
            } else if (isNewUser && localStorage.getItem('paymentSuccess')) {
                console.log('🎯 NOWY USER z paymentSuccess - to powrót z płatności, nie czyszczę!');
            }
            
            // TERAZ sprawdź czy to powrót z płatności
            const paymentSuccess = localStorage.getItem('paymentSuccess');
            const paymentUserId = localStorage.getItem('paymentUserId');
            
            console.log('🔍 Sprawdzam localStorage paymentSuccess:', paymentSuccess, 'dla usera:', paymentUserId);
            
            // Sprawdź czy paymentSuccess jest dla TEGO usera
            const isPaymentForThisUser = paymentSuccess && (!paymentUserId || paymentUserId === user.id);
            
            if (isPaymentForThisUser) {
                console.log('💳 PRIORYTET! Mam paymentSuccess DLA TEGO USERA - to powrót z płatności!');
                localStorage.removeItem('paymentSuccess');
                localStorage.removeItem('paymentUserId');
                alert('Płatność zakończona pomyślnie! Twoja subskrypcja zostanie aktywowana w ciągu kilku minut.');
                
                // USTAW KOMPLETNĄ SUBSKRYPCJĘ ŻEBY DASHBOARD DZIAŁAŁ
                setSubscription({
                    id: 'temp-pending',
                    user_id: user.id,
                    stripe_customer_id: null,
                    stripe_subscription_id: null,
                    status: 'active', // Ustaw jako aktywna żeby dashboard działał
                    plan_id: 'pro', // Przykładowy plan
                    billing_cycle: 'monthly',
                    payment_method: 'card',
                    current_period_start: null,
                    current_period_end: null,
                    cancel_at_period_end: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
                setLoading(false);
                return;
            }
            
            // isNewUser już sprawdzone wcześniej

            // Sprawdź status subskrypcji - pobierz NAJNOWSZĄ (sortuj po created_at DESC)
            const { data: subData, error: subError } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (subError) {
                console.error('Błąd pobierania subskrypcji:', JSON.stringify(subError, null, 2));
                console.log('🚨 WYKRYTO BŁĄD SUBSKRYPCJI - sprawdzam kod:', subError.code);
                
                // Jeśli użytkownik nie ma subskrypcji
                if (subError.code === 'PGRST116' || subError.message?.includes('No rows')) {
                    console.log('🔍 BRAK SUBSKRYPCJI - sprawdzam localStorage...');
                    
                    // SPRAWDŹ CZY TO POWRÓT Z PŁATNOŚCI DLA TEGO KONKRETNEGO USERA
                    const paymentSuccess = localStorage.getItem('paymentSuccess');
                    const paymentUserId = localStorage.getItem('paymentUserId'); // ID usera który płacił
                    
                    console.log('🔍 localStorage paymentSuccess:', paymentSuccess);
                    console.log('🔍 localStorage paymentUserId:', paymentUserId, 'current user:', user.id);
                    
                    // SPRAWDŹ CZY USER ZOSTAŁ UTWORZONY NIEDAWNO (ostatnie 15 minut = prawdopodobnie po płatności)
                    const userCreatedTime = new Date(user.created_at).getTime();
                    const now = new Date().getTime();
                    const isRecentUser = (now - userCreatedTime) < 15 * 60 * 1000; // 15 minut
                    
                    // Sprawdź czy TO TEN SAM USER próbował płacić w ostatnich 10 minutach
                    const lastPaymentAttempt = localStorage.getItem('lastPaymentAttempt');
                    const lastPaymentUserId = localStorage.getItem('lastPaymentUserId');
                    const isRecentPayment = lastPaymentAttempt && 
                                          lastPaymentUserId === user.id && // ✅ MUSI BYĆ TEN SAM USER!
                                          (now - parseInt(lastPaymentAttempt)) < 10 * 60 * 1000;
                    
                    console.log('🔍 User utworzony:', new Date(user.created_at), 'Czy nedawno?', isRecentUser);
                    console.log('🔍 Ostatnia próba płatności:', lastPaymentAttempt, 'przez usera:', lastPaymentUserId);
                    console.log('🔍 isRecentPayment (dla TEGO usera):', isRecentPayment);
                    
                    // TYLKO jeśli paymentSuccess ORAZ to TEN SAM user
                    const isPaymentForThisUser = paymentSuccess && (!paymentUserId || paymentUserId === user.id);
                    
                    if (isPaymentForThisUser || isRecentPayment) {
                        console.log('💳 POTENCJALNY POWRÓT Z PŁATNOŚCI (localStorage/nedawna próba) - sprawdzam Stripe...');
                        localStorage.removeItem('paymentSuccess');
                        
                        // SPRAWDŹ PRAWDZIWĄ SUBSKRYPCJĘ W STRIPE
                        try {
                            const response = await fetch('/api/stripe/check-subscription', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    userId: user.id,
                                    userEmail: user.email
                                })
                            });
                            
                            const result = await response.json();
                            console.log('🔍 Wynik sprawdzenia Stripe:', result);
                            
                            if (result.hasSubscription) {
                                console.log('✅ PRAWDZIWA subskrypcja znaleziona w Stripe!');
                                alert('Płatność zakończona pomyślnie! Twoja subskrypcja jest już aktywna.');
                                setSubscription(result.subscription);
                                
                                // Cache wyłączony - zawsze świeże dane z bazy
                                
                                setLoading(false);
                                return;
                            } else {
                                console.log('❌ Brak subskrypcji w Stripe - pokazuję komunikat oczekiwania');
                                // Jeśli brak subskrypcji - stwórz tymczasową z prawdziwymi danymi
                                const savedPlan = localStorage.getItem('selectedPlan') || 'starter';
                                const savedCycle = localStorage.getItem('selectedBillingCycle') || 'monthly';
                                
                                console.log('📦 Używam zapisanych danych planu:', { savedPlan, savedCycle });
                                
                                const tempSubscription = {
                                    id: 'temp-pending',
                                    user_id: user.id,
                                    stripe_customer_id: null,
                                    stripe_subscription_id: null,
                                    status: 'pending', // Pokazuj jako pending żeby user wiedział że w trakcie
                                    plan_id: savedPlan,
                                    billing_cycle: savedCycle,
                                    payment_method: 'card',
                                    current_period_start: null,
                                    current_period_end: null,
                                    cancel_at_period_end: false,
                                    created_at: new Date().toISOString(),
                                    updated_at: new Date().toISOString()
                                };
                                
                                setSubscription(tempSubscription);
                                alert('Płatność w trakcie przetwarzania. Sprawdź ponownie za kilka minut.');
                                setLoading(false);
                                return;
                            }
                        } catch (error) {
                            console.error('❌ Błąd sprawdzania Stripe:', error);
                            alert('Płatność zakończona pomyślnie! Twoja subskrypcja zostanie aktywowana w ciągu kilku minut.');
                            setLoading(false);
                            return;
                        }
                    }
                    
                    console.log('🔍 SPRAWDZAM WARUNKI:', { paymentSuccess, isRecentPayment, isRecentUser });
                    
                    // Dla nowych userów bez historii płatności - sprawdź czy może mają już subskrypcję
                    if (isRecentUser) {
                        console.log('🆕 NOWY USER - sprawdzam czy ma subskrypcję w Stripe...');
                        
                        try {
                            const response = await fetch('/api/stripe/check-subscription', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    userId: user.id,
                                    userEmail: user.email
                                })
                            });
                            
                            const result = await response.json();
                            console.log('🔍 Wynik sprawdzenia Stripe dla nowego usera:', result);
                            
                            if (result.hasSubscription) {
                                console.log('✅ NOWY USER ma już subskrypcję w Stripe!');
                                alert('Witamy! Twoja subskrypcja jest już aktywna.');
                                setSubscription(result.subscription);
                                setLoading(false);
                                return;
                            } else {
                                console.log('✅ NOWY USER bez subskrypcji - przekierowuję do wyboru planu');
                                // Kontynuuj normalny flow - sprawdzi czy nowy user i przekieruje do planu
                            }
                        } catch (error) {
                            console.error('❌ Błąd sprawdzania Stripe dla nowego usera:', error);
                            // Kontynuuj normalny flow
                        }
                    } else {
                        console.log('❌ Brak paymentSuccess w localStorage - sprawdzam czy nowy user...');
                    }
                    
                    // NOWY UŻYTKOWNIK (zwłaszcza Google OAuth) → ZAWSZE przekieruj do wyboru planu
                    if (isNewUser) {
                        console.log('🆕 Nowy użytkownik bez subskrypcji → przekierowanie do wyboru planu');
                        
                        // Dla Google OAuth - wyczyść cache żeby wymuszać wybór planu
                        if (isGoogleUser) {
                            console.log('🔍 Google OAuth user - czyszczę cache i przekierowuję do planu');
                            localStorage.removeItem('cachedUser');
                            localStorage.removeItem('cachedSubscription');
                            localStorage.removeItem('cacheTime');
                        }
                        
                        window.location.href = '/register/plan';
                        return;
                    }
                    
                    // SPRAWDŹ NAJPIERW CZY TO NIE PROBLEM Z PŁATNOŚCIĄ
                    const savedPlan = localStorage.getItem('selectedPlan');
                    const lastPaymentAttempt2 = localStorage.getItem('lastPaymentAttempt');
                    const now2 = new Date().getTime();
                    const isRecentPayment2 = lastPaymentAttempt2 && (now2 - parseInt(lastPaymentAttempt2)) < 30 * 60 * 1000; // 30 minut
                    
                    if (savedPlan && isRecentPayment2) {
                        console.log('💳 PRAWDOPODOBNY POWRÓT Z PŁATNOŚCI - pokazuję tymczasową subskrypcję');
                        const savedCycle = localStorage.getItem('selectedBillingCycle') || 'monthly';
                        
                        const tempSub = {
                            id: 'temp-processing',
                            user_id: user.id,
                            status: 'pending',
                            plan_id: savedPlan,
                            billing_cycle: savedCycle,
                            payment_method: 'card',
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        };
                        
                        setUser(user);
                        setSubscription(tempSub);
                        
                        // Zapisz do cache
                        // Cache wyłączony - zawsze świeże dane z bazy
                        
                        setLoading(false);
                        return;
                    }
                    
                    // STARY UŻYTKOWNIK (ale NIE nowy Google user) → stwórz FREE subskrypcję
                    console.log('🆓 Stary użytkownik bez subskrypcji → tworzę FREE');
                    
                    // DODATKOWA OCHRONA: Jeśli to Google user utworzony w ostatnich 10 minutach - przekieruj do planu
                    const userCreatedTime2 = new Date(user.created_at).getTime();
                    const isVeryRecentUser = (now2 - userCreatedTime2) < 10 * 60 * 1000; // 10 minut
                    
                    if (isGoogleUser && isVeryRecentUser) {
                        console.log('🔍 Wykryto nowego Google usera - przekierowuję do wyboru planu zamiast FREE');
                        window.location.href = '/register/plan';
                        return;
                    }
                    
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
                } else if (!subData) {
                    // Brak subskrypcji - sprawdź czy nowy user
                    console.log('🚨 Brak subskrypcji w bazie (subData = null)');
                    
                    if (isNewUser) {
                        console.log('🆕 Nowy użytkownik bez subskrypcji → przekierowuję do wyboru planu');
                        window.location.href = '/register/plan';
                        return;
                    }
                    
                    // Stary user bez subskrypcji - utwórz FREE
                    console.log('🆓 Stary użytkownik bez subskrypcji → tworzę FREE');
                    try {
                        const response = await fetch('/api/auth/create-free-subscription', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                userId: user.id,
                                userEmail: user.email
                            }),
                        });
                        const result = await response.json();
                        if (response.ok) {
                            console.log('✅ FREE subskrypcja utworzona:', result.subscription);
                            setSubscription(result.subscription);
                        }
                    } catch (error) {
                        console.error('❌ Błąd tworzenia FREE:', error);
                    }
                } else {
                    setSubscription(subData);
                    
                    // ZAPISZ DO CACHE gdy mamy subskrypcję
                    console.log('💾 Zapisuję subskrypcję do cache');
                    // Cache wyłączony - zawsze świeże dane z bazy
                    
                    // Sprawdź czy subskrypcja jest aktywna (TYMCZASOWO WYŁĄCZONE - pozwalamy na pending)
                    if (subData && subData.status !== 'active' && subData.plan_id !== 'free') {
                        console.warn('⚠️ Subskrypcja nie jest aktywna:', subData.status, '- pozwalamy wejść do dashboardu');
                        // Tymczasowo NIE przekierowujemy - niech user zobaczy dashboard
                        // alert('Twoja subskrypcja nie jest aktywna. Przekierowujemy do płatności.');
                        // window.location.href = '/register/payment';
                        // return;
                    }
            }
        } catch (error) {
            console.error('Błąd sprawdzania użytkownika:', error);
            window.location.href = '/login';
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            // Wyloguj z Supabase
            await supabase.auth.signOut();
            
            // Wyczyść localStorage
            localStorage.clear();
            
            // Przekieruj na login
            window.location.href = '/login';
        } catch (error) {
            console.error('Błąd wylogowania:', error);
            alert('Nie udało się wylogować');
        }
    };

    // Funkcja do pobierania linków użytkownika
    const fetchLinks = async () => {
        if (!user) return;
        
        try {
            const response = await fetch(`/api/links/list?userId=${user.id}`);
            const data = await response.json();
            
            if (response.ok) {
                setLinks(data.links || []);
            } else {
                console.error('Błąd pobierania linków:', data.error);
            }
        } catch (error) {
            console.error('Błąd fetchLinks:', error);
        }
    };

    // Funkcja do pobierania miesięcznego użycia
    const fetchMonthlyUsage = async () => {
        if (!user) return;
        
        try {
            const response = await fetch(`/api/links/usage?userId=${user.id}`);
            const data = await response.json();
            
            if (response.ok) {
                setMonthlyUsage(data);
            } else {
                console.error('Błąd pobierania usage:', data.error);
            }
        } catch (error) {
            console.error('Błąd fetchUsage:', error);
        }
    };

    // Funkcja do tworzenia nowego linku
    const handleCreateLink = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!linkUrl.trim()) {
            setLinkMessage({ type: 'error', text: 'Podaj URL do skrócenia' });
            return;
        }

        if (!user) {
            setLinkMessage({ type: 'error', text: 'Musisz być zalogowany' });
            return;
        }

        // Sprawdź weryfikację emaila
        // Google OAuth users są automatycznie zweryfikowani
        const isGoogleUser = user.app_metadata?.provider === 'google';
        
        if (!user.email_confirmed_at && !isGoogleUser) {
            setLinkMessage({ 
                type: 'error', 
                text: '⚠️ Potwierdź swój email żeby tworzyć linki! Sprawdź skrzynkę.' 
            });
            return;
        }

        setCreatingLink(true);
        setLinkMessage(null);

        try {
            const response = await fetch('/api/links/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    originalUrl: linkUrl,
                    userId: user.id
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setLinkMessage({ 
                    type: 'success', 
                    text: 'Link utworzony!'
                });
                setLastShortUrl(data.shortUrl);
                setLinkUrl(''); // Wyczyść formularz
                fetchLinks(); // Odśwież listę linków
                fetchMonthlyUsage(); // Odśwież miesięczne użycie
            } else {
                // Sprawdź czy to limit reached
                if (data.limitReached && data.currentPlan === 'free') {
                    // Pokaż modal upgrade
                    setUpgradeModalData(data);
                    setShowUpgradeModal(true);
                } else {
                    setLinkMessage({ 
                        type: 'error', 
                        text: data.message || data.error || 'Nie udało się utworzyć linku' 
                    });
                }
            }
        } catch (error) {
            console.error('Błąd tworzenia linku:', error);
            setLinkMessage({ 
                type: 'error', 
                text: 'Wystąpił błąd połączenia' 
            });
        } finally {
            setCreatingLink(false);
        }
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
            fetchLinks(); // Pobierz też linki
            fetchMonthlyUsage(); // Pobierz miesięczne użycie
        }
    }, [user]);

    // Early return - DOPIERO PO wszystkich hookach
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Ładowanie...</p>
                </div>
            </div>
        );
    }

    return (
        <>
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
                    
                    {/* User info */}
                    {user && (
                        <div className="mt-4 pb-3 border-b border-gray-100">
                            <p className="text-sm font-medium text-gray-700 text-center">
                                {user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User'}
                            </p>
                        </div>
                    )}
                    
                    {/* Status subskrypcji */}
                    <div className="mt-3 text-xs">
                        {subscription ? (
                            <div className={`px-2 py-1 rounded-full text-center ${
                                subscription.status === 'active' 
                                    ? 'bg-green-100 text-green-800'
                                    : subscription.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                            }`}>
                                {subscription.plan_id?.toUpperCase() || 'FREE'} - {
                                    subscription.status === 'active' ? 'AKTYWNY' 
                                    : subscription.status === 'pending' ? 'W TRAKCIE'
                                    : 'NIEAKTYWNY'
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
                    <button 
                        onClick={() => { setActiveSection('links'); setShowCreateModal(true); }}
                        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
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
                    <button 
                        onClick={() => setActiveSection('links')}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg ${activeSection === 'links' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'}`}
                    >
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
                        {/* Email Verification Banner */}
                        {user && !user.email_confirmed_at && user.app_metadata?.provider !== 'google' && (
                            <div className="mb-6 bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
                                <div className="flex items-start space-x-3">
                                    <span className="text-2xl">⚠️</span>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-yellow-900 mb-1">
                                            Potwierdź swój adres email
                                        </h3>
                                        <p className="text-yellow-800 text-sm mb-3">
                                            Wysłaliśmy link weryfikacyjny na <strong>{user.email}</strong>.
                                            Musisz potwierdzić email żeby tworzyć linki!
                                        </p>
                                        <button
                                            onClick={async () => {
                                                const { error } = await supabase.auth.resend({
                                                    type: 'signup',
                                                    email: user.email!
                                                });
                                                if (error) {
                                                    alert('Błąd wysyłania: ' + error.message);
                                                } else {
                                                    alert('✅ Email weryfikacyjny wysłany ponownie!');
                                                }
                                            }}
                                            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium text-sm"
                                        >
                                            Wyślij ponownie email weryfikacyjny
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        
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
                                    Domena: {shortDomain.replace('https://', '').replace('http://', '')} 🚀
                                </label>
                            </div>

                            <form onSubmit={handleCreateLink}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Wpisz swój docelowy URL
                                    </label>
                                    <input 
                                        type="url" 
                                        value={linkUrl}
                                        onChange={(e) => setLinkUrl(e.target.value)}
                                        placeholder="https://example.com/my-long-url"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        disabled={creatingLink}
                                        required
                                    />
                                </div>

                                {linkMessage && (
                                    <div className={`mb-4 p-3 rounded-lg ${
                                        linkMessage.type === 'success' 
                                            ? 'bg-green-50 text-green-800 border border-green-200' 
                                            : 'bg-red-50 text-red-800 border border-red-200'
                                    }`}>
                                        <div className="flex flex-col gap-2">
                                            <div className="font-medium">{linkMessage.text}</div>
                                            {linkMessage.type === 'success' && lastShortUrl && (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        value={lastShortUrl}
                                                        className="flex-1 px-3 py-2 border border-green-200 rounded-md bg-white text-green-800"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            try {
                                                                await navigator.clipboard.writeText(lastShortUrl);
                                                                setCopied(true);
                                                                setTimeout(() => setCopied(false), 1500);
                                                            } catch (e) {
                                                                console.error('Clipboard error', e);
                                                            }
                                                        }}
                                                        className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                                                    >
                                                        Skopiuj
                                                    </button>
                                                    {copied && (
                                                        <span className="text-green-700 text-sm">Skopiowano!</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <button 
                                    type="submit"
                                    disabled={creatingLink}
                                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    {creatingLink ? 'Tworzę...' : 'Stwórz swój uplau link'}
                                </button>
                            </form>

                            <p className="text-sm text-gray-500 mt-4">
                                                                {monthlyUsage ? (
                                    <>
                                                                                Linków w tym miesiącu: <strong>{monthlyUsage.used} / {(monthlyUsage.isUnlimited || monthlyUsage.limit === 99999) ? '∞ (Bez limitu)' : monthlyUsage.limit}</strong>
                                                                                {!monthlyUsage.isUnlimited && monthlyUsage.percentage !== null && (
                                                                                    <span className="ml-2">({monthlyUsage.percentage}%)</span>
                                                                                )}
                                        <br />
                                        <span className="text-xs text-gray-400">
                                            Reset: {monthlyUsage.resetDateFormatted}
                                        </span>
                                    </>
                                ) : (
                                    'Ładowanie limitów...'
                                )}
                            </p>
                        </div>

                        {/* Lista utworzonych linków */}
                        {links.length > 0 && (
                            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
                                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                                    Ostatnie linki ({Math.min(links.length, 4)} z {links.length})
                                </h2>
                                
                                <div className="space-y-3">
                                    {links.slice(0, 4).map((link) => (
                                        <div 
                                            key={link.id}
                                            className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex-1">
                                                    <a 
                                                        href={`${shortDomain}/${link.short_code}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-700 font-medium text-lg"
                                                    >
                                                        {shortDomain.replace('https://', '').replace('http://', '')}/{link.short_code}
                                                    </a>
                                                    <p className="text-gray-500 text-sm mt-1 truncate">
                                                        → {link.original_url}
                                                    </p>
                                                </div>
                                                <div className="flex items-center space-x-4">
                                                    <div className="text-center">
                                                        <div className="text-2xl font-bold text-blue-600">
                                                            {link.unique_clicks || 0}
                                                        </div>
                                                        <div className="text-xs text-gray-500">unikalne</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-2xl font-bold text-gray-900">
                                                            {link.clicks}
                                                        </div>
                                                        <div className="text-xs text-gray-500">łącznie</div>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(`${shortDomain}/${link.short_code}`);
                                                            alert('Link skopiowany do schowka!');
                                                        }}
                                                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
                                                    >
                                                        📋 Kopiuj
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                Utworzono: {new Date(link.created_at).toLocaleString('pl-PL')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

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
                                            <button 
                                                onClick={() => window.location.href = '/upgrade'}
                                                className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg text-sm hover:bg-blue-50"
                                            >
                                                Zobacz plany
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {activeSection === 'links' && (
                    <>
                        {/* Top toolbar */}
                        <div className="mb-6 flex items-center gap-3 flex-wrap">
                            <div className="flex-1 min-w-[260px]">
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Szukaj linków"
                                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <select
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value as any)}
                                    className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
                                >
                                    <option value="all">Wszystkie daty</option>
                                    <option value="7">Ostatnie 7 dni</option>
                                    <option value="30">Ostatnie 30 dni</option>
                                    <option value="month">Bieżący miesiąc</option>
                                </select>
                            </div>
                            <div>
                                <button className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                                    Dodaj filtry
                                </button>
                            </div>
                            <div className="ml-auto">
                                <button 
                                    onClick={() => setShowCreateModal(true)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Stwórz link
                                </button>
                            </div>
                        </div>

                        {/* Selection toolbar */}
                        <div className="mb-3 flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                                {selectedLinkIds.length} zaznaczone
                                {selectedLinkIds.length > 0 && (
                                    <span className="ml-3 inline-flex gap-2">
                                        <button
                                            onClick={() => {
                                                const selected = links.filter(l => selectedLinkIds.includes(l.id));
                                                const rows = selected.map(l => ({
                                                    id: l.id,
                                                    short: `${shortDomain}/${l.short_code}`,
                                                    original: l.original_url,
                                                    clicks: l.clicks,
                                                    created_at: l.created_at
                                                }));
                                                const header = Object.keys(rows[0] || {id:'',short:'',original:'',clicks:'',created_at:''}).join(',');
                                                const csv = [header, ...rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g,'\"')}"`).join(','))].join('\n');
                                                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                                                const url = URL.createObjectURL(blob);
                                                const a = document.createElement('a'); a.href = url; a.download = 'links.csv'; a.click(); URL.revokeObjectURL(url);
                                            }}
                                            className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50"
                                        >
                                            Export
                                        </button>
                                        <button
                                            onClick={() => { setHiddenLinkIds(prev => [...new Set([...prev, ...selectedLinkIds])]); setSelectedLinkIds([]); }}
                                            className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50"
                                        >
                                            Ukryj
                                        </button>
                                        <button
                                            onClick={() => {
                                                const tag = prompt('Wpisz tag'); if (!tag) return;
                                                setTagsById(prev => { const next = { ...prev }; selectedLinkIds.forEach(id => { next[id] = Array.from(new Set([...(next[id] || []), tag])); }); return next; });
                                            }}
                                            className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50"
                                        >
                                            Taguj
                                        </button>
                                    </span>
                                )}
                            </div>
                            <div>
                                <select className="px-2 py-1 bg-white border border-gray-300 rounded text-sm">
                                    <option>Show: Active</option>
                                    <option>Show: All</option>
                                </select>
                            </div>
                        </div>

                        {/* List */}
                        <div className="space-y-3">
                            {links
                                .filter(l => !hiddenLinkIds.includes(l.id))
                                .filter(l => {
                                    if (!search.trim()) return true;
                                    const s = search.toLowerCase();
                                    return (
                                        l.short_code?.toLowerCase().includes(s) ||
                                        l.original_url?.toLowerCase().includes(s) ||
                                        `${shortDomain}/${l.short_code}`.toLowerCase().includes(s)
                                    );
                                })
                                .filter(l => {
                                    if (dateFilter === 'all') return true;
                                    const created = new Date(l.created_at);
                                    const now = new Date();
                                    if (dateFilter === '7') { const d = new Date(); d.setDate(d.getDate() - 7); return created >= d; }
                                    if (dateFilter === '30') { const d = new Date(); d.setDate(d.getDate() - 30); return created >= d; }
                                    if (dateFilter === 'month') { return created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth(); }
                                    return true;
                                })
                                .map(link => {
                                    const shortUrl = `${shortDomain.replace('https://','').replace('http://','')}/${link.short_code}`;
                                    const title = (() => { try { return new URL(link.original_url).hostname; } catch { return link.original_url; } })();
                                    const isSelected = selectedLinkIds.includes(link.id);
                                    const tags = tagsById[link.id] || [];
                                    return (
                                        <div key={link.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                            <div className="flex items-start gap-3">
                                                <input type="checkbox" checked={isSelected} onChange={(e) => setSelectedLinkIds(prev => e.target.checked ? [...prev, link.id] : prev.filter(id => id !== link.id))} className="mt-1" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <div className="truncate pr-4">
                                                            <div className="font-medium text-gray-900 truncate">{title}</div>
                                                            <a href={`/${link.short_code}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 text-sm font-medium">{shortUrl}</a>
                                                            <div className="text-gray-500 text-sm truncate">{link.original_url}</div>
                                                            <div className="mt-1 text-xs text-gray-400">Utworzono: {new Date(link.created_at).toLocaleDateString('pl-PL', { year:'numeric', month:'short', day:'numeric' })}</div>
                                                            <div className="mt-2 flex items-center gap-3 text-sm text-gray-600">
                                                                <button onClick={async () => { try { await navigator.clipboard.writeText(`${shortDomain}/${link.short_code}`); alert('Skopiowano!'); } catch {} }} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded">📋 Copy</button>
                                                                <button onClick={async () => { const shareUrl = `${shortDomain}/${link.short_code}`; if ((navigator as any).share) { try { await (navigator as any).share({ title: 'Udostępnij link', url: shareUrl }); } catch {} } else { try { await navigator.clipboard.writeText(shareUrl); alert('Skopiowano do schowka'); } catch {} } }} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded">🔗 Share</button>
                                                                <button onClick={() => setShowEditModal({ open: true, link })} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded">✏️ Edit</button>
                                                                <button onClick={async () => { try { const res = await fetch(`/api/links/analytics?userId=${user.id}&linkId=${link.id}&range=30`); const data = await res.json(); setShowAnalyticsModal({ open: true, link, data }); } catch (e) { console.error(e); } }} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded">📈 Click data</button>
                                                            </div>
                                                        </div>
                                                        <div className="text-center flex-shrink-0 space-y-1">
                                                            <div>
                                                                <div className="text-xl font-bold text-blue-600">{link.unique_clicks || 0}</div>
                                                                <div className="text-xs text-gray-500">unikalne</div>
                                                            </div>
                                                            <div>
                                                                <div className="text-xl font-bold text-gray-900">{link.clicks}</div>
                                                                <div className="text-xs text-gray-500">łącznie</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="mt-2">
                                                        {tags.length > 0 ? (
                                                            <div className="flex flex-wrap gap-2">
                                                                {tags.map(t => (<span key={t} className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{t}</span>))}
                                                            </div>
                                                        ) : (
                                                            <button onClick={() => { const tag = prompt('Dodaj tag'); if (!tag) return; setTagsById(prev => ({ ...prev, [link.id]: [tag] })); }} className="text-xs text-gray-500 underline">No tags</button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="w-6 h-6 text-gray-400">▦</div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                        <div className="text-center text-sm text-gray-500 mt-6">— Dotarłeś do końca listy —</div>
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
                                    onClick={() => window.location.href = '/upgrade'}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Zobacz Plany
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* 🚀 Upgrade Modal - Marketing Popup */}
            {showUpgradeModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative animate-in fade-in zoom-in duration-200">
                        {/* Close button */}
                        <button
                            onClick={() => setShowUpgradeModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
                        >
                            ×
                        </button>

                        {/* Icon */}
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>

                        {/* Headline */}
                        <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">
                            Osiągnąłeś limit darmowego planu! 🎉
                        </h2>

                        {/* Subtext */}
                        <p className="text-gray-600 text-center mb-6">
                            Utworzyłeś już <strong>{upgradeModalData?.current} z {upgradeModalData?.limit} linków</strong> w tym miesiącu. 
                            Odblokuj nieograniczone możliwości z planem PRO!
                        </p>

                        {/* Benefits */}
                        <div className="space-y-3 mb-6">
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <p className="text-gray-700"><strong>100 linków/miesiąc</strong> w planie Starter</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <p className="text-gray-700"><strong>1000 linków/miesiąc</strong> w planie Pro</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <p className="text-gray-700">Zaawansowana <strong>analityka kliknięć</strong></p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <p className="text-gray-700"><strong>Wsparcie priorytetowe</strong></p>
                            </div>
                        </div>

                        {/* CTA Buttons */}
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => window.location.href = '/upgrade'}
                                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                            >
                                🚀 Ulepsz do wersji PRO
                            </button>
                            <button
                                onClick={() => setShowUpgradeModal(false)}
                                className="w-full px-6 py-2 text-gray-600 hover:text-gray-800 font-medium"
                            >
                                Może później
                            </button>
                        </div>

                        {/* Footer note */}
                        <p className="text-xs text-gray-500 text-center mt-4">
                            💡 Reset limitu: 1-go następnego miesiąca
                        </p>
                    </div>
                </div>
            )}
        </div>

        {/* Create Modal */}
        {showCreateModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl p-6 w-full max-w-md">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Stwórz link</h3>
                        <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-700">×</button>
                    </div>
                    <form onSubmit={async (e) => {
                        e.preventDefault(); if (!user) return;
                        const form = e.target as HTMLFormElement; const url = (new FormData(form).get('url') as string) || '';
                        if (!url.trim()) return;
                        try {
                            const res = await fetch('/api/links/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ originalUrl: url, userId: user.id }) });
                            const data = await res.json();
                            if (res.ok) { await fetchLinks(); setShowCreateModal(false); } else { alert(data.error || 'Błąd tworzenia linku'); }
                        } catch {}
                    }}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Docelowy URL</label>
                        <input name="url" type="url" required className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4" placeholder="https://..." />
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg">Anuluj</button>
                            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Utwórz</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* Edit Modal */}
        {showEditModal.open && showEditModal.link && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl p-6 w-full max-w-md">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Edytuj link</h3>
                        <button onClick={() => setShowEditModal({ open: false })} className="text-gray-500 hover:text-gray-700">×</button>
                    </div>
                    <form onSubmit={async (e) => {
                        e.preventDefault(); if (!user) return;
                        const form = e.target as HTMLFormElement; const url = (new FormData(form).get('url') as string) || '';
                        try {
                            const res = await fetch('/api/links/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, linkId: showEditModal.link.id, originalUrl: url }) });
                            const data = await res.json();
                            if (res.ok) { await fetchLinks(); setShowEditModal({ open: false }); } else { alert(data.error || 'Nie udało się zapisać'); }
                        } catch {}
                    }}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Docelowy URL</label>
                        <input name="url" type="url" defaultValue={showEditModal.link.original_url} required className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4" />
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setShowEditModal({ open: false })} className="px-4 py-2 border border-gray-300 rounded-lg">Anuluj</button>
                            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Zapisz</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* Analytics Modal */}
        {showAnalyticsModal.open && showAnalyticsModal.link && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl p-6 w-full max-w-2xl">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Analityka: {showAnalyticsModal.link.short_code}</h3>
                        <button onClick={() => setShowAnalyticsModal({ open: false })} className="text-gray-500 hover:text-gray-700">×</button>
                    </div>
                    {showAnalyticsModal.data ? (
                        <div>
                            <div className="mb-4 grid grid-cols-2 gap-4">
                                <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 text-center">
                                    <div className="text-3xl font-bold text-blue-600">{showAnalyticsModal.data.uniqueClicks || 0}</div>
                                    <div className="text-sm text-gray-600 mt-1">Unikalne kliknięcia</div>
                                </div>
                                <div className="border border-gray-200 bg-gray-50 rounded-lg p-4 text-center">
                                    <div className="text-3xl font-bold text-gray-900">{showAnalyticsModal.data.totalClicks}</div>
                                    <div className="text-sm text-gray-600 mt-1">Łącznie kliknięć</div>
                                </div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="border border-gray-200 rounded p-3">
                                    <div className="font-medium mb-2">Urządzenia</div>
                                    <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40">{JSON.stringify(showAnalyticsModal.data.analytics.byDevice, null, 2)}</pre>
                                </div>
                                <div className="border border-gray-200 rounded p-3">
                                    <div className="font-medium mb-2">Kraje</div>
                                    <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40">{JSON.stringify(showAnalyticsModal.data.analytics.byCountry, null, 2)}</pre>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div>Ładowanie…</div>
                    )}
                </div>
            </div>
        )}
        </>
    );
}