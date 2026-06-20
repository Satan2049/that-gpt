type Props = {
  canExport: boolean;
  exporting: boolean;
  onExportMarkdown: () => void;
  onExportJson: () => void;
  onOpenSettings: () => void;
};

export function HeaderMenu({
  canExport,
  exporting,
  onExportMarkdown,
  onExportJson,
  onOpenSettings
}: Props) {
  return (
    <div className="header-menu">
      <details className="header-menu-dropdown">
        <summary className="header-menu-trigger" aria-label="More actions">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
          </svg>
        </summary>
        <div className="header-menu-panel">
          <button type="button" disabled={!canExport || exporting} onClick={onExportMarkdown}>
            Export Markdown
          </button>
          <button type="button" disabled={!canExport || exporting} onClick={onExportJson}>
            Export JSON
          </button>
          <hr className="header-menu-divider" />
          <button type="button" onClick={onOpenSettings}>
            Settings
          </button>
        </div>
      </details>
    </div>
  );
}
