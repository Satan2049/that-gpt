import { useEffect, useState } from "react";
import type { Folder } from "../types/folder.types";
import { useChatStore } from "../../chat/store/chatStore";
import { ConfirmModal } from "../../../shared/components/ConfirmModal";
import { useTranslation } from "../../../shared/i18n/useTranslation";
import { autoDirProps } from "../../../shared/i18n/textDirection";

type Props = {
  folder: Folder;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export function ProjectSettingsModal({ folder, open, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const patchFolder = useChatStore((s) => s.patchFolder);
  const deleteFolder = useChatStore((s) => s.deleteFolder);
  const setSelectedFolderId = useChatStore((s) => s.setSelectedFolderId);

  const [name, setName] = useState(folder.name);
  const [instructions, setInstructions] = useState(folder.instructions ?? "");
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(folder.name);
    setInstructions(folder.instructions ?? "");
  }, [open, folder]);

  const onSave = async () => {
    setSaving(true);
    try {
      await patchFolder(folder.id, {
        name: name.trim(),
        instructions: instructions.trim() || null
      });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="modal-overlay" role="presentation" onClick={onClose}>
        <div
          className="modal-card project-settings-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="project-settings-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="project-settings-header">
            <h2 id="project-settings-title">{t.projectSettings.title}</h2>
            <button
              type="button"
              className="project-icon-btn"
              aria-label={t.projectSettings.close}
              onClick={onClose}
            >
              ×
            </button>
          </div>

          <label className="settings-field">
            {t.projectSettings.projectName}
            <input
              type="text"
              value={name}
              maxLength={120}
              dir="auto"
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="settings-field">
            {t.projectSettings.instructions}
            <span className="settings-hint">{t.projectSettings.instructionsHint}</span>
            <textarea
              rows={6}
              value={instructions}
              placeholder={t.projectSettings.instructionsPlaceholder}
              {...autoDirProps}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </label>

          <div className="project-settings-footer">
            <button type="button" className="btn-danger-outline" onClick={() => setPendingDelete(true)}>
              {t.projectSettings.deleteProject}
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={saving || !name.trim()}
              onClick={() => void onSave()}
            >
              {saving ? t.projectSettings.saving : t.projectSettings.save}
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={pendingDelete}
        title={t.projects.deleteTitle}
        message={t.projectSettings.deleteConfirm}
        confirmLabel={t.common.delete}
        danger
        onCancel={() => setPendingDelete(false)}
        onConfirm={() => {
          void deleteFolder(folder.id).then(() => {
            setSelectedFolderId(null);
            onClose();
          });
          setPendingDelete(false);
        }}
      />
    </>
  );
}
