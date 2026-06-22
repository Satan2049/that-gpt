import type { ChatMessage, Conversation } from "../types/chat.types";

export function getBranchSiblings(
  conversation: Conversation,
  parentId: string
): ChatMessage[] {
  return conversation.messages.filter(
    (m) => m.role === "assistant" && m.parentId === parentId
  );
}

export function isMessageVisible(conversation: Conversation, msg: ChatMessage): boolean {
  if (msg.role !== "assistant" || !msg.parentId) return true;

  const siblings = getBranchSiblings(conversation, msg.parentId);
  if (siblings.length <= 1) return true;

  const picked = conversation.branchPicks?.[msg.parentId];
  if (picked) return msg.id === picked;

  const latest = [...siblings].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return latest[latest.length - 1]?.id === msg.id;
}

export function getVisibleMessages(conversation: Conversation | null): ChatMessage[] {
  if (!conversation) return [];
  return conversation.messages.filter((m) => isMessageVisible(conversation, m));
}

export function listBranchPoints(conversation: Conversation): Array<{
  parentId: string;
  userContent: string;
  branches: ChatMessage[];
}> {
  const points: Array<{
    parentId: string;
    userContent: string;
    branches: ChatMessage[];
  }> = [];

  for (const msg of conversation.messages) {
    if (msg.role !== "user") continue;
    const branches = getBranchSiblings(conversation, msg.id);
    if (branches.length > 1) {
      const user = conversation.messages.find((m) => m.id === msg.id);
      points.push({
        parentId: msg.id,
        userContent: user?.content ?? "",
        branches
      });
    }
  }

  return points;
}
