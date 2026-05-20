import { useChatStore } from "../../chat/store/chatStore";
import { usePromptStore } from "../store/promptStore";

export function PromptPresetSelect() {
  const presets = usePromptStore((s) => s.presets);
  const activeConversation = useChatStore((s) => s.activeConversation);
  const patchConversation = useChatStore((s) => s.patchConversation);

  return (
    <label className="preset-select-label">
      <span className="preset-select-title">Preset</span>
      <select
        className="preset-select"
        value={activeConversation?.promptPresetId ?? ""}
        disabled={!activeConversation}
        onChange={(e) => {
          const value = e.target.value;
          void patchConversation({
            promptPresetId: value === "" ? null : value
          });
        }}
      >
        <option value="">Default (env)</option>
        {presets.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.name}
          </option>
        ))}
      </select>
    </label>
  );
}
