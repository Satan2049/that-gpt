import { useLocaleStore } from "./localeStore";

export function useTranslation() {
  const locale = useLocaleStore((s) => s.locale);
  const t = useLocaleStore((s) => s.t);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const dir = locale === "fa" ? "rtl" : "ltr";

  return { locale, t, setLocale, dir };
}
