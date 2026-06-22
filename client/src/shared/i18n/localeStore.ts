import { create } from "zustand";
import { en } from "./locales/en";
import { fa } from "./locales/fa";
import type { Locale, Translations } from "./types";

export const LOCALE_KEY = "thatgpt-locale";
export const ONBOARDING_KEY = "thatgpt-onboarding-complete";

const LOCALES: Record<Locale, Translations> = { en, fa };

export function readStoredLocale(): Locale {
  const saved = localStorage.getItem(LOCALE_KEY);
  if (saved === "fa") return "fa";
  return "en";
}

export function readOnboardingComplete(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === "1";
}

export function applyLocale(locale: Locale): void {
  localStorage.setItem(LOCALE_KEY, locale);
  const root = document.documentElement;
  root.lang = locale;
  root.dir = locale === "fa" ? "rtl" : "ltr";
}

export function markOnboardingComplete(): void {
  localStorage.setItem(ONBOARDING_KEY, "1");
}

type LocaleState = {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
  onboardingComplete: boolean;
  completeOnboarding: () => void;
};

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: readStoredLocale(),
  t: LOCALES[readStoredLocale()],
  onboardingComplete: readOnboardingComplete(),
  setLocale: (locale) => {
    applyLocale(locale);
    set({ locale, t: LOCALES[locale] });
  },
  completeOnboarding: () => {
    markOnboardingComplete();
    set({ onboardingComplete: true });
  }
}));
