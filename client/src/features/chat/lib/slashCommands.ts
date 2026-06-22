export type SlashCommand = {
  name: string;
  description: string;
  aliases?: string[];
};

export const SLASH_COMMANDS: SlashCommand[] = [
  { name: "/new", description: "Start a new chat", aliases: ["/n"] },
  { name: "/clear", description: "Clear composer text and attachments", aliases: ["/c"] },
  { name: "/model", description: "Open the model picker", aliases: ["/m"] },
  { name: "/export", description: "Export this chat as Markdown", aliases: ["/e"] },
  { name: "/temp", description: "Start a temporary chat", aliases: ["/t"] },
  { name: "/prompt", description: "Apply a prompt preset", aliases: ["/p"] },
  { name: "/help", description: "Show available commands", aliases: ["/h", "/?"] }
];

export function filterSlashCommands(query: string): SlashCommand[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed.startsWith("/")) return [];
  const token = trimmed.split(/\s/)[0];
  if (token === "/") return SLASH_COMMANDS;
  return SLASH_COMMANDS.filter(
    (cmd) =>
      cmd.name.startsWith(token) ||
      cmd.aliases?.some((alias) => alias.startsWith(token))
  );
}

export function resolveSlashCommand(text: string): SlashCommand | null {
  const token = text.trim().split(/\s/)[0]?.toLowerCase();
  if (!token) return null;
  return (
    SLASH_COMMANDS.find((cmd) => cmd.name === token || cmd.aliases?.includes(token)) ?? null
  );
}
