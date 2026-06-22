import { useState } from "react";
import { BrandMark } from "./BrandMark";
import type { Locale } from "../i18n/types";
import { useLocaleStore } from "../i18n/localeStore";
import { useTranslation } from "../i18n/useTranslation";

type Step = "welcome" | "language" | "tips";

export function OnboardingModal() {
  const { t, locale, setLocale } = useTranslation();
  const completeOnboarding = useLocaleStore((s) => s.completeOnboarding);
  const [step, setStep] = useState<Step>("welcome");
  const [draftLocale, setDraftLocale] = useState<Locale>(locale);

  const finish = () => {
    if (draftLocale !== locale) setLocale(draftLocale);
    completeOnboarding();
  };

  const onNext = () => {
    if (step === "welcome") setStep("language");
    else if (step === "language") {
      if (draftLocale !== locale) setLocale(draftLocale);
      setStep("tips");
    } else finish();
  };

  const onBack = () => {
    if (step === "language") setStep("welcome");
    else if (step === "tips") setStep("language");
  };

  return (
    <div className="onboarding-overlay" role="presentation">
      <div
        className="onboarding-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        <div className="onboarding-brand">
          <BrandMark size={40} />
        </div>

        {step === "welcome" ? (
          <>
            <h2 id="onboarding-title" className="onboarding-title">
              {t.onboarding.welcomeTitle}
            </h2>
            <p className="onboarding-body">{t.onboarding.welcomeBody}</p>
          </>
        ) : null}

        {step === "language" ? (
          <>
            <h2 id="onboarding-title" className="onboarding-title">
              {t.onboarding.languageTitle}
            </h2>
            <p className="onboarding-body">{t.onboarding.languageBody}</p>
            <div className="onboarding-language-grid">
              <button
                type="button"
                className={draftLocale === "en" ? "onboarding-lang-btn active" : "onboarding-lang-btn"}
                onClick={() => {
                  setDraftLocale("en");
                  setLocale("en");
                }}
              >
                English
              </button>
              <button
                type="button"
                className={draftLocale === "fa" ? "onboarding-lang-btn active" : "onboarding-lang-btn"}
                onClick={() => {
                  setDraftLocale("fa");
                  setLocale("fa");
                }}
              >
                فارسی
              </button>
            </div>
          </>
        ) : null}

        {step === "tips" ? (
          <>
            <h2 id="onboarding-title" className="onboarding-title">
              {t.onboarding.tipsTitle}
            </h2>
            <ul className="onboarding-tips">
              <li>{t.onboarding.tipNewChat}</li>
              <li>{t.onboarding.tipProjects}</li>
              <li>{t.onboarding.tipSettings}</li>
            </ul>
          </>
        ) : null}

        <div className="onboarding-actions">
          {step !== "welcome" ? (
            <button type="button" className="onboarding-btn secondary" onClick={onBack}>
              {t.onboarding.back}
            </button>
          ) : (
            <button type="button" className="onboarding-btn ghost" onClick={finish}>
              {t.onboarding.skip}
            </button>
          )}
          <button type="button" className="onboarding-btn primary" onClick={onNext}>
            {step === "tips" ? t.onboarding.getStarted : t.onboarding.next}
          </button>
        </div>

        <div className="onboarding-dots" aria-hidden="true">
          {(["welcome", "language", "tips"] as Step[]).map((s) => (
            <span key={s} className={step === s ? "onboarding-dot active" : "onboarding-dot"} />
          ))}
        </div>
      </div>
    </div>
  );
}
