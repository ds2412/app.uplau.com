'use client';

import { supabase } from '@/lib/supabase';

export default function LoginPage() { //export default function 

    const handleGoogleLogin = async () => {
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/dashboard`
                }
            });

            if (error) {
                console.error('Błąd Google login:', error);
                alert('Wystąpił błąd podczas logowania przez Google');
            }
            // Supabase automatycznie przekieruje do Google
        } catch (error) {
            console.error('Błąd Google login:', error);
            alert('Wystąpił błąd połączenia');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;

        if (!email || !password) {
            alert('Podaj email i hasło');
            return;
        }

        try {
            // Wysyłamy dane do API
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                console.log('Zalogowano:', data.user);
                window.location.href = '/dashboard';
            } else {
                alert(data.error || 'Błąd logowania');
            }
        } catch (error) {
            console.error('Błąd logowania:', error);
            alert('Wystąpił błąd połączenia. Spróbuj ponownie.');
        }
    };


    return(
        <div className="min-h-screen flex">
            {/* LEWA STRONA - Formularz logowania */}
            <div className="w-full lg:w-1/2 bg-white flex flex-col relative">
                {/* Logo + Brand */}
                <div className="absolute top-6 left-6 z-10">
                    <div className="flex items-center space-x-3">
                        <img 
                            src="/logo.png" 
                            alt="uplau logo" 
                            className="w-30 h-20 rounded-lg shadow-sm"
                        />
                    </div>
                </div>
                
                {/* Formularz wyśrodkowany */}
                <div className="flex-1 flex items-center justify-center px-6 sm:px-8 lg:px-16 py-12">
                    {/* Główna zawartość formularza */}
                    <div className="max-w-sm w-full">
                        <div className="text-center mb-10">
                            <h1 className="text-4xl font-extrabold text-gray-900 mb-3">
                                Witaj ponownie
                            </h1>
                            <p className="text-gray-600 text-lg">
                                Zaloguj się do swojego konta
                            </p>
                        </div>

                        {/* Opcje logowania społecznościowego */}
                        <div className="space-y-3 mb-8">
                            <button 
                                type="button"
                                onClick={handleGoogleLogin}
                                className="w-full flex items-center justify-center px-4 py-3.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow"
                            >
                                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                </svg>
                                Kontynuuj z Google
                            </button>

                        </div>

                        {/* Separator */}
                        <div className="relative my-8">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-white text-gray-500 font-medium">LUB</span>
                            </div>
                        </div>

                        {/* Formularz email/hasło */}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-5">
                                <div>
                                    <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                                        Adres email
                                    </label>
                                    <input 
                                        type="email" 
                                        id="email" 
                                        name="email" 
                                        required
                                        className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 transition-all duration-200"
                                        placeholder="Wpisz swój email"
                                    />
                                </div>
                                
                                <div>
                                    <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-2">
                                        Hasło
                                    </label>
                                    <input 
                                        type="password" 
                                        id="password" 
                                        name="password" 
                                        required
                                        className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 transition-all duration-200"
                                        placeholder="Wpisz swoje hasło"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                                        Zapamiętaj mnie
                                    </label>
                                </div>
                                <a href="#" className="text-sm font-semibold text-blue-600 hover:text-blue-500 transition-colors">
                                    Zapomniałeś hasła?
                                </a>
                            </div>

                            <button 
                                type="submit"
                                className="w-full py-3.5 px-4 rounded-xl text-white font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                                style={{backgroundColor: '#190287'}}
                            >
                                Zaloguj się
                            </button>
                        </form>

                        {/* Sign up */}
                        <div className="mt-8 text-center">
                            <p className="text-gray-600">
                                Nie masz konta?{' '}
                                <a href="/register" className="font-semibold text-blue-600 hover:text-blue-500 transition-colors">
                                    Zarejestruj się za darmo
                                </a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* PRAWA STRONA - Hero Image */}
            <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
                {/* Background Image */}
                <div 
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{
                        backgroundImage: "url('https://picsum.photos/800/1000?random=hero')",
                    }}
                >
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-purple-900/70 to-indigo-900/80"></div>
                </div>

                {/* Content */}
                <div className="relative z-10 h-full flex flex-col justify-center px-12 xl:px-16">
                    <div className="max-w-lg">
                        <h2 className="text-4xl xl:text-5xl font-bold text-white mb-6 leading-tight">
                            Skracaj. Udostępniaj. Analizuj.
                        </h2>
                        <p className="text-xl text-gray-200 mb-8 leading-relaxed">
                            Przekształć swoje długie adresy URL w potężne narzędzia marketingowe z szczegółową analityką i własnym brandingiem.
                        </p>
                        
                        {/* Features */}
                        <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                                    <span className="text-white">📊</span>
                                </div>
                                <span className="text-white font-medium">Analiza w czasie rzeczywistym</span>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                                    <span className="text-white">🎯</span>
                                </div>
                                <span className="text-white font-medium">Spersonalizowane linki</span>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                                    <span className="text-white">🚀</span>
                                </div>
                                <span className="text-white font-medium">Błyskawiczne przekierowania</span>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="mt-12 grid grid-cols-3 gap-6">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-white">10M+</div>
                                <div className="text-sm text-gray-300">Skróconych linków</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-white">50K+</div>
                                <div className="text-sm text-gray-300">Aktywnych użytkowników</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-white">99.9%</div>
                                <div className="text-sm text-gray-300">Dostępność</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Floating Elements */}
                <div className="absolute top-20 right-20 w-20 h-20 bg-white bg-opacity-10 rounded-2xl backdrop-blur-sm animate-pulse"></div>
                <div className="absolute bottom-32 right-12 w-16 h-16 bg-white bg-opacity-10 rounded-xl backdrop-blur-sm animate-pulse delay-300"></div>
                <div className="absolute top-1/2 right-32 w-12 h-12 bg-white bg-opacity-10 rounded-lg backdrop-blur-sm animate-pulse delay-700"></div>
            </div>
        </div>
    );
}