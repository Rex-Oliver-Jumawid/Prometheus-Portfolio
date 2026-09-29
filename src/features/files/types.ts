import type { Database } from "@/types/database.generated";

export type FileRecord = Database["public"]["Tables"]["file_records"]["Row"];

export interface FileListItem extends FileRecord {
  downloadUrl: string | null;
}
