import { invoke } from "../../../shared/lib/tauriInvoke";
import type { Folder } from "../types/folder.types";

export async function apiListFolders(): Promise<Folder[]> {
  return invoke<Folder[]>("list_folders");
}

export async function apiCreateFolder(name: string): Promise<Folder> {
  return invoke<Folder>("create_folder", { body: { name } });
}

export async function apiPatchFolder(
  id: string,
  patch: { name?: string; instructions?: string | null }
): Promise<Folder> {
  return invoke<Folder>("update_folder", { id, body: patch });
}

export async function apiDeleteFolder(id: string): Promise<void> {
  await invoke("delete_folder", { id });
}

export async function apiAddFolderSource(
  folderId: string,
  filename: string,
  mimeType: string,
  dataBase64: string
): Promise<Folder> {
  return invoke<Folder>("add_folder_source", {
    body: { folderId, filename, mimeType, dataBase64 }
  });
}

export async function apiRemoveFolderSource(folderId: string, sourceId: string): Promise<Folder> {
  return invoke<Folder>("remove_folder_source", {
    body: { folderId, sourceId }
  });
}
