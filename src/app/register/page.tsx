'use client';

import Image from 'next/image';
import { FormEvent, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function RegisterPage() {
    const [showSuccess, setShowSuccess] = useState(false);

    const showSuccessMessage = () => {
        setShowSuccess(true);
    };
    const handleGoogleSignUp = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/dashboard`
                }
            });

            if (error) {
                console.error('Błąd Google signup:', error);
                alert('Wystąpił błąd podczas logowania przez Google: ' + error.message);
            }
        } catch (error) {
            console.error('Błąd Google signup:', error);
            alert('Wystąpił błąd połączenia');
        }
    };

    const validatePassword = (password: string) => {
        const hasLetter = /[a-zA-Z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        const isLongEnough = password.length >= 9;
        
        return {
            hasLetter,
            hasNumber,
            hasSpecialChar,
            isLongEnough,
            isValid: hasLetter && hasNumber && hasSpecialChar && isLongEnough
        };
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        const confirmPassword = formData.get('confirmPassword') as string;
        // Walidacja hasła
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            let errorMessage = 'Hasło musi zawierać:\n';
            if (!passwordValidation.hasLetter) errorMessage += '• Co najmniej jedną literę\n';
            if (!passwordValidation.hasNumber) errorMessage += '• Co najmniej jedną cyfrę\n';
            if (!passwordValidation.hasSpecialChar) errorMessage += '• Co najmniej jeden znak specjalny\n';
            if (!passwordValidation.isLongEnough) errorMessage += '• Co najmniej 9 znaków\n';
            
            alert(errorMessage);
            return;
        }

        if (password !== confirmPassword) {
            alert('Hasła nie są identyczne!');
            return;
        }

        try {
            // Wysyłamy dane do API
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                // Zapisz dane użytkownika do localStorage
                localStorage.setItem('userEmail', email);
                if (data.userId) {
                    localStorage.setItem('userId', data.userId);
                }
                console.log('✅ REGISTER: Zapisałem do localStorage:', { email, userId: data.userId });
                
                // WAŻNE: Zaloguj użytkownika w frontend Supabase session
                console.log('🔑 REGISTER: Loguję użytkownika w frontend...');
                const { error: loginError } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (loginError) {
                    console.error('❌ REGISTER: Błąd logowania frontend:', loginError);
                    alert('Konto utworzone, ale wystąpił problem z logowaniem. Spróbuj się zalogować ręcznie.');
                    window.location.href = '/login';
                    return;
                } else {
                    console.log('✅ REGISTER: Użytkownik zalogowany w frontend!');
                }
                
                window.location.href = '/register/plan';
            } else {
                alert(data.error || 'Wystąpił błąd podczas rejestracji');
            }
        } catch (error) {
            console.error('Błąd rejestracji:', error);
            alert('Wystąpił błąd połączenia. Spróbuj ponownie.');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
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
                                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">1</div>
                                <span className="ml-2 text-sm font-medium text-blue-600">Konto</span>
                            </div>
                            <div className="w-8 h-px bg-gray-300"></div>
                            <div className="flex items-center">
                                <div className="w-8 h-8 bg-gray-300 text-gray-500 rounded-full flex items-center justify-center text-sm font-medium">2</div>
                                <span className="ml-2 text-sm text-gray-500">Plan</span>
                            </div>
                            <div className="w-8 h-px bg-gray-300"></div>
                            <div className="flex items-center">
                                <div className="w-8 h-8 bg-gray-300 text-gray-500 rounded-full flex items-center justify-center text-sm font-medium">3</div>
                                <span className="ml-2 text-sm text-gray-500">Płatność</span>
                            </div>
                        </div>
                    </div>

                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                        Utwórz konto
                    </h2>
                    <p className="text-gray-600 text-sm">
                        Krok 1 z 3: Podstawowe informacje
                    </p>
                </div>

                <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-gray-100">
                    {/* Google button */}
                    <div className="mb-6">
                        <button 
                            type="button"
                            onClick={handleGoogleSignUp}
                            className="w-full flex items-center justify-center px-4 py-3.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow"
                        >
                            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Zarejestruj się z Google
                        </button>
                    </div>

                    {/* Separator */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-white text-gray-500 font-medium">LUB</span>
                        </div>
                    </div>



                    {/* Formularz rejestracji */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                                Adres email
                            </label>
                            <input 
                                type="email" 
                                id="email" 
                                name="email" 
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                                placeholder="jan.kowalski@email.com"
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
                                minLength={9}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                                placeholder="Min. 9 znaków, litera, cyfra, znak specjalny"
                            />
                            <div className="mt-2 text-xs text-gray-500 space-y-1">
                                <div className="flex flex-wrap gap-x-4 gap-y-1">
                                    <span>• Co najmniej jedna litera</span>
                                    <span>• Co najmniej jedna cyfra</span>
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1">
                                    <span>• Co najmniej jeden znak specjalny</span>
                                    <span>• Co najmniej 9 znaków</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-900 mb-2">
                                Potwierdź hasło
                            </label>
                            <input 
                                type="password" 
                                id="confirmPassword" 
                                name="confirmPassword" 
                                required
                                minLength={9}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                                placeholder="Wpisz hasło ponownie"
                            />
                        </div>

                        <button 
                            type="submit" 
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-4 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            Utwórz konto
                        </button>
                    </form>

                    {/* Link do logowania */}
                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            Masz już konto?{' '}
                            <a 
                                href="/login" 
                                className="font-semibold text-blue-600 hover:text-blue-500 transition-colors"
                            >
                                Zaloguj się
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}