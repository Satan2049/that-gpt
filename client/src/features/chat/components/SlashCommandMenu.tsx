import type { SlashCommand } from "../lib/slashCommands";

type Props = {
  commands: SlashCommand[];
  activeIndex: number;
  onSelect: (command: SlashCommand) => void;
};

export function SlashCommandMenu({ commands, activeIndex, onSelect }: Props) {
  if (commands.length === 0) return null;

  return (
    <div className="slash-command-menu" role="listbox" aria-label="Slash commands">
      <p className="slash-command-menu-title">Commands</p>
      <ul>
        {commands.map((cmd, index) => (
          <li key={cmd.name}>
            <button
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className={index === activeIndex ? "slash-command-item active" : "slash-command-item"}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(cmd);
              }}
            >
              <span className="slash-command-name">{cmd.name}</span>
              <span className="slash-command-desc">{cmd.description}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
