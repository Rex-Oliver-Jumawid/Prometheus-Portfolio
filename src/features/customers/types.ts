import type { Database } from "@/types/database.generated";

export type Customer = Database["public"]["Tables"]["customers"]["Row"];
