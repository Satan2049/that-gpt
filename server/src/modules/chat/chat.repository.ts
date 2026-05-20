import { promises as fs } from "node:fs";
import path from "node:path";
import type { Conversation } from "./chat.types.js";

const CHATS_DIR = path.join(process.cwd(), "data", "chats");

async function ensureChatsDir(): Promise<void> {
  await fs.mkdir(CHATS_DIR, { recursive: true });
}

function conversationFilePath(id: string): string {
  return path.join(CHATS_DIR, `${id}.json`);
}

export class ChatRepository {
  async save(conversation: Conversation): Promise<void> {
    await ensureChatsDir();
    await fs.writeFile(
      conversationFilePath(conversation.id),
      JSON.stringify(conversation, null, 2),
      "utf8"
    );
  }

  async findById(id: string): Promise<Conversation | null> {
    try {
      const raw = await fs.readFile(conversationFilePath(id), "utf8");
      return JSON.parse(raw) as Conversation;
    } catch {
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await fs.unlink(conversationFilePath(id));
      return true;
    } catch {
      return false;
    }
  }

  async listIds(): Promise<string[]> {
    await ensureChatsDir();
    const entries = await fs.readdir(CHATS_DIR);
    return entries
      .filter((name) => name.endsWith(".json"))
      .map((name) => name.replace(/\.json$/u, ""));
  }

  async listAll(): Promise<Conversation[]> {
    const ids = await this.listIds();
    const conversations: Conversation[] = [];
    for (const id of ids) {
      const conversation = await this.findById(id);
      if (conversation) conversations.push(conversation);
    }
    return conversations.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }
}
