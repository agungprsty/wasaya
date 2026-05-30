"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";

interface UserData {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

interface SubscriptionData {
  tier: string;
}

interface SettingsData {
  webhookUrl: string;
  webhookSecret: string;
  autoReplyText: string;
  autoReplyActive: boolean;
  watermarkText: string;
  watermarkActive: boolean;
  broadcastEnabled: boolean;
  concurrency: number;
  adminNumbers: string[];
  safetyMode: string;
  msPerChar: number;
  readDelayMs: number;
  typingEnabled: boolean;
  enterpriseCustomSettings: Record<string, unknown> | null;
}

interface UsageData {
  daily: number;
  monthly: number;
}

interface DashboardState {
  user: UserData | null;
  subscription: SubscriptionData | null;
  settings: SettingsData | null;
  usage: UsageData;
  proxyUrl: string | null;
  isQuarantined: boolean;
  safetyViolations: number;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const DashboardContext = createContext<DashboardState | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [usage, setUsage] = useState<UsageData>({ daily: 0, monthly: 0 });
  const [proxyUrl, setProxyUrl] = useState<string | null>(null);
  const [isQuarantined, setIsQuarantined] = useState(false);
  const [safetyViolations, setSafetyViolations] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        throw new Error("Failed to fetch dashboard data");
      }
      const data = await res.json();
      setUser(data.user);
      setSubscription(data.subscription);
      setSettings(data.settings);
      setUsage(data.usage ?? { daily: 0, monthly: 0 });
      setProxyUrl(data.proxyUrl);
      setIsQuarantined(data.isQuarantined);
      setSafetyViolations(data.safetyViolations);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <DashboardContext.Provider
      value={{
        user,
        subscription,
        settings,
        usage,
        proxyUrl,
        isQuarantined,
        safetyViolations,
        loading,
        error,
        refresh: fetchData,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return ctx;
}
