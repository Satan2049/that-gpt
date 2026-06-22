import { useEffect } from "react";
import { useSettingsStore } from "../features/settings/store/settingsStore";
import { useTranslation } from "../shared/i18n/useTranslation";

type NavProps = {
  onNewChat: () => void;
  onSearch: () => void;
  onOpenLibrary: () => void;
  onOpenProjects: () => void;
  onOpenMore: () => void;
  activePanel?: "chats" | "projects" | "archived" | "library";
};

export function SidebarNav({
  onNewChat,
  onSearch,
  onOpenLibrary,
  onOpenProjects,
  onOpenMore,
  activePanel = "chats"
}: NavProps) {
  const { t } = useTranslation();

  return (
    <nav className="sidebar-nav" aria-label="Main navigation">
      <button type="button" className="sidebar-nav-item" onClick={onNewChat}>
        <span className="sidebar-nav-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
        </span>
        <span className="sidebar-nav-label">{t.nav.newChat}</span>
      </button>

      <button type="button" className="sidebar-nav-item" onClick={onSearch}>
        <span className="sidebar-nav-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3-3" strokeLinecap="round" />
          </svg>
        </span>
        <span className="sidebar-nav-label">{t.nav.searchChats}</span>
        <span className="sidebar-nav-shortcut">Ctrl+K</span>
      </button>

      <button
        type="button"
        className={activePanel === "library" ? "sidebar-nav-item active" : "sidebar-nav-item"}
        onClick={onOpenLibrary}
      >
        <span className="sidebar-nav-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
          </svg>
        </span>
        <span className="sidebar-nav-label">{t.nav.library}</span>
      </button>

      <button
        type="button"
        className={activePanel === "projects" ? "sidebar-nav-item active" : "sidebar-nav-item"}
        onClick={onOpenProjects}
      >
        <span className="sidebar-nav-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
          </svg>
        </span>
        <span className="sidebar-nav-label">{t.nav.projects}</span>
      </button>

      <button type="button" className="sidebar-nav-item" onClick={onOpenMore}>
        <span className="sidebar-nav-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
          </svg>
        </span>
        <span className="sidebar-nav-label">{t.nav.more}</span>
      </button>
    </nav>
  );
}

type FooterProps = {
  onOpenSettings: () => void;
};

export function SidebarFooter({ onOpenSettings }: FooterProps) {
  const { t } = useTranslation();
  const settings = useSettingsStore((s) => s.settings);
  const connectionTest = useSettingsStore((s) => s.connectionTest);
  const loadSettings = useSettingsStore((s) => s.loadSettings);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const connected = connectionTest?.ok ?? Boolean(settings?.aiApiKey?.trim());
  const statusLabel = connected ? t.footer.connected : t.footer.setupRequired;

  return (
    <div className="sidebar-footer">
      <button type="button" className="sidebar-footer-btn" onClick={onOpenSettings}>
        <span
          className={connected ? "sidebar-footer-dot sidebar-footer-dot--ok" : "sidebar-footer-dot"}
          aria-hidden="true"
        />
        <span className="sidebar-footer-text">
          <span className="sidebar-footer-title">{statusLabel}</span>
          <span className="sidebar-footer-sub">{t.footer.settingsApi}</span>
        </span>
      </button>
    </div>
  );
}
