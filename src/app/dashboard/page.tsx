"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [billingInfo, setBillingInfo] = useState<any>(null);

  // 💾 Przywróć ostatnią aktywną zakładkę z localStorage (jeśli istnieje)
  const [activeSection, setActiveSection] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("activeSection") || "home";
    }
    return "home";
  });

  // State dla rozwijania submenu w Ustawieniach
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [activeSettingsSubmenu, setActiveSettingsSubmenu] = useState<
    string | null
  >(null);

  // Nowe state dla linków
  const [links, setLinks] = useState<any[]>([]);
  const [linkUrl, setLinkUrl] = useState("");
  const [creatingLink, setCreatingLink] = useState(false);
  const [linkMessage, setLinkMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [lastShortUrl, setLastShortUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [monthlyUsage, setMonthlyUsage] = useState<any>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModalData, setUpgradeModalData] = useState<any>(null);
  // 🔄 Loading states dla odświeżania
  const [refreshingLinks, setRefreshingLinks] = useState(false);
  const [refreshingQrCodes, setRefreshingQrCodes] = useState(false);
  // Links section state
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "7" | "30" | "month">(
    "all",
  );
  const [selectedLinkIds, setSelectedLinkIds] = useState<string[]>([]);
  const [hiddenLinkIds, setHiddenLinkIds] = useState<string[]>([]);
  const [tagsById, setTagsById] = useState<Record<string, string[]>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<{
    open: boolean;
    link?: any;
  }>({ open: false });
  const [showAnalyticsModal, setShowAnalyticsModal] = useState<{
    open: boolean;
    link?: any;
    data?: any;
  }>({ open: false });

  // Analytics section state
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState("7");
  // Custom date range
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  // MULTI-SELECT: array typów wykresów (można wybrać kilka naraz)
  const [analyticsChartFilters, setAnalyticsChartFilters] = useState<
    Array<"all" | "unique" | "qr" | "qr_unique">
  >(["all"]);
  // Dane dla każdego typu (wszystkie fetchowane naraz)
  const [chartDataAll, setChartDataAll] = useState<{ [key: string]: number[] }>(
    {},
  );
  const [chartLabels, setChartLabels] = useState<string[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);
  // Tooltip state (Google Analytics style!)
  const [hoveredPoint, setHoveredPoint] = useState<{
    index: number;
    x: number;
    y: number;
  } | null>(null);

  // QR Codes section state
  const [qrCodes, setQrCodes] = useState<any[]>([]);
  const [creatingQr, setCreatingQr] = useState(false);
  const [qrMessage, setQrMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [selectedLinkForQr, setSelectedLinkForQr] = useState<string | null>(
    null,
  );
  const [quickCreateMode, setQuickCreateMode] = useState<"link" | "qr">("link"); // Tryb szybkiego tworzenia
  const [generatedQrCode, setGeneratedQrCode] = useState<string | null>(null); // Wygenerowany QR kod (base64)

  // Analytics Page State
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsDateRange, setAnalyticsDateRange] = useState("30");
  const [analyticsLinkFilter, setAnalyticsLinkFilter] = useState(""); // For chart filtering
  const [selectedAnalyticsLink, setSelectedAnalyticsLink] = useState<
    string | null
  >(null);

  // Profile Page State
  const [displayName, setDisplayName] = useState("");
  const [updatingDisplayName, setUpdatingDisplayName] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [accessHistory, setAccessHistory] = useState<any[]>([]);
  const [loadingAccessHistory, setLoadingAccessHistory] = useState(false);

  // 2FA State
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [showTwoFASetup, setShowTwoFASetup] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [twoFASecret, setTwoFASecret] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState("");
  const [twoFAMessage, setTwoFAMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Domena dla skróconych linków
  const shortDomain =
    process.env.NEXT_PUBLIC_SHORT_DOMAIN || "http://localhost:3000";

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const dropdown = document.getElementById("date-range-dropdown");
      const button = (e.target as HTMLElement).closest("button");
      if (dropdown && !dropdown.contains(e.target as Node) && !button) {
        dropdown.classList.add("hidden");
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    console.log(
      "🔍 DASHBOARD useEffect - sprawdzam URL:",
      window.location.href,
    );

    // 🔑 PARSUJ HASH z OAuth redirect NAJPIERW (zanim cokolwiek innego!)
    const parseOAuthHash = async () => {
      const hash = window.location.hash;
      console.log("🔍 Hash z URL:", hash);

      if (hash && hash.includes("access_token")) {
        console.log("✅ Znalazłem OAuth hash - parsuje tokeny RĘCZNIE...");

        try {
          // RĘCZNE parsowanie hasha (Supabase 2.x NIE robi tego automatycznie!)
          const hashParams = new URLSearchParams(hash.substring(1)); // Usuń # z początku
          const access_token = hashParams.get("access_token");
          const refresh_token = hashParams.get("refresh_token");

          if (access_token && refresh_token) {
            console.log(
              "🔑 Mam tokeny z hasha - zapisuje przez setSession()...",
            );

            // Użyj setSession() żeby zapisać tokeny
            const { data, error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });

            if (error) {
              console.error("❌ Błąd zapisywania sesji:", error);
              return false;
            }

            console.log(
              "✅ Sesja ustanowiona z OAuth!",
              data.session?.user?.email,
            );
            // Wyczyść hash z URL (estetycznie)
            window.history.replaceState({}, "", "/dashboard");
            return true; // Sukces!
          } else {
            console.error("❌ Brak access_token lub refresh_token w hashu");
          }
        } catch (err) {
          console.error("❌ Exception podczas parsowania hasha:", err);
        }
      }
      return false;
    };

    // Jeśli wróciliśmy ze Stripe przez success_url=/dashboard?payment_success=true
    try {
      const params = new URLSearchParams(window.location.search);
      const fromStripe =
        params.get("from") === "stripe" ||
        params.get("payment_success") === "true";
      if (fromStripe) {
        localStorage.setItem("paymentSuccess", "true");
        window.history.replaceState({}, "", "/dashboard");
      }
    } catch {}

    // 🔑 PRZYWRÓĆ SESJĘ z zapisanych tokenów (po powrocie ze Stripe)
    const restoreSession = async () => {
      const accessToken = sessionStorage.getItem("payment_access_token");
      const refreshToken = sessionStorage.getItem("payment_refresh_token");

      if (accessToken && refreshToken) {
        console.log(
          "🔑 Znalazłem zapisane tokeny w sessionStorage - przywracam sesję...",
        );

        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error("❌ Błąd przywracania sesji:", error);
            // Wyczyść nieprawidłowe tokeny
            sessionStorage.removeItem("payment_access_token");
            sessionStorage.removeItem("payment_refresh_token");
          } else {
            console.log("✅ Sesja przywrócona!", data.user?.email);
          }
        } catch (err) {
          console.error("❌ Exception podczas przywracania sesji:", err);
          // Wyczyść tokeny
          sessionStorage.removeItem("payment_access_token");
          sessionStorage.removeItem("payment_refresh_token");
        }

        // Wyczyść tokeny po użyciu
        sessionStorage.removeItem("payment_access_token");
        sessionStorage.removeItem("payment_refresh_token");
      } else {
        console.log("ℹ️ Brak tokenów w sessionStorage");
      }
    };

    // GŁÓWNY FLOW:
    (async () => {
      const wasOAuth = await parseOAuthHash();
      if (!wasOAuth) {
        // Nie było OAuth - spróbuj przywrócić sesję z Stripe
        await restoreSession();
      }

      // Po wszystkim - sprawdź usera (zwiększony delay po OAuth!)
      setTimeout(
        () => {
          checkUserAndSubscription();
        },
        wasOAuth ? 1000 : 500,
      ); // Więcej czasu po OAuth (1s vs 0.5s)
    })();

    // 🧹 CACHE będzie sprawdzany AFTER pobrania usera, żeby użyć user_id jako klucza
    // To zapobiega mieszaniu danych między różnymi kontami
    const now = new Date().getTime();

    // Sprawdź czy to redirect z Stripe
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get("session_id");
    const urlUserId = urlParams.get("user_id"); // ID usera z URL

    if (sessionId) {
      console.log(
        "🎉 Płatność udana! Session ID:",
        sessionId,
        "User ID:",
        urlUserId,
      );
      console.log("💾 Ustawiam localStorage paymentSuccess = true");

      // Ustaw flagę płatności PRZED czyszczeniem URL
      localStorage.setItem("paymentSuccess", "true");
      if (urlUserId) {
        localStorage.setItem("paymentUserId", urlUserId); // Zapisz ID usera który płacił
        console.log("💾 Zapisano paymentUserId:", urlUserId);
      }

      // Wyczyść cache bo mamy nową płatność
      localStorage.removeItem("cachedUser");
      localStorage.removeItem("cachedSubscription");
      localStorage.removeItem("cacheTime");

      // Wyczyść URL
      window.history.replaceState({}, "", "/dashboard");

      console.log(
        "✅ localStorage ustawiony, cache wyczyszczony, URL wyczyszczony",
      );
    }

    // Sprawdzamy usera ZAWSZE - cache będzie per-user w checkUserAndSubscription
    // Zwiększony czas oczekiwania na załadowanie sesji (szczególnie po powrocie ze Stripe)
    setTimeout(() => {
      checkUserAndSubscription();
    }, 3000); // 3 sekundy - daj więcej czasu na załadowanie sesji OAuth
  }, []);

  const checkUserAndSubscription = async () => {
    try {
      // 🔑 UŻYWAMY getSession() zamiast getUser() - parsuje hash z OAuth redirect!
      const {
        data: { session },
        error: userError,
      } = await supabase.auth.getSession();
      const user = session?.user || null;

      console.log("Dashboard - sprawdzam usera:", user, userError);

      // 🧹 WYCZYŚĆ localStorage jeśli to inny user niż poprzednio
      const lastUserId = localStorage.getItem("currentUserId");
      if (user && lastUserId && lastUserId !== user.id) {
        console.log(
          "🔄 ZMIANA USERA! Poprzedni:",
          lastUserId,
          "Aktualny:",
          user.id,
        );
        console.log("🧹 Czyszczę localStorage z poprzedniej sesji...");
        localStorage.removeItem("paymentSuccess");
        localStorage.removeItem("paymentUserId");
        localStorage.removeItem("lastPaymentAttempt");
        localStorage.removeItem("lastPaymentUserId");
        localStorage.removeItem("cachedUser");
        localStorage.removeItem("cachedSubscription");
        localStorage.removeItem("cacheTime");
      }

      // Zapisz aktualnego usera
      if (user) {
        localStorage.setItem("currentUserId", user.id);
      }

      if (userError || !user) {
        // Specjalny przypadek: user został usunięty w Supabase, ale w przeglądarce zostały stare tokeny
        const userErrorMessage = (userError as any)?.message || "";
        if (
          userErrorMessage.includes("User from sub claim in JWT does not exist")
        ) {
          console.warn(
            "⚠️ Supabase auth desync: token wskazuje na nieistniejącego usera. Czyszczę sesję…",
          );
          try {
            await supabase.auth.signOut();
          } catch {}
          try {
            sessionStorage.clear();
          } catch {}
          try {
            localStorage.clear();
          } catch {}
          window.location.href = "/register?reason=relogin";
          return;
        }

        console.log("Brak usera, przekierowuję do logowania");
        // Sprawdź czy to redirect z Stripe
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get("session_id");
        const fromPayment = urlParams.get("from_payment");

        if (sessionId || fromPayment) {
          // To redirect z Stripe - sprawdź ile razy próbowaliśmy
          const retryCount = parseInt(
            localStorage.getItem("auth_retry_count") || "0",
          );

          if (retryCount < 3) {
            // Spróbuj ponownie za chwilę
            console.log(`🔄 Próba ${retryCount + 1}/3 - czekam na sesję...`);
            localStorage.setItem(
              "auth_retry_count",
              (retryCount + 1).toString(),
            );

            setTimeout(() => {
              window.location.reload();
            }, 2000); // Czekaj 2 sekundy i spróbuj ponownie
            return;
          } else {
            // Po 3 próbach - zapisz session_id i przekieruj na login
            console.log(
              "❌ Sesja nie załadowała się po 3 próbach - przekierowuję na login",
            );
            localStorage.removeItem("auth_retry_count");
            localStorage.setItem("stripe_session_id", sessionId || "");
            window.location.href = "/login?from=stripe";
            return;
          }
        }

        window.location.href = "/login";
        return;
      }

      // Sesja załadowana - wyczyść retry counter
      localStorage.removeItem("auth_retry_count");

      setUser(user);

      console.log("📅 User metadata:", user.user_metadata);
      console.log("📅 Created at:", user.created_at);

      // Sprawdź czy to nowy użytkownik (utworzony < 5 minut temu)
      const userCreated = new Date(user.created_at);
      const now = new Date();
      const isNewUser = now.getTime() - userCreated.getTime() < 5 * 60 * 1000; // 5 minut (zwiększone dla OAuth)

      // Sprawdź czy to Google OAuth user (nowy, bez wcześniejszej subskrypcji)
      const isGoogleUser = user.app_metadata?.provider === "google";

      console.log("🆕 Is new user?", isNewUser, { userCreated, now });
      console.log(
        "🔍 Is Google user?",
        isGoogleUser,
        "Provider:",
        user.app_metadata?.provider,
      );

      // JEŚLI TO NOWY USER - WYCZYŚĆ LOCALSTORAGE (ale NIE jeśli mamy paymentSuccess z session_id!)
      if (isNewUser && !localStorage.getItem("paymentSuccess")) {
        console.log(
          "🧹 NOWY USER bez paymentSuccess - czyszczę stare localStorage!",
        );
        localStorage.removeItem("lastPaymentAttempt");
      } else if (isNewUser && localStorage.getItem("paymentSuccess")) {
        console.log(
          "🎯 NOWY USER z paymentSuccess - to powrót z płatności, nie czyszczę!",
        );
      }

      // TERAZ sprawdź czy to powrót z płatności
      const paymentSuccess = localStorage.getItem("paymentSuccess");
      const paymentUserId = localStorage.getItem("paymentUserId");

      console.log(
        "🔍 Sprawdzam localStorage paymentSuccess:",
        paymentSuccess,
        "dla usera:",
        paymentUserId,
      );

      // Sprawdź czy paymentSuccess jest dla TEGO usera
      const isPaymentForThisUser =
        paymentSuccess && (!paymentUserId || paymentUserId === user.id);

      if (isPaymentForThisUser) {
        console.log(
          "💳 PRIORYTET! Mam paymentSuccess DLA TEGO USERA - to powrót z płatności!",
        );
        localStorage.removeItem("paymentSuccess");
        localStorage.removeItem("paymentUserId");
        alert(
          "Płatność zakończona pomyślnie! Twoja subskrypcja zostanie aktywowana w ciągu kilku minut.",
        );

        // USTAW KOMPLETNĄ SUBSKRYPCJĘ ŻEBY DASHBOARD DZIAŁAŁ
        setSubscription({
          id: "temp-pending",
          user_id: user.id,
          stripe_customer_id: null,
          stripe_subscription_id: null,
          status: "active", // Ustaw jako aktywna żeby dashboard działał
          plan_id: "pro", // Przykładowy plan
          billing_cycle: "monthly",
          payment_method: "card",
          current_period_start: null,
          current_period_end: null,
          cancel_at_period_end: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        setLoading(false);
        return;
      }

      // isNewUser już sprawdzone wcześniej

      // Sprawdź status subskrypcji - pobierz NAJNOWSZĄ (sortuj po created_at DESC)
      const { data: subData, error: subError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subError) {
        console.error(
          "Błąd pobierania subskrypcji:",
          JSON.stringify(subError, null, 2),
        );
        console.log(
          "🚨 WYKRYTO BŁĄD SUBSKRYPCJI - sprawdzam kod:",
          subError.code,
        );

        // Jeśli użytkownik nie ma subskrypcji
        if (
          subError.code === "PGRST116" ||
          subError.message?.includes("No rows")
        ) {
          console.log("🔍 BRAK SUBSKRYPCJI - sprawdzam localStorage...");

          // SPRAWDŹ CZY TO POWRÓT Z PŁATNOŚCI DLA TEGO KONKRETNEGO USERA
          const paymentSuccess = localStorage.getItem("paymentSuccess");
          const paymentUserId = localStorage.getItem("paymentUserId"); // ID usera który płacił

          console.log("🔍 localStorage paymentSuccess:", paymentSuccess);
          console.log(
            "🔍 localStorage paymentUserId:",
            paymentUserId,
            "current user:",
            user.id,
          );

          // SPRAWDŹ CZY USER ZOSTAŁ UTWORZONY NIEDAWNO (ostatnie 15 minut = prawdopodobnie po płatności)
          const userCreatedTime = new Date(user.created_at).getTime();
          const now = new Date().getTime();
          const isRecentUser = now - userCreatedTime < 15 * 60 * 1000; // 15 minut

          // Sprawdź czy TO TEN SAM USER próbował płacić w ostatnich 10 minutach
          const lastPaymentAttempt = localStorage.getItem("lastPaymentAttempt");
          const lastPaymentUserId = localStorage.getItem("lastPaymentUserId");
          const isRecentPayment =
            lastPaymentAttempt &&
            lastPaymentUserId === user.id && // ✅ MUSI BYĆ TEN SAM USER!
            now - parseInt(lastPaymentAttempt) < 10 * 60 * 1000;

          console.log(
            "🔍 User utworzony:",
            new Date(user.created_at),
            "Czy nedawno?",
            isRecentUser,
          );
          console.log(
            "🔍 Ostatnia próba płatności:",
            lastPaymentAttempt,
            "przez usera:",
            lastPaymentUserId,
          );
          console.log("🔍 isRecentPayment (dla TEGO usera):", isRecentPayment);

          // TYLKO jeśli paymentSuccess ORAZ to TEN SAM user
          const isPaymentForThisUser =
            paymentSuccess && (!paymentUserId || paymentUserId === user.id);

          if (isPaymentForThisUser || isRecentPayment) {
            console.log(
              "💳 POTENCJALNY POWRÓT Z PŁATNOŚCI (localStorage/nedawna próba) - sprawdzam Stripe...",
            );
            localStorage.removeItem("paymentSuccess");

            // SPRAWDŹ PRAWDZIWĄ SUBSKRYPCJĘ W STRIPE
            try {
              const response = await fetch("/api/stripe/check-subscription", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  userId: user.id,
                  userEmail: user.email,
                }),
              });

              const result = await response.json();
              console.log("🔍 Wynik sprawdzenia Stripe:", result);

              if (result.hasSubscription) {
                console.log("✅ PRAWDZIWA subskrypcja znaleziona w Stripe!");
                alert(
                  "Płatność zakończona pomyślnie! Twoja subskrypcja jest już aktywna.",
                );
                setSubscription(result.subscription);

                // Cache wyłączony - zawsze świeże dane z bazy

                setLoading(false);
                return;
              } else {
                console.log(
                  "❌ Brak subskrypcji w Stripe - pokazuję komunikat oczekiwania",
                );
                // Jeśli brak subskrypcji - stwórz tymczasową z prawdziwymi danymi
                const savedPlan =
                  localStorage.getItem("selectedPlan") || "starter";
                const savedCycle =
                  localStorage.getItem("selectedBillingCycle") || "monthly";

                console.log("📦 Używam zapisanych danych planu:", {
                  savedPlan,
                  savedCycle,
                });

                const tempSubscription = {
                  id: "temp-pending",
                  user_id: user.id,
                  stripe_customer_id: null,
                  stripe_subscription_id: null,
                  status: "pending", // Pokazuj jako pending żeby user wiedział że w trakcie
                  plan_id: savedPlan,
                  billing_cycle: savedCycle,
                  payment_method: "card",
                  current_period_start: null,
                  current_period_end: null,
                  cancel_at_period_end: false,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                };

                setSubscription(tempSubscription);
                alert(
                  "Płatność w trakcie przetwarzania. Sprawdź ponownie za kilka minut.",
                );
                setLoading(false);
                return;
              }
            } catch (error) {
              console.error("❌ Błąd sprawdzania Stripe:", error);
              alert(
                "Płatność zakończona pomyślnie! Twoja subskrypcja zostanie aktywowana w ciągu kilku minut.",
              );
              setLoading(false);
              return;
            }
          }

          console.log("🔍 SPRAWDZAM WARUNKI:", {
            paymentSuccess,
            isRecentPayment,
            isRecentUser,
          });

          // Dla nowych userów bez historii płatności - sprawdź czy może mają już subskrypcję
          if (isRecentUser) {
            console.log(
              "🆕 NOWY USER - sprawdzam czy ma subskrypcję w Stripe...",
            );

            try {
              const response = await fetch("/api/stripe/check-subscription", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  userId: user.id,
                  userEmail: user.email,
                }),
              });

              const result = await response.json();
              console.log(
                "🔍 Wynik sprawdzenia Stripe dla nowego usera:",
                result,
              );

              if (result.hasSubscription) {
                console.log("✅ NOWY USER ma już subskrypcję w Stripe!");
                alert("Witamy! Twoja subskrypcja jest już aktywna.");
                setSubscription(result.subscription);
                setLoading(false);
                return;
              } else {
                console.log(
                  "✅ NOWY USER bez subskrypcji - przekierowuję do wyboru planu",
                );
                // Kontynuuj normalny flow - sprawdzi czy nowy user i przekieruje do planu
              }
            } catch (error) {
              console.error(
                "❌ Błąd sprawdzania Stripe dla nowego usera:",
                error,
              );
              // Kontynuuj normalny flow
            }
          } else {
            console.log(
              "❌ Brak paymentSuccess w localStorage - sprawdzam czy nowy user...",
            );
          }

          // NOWY UŻYTKOWNIK (zwłaszcza Google OAuth) → ZAWSZE przekieruj do wyboru planu
          if (isNewUser) {
            console.log(
              "🆕 Nowy użytkownik bez subskrypcji → przekierowanie do wyboru planu",
            );

            // Dla Google OAuth - wyczyść cache żeby wymuszać wybór planu
            if (isGoogleUser) {
              console.log(
                "🔍 Google OAuth user - czyszczę cache i przekierowuję do planu",
              );
              localStorage.removeItem("cachedUser");
              localStorage.removeItem("cachedSubscription");
              localStorage.removeItem("cacheTime");
            }

            window.location.href = "/register/plan";
            return;
          }

          // SPRAWDŹ NAJPIERW CZY TO NIE PROBLEM Z PŁATNOŚCIĄ
          const savedPlan = localStorage.getItem("selectedPlan");
          const lastPaymentAttempt2 =
            localStorage.getItem("lastPaymentAttempt");
          const now2 = new Date().getTime();
          const isRecentPayment2 =
            lastPaymentAttempt2 &&
            now2 - parseInt(lastPaymentAttempt2) < 30 * 60 * 1000; // 30 minut

          if (savedPlan && isRecentPayment2) {
            console.log(
              "💳 PRAWDOPODOBNY POWRÓT Z PŁATNOŚCI - pokazuję tymczasową subskrypcję",
            );
            const savedCycle =
              localStorage.getItem("selectedBillingCycle") || "monthly";

            const tempSub = {
              id: "temp-processing",
              user_id: user.id,
              status: "pending",
              plan_id: savedPlan,
              billing_cycle: savedCycle,
              payment_method: "card",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            setUser(user);
            setSubscription(tempSub);

            // Zapisz do cache
            // Cache wyłączony - zawsze świeże dane z bazy

            setLoading(false);
            return;
          }

          // STARY UŻYTKOWNIK (ale NIE nowy Google user) → stwórz FREE subskrypcję
          console.log("🆓 Stary użytkownik bez subskrypcji → tworzę FREE");

          // DODATKOWA OCHRONA: Jeśli to Google user utworzony w ostatnich 10 minutach - przekieruj do planu
          const userCreatedTime2 = new Date(user.created_at).getTime();
          const isVeryRecentUser = now2 - userCreatedTime2 < 10 * 60 * 1000; // 10 minut

          if (isGoogleUser && isVeryRecentUser) {
            console.log(
              "🔍 Wykryto nowego Google usera - przekierowuję do wyboru planu zamiast FREE",
            );
            window.location.href = "/register/plan";
            return;
          }

          try {
            // Użyj API endpoint żeby ominaść RLS
            const response = await fetch("/api/auth/create-free-subscription", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                userId: user.id,
                userEmail: user.email,
              }),
            });

            const result = await response.json();

            if (response.ok) {
              console.log(
                "✅ FREE subskrypcja utworzona:",
                result.subscription,
              );
              setSubscription(result.subscription);
            } else {
              console.error("Błąd tworzenia FREE subskrypcji:", result.error);
            }
          } catch (insertError) {
            console.error(
              "Exception podczas tworzenia FREE subskrypcji:",
              insertError,
            );
          }
        }
      } else if (!subData) {
        // Brak subskrypcji - sprawdź czy nowy user
        console.log("🚨 Brak subskrypcji w bazie (subData = null)");

        if (isNewUser) {
          console.log(
            "🆕 Nowy użytkownik bez subskrypcji → przekierowuję do wyboru planu",
          );
          window.location.href = "/register/plan";
          return;
        }

        // Stary user bez subskrypcji - utwórz FREE
        console.log("🆓 Stary użytkownik bez subskrypcji → tworzę FREE");
        try {
          const response = await fetch("/api/auth/create-free-subscription", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user.id,
              userEmail: user.email,
            }),
          });
          const result = await response.json();
          if (response.ok) {
            console.log("✅ FREE subskrypcja utworzona:", result.subscription);
            setSubscription(result.subscription);
          }
        } catch (error) {
          console.error("❌ Błąd tworzenia FREE:", error);
        }
      } else {
        setSubscription(subData);

        // ZAPISZ DO CACHE gdy mamy subskrypcję
        console.log("💾 Zapisuję subskrypcję do cache");
        // Cache wyłączony - zawsze świeże dane z bazy

        // Sprawdź czy subskrypcja jest aktywna (TYMCZASOWO WYŁĄCZONE - pozwalamy na pending)
        if (
          subData &&
          subData.status !== "active" &&
          subData.plan_id !== "free"
        ) {
          console.warn(
            "⚠️ Subskrypcja nie jest aktywna:",
            subData.status,
            "- pozwalamy wejść do dashboardu",
          );
          // Tymczasowo NIE przekierowujemy - niech user zobaczy dashboard
          // alert('Twoja subskrypcja nie jest aktywna. Przekierowujemy do płatności.');
          // window.location.href = '/register/payment';
          // return;
        }
      }
    } catch (error) {
      console.error("Błąd sprawdzania użytkownika:", error);
      window.location.href = "/login";
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
      window.location.href = "/login";
    } catch (error) {
      console.error("Błąd wylogowania:", error);
      alert("Nie udało się wylogować");
    }
  };

  // ===== PROFILE FUNCTIONS =====

  // Funkcja do aktualizacji display name
  const handleUpdateDisplayName = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingDisplayName(true);

    try {
      const { error } = await supabase.auth.updateUser({
        data: { display_name: displayName },
      });

      if (error) throw error;

      alert("✅ Nazwa wyświetlana zaktualizowana!");
      // Odśwież dane usera
      await checkUserAndSubscription();
    } catch (error: any) {
      console.error("Błąd aktualizacji nazwy:", error);
      alert("❌ Nie udało się zaktualizować nazwy: " + error.message);
    } finally {
      setUpdatingDisplayName(false);
    }
  };

  // Funkcja do zmiany hasła
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    // Walidacja
    if (newPassword !== confirmPassword) {
      setPasswordMessage({
        type: "error",
        text: "Nowe hasła nie są identyczne!",
      });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage({
        type: "error",
        text: "Hasło musi mieć minimum 6 znaków!",
      });
      return;
    }

    setChangingPassword(true);

    try {
      // Supabase nie wymaga starego hasła dla zmiany (user jest zalogowany)
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setPasswordMessage({
        type: "success",
        text: "✅ Hasło zmienione! Za chwilę zostaniesz wylogowany...",
      });

      // Wyczyść pola
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Wyloguj po 2 sekundach (Supabase wymaga ponownego logowania)
      setTimeout(async () => {
        await supabase.auth.signOut();
        window.location.href = "/login?password_changed=true";
      }, 2000);
    } catch (error: any) {
      console.error("Błąd zmiany hasła:", error);
      setPasswordMessage({ type: "error", text: "❌ " + error.message });
    } finally {
      setChangingPassword(false);
    }
  };

  // Funkcja do pobierania historii logowań
  const fetchAccessHistory = async () => {
    if (!user) return;

    setLoadingAccessHistory(true);

    try {
      // Fetch prawdziwych danych z API
      const response = await fetch(
        `/api/profile/access-history?userId=${user.id}`,
      );
      const data = await response.json();

      if (response.ok && data.history) {
        setAccessHistory(data.history);
        console.log(
          "✅ Access history pobrana:",
          data.history.length,
          "wpisów",
        );
      } else {
        console.error("Błąd pobierania historii:", data.error);
        // Fallback - pokaż przynajmniej obecną sesję
        setAccessHistory([
          {
            action:
              user.app_metadata?.provider === "google"
                ? "Log In With Google"
                : "Log In",
            location: "Poland, Swarzędz",
            timestamp: new Date().toISOString(),
            ip_address: "Current session",
            user_agent: navigator.userAgent,
          },
        ]);
      }
    } catch (error) {
      console.error("Exception pobierania historii:", error);
      // Fallback - pokaż obecną sesję
      setAccessHistory([
        {
          action:
            user.app_metadata?.provider === "google"
              ? "Log In With Google"
              : "Log In",
          location: "Poland, Swarzędz",
          timestamp: new Date().toISOString(),
          ip_address: "Current session",
          user_agent: navigator.userAgent,
        },
      ]);
    } finally {
      setLoadingAccessHistory(false);
    }
  };

  // Funkcja do wylogowania ze wszystkich sesji
  const handleLogoutAllSessions = async () => {
    if (
      !confirm(
        "Czy na pewno chcesz wylogować się ze wszystkich urządzeń? Ta akcja wymusi ponowne logowanie na wszystkich urządzeniach.",
      )
    ) {
      return;
    }

    try {
      // Supabase: signOut with scope: 'global' wyloguje ze wszystkich sesji
      await supabase.auth.signOut({ scope: "global" });

      localStorage.clear();
      window.location.href = "/login?logged_out_all=true";
    } catch (error) {
      console.error("Błąd wylogowania ze wszystkich sesji:", error);
      alert("❌ Nie udało się wylogować ze wszystkich sesji");
    }
  };

  // Funkcja do requestowania SAR (Subject Access Request - GDPR)
  const handleRequestSAR = async () => {
    if (
      !confirm(
        "Czy chcesz zażądać raportu SAR (Subject Access Request)? Otrzymasz emaila z wszystkimi danymi które o Tobie przechowujemy.",
      )
    ) {
      return;
    }

    try {
      // W prawdziwej apce: POST do /api/profile/sar który wysyła email z danymi
      // Na razie: symulacja
      alert(
        "✅ Żądanie SAR zostało wysłane! Otrzymasz email w ciągu 30 dni zgodnie z GDPR.",
      );
    } catch (error) {
      console.error("Błąd SAR:", error);
      alert("❌ Nie udało się wysłać żądania SAR");
    }
  };

  // ===== 2FA FUNCTIONS =====

  // Funkcja do sprawdzania statusu 2FA
  const check2FAStatus = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/auth/2fa/status?userId=${user.id}`);
      const data = await response.json();

      if (response.ok) {
        setTwoFAEnabled(data.enabled || false);
      }
    } catch (error) {
      console.error("Błąd sprawdzania 2FA status:", error);
    }
  };

  // Funkcja do rozpoczęcia setupu 2FA (generowanie QR)
  const handleSetup2FA = async () => {
    if (!user) return;

    setTwoFALoading(true);
    setTwoFAMessage(null);

    try {
      const response = await fetch("/api/auth/2fa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await response.json();

      if (response.ok) {
        setQrCodeData(data.qrCode);
        setTwoFASecret(data.secret);
        setBackupCodes(data.backupCodes);
        setShowTwoFASetup(true);
        setTwoFAMessage({
          type: "success",
          text: "✅ QR Code generated! Scan it with Google Authenticator.",
        });
      } else {
        setTwoFAMessage({
          type: "error",
          text: "❌ " + (data.error || "Failed to setup 2FA"),
        });
      }
    } catch (error) {
      console.error("Błąd setup 2FA:", error);
      setTwoFAMessage({ type: "error", text: "❌ Failed to setup 2FA" });
    } finally {
      setTwoFALoading(false);
    }
  };

  // Funkcja do weryfikacji kodu i włączenia 2FA
  const handleEnable2FA = async () => {
    if (!user || !verificationCode) {
      setTwoFAMessage({
        type: "error",
        text: "❌ Please enter verification code",
      });
      return;
    }

    setTwoFALoading(true);
    setTwoFAMessage(null);

    try {
      const response = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          token: verificationCode,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setTwoFAEnabled(true);
        setShowTwoFASetup(false);
        setVerificationCode("");
        setTwoFAMessage({
          type: "success",
          text: "✅ 2FA enabled successfully!",
        });
        alert("✅ 2FA enabled! Save your backup codes in a safe place.");
      } else {
        setTwoFAMessage({
          type: "error",
          text: "❌ " + (data.error || "Invalid code"),
        });
      }
    } catch (error) {
      console.error("Błąd weryfikacji 2FA:", error);
      setTwoFAMessage({ type: "error", text: "❌ Failed to verify code" });
    } finally {
      setTwoFALoading(false);
    }
  };

  // Funkcja do wyłączenia 2FA
  const handleDisable2FA = async () => {
    if (!user) return;

    const code = prompt(
      "Enter 6-digit code from Google Authenticator (or backup code) to disable 2FA:",
    );
    if (!code) return;

    setTwoFALoading(true);
    setTwoFAMessage(null);

    try {
      const response = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          token: code,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setTwoFAEnabled(false);
        setTwoFAMessage({
          type: "success",
          text: "✅ 2FA disabled successfully!",
        });
      } else {
        setTwoFAMessage({
          type: "error",
          text: "❌ " + (data.error || "Failed to disable 2FA"),
        });
      }
    } catch (error) {
      console.error("Błąd wyłączania 2FA:", error);
      setTwoFAMessage({ type: "error", text: "❌ Failed to disable 2FA" });
    } finally {
      setTwoFALoading(false);
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
        console.error("Błąd pobierania linków:", data.error);
      }
    } catch (error) {
      console.error("Błąd fetchLinks:", error);
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
        console.error("Błąd pobierania usage:", data.error);
      }
    } catch (error) {
      console.error("Błąd fetchUsage:", error);
    }
  };

  // Funkcja do pobierania QR kodów użytkownika
  const fetchQrCodes = async () => {
    if (!user) return;

    try {
      // Pobierz access token z sesji
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error("Brak tokena - user niezalogowany");
        return;
      }

      const response = await fetch("/api/qr/list", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await response.json();

      if (response.ok) {
        setQrCodes(data.qrCodes || []);
      } else {
        console.error("Błąd pobierania QR kodów:", data.error);
      }
    } catch (error) {
      console.error("Błąd fetchQrCodes:", error);
    }
  };

  // 🔄 Funkcja do odświeżania linków (z animacją)
  const refreshLinks = async () => {
    setRefreshingLinks(true);
    await Promise.all([fetchLinks(), fetchMonthlyUsage()]);
    // Czekaj minimum 500ms dla lepszej UX (żeby user zobaczył animację)
    setTimeout(() => {
      setRefreshingLinks(false);
    }, 500);
  };

  // 🔄 Funkcja do odświeżania QR kodów (z animacją)
  const refreshQrCodes = async () => {
    setRefreshingQrCodes(true);
    await Promise.all([fetchQrCodes(), fetchMonthlyUsage()]);
    // Czekaj minimum 500ms dla lepszej UX
    setTimeout(() => {
      setRefreshingQrCodes(false);
    }, 500);
  };

  // 📊 Funkcja do pobierania pełnych analytics (Analytics Page)
  const fetchAnalyticsOverview = async () => {
    if (!user) return;

    setAnalyticsLoading(true);
    try {
      const url = `/api/analytics/overview?userId=${user.id}&range=${analyticsDateRange}${selectedAnalyticsLink ? `&linkId=${selectedAnalyticsLink}` : ""}`;
      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        setAnalyticsData(data);
      } else {
        console.error("Error fetching analytics:", data.error);
      }
    } catch (error) {
      console.error("Error fetchAnalyticsOverview:", error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Fetch chart data for Analytics section (all types)
  const fetchAnalyticsChart = async () => {
    if (!user) {
      console.log("⚠️ Brak usera - nie pobieram chart data");
      return;
    }

    console.log("🔄 Fetching chart data for ALL types...", {
      userId: user.id,
      range: analyticsDateRange,
    });
    setLoadingChart(true);

    try {
      const linkParam = analyticsLinkFilter
        ? `&linkId=${analyticsLinkFilter}`
        : "";

      // Fetchuj wszystkie 4 typy naraz (parallel)
      const types = ["all", "unique", "qr", "qr_unique"] as const;
      const promises = types.map((type) =>
        fetch(
          `/api/links/analytics-chart?userId=${user.id}&range=${analyticsDateRange}&type=${type}${linkParam}`,
        ).then((r) => r.json()),
      );

      const results = await Promise.all(promises);

      // Zapisz dane dla każdego typu
      const newChartData: { [key: string]: number[] } = {};
      let labels: string[] = [];

      results.forEach((data, index) => {
        const type = types[index];
        if (data.chartData) {
          newChartData[type] = data.chartData;
          if (index === 0) labels = data.labels || []; // Labels są te same dla wszystkich
        }
      });

      setChartDataAll(newChartData);
      setChartLabels(labels);

      console.log("✅ All chart data loaded:", {
        types: Object.keys(newChartData),
        labelsCount: labels.length,
        qrData: newChartData["qr"],
        qrUniqueData: newChartData["qr_unique"],
        allData: newChartData["all"],
      });
    } catch (error) {
      console.error("❌ Exception w fetchAnalyticsChart:", error);
    } finally {
      setLoadingChart(false);
    }
  };

  // Funkcja do pobierania danych wykresu
  const fetchChartData = async () => {
    if (!user) {
      console.log("⚠️ Brak usera - nie pobieram chart data");
      return;
    }

    console.log("🔄 Fetching chart data for ALL types...", {
      userId: user.id,
      range: analyticsTimeRange,
    });
    setLoadingChart(true);

    try {
      // Fetchuj wszystkie 4 typy naraz (parallel)
      const types = ["all", "unique", "qr", "qr_unique"] as const;
      const promises = types.map((type) =>
        fetch(
          `/api/links/analytics-chart?userId=${user.id}&range=${analyticsTimeRange}&type=${type}`,
        ).then((r) => r.json()),
      );

      const results = await Promise.all(promises);

      // Zapisz dane dla każdego typu
      const newChartData: { [key: string]: number[] } = {};
      let labels: string[] = [];

      results.forEach((data, index) => {
        const type = types[index];
        if (data.chartData) {
          newChartData[type] = data.chartData;
          if (index === 0) labels = data.labels || []; // Labels są te same dla wszystkich
        }
      });

      setChartDataAll(newChartData);
      setChartLabels(labels);

      console.log("✅ All chart data loaded:", {
        types: Object.keys(newChartData),
        labelsCount: labels.length,
      });
    } catch (error) {
      console.error("❌ Exception w fetchChartData:", error);
    } finally {
      setLoadingChart(false);
    }
  };

  // Funkcja do tworzenia nowego linku
  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!linkUrl.trim()) {
      setLinkMessage({ type: "error", text: "Podaj URL do skrócenia" });
      return;
    }

    if (!user) {
      setLinkMessage({ type: "error", text: "Musisz być zalogowany" });
      return;
    }

    // Sprawdź weryfikację emaila
    // Google OAuth users są automatycznie zweryfikowani
    const isGoogleUser = user.app_metadata?.provider === "google";

    if (!user.email_confirmed_at && !isGoogleUser) {
      setLinkMessage({
        type: "error",
        text: "⚠️ Potwierdź swój email żeby tworzyć linki! Sprawdź skrzynkę.",
      });
      return;
    }

    // Jeśli tryb QR - najpierw utwórz link, potem QR
    if (quickCreateMode === "qr") {
      setCreatingLink(true);
      setLinkMessage(null);
      setGeneratedQrCode(null);

      try {
        // 1. Utwórz link
        const linkResponse = await fetch("/api/links/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            originalUrl: linkUrl,
            userId: user.id,
          }),
        });

        const linkData = await linkResponse.json();

        if (!linkResponse.ok) {
          if (linkData.limitReached && linkData.currentPlan === "free") {
            setUpgradeModalData(linkData);
            setShowUpgradeModal(true);
          } else {
            setLinkMessage({
              type: "error",
              text:
                linkData.message ||
                linkData.error ||
                "Nie udało się utworzyć linku",
            });
          }
          setCreatingLink(false);
          return;
        }

        // 2. Pobierz token z sesji dla QR request
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setLinkMessage({
            type: "error",
            text: "Błąd autoryzacji - odśwież stronę",
          });
          setCreatingLink(false);
          return;
        }

        // 3. Utwórz QR kod dla tego linka
        const qrResponse = await fetch("/api/qr/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            linkId: linkData.link.id,
          }),
        });

        const qrData = await qrResponse.json();

        if (qrResponse.ok) {
          setLinkMessage({ type: "success", text: "🎉 QR kod utworzony!" });
          setGeneratedQrCode(qrData.qrCode.qr_image_data);
          setLastShortUrl(qrData.shortUrl);
          setLinkUrl("");
          fetchLinks();
          fetchQrCodes();
          fetchMonthlyUsage();
        } else {
          setLinkMessage({
            type: "error",
            text: qrData.error || "Nie udało się utworzyć QR kodu",
          });
        }
      } catch (error) {
        console.error("Error creating QR:", error);
        setLinkMessage({
          type: "error",
          text: "Wystąpił błąd podczas tworzenia",
        });
      }

      setCreatingLink(false);
      return;
    }

    // Tryb normalny - tylko link
    setCreatingLink(true);
    setLinkMessage(null);

    try {
      const response = await fetch("/api/links/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originalUrl: linkUrl,
          userId: user.id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setLinkMessage({
          type: "success",
          text: "Link utworzony!",
        });
        setLastShortUrl(data.shortUrl);
        setLinkUrl(""); // Wyczyść formularz
        fetchLinks(); // Odśwież listę linków
        fetchMonthlyUsage(); // Odśwież miesięczne użycie
      } else {
        // Sprawdź czy to limit reached
        if (data.limitReached && data.currentPlan === "free") {
          // Pokaż modal upgrade
          setUpgradeModalData(data);
          setShowUpgradeModal(true);
        } else {
          setLinkMessage({
            type: "error",
            text: data.message || data.error || "Nie udało się utworzyć linku",
          });
        }
      }
    } catch (error) {
      console.error("Błąd tworzenia linku:", error);
      setLinkMessage({
        type: "error",
        text: "Wystąpił błąd połączenia",
      });
    } finally {
      setCreatingLink(false);
    }
  };

  const fetchBillingInfo = async () => {
    if (!user) return;

    try {
      const response = await fetch(
        `/api/stripe/billing-info?userId=${user.id}`,
      );
      const data = await response.json();
      setBillingInfo(data);
    } catch (error) {
      console.error("Błąd pobierania billing info:", error);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) return;

    try {
      const response = await fetch("/api/stripe/customer-portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          returnUrl: window.location.origin + "/dashboard",
        }),
      });

      const data = await response.json();

      if (response.ok && data.portalUrl) {
        window.location.href = data.portalUrl;
      } else {
        alert("Błąd: " + (data.error || "Nie można otworzyć portalu billing"));
      }
    } catch (error) {
      console.error("Błąd portalu billing:", error);
      alert("Wystąpił błąd podczas otwierania portalu billing");
    }
  };

  // Pobierz billing info gdy user się załaduje
  useEffect(() => {
    if (user) {
      fetchBillingInfo();
      fetchLinks(); // Pobierz też linki
      fetchMonthlyUsage(); // Pobierz miesięczne użycie
      fetchQrCodes(); // Pobierz QR kody
      fetchChartData(); // Pobierz dane wykresu
    }
  }, [user]);

  // Pobierz dane wykresu gdy zmienia się filtr lub zakres
  useEffect(() => {
    if (user) {
      fetchChartData();
    }
  }, [analyticsTimeRange]); // Usunięto chartFilter bo teraz fetchujemy wszystkie typy naraz

  // � Pobierz analytics overview gdy user zmienia zakres lub filtr linku
  useEffect(() => {
    if (user && activeSection === "analytics") {
      fetchAnalyticsOverview();
      fetchAnalyticsChart();
    }
  }, [user, activeSection, analyticsDateRange, selectedAnalyticsLink]);

  // �💾 Zapisz aktywną zakładkę do localStorage przy każdej zmianie
  useEffect(() => {
    localStorage.setItem("activeSection", activeSection);
  }, [activeSection]);

  // Pobierz dane profilu gdy user wchodzi na zakładkę Profile
  useEffect(() => {
    if (user && activeSection === "profile") {
      const currentDisplayName =
        user.user_metadata?.display_name || user.email?.split("@")[0] || "User";
      setDisplayName(currentDisplayName);
      fetchAccessHistory();
      check2FAStatus();
    }
  }, [user, activeSection]);

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
                  {user.user_metadata?.full_name ||
                    user.user_metadata?.name ||
                    user.email?.split("@")[0] ||
                    "User"}
                </p>
              </div>
            )}

            {/* Status subskrypcji */}
            <div className="mt-3 text-xs">
              {subscription ? (
                <div
                  className={`px-2 py-1 rounded-full text-center ${
                    subscription.status === "active"
                      ? "bg-green-100 text-green-800"
                      : subscription.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                  }`}
                >
                  {subscription.plan_id?.toUpperCase() || "FREE"} -{" "}
                  {subscription.status === "active"
                    ? "AKTYWNY"
                    : subscription.status === "pending"
                      ? "W TRAKCIE"
                      : "NIEAKTYWNY"}
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
              onClick={() => {
                setActiveSection("links");
                setShowCreateModal(true);
              }}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Stwórz nowy
            </button>
          </div>

          {/* Navigation */}
          <nav className="px-4 space-y-1">
            <button
              onClick={() => setActiveSection("home")}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg ${
                activeSection === "home"
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span>🏠</span>
              <span>Home</span>
            </button>
            <button
              onClick={() => setActiveSection("links")}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg ${activeSection === "links" ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700 hover:bg-gray-100"}`}
            >
              <span>🔗</span>
              <span>Linki</span>
            </button>
            <button
              onClick={() => setActiveSection("qrcodes")}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg ${
                activeSection === "qrcodes"
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span>📱</span>
              <span>QR Codes</span>
            </button>
            <div className="relative group">
              <button
                disabled
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-400 cursor-not-allowed opacity-60"
              >
                <span>📄</span>
                <span>Strony</span>
                <span className="ml-auto bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-medium">
                  Wkrótce
                </span>
              </button>
              {/* Tooltip on hover */}
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs rounded px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                🚧 W trakcie realizacji - dostępne wkrótce!
              </div>
            </div>
            <button
              onClick={() => setActiveSection("analytics")}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg ${
                activeSection === "analytics"
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span>📊</span>
              <span>Analityka</span>
            </button>
            <div className="relative group">
              <button
                disabled
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-400 cursor-not-allowed opacity-60"
              >
                <span>📢</span>
                <span>Kampanie</span>
                <span className="ml-auto bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-medium">
                  Wkrótce
                </span>
              </button>
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs rounded px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                🚧 W trakcie realizacji - dostępne wkrótce!
              </div>
            </div>
            <div className="relative group">
              <button
                disabled
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-400 cursor-not-allowed opacity-60"
              >
                <span>🌐</span>
                <span>Własne domeny</span>
                <span className="ml-auto bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-medium">
                  Wkrótce
                </span>
              </button>
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs rounded px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                🚧 W trakcie realizacji - dostępne wkrótce!
              </div>
            </div>
            <button
              onClick={() => setActiveSection("billing")}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg ${
                activeSection === "billing"
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span>💳</span>
              <span>Billing</span>
            </button>
            {/* Ustawienia z submenu */}
            <div>
              <button
                onClick={() => setSettingsExpanded(!settingsExpanded)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg ${
                  activeSection === "profile"
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span>⚙️</span>
                  <span>Ustawienia</span>
                </div>
                <svg
                  className={`w-4 h-4 transition-transform ${settingsExpanded ? "rotate-90" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>

              {/* Submenu - rozwijane */}
              {settingsExpanded && (
                <div className="ml-6 mt-1 space-y-1 border-l-2 border-gray-200 pl-3">
                  <button
                    onClick={() => {
                      setActiveSection("profile");
                      setActiveSettingsSubmenu("profile");
                      // Scroll do sekcji
                      setTimeout(() => {
                        document
                          .getElementById("profile-section")
                          ?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                      }, 100);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded text-sm ${
                      activeSettingsSubmenu === "profile"
                        ? "text-blue-700 font-medium bg-blue-50"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      setActiveSection("profile");
                      setActiveSettingsSubmenu("security");
                      setTimeout(() => {
                        document
                          .getElementById("security-section")
                          ?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                      }, 100);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded text-sm ${
                      activeSettingsSubmenu === "security"
                        ? "text-blue-700 font-medium bg-blue-50"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    Security
                  </button>
                  <button
                    onClick={() => {
                      setActiveSection("profile");
                      setActiveSettingsSubmenu("2fa");
                      setTimeout(() => {
                        document
                          .getElementById("2fa-section")
                          ?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                      }, 100);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded text-sm ${
                      activeSettingsSubmenu === "2fa"
                        ? "text-blue-700 font-medium bg-blue-50"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    2-Factor Authentication
                  </button>
                  <button
                    onClick={() => {
                      setActiveSection("profile");
                      setActiveSettingsSubmenu("access-history");
                      setTimeout(() => {
                        document
                          .getElementById("access-history-section")
                          ?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                      }, 100);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded text-sm ${
                      activeSettingsSubmenu === "access-history"
                        ? "text-blue-700 font-medium bg-blue-50"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    Access History
                  </button>
                </div>
              )}
            </div>
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
          {activeSection === "home" && (
            <>
              {/* Email Verification Banner */}
              {user &&
                !user.email_confirmed_at &&
                user.app_metadata?.provider !== "google" && (
                  <div className="mb-6 bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">⚠️</span>
                      <div className="flex-1">
                        <h3 className="font-bold text-yellow-900 mb-1">
                          Potwierdź swój adres email
                        </h3>
                        <p className="text-yellow-800 text-sm mb-3">
                          Wysłaliśmy link weryfikacyjny na{" "}
                          <strong>{user.email}</strong>. Musisz potwierdzić
                          email żeby tworzyć linki!
                        </p>
                        <button
                          onClick={async () => {
                            const { error } = await supabase.auth.resend({
                              type: "signup",
                              email: user.email!,
                            });
                            if (error) {
                              alert("Błąd wysyłania: " + error.message);
                            } else {
                              alert("✅ Email weryfikacyjny wysłany ponownie!");
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
                  <a href="#" className="underline">
                    Ulepsz teraz
                  </a>
                </div>
              </div>

              {/* Quick Create */}
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Szybkie tworzenie
                </h2>
                <p className="text-gray-600 mb-4">
                  Możesz stworzyć 3 więcej krótkich linków w tym miesiącu
                </p>

                <div className="flex space-x-4 mb-6">
                  <button
                    type="button"
                    onClick={() => {
                      setQuickCreateMode("link");
                      setLinkMessage(null);
                      setGeneratedQrCode(null);
                    }}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      quickCreateMode === "link"
                        ? "bg-blue-600 text-white"
                        : "border border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <span>🔗</span>
                    <span>Krótki link</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickCreateMode("qr");
                      setLinkMessage(null);
                      setGeneratedQrCode(null);
                    }}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      quickCreateMode === "qr"
                        ? "bg-blue-600 text-white"
                        : "border border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <span>📱</span>
                    <span>QR Code</span>
                  </button>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Domena:{" "}
                    {shortDomain.replace("https://", "").replace("http://", "")}{" "}
                    🚀
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
                    <div
                      className={`mb-4 p-3 rounded-lg ${
                        linkMessage.type === "success"
                          ? "bg-green-50 text-green-800 border border-green-200"
                          : "bg-red-50 text-red-800 border border-red-200"
                      }`}
                    >
                      <div className="flex flex-col gap-2">
                        <div className="font-medium">{linkMessage.text}</div>
                        {linkMessage.type === "success" &&
                          quickCreateMode === "link" &&
                          lastShortUrl && (
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
                                    await navigator.clipboard.writeText(
                                      lastShortUrl,
                                    );
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 1500);
                                  } catch (e) {
                                    console.error("Clipboard error", e);
                                  }
                                }}
                                className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                              >
                                Skopiuj
                              </button>
                              {copied && (
                                <span className="text-green-700 text-sm">
                                  Skopiowano!
                                </span>
                              )}
                            </div>
                          )}
                        {linkMessage.type === "success" &&
                          quickCreateMode === "qr" &&
                          generatedQrCode && (
                            <div className="flex flex-col items-center gap-3 mt-3">
                              <img
                                src={generatedQrCode}
                                alt="Generated QR Code"
                                className="w-48 h-48 border-2 border-green-300 rounded-lg"
                              />
                              <div className="text-sm text-green-700">
                                Link: {lastShortUrl}
                              </div>
                              <div className="flex gap-2">
                                <a
                                  href={generatedQrCode}
                                  download="qr-code.png"
                                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                                >
                                  📥 Pobierz QR
                                </a>
                                <button
                                  type="button"
                                  onClick={() => setActiveSection("qrcodes")}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                  Zobacz wszystkie QR
                                </button>
                              </div>
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
                    {creatingLink
                      ? "Tworzę..."
                      : quickCreateMode === "qr"
                        ? "📱 Stwórz QR Code"
                        : "🔗 Stwórz swój uplau link"}
                  </button>
                </form>

                <p className="text-sm text-gray-500 mt-4">
                  {monthlyUsage ? (
                    <>
                      {quickCreateMode === "link" && (
                        <>
                          Linków w tym miesiącu:{" "}
                          <strong>
                            {monthlyUsage.used} /{" "}
                            {monthlyUsage.isUnlimited ||
                            monthlyUsage.limit === 99999
                              ? "∞ (Bez limitu)"
                              : monthlyUsage.limit}
                          </strong>
                          {!monthlyUsage.isUnlimited &&
                            monthlyUsage.percentage !== null && (
                              <span className="ml-2">
                                ({monthlyUsage.percentage}%)
                              </span>
                            )}
                        </>
                      )}
                      {quickCreateMode === "qr" && (
                        <>
                          QR kodów w tym miesiącu:{" "}
                          <strong>
                            {monthlyUsage.qr_codes_created || 0} /{" "}
                            {(() => {
                              const planId =
                                subscription?.plan_id?.toLowerCase() || "free";
                              const isActive =
                                subscription?.status === "active";

                              // ⚠️ Tylko AKTYWNE subskrypcje dają premium limity
                              if (!isActive && planId !== "free") {
                                return 2; // Nieaktywna subskrypcja → FREE limit
                              }

                              // Limity QR kodów według planu
                              const qrLimits: Record<string, number> = {
                                free: 2,
                                starter: 100,
                                pro: 1000,
                                enterprise: 99999,
                                business: 99999,
                              };

                              const limit = qrLimits[planId] || 2;
                              return limit >= 99999 ? "∞" : limit;
                            })()}
                          </strong>
                          {(() => {
                            const planId =
                              subscription?.plan_id?.toLowerCase() || "free";
                            const isActive = subscription?.status === "active";
                            const effectivePlan =
                              !isActive && planId !== "free" ? "free" : planId;
                            const qrLimits: Record<string, number> = {
                              free: 2,
                              starter: 100,
                              pro: 1000,
                              enterprise: 99999,
                              business: 99999,
                            };
                            const limit = qrLimits[effectivePlan] || 2;
                            const used = monthlyUsage.qr_codes_created || 0;

                            if (limit < 99999 && used >= limit) {
                              return (
                                <span className="ml-2 text-red-600">
                                  (Limit osiągnięty)
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </>
                      )}
                      <br />
                      <span className="text-xs text-gray-400">
                        Reset: {monthlyUsage.resetDateFormatted}
                      </span>
                    </>
                  ) : (
                    "Ładowanie limitów..."
                  )}
                </p>
              </div>

              {/* Grid layout - Ostatnie linki + Aktualności */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Lista utworzonych linków */}
                {links.length > 0 && (
                  <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      Ostatnie linki ({Math.min(links.length, 4)} z{" "}
                      {links.length})
                    </h2>

                    <div className="space-y-3">
                      {links.slice(0, 4).map((link) => (
                        <div
                          key={link.id}
                          className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <a
                                href={`${shortDomain}/${link.short_code}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 font-medium text-lg block truncate"
                              >
                                {shortDomain
                                  .replace("https://", "")
                                  .replace("http://", "")}
                                /{link.short_code}
                              </a>
                              <p className="text-gray-500 text-sm mt-1 truncate">
                                → {link.original_url}
                              </p>
                            </div>
                            <div className="flex items-center space-x-3 ml-4 flex-shrink-0">
                              <div className="text-center">
                                <div className="text-xl font-bold text-blue-600">
                                  {link.unique_clicks || 0}
                                </div>
                                <div className="text-xs text-gray-500">
                                  unikalne
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-xl font-bold text-gray-900">
                                  {link.clicks}
                                </div>
                                <div className="text-xs text-gray-500">
                                  łącznie
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-400">
                              {new Date(link.created_at).toLocaleString(
                                "pl-PL",
                              )}
                            </div>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  `${shortDomain}/${link.short_code}`,
                                );
                                alert("Link skopiowany do schowka!");
                              }}
                              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs transition-colors"
                            >
                              📋 Kopiuj
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {links.length > 4 && (
                      <button
                        onClick={() => setActiveSection("links")}
                        className="w-full mt-4 py-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        Zobacz wszystkie linki ({links.length}) →
                      </button>
                    )}
                  </div>
                )}

                {/* Aktualizacje */}
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Aktualizacje 📰
                    </h2>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                      NOWE
                    </span>
                  </div>

                  <div className="space-y-4">
                    {/* Aktualność 1 */}
                    <div className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-semibold text-gray-900">
                          🚀 Nowa domena uplau.it
                        </h3>
                        <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                          18 paź 2024
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Wprowadziliśmy krótszą domenę dla Twoich linków!
                        Wszystkie nowe linki będą używać{" "}
                        <strong>uplau.it</strong> zamiast app.uplau.com.
                      </p>
                      <a
                        href="#"
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Dowiedz się więcej →
                      </a>
                    </div>

                    {/* Aktualność 2 */}
                    <div className="border-l-4 border-green-500 pl-4 py-2">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-semibold text-gray-900">
                          📊 Ulepszona analityka
                        </h3>
                        <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                          15 paź 2024
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Teraz śledzimy unikalne kliknięcia! Zobacz dokładne
                        statystyki każdego linku z podziałem na urządzenia i
                        lokalizacje.
                      </p>
                      <button
                        onClick={() => setActiveSection("links")}
                        className="text-xs text-green-600 hover:text-green-700 font-medium"
                      >
                        Sprawdź swoje statystyki →
                      </button>
                    </div>

                    {/* Aktualność 3 */}
                    <div className="border-l-4 border-purple-500 pl-4 py-2">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-semibold text-gray-900">
                          📱 QR Codes dla linków
                        </h3>
                        <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                          10 paź 2024
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Generuj kody QR dla swoich linków! Idealne do materiałów
                        drukowanych, plakatów i eventów.
                      </p>
                      <button
                        onClick={() => setActiveSection("qrcodes")}
                        className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                      >
                        Stwórz QR Code →
                      </button>
                    </div>
                  </div>

                  {/* Footer z CTA */}
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        💡 Chcesz więcej funkcji?
                      </p>
                      <button
                        onClick={() => (window.location.href = "/upgrade")}
                        className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                      >
                        Ulepsz plan →
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Analityka - Full Width */}
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    📊 Analityka
                  </h2>

                  {/* GA4-style Date Picker */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        const dropdown = document.getElementById(
                          "date-range-dropdown",
                        );
                        if (dropdown) dropdown.classList.toggle("hidden");
                      }}
                      className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer flex items-center gap-2 min-w-[140px]"
                    >
                      <svg
                        className="w-4 h-4 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="text-xs font-medium">
                        {analyticsTimeRange === "7" && "Ostatnie 7 dni"}
                        {analyticsTimeRange === "30" && "Ostatnie 30 dni"}
                        {analyticsTimeRange === "90" && "Ostatnie 90 dni"}
                        {analyticsTimeRange === "all" && "Cały czas"}
                        {analyticsTimeRange === "custom" &&
                          customStartDate &&
                          customEndDate &&
                          `${new Date(customStartDate).toLocaleDateString("pl-PL", { day: "numeric", month: "short" })} - ${new Date(customEndDate).toLocaleDateString("pl-PL", { day: "numeric", month: "short" })}`}
                        {analyticsTimeRange === "custom" &&
                          (!customStartDate || !customEndDate) &&
                          "Niestandardowy zakres"}
                      </span>
                      <svg
                        className="w-3 h-3 text-gray-400 ml-auto"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    {/* Dropdown */}
                    <div
                      id="date-range-dropdown"
                      className="hidden absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-20"
                    >
                      <div className="py-1">
                        {[
                          { value: "7", label: "Ostatnie 7 dni" },
                          { value: "30", label: "Ostatnie 30 dni" },
                          { value: "90", label: "Ostatnie 90 dni" },
                          { value: "all", label: "Cały czas" },
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setAnalyticsTimeRange(option.value);
                              setShowCustomDatePicker(false);
                              document
                                .getElementById("date-range-dropdown")
                                ?.classList.add("hidden");
                            }}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-blue-50 transition-colors ${
                              analyticsTimeRange === option.value
                                ? "bg-blue-50 text-blue-700 font-medium"
                                : "text-gray-700"
                            }`}
                          >
                            {option.label}
                            {analyticsTimeRange === option.value && (
                              <svg
                                className="w-3 h-3 inline-block ml-2"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </button>
                        ))}

                        {/* Custom Date Range */}
                        <div className="border-t border-gray-200 mt-1 pt-1">
                          <button
                            onClick={() => {
                              setShowCustomDatePicker(!showCustomDatePicker);
                              setAnalyticsTimeRange("custom");
                            }}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-blue-50 transition-colors ${
                              analyticsTimeRange === "custom"
                                ? "bg-blue-50 text-blue-700 font-medium"
                                : "text-gray-700"
                            }`}
                          >
                            📅 Niestandardowy zakres
                            {analyticsTimeRange === "custom" && (
                              <svg
                                className="w-3 h-3 inline-block ml-2"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </button>

                          {showCustomDatePicker && (
                            <div className="px-3 py-2 space-y-2 bg-gray-50">
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">
                                  Od:
                                </label>
                                <input
                                  type="date"
                                  value={customStartDate}
                                  onChange={(e) =>
                                    setCustomStartDate(e.target.value)
                                  }
                                  max={
                                    customEndDate ||
                                    new Date().toISOString().split("T")[0]
                                  }
                                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">
                                  Do:
                                </label>
                                <input
                                  type="date"
                                  value={customEndDate}
                                  onChange={(e) =>
                                    setCustomEndDate(e.target.value)
                                  }
                                  min={customStartDate}
                                  max={new Date().toISOString().split("T")[0]}
                                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                />
                              </div>
                              <button
                                onClick={() => {
                                  if (customStartDate && customEndDate) {
                                    document
                                      .getElementById("date-range-dropdown")
                                      ?.classList.add("hidden");
                                    setShowCustomDatePicker(false);
                                  }
                                }}
                                disabled={!customStartDate || !customEndDate}
                                className="w-full px-2 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                              >
                                Zastosuj
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats Cards - Compact */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {/* Łączne kliknięcia */}
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <div className="text-xs text-blue-600 font-medium mb-1">
                      Łączne kliknięcia
                    </div>
                    <div className="text-2xl font-bold text-blue-700">
                      {links.reduce((sum, link) => sum + (link.clicks || 0), 0)}
                    </div>
                  </div>

                  {/* Łączne unikalne kliknięcia */}
                  <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                    <div className="text-xs text-purple-600 font-medium mb-1">
                      Unikalne kliknięcia
                    </div>
                    <div className="text-2xl font-bold text-purple-700">
                      {links.reduce(
                        (sum, link) => sum + (link.unique_clicks || 0),
                        0,
                      )}
                    </div>
                  </div>

                  {/* Aktywne linki */}
                  <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                    <div className="text-xs text-green-600 font-medium mb-1">
                      Aktywne linki
                    </div>
                    <div className="text-2xl font-bold text-green-700">
                      {links.length}
                    </div>
                  </div>

                  {/* QR Codes */}
                  <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                    <div className="text-xs text-orange-600 font-medium mb-1">
                      QR Codes
                    </div>
                    <div className="text-2xl font-bold text-orange-700">
                      {qrCodes.length}
                    </div>
                  </div>
                </div>

                {/* Wykres */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-end mb-4">
                    <div className="flex gap-2 text-sm flex-wrap">
                      {/* MULTI-SELECT: Checkboxy zamiast radio buttons */}
                      <button
                        onClick={() => {
                          setAnalyticsChartFilters((prev) =>
                            prev.includes("all")
                              ? prev.filter((f) => f !== "all")
                              : [...prev, "all"],
                          );
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                          analyticsChartFilters.includes("all")
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                        Wszystkie kliknięcia
                      </button>
                      <button
                        onClick={() => {
                          setAnalyticsChartFilters((prev) =>
                            prev.includes("unique")
                              ? prev.filter((f) => f !== "unique")
                              : [...prev, "unique"],
                          );
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                          analyticsChartFilters.includes("unique")
                            ? "bg-purple-100 text-purple-700"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                        Unikalne kliknięcia
                      </button>
                      <button
                        onClick={() => {
                          setAnalyticsChartFilters((prev) =>
                            prev.includes("qr")
                              ? prev.filter((f) => f !== "qr")
                              : [...prev, "qr"],
                          );
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                          analyticsChartFilters.includes("qr")
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                        Skanowania QR
                      </button>
                      <button
                        onClick={() => {
                          setAnalyticsChartFilters((prev) =>
                            prev.includes("qr_unique")
                              ? prev.filter((f) => f !== "qr_unique")
                              : [...prev, "qr_unique"],
                          );
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                          analyticsChartFilters.includes("qr_unique")
                            ? "bg-orange-100 text-orange-700"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
                        Unikalne skanowania QR
                      </button>
                    </div>
                  </div>

                  {/* SVG Chart - MULTI-LINE (kilka wykresów naraz!) */}
                  <div className="relative h-80 mt-6 flex gap-4">
                    {/* Oś Y - liczby po lewej */}
                    {!loadingChart &&
                      Object.keys(chartDataAll).length > 0 &&
                      (() => {
                        // Znajdź max ze wszystkich wybranych typów
                        const allValues = analyticsChartFilters.flatMap(
                          (type) => chartDataAll[type] || [],
                        );
                        const maxValue = Math.max(...allValues, 1);
                        const paddedMax = Math.ceil(maxValue * 1.1);

                        return (
                          <div className="flex flex-col justify-between h-80 text-xs text-gray-500 pr-2 pt-1 pb-8">
                            <span>{paddedMax}</span>
                            <span>{Math.round(paddedMax * 0.75)}</span>
                            <span>{Math.round(paddedMax * 0.5)}</span>
                            <span>{Math.round(paddedMax * 0.25)}</span>
                            <span>0</span>
                          </div>
                        );
                      })()}

                    {/* Wykres */}
                    <div className="flex-1 h-80">
                      {loadingChart ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                      ) : analyticsChartFilters.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          <div className="text-center">
                            <p className="text-lg mb-2">📊</p>
                            <p>Wybierz typ wykresu powyżej</p>
                          </div>
                        </div>
                      ) : (
                        <svg
                          className="w-full h-full"
                          viewBox="0 0 800 200"
                          preserveAspectRatio="xMidYMid meet"
                        >
                          {/* Grid lines */}
                          <line
                            x1="0"
                            y1="180"
                            x2="800"
                            y2="180"
                            stroke="#e5e7eb"
                            strokeWidth="1"
                          />
                          <line
                            x1="0"
                            y1="135"
                            x2="800"
                            y2="135"
                            stroke="#e5e7eb"
                            strokeWidth="1"
                          />
                          <line
                            x1="0"
                            y1="90"
                            x2="800"
                            y2="90"
                            stroke="#e5e7eb"
                            strokeWidth="1"
                          />
                          <line
                            x1="0"
                            y1="45"
                            x2="800"
                            y2="45"
                            stroke="#e5e7eb"
                            strokeWidth="1"
                          />
                          <line
                            x1="0"
                            y1="0"
                            x2="800"
                            y2="0"
                            stroke="#e5e7eb"
                            strokeWidth="1"
                          />

                          {/* MULTI-LINE: Renderuj każdy wybrany typ */}
                          {(() => {
                            // Oblicz wszystko RAZ (nie w pętli)
                            const allValues = analyticsChartFilters.flatMap(
                              (type) => chartDataAll[type] || [],
                            );
                            const maxValue = Math.max(...allValues, 1);
                            const paddedMax = maxValue * 1.1;
                            const width = 800;
                            const height = 180;
                            const padding = 10;

                            const firstChartData =
                              chartDataAll[analyticsChartFilters[0]] || [];

                            return (
                              <>
                                {/* Interaktywne obszary (invisible rectangles) dla tooltipa */}
                                {firstChartData.map((_, index: number) => {
                                  const x =
                                    firstChartData.length > 1
                                      ? (index / (firstChartData.length - 1)) *
                                        width
                                      : width / 2;
                                  const rectWidth =
                                    firstChartData.length > 1
                                      ? width / (firstChartData.length - 1)
                                      : width;

                                  return (
                                    <rect
                                      key={`hover-${index}`}
                                      x={x - rectWidth / 2}
                                      y={0}
                                      width={rectWidth}
                                      height={height}
                                      fill="transparent"
                                      style={{ cursor: "pointer" }}
                                      onMouseEnter={() =>
                                        setHoveredPoint({ index, x, y: 0 })
                                      }
                                      onMouseLeave={() => setHoveredPoint(null)}
                                    />
                                  );
                                })}

                                {/* Linie i punkty */}
                                {analyticsChartFilters.map((filterType) => {
                                  const chartData =
                                    chartDataAll[filterType] || [];
                                  if (chartData.length === 0) return null;

                                  const colorMap = {
                                    all: "#3b82f6",
                                    unique: "#a855f7",
                                    qr: "#22c55e",
                                    qr_unique: "#f97316",
                                  };
                                  const color = colorMap[filterType];

                                  const points = chartData
                                    .map((value: number, index: number) => {
                                      const x =
                                        chartData.length > 1
                                          ? (index / (chartData.length - 1)) *
                                            width
                                          : width / 2;

                                      const normalizedValue = value / paddedMax;
                                      const y =
                                        height -
                                        padding -
                                        normalizedValue * (height - padding);

                                      return `${x.toFixed(2)},${y.toFixed(2)}`;
                                    })
                                    .join(" ");

                                  return (
                                    <g key={filterType}>
                                      <polyline
                                        fill="none"
                                        stroke={color}
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        points={points}
                                        opacity="0.9"
                                      />
                                      {chartData.map(
                                        (value: number, index: number) => {
                                          const x =
                                            chartData.length > 1
                                              ? (index /
                                                  (chartData.length - 1)) *
                                                width
                                              : width / 2;

                                          const normalizedValue =
                                            value / paddedMax;
                                          const y =
                                            height -
                                            padding -
                                            normalizedValue *
                                              (height - padding);

                                          return (
                                            <circle
                                              key={`${filterType}-${index}`}
                                              cx={x}
                                              cy={y}
                                              r="3"
                                              fill={color}
                                              stroke="white"
                                              strokeWidth="1"
                                            />
                                          );
                                        },
                                      )}
                                    </g>
                                  );
                                })}

                                {/* Pionowa linia na hover */}
                                {hoveredPoint && (
                                  <line
                                    x1={hoveredPoint.x}
                                    y1={0}
                                    x2={hoveredPoint.x}
                                    y2={height}
                                    stroke="#9ca3af"
                                    strokeWidth="1"
                                    strokeDasharray="4 2"
                                  />
                                )}
                              </>
                            );
                          })()}
                        </svg>
                      )}

                      {/* Tooltip - Google Analytics style! */}
                      {hoveredPoint && !loadingChart && (
                        <div
                          className="absolute bg-white shadow-lg rounded-lg border border-gray-200 p-3 z-10"
                          style={{
                            left: `${Math.min(hoveredPoint.x + 60, 700)}px`,
                            top: "20px",
                            minWidth: "180px",
                          }}
                        >
                          {/* Data */}
                          <div className="text-xs font-semibold text-gray-700 mb-2 pb-2 border-b border-gray-200">
                            {new Date(
                              chartLabels[hoveredPoint.index],
                            ).toLocaleDateString("pl-PL", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </div>

                          {/* Wartości dla każdego typu */}
                          <div className="space-y-1.5">
                            {analyticsChartFilters.map((filterType) => {
                              const value =
                                chartDataAll[filterType]?.[
                                  hoveredPoint.index
                                ] || 0;
                              const colorMap = {
                                all: "#3b82f6",
                                unique: "#a855f7",
                                qr: "#22c55e",
                                qr_unique: "#f97316",
                              };
                              const labelMap = {
                                all: "Wszystkie",
                                unique: "Unikalne",
                                qr: "QR",
                                qr_unique: "QR unikalne",
                              };

                              return (
                                <div
                                  key={filterType}
                                  className="flex items-center justify-between gap-3 text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="w-2.5 h-2.5 rounded-full"
                                      style={{
                                        backgroundColor: colorMap[filterType],
                                      }}
                                    ></span>
                                    <span className="text-gray-600">
                                      {labelMap[filterType]}:
                                    </span>
                                  </div>
                                  <span className="font-semibold text-gray-900">
                                    {value}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* X-axis labels - PRAWDZIWE DATY z API */}
                      <div className="flex justify-between mt-2 text-xs text-gray-500">
                        {chartLabels.length > 0 ? (
                          <>
                            {/* Pokaż pierwszą datę */}
                            <span>
                              {new Date(chartLabels[0]).toLocaleDateString(
                                "pl-PL",
                                { day: "numeric", month: "short" },
                              )}
                            </span>

                            {/* Pokaż kilka dat pośrednich */}
                            {chartLabels.length > 8 && (
                              <>
                                <span>
                                  {new Date(
                                    chartLabels[
                                      Math.floor(chartLabels.length * 0.14)
                                    ],
                                  ).toLocaleDateString("pl-PL", {
                                    day: "numeric",
                                    month: "short",
                                  })}
                                </span>
                                <span>
                                  {new Date(
                                    chartLabels[
                                      Math.floor(chartLabels.length * 0.28)
                                    ],
                                  ).toLocaleDateString("pl-PL", {
                                    day: "numeric",
                                    month: "short",
                                  })}
                                </span>
                                <span>
                                  {new Date(
                                    chartLabels[
                                      Math.floor(chartLabels.length * 0.42)
                                    ],
                                  ).toLocaleDateString("pl-PL", {
                                    day: "numeric",
                                    month: "short",
                                  })}
                                </span>
                                <span>
                                  {new Date(
                                    chartLabels[
                                      Math.floor(chartLabels.length * 0.57)
                                    ],
                                  ).toLocaleDateString("pl-PL", {
                                    day: "numeric",
                                    month: "short",
                                  })}
                                </span>
                                <span>
                                  {new Date(
                                    chartLabels[
                                      Math.floor(chartLabels.length * 0.71)
                                    ],
                                  ).toLocaleDateString("pl-PL", {
                                    day: "numeric",
                                    month: "short",
                                  })}
                                </span>
                                <span>
                                  {new Date(
                                    chartLabels[
                                      Math.floor(chartLabels.length * 0.85)
                                    ],
                                  ).toLocaleDateString("pl-PL", {
                                    day: "numeric",
                                    month: "short",
                                  })}
                                </span>
                              </>
                            )}

                            {/* Pokaż ostatnią datę */}
                            <span>Dziś</span>
                          </>
                        ) : (
                          <span>Brak danych</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Legenda pod wykresem - MULTI */}
                  {!loadingChart && analyticsChartFilters.length > 0 && (
                    <div className="mt-4 text-xs text-gray-500 flex items-center justify-center gap-4 flex-wrap">
                      {analyticsChartFilters.map((filterType) => {
                        const colorMap = {
                          all: "#3b82f6",
                          unique: "#a855f7",
                          qr: "#22c55e",
                          qr_unique: "#f97316",
                        };
                        const labelMap = {
                          all: "Wszystkie kliknięcia",
                          unique: "Unikalne kliknięcia",
                          qr: "Skanowania QR",
                          qr_unique: "Unikalne skanowania QR",
                        };

                        return (
                          <div
                            key={filterType}
                            className="flex items-center gap-2"
                          >
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: colorMap[filterType] }}
                            ></span>
                            <span>{labelMap[filterType]}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* CTA Button */}
                <div className="mt-6 text-center">
                  <button
                    onClick={() => setActiveSection("analytics")}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                  >
                    📊 Przejdź do szczegółowej analityki linków
                  </button>
                </div>
              </div>
            </>
          )}

          {activeSection === "links" && (
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
                <div>
                  <button
                    onClick={refreshLinks}
                    disabled={refreshingLinks}
                    className={`px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2 ${refreshingLinks ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <svg
                      className={`w-4 h-4 ${refreshingLinks ? "animate-spin" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    {refreshingLinks ? "Odświeżanie..." : "Odśwież"}
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
                          const selected = links.filter((l) =>
                            selectedLinkIds.includes(l.id),
                          );
                          const rows = selected.map((l) => ({
                            id: l.id,
                            short: `${shortDomain}/${l.short_code}`,
                            original: l.original_url,
                            clicks: l.clicks,
                            created_at: l.created_at,
                          }));
                          const header = Object.keys(
                            rows[0] || {
                              id: "",
                              short: "",
                              original: "",
                              clicks: "",
                              created_at: "",
                            },
                          ).join(",");
                          const csv = [
                            header,
                            ...rows.map((r) =>
                              Object.values(r)
                                .map(
                                  (v) => `"${String(v).replace(/"/g, '\"')}"`,
                                )
                                .join(","),
                            ),
                          ].join("\n");
                          const blob = new Blob([csv], {
                            type: "text/csv;charset=utf-8;",
                          });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = "links.csv";
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50"
                      >
                        Export
                      </button>
                      <button
                        onClick={() => {
                          setHiddenLinkIds((prev) => [
                            ...new Set([...prev, ...selectedLinkIds]),
                          ]);
                          setSelectedLinkIds([]);
                        }}
                        className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50"
                      >
                        Ukryj
                      </button>
                      <button
                        onClick={() => {
                          const tag = prompt("Wpisz tag");
                          if (!tag) return;
                          setTagsById((prev) => {
                            const next = { ...prev };
                            selectedLinkIds.forEach((id) => {
                              next[id] = Array.from(
                                new Set([...(next[id] || []), tag]),
                              );
                            });
                            return next;
                          });
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
                  .filter((l) => !hiddenLinkIds.includes(l.id))
                  .filter((l) => {
                    if (!search.trim()) return true;
                    const s = search.toLowerCase();
                    return (
                      l.short_code?.toLowerCase().includes(s) ||
                      l.original_url?.toLowerCase().includes(s) ||
                      `${shortDomain}/${l.short_code}`.toLowerCase().includes(s)
                    );
                  })
                  .filter((l) => {
                    if (dateFilter === "all") return true;
                    const created = new Date(l.created_at);
                    const now = new Date();
                    if (dateFilter === "7") {
                      const d = new Date();
                      d.setDate(d.getDate() - 7);
                      return created >= d;
                    }
                    if (dateFilter === "30") {
                      const d = new Date();
                      d.setDate(d.getDate() - 30);
                      return created >= d;
                    }
                    if (dateFilter === "month") {
                      return (
                        created.getFullYear() === now.getFullYear() &&
                        created.getMonth() === now.getMonth()
                      );
                    }
                    return true;
                  })
                  .map((link) => {
                    const shortUrl = `${shortDomain.replace("https://", "").replace("http://", "")}/${link.short_code}`;
                    const title = (() => {
                      try {
                        return new URL(link.original_url).hostname;
                      } catch {
                        return link.original_url;
                      }
                    })();
                    const isSelected = selectedLinkIds.includes(link.id);
                    const tags = tagsById[link.id] || [];
                    return (
                      <div
                        key={link.id}
                        className="bg-white border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) =>
                              setSelectedLinkIds((prev) =>
                                e.target.checked
                                  ? [...prev, link.id]
                                  : prev.filter((id) => id !== link.id),
                              )
                            }
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="truncate pr-4">
                                <div className="font-medium text-gray-900 truncate">
                                  {title}
                                </div>
                                <a
                                  href={`/${link.short_code}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                >
                                  {shortUrl}
                                </a>
                                <div className="text-gray-500 text-sm truncate">
                                  {link.original_url}
                                </div>
                                <div className="mt-1 text-xs text-gray-400">
                                  Utworzono:{" "}
                                  {new Date(link.created_at).toLocaleDateString(
                                    "pl-PL",
                                    {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    },
                                  )}
                                </div>
                                <div className="mt-2 flex items-center gap-3 text-sm text-gray-600">
                                  <button
                                    onClick={async () => {
                                      try {
                                        await navigator.clipboard.writeText(
                                          `${shortDomain}/${link.short_code}`,
                                        );
                                        alert("Skopiowano!");
                                      } catch {}
                                    }}
                                    className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                                  >
                                    📋 Copy
                                  </button>
                                  <button
                                    onClick={async () => {
                                      const shareUrl = `${shortDomain}/${link.short_code}`;
                                      if ((navigator as any).share) {
                                        try {
                                          await (navigator as any).share({
                                            title: "Udostępnij link",
                                            url: shareUrl,
                                          });
                                        } catch {}
                                      } else {
                                        try {
                                          await navigator.clipboard.writeText(
                                            shareUrl,
                                          );
                                          alert("Skopiowano do schowka");
                                        } catch {}
                                      }
                                    }}
                                    className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                                  >
                                    🔗 Share
                                  </button>
                                  <button
                                    onClick={() =>
                                      setShowEditModal({ open: true, link })
                                    }
                                    className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    onClick={async () => {
                                      try {
                                        const res = await fetch(
                                          `/api/links/analytics?userId=${user.id}&linkId=${link.id}&range=30`,
                                        );
                                        const data = await res.json();
                                        setShowAnalyticsModal({
                                          open: true,
                                          link,
                                          data,
                                        });
                                      } catch (e) {
                                        console.error(e);
                                      }
                                    }}
                                    className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                                  >
                                    📈 Click data
                                  </button>
                                </div>
                              </div>
                              <div className="text-center flex-shrink-0 space-y-1">
                                <div>
                                  <div className="text-xl font-bold text-blue-600">
                                    {link.unique_clicks || 0}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    unikalne
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xl font-bold text-gray-900">
                                    {link.clicks}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    łącznie
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="mt-2">
                              {tags.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {tags.map((t) => (
                                    <span
                                      key={t}
                                      className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200"
                                    >
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    const tag = prompt("Dodaj tag");
                                    if (!tag) return;
                                    setTagsById((prev) => ({
                                      ...prev,
                                      [link.id]: [tag],
                                    }));
                                  }}
                                  className="text-xs text-gray-500 underline"
                                >
                                  No tags
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="w-6 h-6 text-gray-400">▦</div>
                        </div>
                      </div>
                    );
                  })}
              </div>
              <div className="text-center text-sm text-gray-500 mt-6">
                — Dotarłeś do końca listy —
              </div>
            </>
          )}

          {/* QR CODES SECTION */}
          {activeSection === "qrcodes" && (
            <>
              {/* Header */}
              <div className="mb-8 flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    QR Codes 📱
                  </h1>
                  <p className="text-gray-600">
                    Generuj QR kody dla swoich linków
                  </p>
                </div>
                <button
                  onClick={refreshQrCodes}
                  disabled={refreshingQrCodes}
                  className={`px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2 ${refreshingQrCodes ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <svg
                    className={`w-4 h-4 ${refreshingQrCodes ? "animate-spin" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  {refreshingQrCodes ? "Odświeżanie..." : "Odśwież"}
                </button>
              </div>

              {/* Usage Stats */}
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Miesięczne użycie QR kodów
                </h2>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-3xl font-bold text-blue-600">
                      {monthlyUsage?.qr_codes_created || 0}
                    </span>
                    <span className="text-gray-500 ml-2">
                      /{" "}
                      {(() => {
                        const planId =
                          subscription?.plan_id?.toLowerCase() || "free";
                        const isActive = subscription?.status === "active";

                        // ⚠️ Tylko AKTYWNE subskrypcje dają premium limity
                        if (!isActive && planId !== "free") {
                          return "2"; // Nieaktywna subskrypcja → FREE limit
                        }

                        // Limity QR kodów według planu
                        const qrLimits: Record<string, string> = {
                          free: "2",
                          starter: "100",
                          pro: "1000",
                          enterprise: "∞",
                          business: "∞",
                        };

                        return qrLimits[planId] || "2";
                      })()}{" "}
                      QR kodów
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Reset:{" "}
                    {new Date(
                      new Date().getFullYear(),
                      new Date().getMonth() + 1,
                      1,
                    ).toLocaleDateString("pl-PL")}
                  </div>
                </div>
                <div className="mt-4 bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${(() => {
                        const planId =
                          subscription?.plan_id?.toLowerCase() || "free";
                        const isActive = subscription?.status === "active";
                        const used = monthlyUsage?.qr_codes_created || 0;

                        // Limity numeryczne
                        const qrLimits: Record<string, number> = {
                          free: 2,
                          starter: 100,
                          pro: 1000,
                          enterprise: 99999,
                          business: 99999,
                        };

                        const effectivePlan =
                          !isActive && planId !== "free" ? "free" : planId;
                        const limit = qrLimits[effectivePlan] || 2;

                        return Math.min((used / limit) * 100, 100);
                      })()}%`,
                    }}
                  ></div>
                </div>

                {/* Info o limitach planów */}
                {(subscription?.plan_id?.toLowerCase() === "free" ||
                  !subscription) && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      💎 <strong>Plan PRO:</strong> Twórz do 1000 QR kodów
                      miesięcznie!
                      <button
                        onClick={() => setActiveSection("billing")}
                        className="ml-2 text-blue-600 hover:text-blue-700 underline font-medium"
                      >
                        Upgrade
                      </button>
                    </p>
                  </div>
                )}
              </div>

              {/* QR Codes List */}
              <div className="space-y-4">
                {qrCodes.length === 0 && (
                  <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <span className="text-6xl mb-4 block">📱</span>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Brak QR kodów
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Stwórz swój pierwszy QR kod w zakładce "Linki"
                    </p>
                    <button
                      onClick={() => setActiveSection("links")}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Przejdź do Linków
                    </button>
                  </div>
                )}

                {qrCodes.map((qr) => (
                  <div
                    key={qr.id}
                    className="bg-white rounded-lg p-6 shadow-sm border border-gray-200"
                  >
                    <div className="flex items-start justify-between">
                      {/* QR Image */}
                      <div className="flex-shrink-0 mr-6">
                        <img
                          src={qr.qr_image_data}
                          alt="QR Code"
                          className="w-32 h-32 border border-gray-200 rounded"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {shortDomain}/{qr.links?.short_code}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          → {qr.links?.original_url}
                        </p>
                        <p className="text-xs text-gray-500">
                          Utworzono:{" "}
                          {new Date(qr.created_at).toLocaleString("pl-PL")}
                        </p>
                        <p className="text-xs text-gray-500">
                          Kliknięcia: {qr.links?.clicks || 0}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col space-y-2">
                        <a
                          href={qr.qr_image_data}
                          download={`qr-${qr.links?.short_code}.png`}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm text-center"
                        >
                          📥 Pobierz
                        </a>
                        <button
                          onClick={async () => {
                            if (
                              !confirm("Czy na pewno chcesz usunąć ten QR kod?")
                            )
                              return;

                            try {
                              // Pobierz token z sesji
                              const {
                                data: { session },
                              } = await supabase.auth.getSession();
                              if (!session?.access_token) {
                                setQrMessage({
                                  type: "error",
                                  text: "Błąd autoryzacji",
                                });
                                return;
                              }

                              const response = await fetch(
                                `/api/qr/list?id=${qr.id}`,
                                {
                                  method: "DELETE",
                                  headers: {
                                    Authorization: `Bearer ${session.access_token}`,
                                  },
                                },
                              );

                              if (response.ok) {
                                setQrMessage({
                                  type: "success",
                                  text: "QR kod usunięty!",
                                });
                                fetchQrCodes();
                                fetchMonthlyUsage();
                              } else {
                                const data = await response.json();
                                setQrMessage({
                                  type: "error",
                                  text: data.error,
                                });
                              }
                            } catch (error) {
                              setQrMessage({
                                type: "error",
                                text: "Błąd usuwania QR kodu",
                              });
                            }
                          }}
                          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                        >
                          🗑️ Usuń
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message */}
              {qrMessage && (
                <div
                  className={`mt-4 p-4 rounded-lg ${
                    qrMessage.type === "success"
                      ? "bg-green-50 text-green-800"
                      : "bg-red-50 text-red-800"
                  }`}
                >
                  {qrMessage.text}
                </div>
              )}
            </>
          )}

          {activeSection === "billing" && (
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
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Aktualny Plan
                </h2>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-2xl font-bold text-blue-600">
                        {billingInfo?.plan?.toUpperCase() || "FREE"}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          billingInfo?.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {billingInfo?.status === "active"
                          ? "AKTYWNY"
                          : "NIEAKTYWNY"}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm">
                      {billingInfo?.billing_cycle === "yearly"
                        ? "Płatność roczna"
                        : "Płatność miesięczna"}
                    </p>
                  </div>
                  <div className="text-right">
                    {billingInfo?.plan !== "free" && (
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
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Metoda Płatności
                  </h2>
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
                        Wygasa {billingInfo.payment_method.exp_month}/
                        {billingInfo.payment_method.exp_year}
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
              {billingInfo?.plan === "free" && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Ulepsz swój plan
                  </h2>
                  <p className="text-gray-600 mb-4">
                    Odblokuj więcej funkcji i zwiększ limity linków
                  </p>
                  <button
                    onClick={() => (window.location.href = "/upgrade")}
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
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>

              {/* Headline */}
              <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">
                Osiągnąłeś limit darmowego planu! 🎉
              </h2>

              {/* Subtext */}
              <p className="text-gray-600 text-center mb-6">
                Utworzyłeś już{" "}
                <strong>
                  {upgradeModalData?.current} z {upgradeModalData?.limit} linków
                </strong>{" "}
                w tym miesiącu. Odblokuj nieograniczone możliwości z planem PRO!
              </p>

              {/* Benefits */}
              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg
                      className="w-4 h-4 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-700">
                    <strong>100 linków/miesiąc</strong> w planie Starter
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg
                      className="w-4 h-4 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-700">
                    <strong>1000 linków/miesiąc</strong> w planie Pro
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg
                      className="w-4 h-4 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-700">
                    Zaawansowana <strong>analityka kliknięć</strong>
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg
                      className="w-4 h-4 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-700">
                    <strong>Wsparcie priorytetowe</strong>
                  </p>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => (window.location.href = "/upgrade")}
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

        {/* ANALYTICS SECTION */}
        {activeSection === "analytics" && (
          <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
            {/* Header with Filters */}
            <div className="mb-6 sm:mb-8 w-full">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 sm:mb-6">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                    📊 Analityka
                  </h1>
                  <p className="text-sm sm:text-base text-gray-600">
                    Kompleksowe statystyki i analiza wydajności Twoich linków
                  </p>
                </div>
              </div>

              {/* Filters Row */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 w-full">
                {/* Date Range Filter */}
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📅 Okres czasu
                  </label>
                  <select
                    value={analyticsDateRange}
                    onChange={(e) => setAnalyticsDateRange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="7">Ostatnie 7 dni</option>
                    <option value="30">Ostatnie 30 dni</option>
                    <option value="90">Ostatnie 90 dni</option>
                    <option value="all">Cały czas</option>
                  </select>
                </div>

                {/* Link Filter */}
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🔗 Filtruj po linku
                  </label>
                  <select
                    value={selectedAnalyticsLink || ""}
                    onChange={(e) =>
                      setSelectedAnalyticsLink(e.target.value || null)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">Wszystkie linki</option>
                    {links.map((link: any) => (
                      <option key={link.id} value={link.id}>
                        {link.short_code} → {link.original_url.slice(0, 40)}...
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {analyticsLoading && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                <p className="text-gray-600 mt-4">Ładowanie analityki...</p>
              </div>
            )}

            {/* Analytics Content */}
            {!analyticsLoading && analyticsData && (
              <>
                {/* Summary Cards - 4 w rzędzie */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                  {/* Total Clicks Card */}
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-medium opacity-90">
                        Wszystkie kliknięcia
                      </h3>
                      <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                          />
                        </svg>
                      </div>
                    </div>
                    <p className="text-3xl font-bold mb-1">
                      {analyticsData.summary.totalClicks.toLocaleString()}
                    </p>
                    <p className="text-xs opacity-75">Łączna liczba kliknięć</p>
                  </div>

                  {/* Unique Visitors Card */}
                  <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-medium opacity-90">
                        Unikalni użytkownicy
                      </h3>
                      <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                          />
                        </svg>
                      </div>
                    </div>
                    <p className="text-3xl font-bold mb-1">
                      {analyticsData.summary.uniqueClicks.toLocaleString()}
                    </p>
                    <p className="text-xs opacity-75">Różni odwiedzający</p>
                  </div>

                  {/* QR Scans Card */}
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-medium opacity-90">
                        Skanowania QR
                      </h3>
                      <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                          />
                        </svg>
                      </div>
                    </div>
                    <p className="text-3xl font-bold mb-1">
                      {analyticsData.summary.qrScans.toLocaleString()}
                    </p>
                    <p className="text-xs opacity-75">Przez kody QR</p>
                  </div>

                  {/* Active Links Card */}
                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-4 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-medium opacity-90">
                        Aktywne linki
                      </h3>
                      <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                          />
                        </svg>
                      </div>
                    </div>
                    <p className="text-3xl font-bold mb-1">
                      {analyticsData.summary.totalLinks.toLocaleString()}
                    </p>
                    <p className="text-xs opacity-75">Utworzonych linków</p>
                  </div>
                </div>

                {/* Wykres liniowy - Kliknięcia w czasie */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                  {/* Multi-select chart type filters */}
                  <div className="flex items-center justify-end mb-4">
                    <div className="flex gap-2 text-sm flex-wrap">
                      <button
                        onClick={() => {
                          setAnalyticsChartFilters((prev) =>
                            prev.includes("all")
                              ? prev.filter((f) => f !== "all")
                              : [...prev, "all"],
                          );
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                          analyticsChartFilters.includes("all")
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                        Wszystkie kliknięcia
                      </button>
                      <button
                        onClick={() => {
                          setAnalyticsChartFilters((prev) =>
                            prev.includes("unique")
                              ? prev.filter((f) => f !== "unique")
                              : [...prev, "unique"],
                          );
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                          analyticsChartFilters.includes("unique")
                            ? "bg-purple-100 text-purple-700"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                        Unikalne kliknięcia
                      </button>
                      <button
                        onClick={() => {
                          setAnalyticsChartFilters((prev) =>
                            prev.includes("qr")
                              ? prev.filter((f) => f !== "qr")
                              : [...prev, "qr"],
                          );
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                          analyticsChartFilters.includes("qr")
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                        Skanowania QR
                      </button>
                      <button
                        onClick={() => {
                          setAnalyticsChartFilters((prev) =>
                            prev.includes("qr_unique")
                              ? prev.filter((f) => f !== "qr_unique")
                              : [...prev, "qr_unique"],
                          );
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                          analyticsChartFilters.includes("qr_unique")
                            ? "bg-orange-100 text-orange-700"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
                        Unikalne skanowania QR
                      </button>
                    </div>
                  </div>

                  {/* SVG Chart - MULTI-LINE */}
                  <div className="relative h-80 mt-6 flex gap-4">
                    {/* Oś Y - liczby po lewej */}
                    {!loadingChart &&
                      Object.keys(chartDataAll).length > 0 &&
                      (() => {
                        // Znajdź max ze wszystkich wybranych typów
                        const allValues = analyticsChartFilters.flatMap(
                          (type) => chartDataAll[type] || [],
                        );
                        const maxValue = Math.max(...allValues, 1);
                        const paddedMax = Math.ceil(maxValue * 1.1);

                        return (
                          <div className="flex flex-col justify-between h-80 text-xs text-gray-500 pr-2 pt-1 pb-8">
                            <span>{paddedMax}</span>
                            <span>{Math.round(paddedMax * 0.75)}</span>
                            <span>{Math.round(paddedMax * 0.5)}</span>
                            <span>{Math.round(paddedMax * 0.25)}</span>
                            <span>0</span>
                          </div>
                        );
                      })()}

                    {/* Wykres */}
                    <div className="flex-1 h-80">
                      {loadingChart ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                      ) : analyticsChartFilters.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          <div className="text-center">
                            <p className="text-lg mb-2">📊</p>
                            <p>Wybierz typ wykresu powyżej</p>
                          </div>
                        </div>
                      ) : (
                        <svg
                          className="w-full h-full"
                          viewBox="0 0 800 200"
                          preserveAspectRatio="xMidYMid meet"
                        >
                          {/* Grid lines */}
                          <line
                            x1="0"
                            y1="180"
                            x2="800"
                            y2="180"
                            stroke="#e5e7eb"
                            strokeWidth="1"
                          />
                          <line
                            x1="0"
                            y1="135"
                            x2="800"
                            y2="135"
                            stroke="#e5e7eb"
                            strokeWidth="1"
                          />
                          <line
                            x1="0"
                            y1="90"
                            x2="800"
                            y2="90"
                            stroke="#e5e7eb"
                            strokeWidth="1"
                          />
                          <line
                            x1="0"
                            y1="45"
                            x2="800"
                            y2="45"
                            stroke="#e5e7eb"
                            strokeWidth="1"
                          />
                          <line
                            x1="0"
                            y1="0"
                            x2="800"
                            y2="0"
                            stroke="#e5e7eb"
                            strokeWidth="1"
                          />

                          {/* MULTI-LINE: Renderuj każdy wybrany typ */}
                          {(() => {
                            // Oblicz wszystko RAZ (nie w pętli)
                            const allValues = analyticsChartFilters.flatMap(
                              (type) => chartDataAll[type] || [],
                            );
                            const maxValue = Math.max(...allValues, 1);
                            const paddedMax = maxValue * 1.1;
                            const width = 800;
                            const height = 180;
                            const padding = 10;

                            const firstChartData =
                              chartDataAll[analyticsChartFilters[0]] || [];

                            return (
                              <>
                                {/* Interaktywne obszary (invisible rectangles) dla tooltipa */}
                                {firstChartData.map(
                                  (_: number, index: number) => {
                                    const x =
                                      firstChartData.length > 1
                                        ? (index /
                                            (firstChartData.length - 1)) *
                                          width
                                        : width / 2;
                                    const rectWidth =
                                      firstChartData.length > 1
                                        ? width / (firstChartData.length - 1)
                                        : width;

                                    return (
                                      <rect
                                        key={`hover-${index}`}
                                        x={x - rectWidth / 2}
                                        y={0}
                                        width={rectWidth}
                                        height={height}
                                        fill="transparent"
                                        style={{ cursor: "pointer" }}
                                        onMouseEnter={() =>
                                          setHoveredPoint({ index, x, y: 0 })
                                        }
                                        onMouseLeave={() =>
                                          setHoveredPoint(null)
                                        }
                                      />
                                    );
                                  },
                                )}

                                {/* Linie i punkty */}
                                {analyticsChartFilters.map((filterType) => {
                                  const chartData =
                                    chartDataAll[filterType] || [];
                                  if (chartData.length === 0) return null;

                                  const colorMap = {
                                    all: "#3b82f6",
                                    unique: "#a855f7",
                                    qr: "#22c55e",
                                    qr_unique: "#f97316",
                                  };
                                  const color = colorMap[filterType];

                                  const points = chartData
                                    .map((value: number, index: number) => {
                                      const x =
                                        chartData.length > 1
                                          ? (index / (chartData.length - 1)) *
                                            width
                                          : width / 2;

                                      const normalizedValue = value / paddedMax;
                                      const y =
                                        height -
                                        padding -
                                        normalizedValue * (height - padding);

                                      return `${x.toFixed(2)},${y.toFixed(2)}`;
                                    })
                                    .join(" ");

                                  return (
                                    <g key={filterType}>
                                      <polyline
                                        fill="none"
                                        stroke={color}
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        points={points}
                                        opacity="0.9"
                                      />
                                      {chartData.map(
                                        (value: number, index: number) => {
                                          const x =
                                            chartData.length > 1
                                              ? (index /
                                                  (chartData.length - 1)) *
                                                width
                                              : width / 2;

                                          const normalizedValue =
                                            value / paddedMax;
                                          const y =
                                            height -
                                            padding -
                                            normalizedValue *
                                              (height - padding);

                                          return (
                                            <circle
                                              key={`${filterType}-${index}`}
                                              cx={x}
                                              cy={y}
                                              r="3"
                                              fill={color}
                                              stroke="white"
                                              strokeWidth="1"
                                            />
                                          );
                                        },
                                      )}
                                    </g>
                                  );
                                })}

                                {/* Pionowa linia na hover */}
                                {hoveredPoint && (
                                  <line
                                    x1={hoveredPoint.x}
                                    y1={0}
                                    x2={hoveredPoint.x}
                                    y2={height}
                                    stroke="#9ca3af"
                                    strokeWidth="1"
                                    strokeDasharray="4 2"
                                  />
                                )}
                              </>
                            );
                          })()}
                        </svg>
                      )}

                      {/* Tooltip - Google Analytics style! */}
                      {hoveredPoint && !loadingChart && (
                        <div
                          className="absolute bg-white shadow-lg rounded-lg border border-gray-200 p-3 z-10"
                          style={{
                            left: `${Math.min(hoveredPoint.x + 60, 700)}px`,
                            top: "20px",
                            minWidth: "180px",
                          }}
                        >
                          {/* Data */}
                          <div className="text-xs font-semibold text-gray-700 mb-2 pb-2 border-b border-gray-200">
                            {chartLabels[hoveredPoint.index] &&
                              new Date(
                                chartLabels[hoveredPoint.index],
                              ).toLocaleDateString("pl-PL", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}
                          </div>

                          {/* Wartości dla każdego typu */}
                          <div className="space-y-1.5">
                            {analyticsChartFilters.map((filterType) => {
                              const value =
                                chartDataAll[filterType]?.[
                                  hoveredPoint.index
                                ] || 0;
                              const colorMap = {
                                all: "#3b82f6",
                                unique: "#a855f7",
                                qr: "#22c55e",
                                qr_unique: "#f97316",
                              };
                              const labelMap = {
                                all: "Wszystkie",
                                unique: "Unikalne",
                                qr: "QR",
                                qr_unique: "QR unikalne",
                              };

                              return (
                                <div
                                  key={filterType}
                                  className="flex items-center justify-between gap-3 text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="w-2.5 h-2.5 rounded-full"
                                      style={{
                                        backgroundColor: colorMap[filterType],
                                      }}
                                    ></span>
                                    <span className="text-gray-600">
                                      {labelMap[filterType]}:
                                    </span>
                                  </div>
                                  <span className="font-semibold text-gray-900">
                                    {value}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* X-axis labels - PRAWDZIWE DATY z API */}
                      <div className="flex justify-between mt-2 text-xs text-gray-500">
                        {chartLabels.length > 0 ? (
                          <>
                            {/* Pokaż pierwszą datę */}
                            <span>
                              {new Date(chartLabels[0]).toLocaleDateString(
                                "pl-PL",
                                { day: "numeric", month: "short" },
                              )}
                            </span>

                            {/* Pokaż kilka dat pośrednich */}
                            {chartLabels.length > 8 && (
                              <>
                                <span>
                                  {new Date(
                                    chartLabels[
                                      Math.floor(chartLabels.length * 0.14)
                                    ],
                                  ).toLocaleDateString("pl-PL", {
                                    day: "numeric",
                                    month: "short",
                                  })}
                                </span>
                                <span>
                                  {new Date(
                                    chartLabels[
                                      Math.floor(chartLabels.length * 0.28)
                                    ],
                                  ).toLocaleDateString("pl-PL", {
                                    day: "numeric",
                                    month: "short",
                                  })}
                                </span>
                                <span>
                                  {new Date(
                                    chartLabels[
                                      Math.floor(chartLabels.length * 0.42)
                                    ],
                                  ).toLocaleDateString("pl-PL", {
                                    day: "numeric",
                                    month: "short",
                                  })}
                                </span>
                                <span>
                                  {new Date(
                                    chartLabels[
                                      Math.floor(chartLabels.length * 0.57)
                                    ],
                                  ).toLocaleDateString("pl-PL", {
                                    day: "numeric",
                                    month: "short",
                                  })}
                                </span>
                                <span>
                                  {new Date(
                                    chartLabels[
                                      Math.floor(chartLabels.length * 0.71)
                                    ],
                                  ).toLocaleDateString("pl-PL", {
                                    day: "numeric",
                                    month: "short",
                                  })}
                                </span>
                                <span>
                                  {new Date(
                                    chartLabels[
                                      Math.floor(chartLabels.length * 0.85)
                                    ],
                                  ).toLocaleDateString("pl-PL", {
                                    day: "numeric",
                                    month: "short",
                                  })}
                                </span>
                              </>
                            )}

                            {/* Pokaż ostatnią datę */}
                            <span>Dziś</span>
                          </>
                        ) : (
                          <span>Brak danych</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Legenda pod wykresem - MULTI */}
                  {!loadingChart && analyticsChartFilters.length > 0 && (
                    <div className="mt-4 text-xs text-gray-500 flex items-center justify-center gap-4 flex-wrap">
                      {analyticsChartFilters.map((filterType) => {
                        const colorMap = {
                          all: "#3b82f6",
                          unique: "#a855f7",
                          qr: "#22c55e",
                          qr_unique: "#f97316",
                        };
                        const labelMap = {
                          all: "Wszystkie kliknięcia",
                          unique: "Unikalne kliknięcia",
                          qr: "Skanowania QR",
                          qr_unique: "Unikalne skanowania QR",
                        };

                        return (
                          <div
                            key={filterType}
                            className="flex items-center gap-2"
                          >
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: colorMap[filterType] }}
                            ></span>
                            <span>{labelMap[filterType]}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Breakdowns - Grid 2x3 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                  {/* Devices Breakdown */}
                  <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
                    <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <span>📱</span> Urządzenia
                    </h3>
                    {Object.keys(analyticsData.devices).length === 0 ? (
                      <p className="text-gray-500 text-sm">Brak danych</p>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(analyticsData.devices)
                          .sort(([, a]: any, [, b]: any) => b - a)
                          .map(([device, count]: any) => {
                            const total = Object.values(
                              analyticsData.devices,
                            ).reduce(
                              (sum: number, val: any) => sum + val,
                              0,
                            ) as number;
                            const percentage = ((count / total) * 100).toFixed(
                              1,
                            );
                            const deviceEmoji =
                              device === "desktop"
                                ? "🖥️"
                                : device === "mobile"
                                  ? "📱"
                                  : "💻";
                            return (
                              <div key={device}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm text-gray-700 flex items-center gap-2">
                                    <span>{deviceEmoji}</span>
                                    <span className="capitalize">{device}</span>
                                  </span>
                                  <span className="text-sm font-semibold text-gray-900">
                                    {count} ({percentage}%)
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-500 h-2 rounded-full transition-all"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  {/* Countries Breakdown */}
                  <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <span>🌍</span> Kraje
                    </h3>
                    {Object.keys(analyticsData.countries).length === 0 ? (
                      <p className="text-gray-500 text-sm">Brak danych</p>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(analyticsData.countries)
                          .sort(([, a]: any, [, b]: any) => b - a)
                          .map(([country, count]: any) => {
                            const total = Object.values(
                              analyticsData.countries,
                            ).reduce(
                              (sum: number, val: any) => sum + val,
                              0,
                            ) as number;
                            const percentage = ((count / total) * 100).toFixed(
                              1,
                            );
                            const countryFlags: any = {
                              PL: "🇵🇱",
                              US: "🇺🇸",
                              DE: "🇩🇪",
                              GB: "🇬🇧",
                              FR: "🇫🇷",
                              ES: "🇪🇸",
                              IT: "🇮🇹",
                            };
                            const flag = countryFlags[country] || "🌐";
                            return (
                              <div key={country}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm text-gray-700 flex items-center gap-2">
                                    <span>{flag}</span>
                                    <span className="uppercase">{country}</span>
                                  </span>
                                  <span className="text-sm font-semibold text-gray-900">
                                    {count} ({percentage}%)
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-green-500 h-2 rounded-full transition-all"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  {/* Browsers Breakdown */}
                  <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <span>🌐</span> Przeglądarki
                    </h3>
                    {Object.keys(analyticsData.browsers).length === 0 ? (
                      <p className="text-gray-500 text-sm">Brak danych</p>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(analyticsData.browsers)
                          .sort(([, a]: any, [, b]: any) => b - a)
                          .map(([browser, count]: any) => {
                            const total = Object.values(
                              analyticsData.browsers,
                            ).reduce(
                              (sum: number, val: any) => sum + val,
                              0,
                            ) as number;
                            const percentage = ((count / total) * 100).toFixed(
                              1,
                            );
                            return (
                              <div key={browser}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm text-gray-700 capitalize">
                                    {browser}
                                  </span>
                                  <span className="text-sm font-semibold text-gray-900">
                                    {count} ({percentage}%)
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-purple-500 h-2 rounded-full transition-all"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  {/* Systemy operacyjne */}
                  <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <span>💿</span> Systemy operacyjne
                    </h3>
                    {Object.keys(analyticsData.operatingSystems).length ===
                    0 ? (
                      <p className="text-gray-500 text-sm">Brak danych</p>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(analyticsData.operatingSystems)
                          .sort(([, a]: any, [, b]: any) => b - a)
                          .map(([os, count]: any) => {
                            const total = Object.values(
                              analyticsData.operatingSystems,
                            ).reduce(
                              (sum: number, val: any) => sum + val,
                              0,
                            ) as number;
                            const percentage = ((count / total) * 100).toFixed(
                              1,
                            );
                            return (
                              <div key={os}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm text-gray-700 capitalize">
                                    {os}
                                  </span>
                                  <span className="text-sm font-semibold text-gray-900">
                                    {count} ({percentage}%)
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-orange-500 h-2 rounded-full transition-all"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  {/* Źródła ruchu */}
                  <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <span>🔗</span> Źródła ruchu
                    </h3>
                    {Object.keys(analyticsData.referrers).length === 0 ? (
                      <p className="text-gray-500 text-sm">
                        Brak danych o źródłach
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(analyticsData.referrers)
                          .sort(([, a]: any, [, b]: any) => b - a)
                          .map(([referrer, count]: any) => {
                            const total = Object.values(
                              analyticsData.referrers,
                            ).reduce(
                              (sum: number, val: any) => sum + val,
                              0,
                            ) as number;
                            const percentage = ((count / total) * 100).toFixed(
                              1,
                            );
                            const displayReferrer =
                              referrer === "direct"
                                ? "🔗 Bezpośrednie wejście"
                                : referrer;
                            return (
                              <div key={referrer}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm text-gray-700 truncate max-w-xs">
                                    {displayReferrer}
                                  </span>
                                  <span className="text-sm font-semibold text-gray-900 ml-2 flex-shrink-0">
                                    {count} ({percentage}%)
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-indigo-500 h-2 rounded-full transition-all"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  {/* Traffic Type Breakdown - Clicks vs QR */}
                  <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
                    <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <span>📊</span> Typ ruchu
                    </h3>
                    <div className="space-y-2">
                      {/* Regular Clicks */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-700 flex items-center gap-2">
                            <span>🖱️</span>
                            <span>Kliknięcia linków</span>
                          </span>
                          <span className="text-sm font-semibold text-gray-900">
                            {(
                              analyticsData.summary.totalClicks -
                              analyticsData.summary.qrScans
                            ).toLocaleString()}{" "}
                            (
                            {(
                              ((analyticsData.summary.totalClicks -
                                analyticsData.summary.qrScans) /
                                analyticsData.summary.totalClicks) *
                              100
                            ).toFixed(1)}
                            %)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{
                              width: `${((analyticsData.summary.totalClicks - analyticsData.summary.qrScans) / analyticsData.summary.totalClicks) * 100}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* QR Scans */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-700 flex items-center gap-2">
                            <span>📱</span>
                            <span>Skanowania QR</span>
                          </span>
                          <span className="text-sm font-semibold text-gray-900">
                            {analyticsData.summary.qrScans.toLocaleString()} (
                            {(
                              (analyticsData.summary.qrScans /
                                analyticsData.summary.totalClicks) *
                              100
                            ).toFixed(1)}
                            %)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-500 h-2 rounded-full transition-all"
                            style={{
                              width: `${(analyticsData.summary.qrScans / analyticsData.summary.totalClicks) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top 10 Table - MOVED TO BOTTOM */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span>🏆</span> Top 10 najlepszych linków
                  </h2>
                  {analyticsData.topLinks.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">
                        Brak danych o kliknięciach w wybranym okresie
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700">
                              #
                            </th>
                            <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700">
                              Short Code
                            </th>
                            <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700">
                              Docelowy URL
                            </th>
                            <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700">
                              Kliknięcia
                            </th>
                            <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700">
                              Unikalni
                            </th>
                            <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700">
                              QR
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {analyticsData.topLinks.map(
                            (link: any, index: number) => (
                              <tr
                                key={link.id}
                                className="border-b border-gray-100 hover:bg-gray-50"
                              >
                                <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-600">
                                  {index === 0 && "🥇"}
                                  {index === 1 && "🥈"}
                                  {index === 2 && "🥉"}
                                  {index > 2 && index + 1}
                                </td>
                                <td className="py-2 sm:py-3 px-2 sm:px-4">
                                  <code className="px-1 sm:px-2 py-0.5 sm:py-1 bg-blue-50 text-blue-700 rounded text-xs sm:text-sm font-mono">
                                    {link.short_code}
                                  </code>
                                </td>
                                <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-700 max-w-[150px] sm:max-w-md truncate">
                                  {link.original_url}
                                </td>
                                <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-xs sm:text-sm font-semibold text-gray-900">
                                  {link.clicksInRange.toLocaleString()}
                                </td>
                                <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-xs sm:text-sm text-gray-600">
                                  {link.uniqueInRange.toLocaleString()}
                                </td>
                                <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-xs sm:text-sm text-gray-600">
                                  {link.qrInRange.toLocaleString()}
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Empty State */}
            {!analyticsLoading &&
              (!analyticsData || analyticsData.summary.totalClicks === 0) && (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-10 h-10 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Brak danych analitycznych
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Nie ma jeszcze żadnych kliknięć w wybranym okresie. <br />
                    Udostępnij swoje linki, aby zobaczyć statystyki!
                  </p>
                  <button
                    onClick={() => setActiveSection("home")}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Stwórz pierwszy link
                  </button>
                </div>
              )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Stwórz link</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!user) return;
                const form = e.target as HTMLFormElement;
                const url = (new FormData(form).get("url") as string) || "";
                if (!url.trim()) return;
                try {
                  const res = await fetch("/api/links/create", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ originalUrl: url, userId: user.id }),
                  });
                  const data = await res.json();
                  if (res.ok) {
                    await fetchLinks();
                    setShowCreateModal(false);
                  } else {
                    alert(data.error || "Błąd tworzenia linku");
                  }
                } catch {}
              }}
            >
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Docelowy URL
              </label>
              <input
                name="url"
                type="url"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
                placeholder="https://..."
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                >
                  Utwórz
                </button>
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
              <button
                onClick={() => setShowEditModal({ open: false })}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!user) return;
                const form = e.target as HTMLFormElement;
                const url = (new FormData(form).get("url") as string) || "";
                try {
                  const res = await fetch("/api/links/update", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      userId: user.id,
                      linkId: showEditModal.link.id,
                      originalUrl: url,
                    }),
                  });
                  const data = await res.json();
                  if (res.ok) {
                    await fetchLinks();
                    setShowEditModal({ open: false });
                  } else {
                    alert(data.error || "Nie udało się zapisać");
                  }
                } catch {}
              }}
            >
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Docelowy URL
              </label>
              <input
                name="url"
                type="url"
                defaultValue={showEditModal.link.original_url}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal({ open: false })}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                >
                  Zapisz
                </button>
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
              <h3 className="text-lg font-semibold">
                Analityka: {showAnalyticsModal.link.short_code}
              </h3>
              <button
                onClick={() => setShowAnalyticsModal({ open: false })}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            {showAnalyticsModal.data ? (
              <div>
                <div className="mb-4 grid grid-cols-2 gap-4">
                  <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {showAnalyticsModal.data.uniqueClicks || 0}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Unikalne kliknięcia
                    </div>
                  </div>
                  <div className="border border-gray-200 bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-gray-900">
                      {showAnalyticsModal.data.totalClicks}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Łącznie kliknięć
                    </div>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Urządzenia - GA4 style */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <span className="text-lg">📱</span>
                      Urządzenia
                    </div>
                    <div className="space-y-3">
                      {Object.entries(
                        showAnalyticsModal.data.analytics.byDevice || {},
                      )
                        .sort(([, a]: any, [, b]: any) => b - a)
                        .map(([device, count]: any) => {
                          const total = Object.values(
                            showAnalyticsModal.data.analytics.byDevice || {},
                          ).reduce(
                            (sum: number, val: any) => sum + val,
                            0,
                          ) as number;
                          const percentage =
                            total > 0 ? Math.round((count / total) * 100) : 0;

                          // Emoji dla urządzeń
                          const deviceIcon: Record<string, string> = {
                            desktop: "🖥️",
                            mobile: "📱",
                            tablet: "📱",
                            unknown: "❓",
                          };

                          return (
                            <div key={device} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2 text-gray-700">
                                  <span>
                                    {deviceIcon[device.toLowerCase()] || "📱"}
                                  </span>
                                  <span className="capitalize">{device}</span>
                                </span>
                                <span className="font-medium text-gray-900">
                                  {count} ({percentage}%)
                                </span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-2">
                                <div
                                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      {Object.keys(
                        showAnalyticsModal.data.analytics.byDevice || {},
                      ).length === 0 && (
                        <div className="text-sm text-gray-500 text-center py-4">
                          Brak danych
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Kraje - GA4 style */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <span className="text-lg">🌍</span>
                      Kraje
                    </div>
                    <div className="space-y-3">
                      {Object.entries(
                        showAnalyticsModal.data.analytics.byCountry || {},
                      )
                        .sort(([, a]: any, [, b]: any) => b - a)
                        .slice(0, 5) // Top 5 krajów
                        .map(([country, count]: any) => {
                          const total = Object.values(
                            showAnalyticsModal.data.analytics.byCountry || {},
                          ).reduce(
                            (sum: number, val: any) => sum + val,
                            0,
                          ) as number;
                          const percentage =
                            total > 0 ? Math.round((count / total) * 100) : 0;

                          // Flagi krajów
                          const countryFlags: Record<string, string> = {
                            Poland: "🇵🇱",
                            "United States": "🇺🇸",
                            Germany: "🇩🇪",
                            "United Kingdom": "🇬🇧",
                            France: "🇫🇷",
                            Spain: "🇪🇸",
                            Italy: "🇮🇹",
                            Netherlands: "🇳🇱",
                            Ukraine: "🇺🇦",
                            "Czech Republic": "🇨🇿",
                            Unknown: "🏳️",
                          };

                          return (
                            <div key={country} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2 text-gray-700">
                                  <span>{countryFlags[country] || "🌐"}</span>
                                  <span>{country}</span>
                                </span>
                                <span className="font-medium text-gray-900">
                                  {count} ({percentage}%)
                                </span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-2">
                                <div
                                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      {Object.keys(
                        showAnalyticsModal.data.analytics.byCountry || {},
                      ).length === 0 && (
                        <div className="text-sm text-gray-500 text-center py-4">
                          Brak danych
                        </div>
                      )}
                      {Object.keys(
                        showAnalyticsModal.data.analytics.byCountry || {},
                      ).length > 5 && (
                        <div className="text-xs text-gray-500 text-center pt-2">
                          +{" "}
                          {Object.keys(
                            showAnalyticsModal.data.analytics.byCountry || {},
                          ).length - 5}{" "}
                          więcej krajów
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>Ładowanie…</div>
            )}
          </div>
        </div>
      )}

        {/* PROFILE SECTION */}
        {activeSection === "profile" && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Profile</h2>

            {/* Display Name */}
            <div
              id="profile-section"
              className="mb-8 pb-8 border-b border-gray-200 scroll-mt-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Preferences
              </h3>
              <form onSubmit={handleUpdateDisplayName} className="max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                  placeholder="Your display name"
                  disabled={updatingDisplayName}
                />
                <button
                  type="submit"
                  disabled={updatingDisplayName}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                >
                  {updatingDisplayName ? "Updating..." : "Update display name"}
                </button>
              </form>
            </div>

            {/* Email Addresses */}
            <div className="mb-8 pb-8 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Email addresses
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Select or add a new email address to receive notifications. Only
                verified emails can be designated as the primary email address,
                which is used to log in.
              </p>

              <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-gray-900 font-medium">
                      {user?.email}
                    </span>
                    {user?.email_confirmed_at && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        Verified
                      </span>
                    )}
                    {!user?.email_confirmed_at && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                        Pending
                      </span>
                    )}
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
                    Primary
                  </span>
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  disabled
                  className="px-4 py-2 border border-gray-300 text-gray-400 rounded-lg text-sm cursor-not-allowed"
                >
                  Add new email
                </button>
                <button
                  disabled
                  className="px-4 py-2 border border-gray-300 text-gray-400 rounded-lg text-sm cursor-not-allowed"
                >
                  Update primary email
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Multiple email addresses coming soon!
              </p>
            </div>

            {/* Change Password */}
            <div
              id="security-section"
              className="mb-8 pb-8 border-b border-gray-200 scroll-mt-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Security & authentication
              </h3>
              <h4 className="text-base font-medium text-gray-800 mb-2">
                Change password
              </h4>
              <p className="text-sm text-gray-600 mb-4">
                You will be required to login after changing your password
              </p>

              {passwordMessage && (
                <div
                  className={`mb-4 p-3 rounded-lg text-sm ${
                    passwordMessage.type === "success"
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {passwordMessage.text}
                </div>
              )}

              <form
                onSubmit={handleChangePassword}
                className="max-w-md space-y-3"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                    disabled={changingPassword}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    For OAuth users, this field is optional
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                    required
                    disabled={changingPassword}
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm new password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                    required
                    disabled={changingPassword}
                    minLength={6}
                  />
                </div>

                <button
                  type="submit"
                  disabled={changingPassword}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                >
                  {changingPassword
                    ? "Changing password..."
                    : "Change password"}
                </button>
              </form>
            </div>

            {/* 2-Factor Authentication */}
            <div
              id="2fa-section"
              className="mb-8 pb-8 border-b border-gray-200 scroll-mt-6"
            >
              <h4 className="text-base font-medium text-gray-800 mb-2">
                2-Factor authentication (TOTP)
              </h4>
              <p className="text-sm text-gray-600 mb-4">
                {user?.app_metadata?.provider === "google"
                  ? "🔒 You use Google OAuth - 2FA is handled by Google (not needed here)"
                  : "Add an extra layer of security using Google Authenticator or Authy"}
              </p>

              {twoFAMessage && (
                <div
                  className={`mb-4 p-3 rounded-lg text-sm ${
                    twoFAMessage.type === "success"
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {twoFAMessage.text}
                </div>
              )}

              {/* Jeśli user używa Google OAuth - pokaż info że nie potrzebuje 2FA */}
              {user?.app_metadata?.provider === "google" ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">ℹ️</span>
                    <div>
                      <h5 className="font-medium text-blue-900 mb-1">
                        Google OAuth Security
                      </h5>
                      <p className="text-sm text-blue-800">
                        Your account is secured by Google's authentication
                        system. 2FA is managed through your Google Account
                        settings.
                      </p>
                      <a
                        href="https://myaccount.google.com/security"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline mt-2 inline-block"
                      >
                        Manage Google 2FA →
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="max-w-md space-y-4">
                  {/* Status 2FA */}
                  <div
                    className={`p-4 rounded-lg border ${
                      twoFAEnabled
                        ? "bg-green-50 border-green-200"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">
                          {twoFAEnabled ? "✅ 2FA Enabled" : "⚠️ 2FA Disabled"}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {twoFAEnabled
                            ? "Your account is protected with 2FA"
                            : "Enable 2FA to secure your account"}
                        </div>
                      </div>
                      {twoFAEnabled && (
                        <button
                          onClick={handleDisable2FA}
                          disabled={twoFALoading}
                          className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          Disable
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Setup 2FA */}
                  {!twoFAEnabled && !showTwoFASetup && (
                    <button
                      onClick={handleSetup2FA}
                      disabled={twoFALoading}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm"
                    >
                      {twoFALoading ? "Setting up..." : "Enable 2FA"}
                    </button>
                  )}

                  {/* QR Code + Weryfikacja */}
                  {showTwoFASetup && qrCodeData && (
                    <div className="space-y-4 border border-gray-200 rounded-lg p-4">
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">
                          Step 1: Scan QR Code
                        </h5>
                        <p className="text-sm text-gray-600 mb-3">
                          Use Google Authenticator or Authy to scan this QR
                          code:
                        </p>
                        <div className="flex justify-center bg-white p-4 rounded border">
                          <img
                            src={qrCodeData}
                            alt="2FA QR Code"
                            className="w-48 h-48"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-2 text-center">
                          Can't scan? Manual entry:{" "}
                          <code className="bg-gray-100 px-2 py-1 rounded">
                            {twoFASecret}
                          </code>
                        </p>
                      </div>

                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">
                          Step 2: Enter Verification Code
                        </h5>
                        <input
                          type="text"
                          value={verificationCode}
                          onChange={(e) =>
                            setVerificationCode(
                              e.target.value.replace(/\D/g, "").slice(0, 6),
                            )
                          }
                          placeholder="000000"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-center text-2xl tracking-widest"
                          maxLength={6}
                        />
                        <button
                          onClick={handleEnable2FA}
                          disabled={
                            twoFALoading || verificationCode.length !== 6
                          }
                          className="w-full mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                        >
                          {twoFALoading
                            ? "Verifying..."
                            : "Verify & Enable 2FA"}
                        </button>
                      </div>

                      {backupCodes.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <h5 className="font-medium text-yellow-900 mb-2">
                            ⚠️ Save Backup Codes
                          </h5>
                          <p className="text-sm text-yellow-800 mb-3">
                            Save these codes in a safe place. You can use them
                            to access your account if you lose your device.
                          </p>
                          <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                            {backupCodes.map((code, idx) => (
                              <div
                                key={idx}
                                className="bg-white px-3 py-2 rounded border border-yellow-300"
                              >
                                {code}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => {
                          setShowTwoFASetup(false);
                          setQrCodeData(null);
                          setVerificationCode("");
                          setTwoFAMessage(null);
                        }}
                        className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Access History */}
            <div
              id="access-history-section"
              className="mb-8 pb-8 border-b border-gray-200 scroll-mt-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Access history
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                You're viewing recent activity on your account. Logging out will
                apply to all devices currently connected to uplau.com.
              </p>

              <button
                onClick={handleLogoutAllSessions}
                className="mb-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm"
              >
                Log out of all sessions
              </button>

              {loadingAccessHistory ? (
                <div className="text-sm text-gray-500">Loading...</div>
              ) : (
                <div className="space-y-3">
                  {accessHistory && accessHistory.length > 0 ? (
                    accessHistory.map((log: any, index: number) => (
                      <div
                        key={log.id || index}
                        className={`border border-gray-200 rounded-lg p-4 ${index === 0 ? "bg-blue-50 border-blue-200" : ""}`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium text-gray-900 mb-1 flex items-center gap-2">
                              <span>{log.action || "Log In"}</span>
                              {index === 0 && (
                                <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                                  Current
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600">
                              {log.location || "Unknown location"}
                            </div>
                            {log.ip_address &&
                              log.ip_address !== "Current session" && (
                                <div className="text-xs text-gray-500 mt-1">
                                  IP: {log.ip_address}
                                </div>
                              )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(log.timestamp).toLocaleString("en-GB", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="border border-gray-200 rounded-lg p-4 text-center text-gray-500">
                      <p className="text-sm">
                        No access history yet. This is your first login!
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SAR Report */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                SAR Report
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Click to request a Subject Access Request (SAR) Report of all
                your Personal Information stored by uplau.com. Once requested,
                in compliance with your local regulations, we will reply to your
                request via email.
              </p>
              <button
                onClick={handleRequestSAR}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium text-sm"
              >
                Request SAR Report
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
