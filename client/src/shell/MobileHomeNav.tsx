import { useTranslation } from "../shared/i18n/useTranslation";

type Props = {
  onOpenLibrary: () => void;
  onOpenProjects: () => void;
  onOpenMore: () => void;
};

export function MobileHomeNav({ onOpenLibrary, onOpenProjects, onOpenMore }: Props) {
  const { t } = useTranslation();

  return (
    <nav className="mobile-home-nav" aria-label={t.mobile.tabNavigation}>
      <button type="button" className="mobile-home-nav-item" onClick={onOpenLibrary}>
        <span className="mobile-home-nav-icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
          </svg>
        </span>
        <span>{t.nav.library}</span>
      </button>
      <button type="button" className="mobile-home-nav-item" onClick={onOpenProjects}>
        <span className="mobile-home-nav-icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
          </svg>
        </span>
        <span>{t.nav.projects}</span>
      </button>
      <button type="button" className="mobile-home-nav-item" onClick={onOpenMore}>
        <span className="mobile-home-nav-icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
          </svg>
        </span>
        <span>{t.nav.more}</span>
      </button>
    </nav>
  );
}
