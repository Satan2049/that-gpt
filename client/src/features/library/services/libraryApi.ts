import { invoke } from "../../../shared/lib/tauriInvoke";
import type {
  AttachmentIndexResult,
  KnowledgeIndexResult,
  LibraryFilter
} from "../types/library.types";

export async function apiIndexAttachments(
  filter: LibraryFilter = "all"
): Promise<AttachmentIndexResult> {
  return invoke<AttachmentIndexResult>("index_attachments", { filter });
}

export async function apiIndexKnowledgeBase(): Promise<KnowledgeIndexResult> {
  return invoke<KnowledgeIndexResult>("index_knowledge_base");
}
