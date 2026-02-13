// ============================================================
// RenoVision — TypeScript Types
// Maps to Supabase DB tables for 53 Thurston Road renovation
// ============================================================

// --------------- Status Enums ---------------

export type WorkPackageStatus =
  | 'not_started'
  | 'in_design'
  | 'quoted'
  | 'in_progress'
  | 'complete';

export type BudgetItemStatus =
  | 'estimated'
  | 'quoted'
  | 'committed'
  | 'paid';

export type ContractorStatus =
  | 'prospective'
  | 'quoting'
  | 'hired'
  | 'active'
  | 'complete';

export type ScheduleTaskStatus =
  | 'scheduled'
  | 'in_progress'
  | 'delayed'
  | 'complete';

export type DesignDecisionStatus =
  | 'considering'
  | 'shortlisted'
  | 'selected'
  | 'rejected';

export type FileCategory =
  | 'current_state'
  | 'inspiration'
  | 'quote'
  | 'contract'
  | 'receipt'
  | 'rendering'
  | 'spec_sheet'
  | 'other';

export type Room =
  | 'kitchen'
  | 'living_dining'
  | 'bedroom_1'
  | 'bedroom_2'
  | 'bedroom_3'
  | 'upper_hall'
  | 'front_entry'
  | 'rear_entry'
  | 'staircase'
  | 'mudroom'
  | 'general';

// --------------- Database Row Types ---------------

export interface WorkPackage {
  id: string;
  number: number;
  name: string;
  description: string;
  status: WorkPackageStatus;
  budget_allocated: number;
  created_at: string;
  updated_at: string;
}

export interface BudgetItem {
  id: string;
  work_package_id: string;
  description: string;
  estimated_cost: number;
  quoted_cost: number | null;
  actual_cost: number | null;
  status: BudgetItemStatus;
  vendor: string | null;
  notes: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contractor {
  id: string;
  name: string;
  company: string | null;
  trade: string;
  phone: string | null;
  email: string | null;
  status: ContractorStatus;
  rating: number | null;
  notes: string | null;
  created_at: string;
}

export interface ContractorAssignment {
  id: string;
  contractor_id: string;
  work_package_id: string;
  quote_amount: number | null;
  is_selected: boolean;
  quote_notes: string | null;
}

export interface FileRecord {
  id: string;
  filename: string;
  storage_path: string;
  file_type: string;
  category: FileCategory;
  room: Room | null;
  tags: string[];
  notes: string | null;
  work_package_id: string | null;
  is_favorite: boolean;
  ai_generated: boolean;
  created_at: string;
}

export interface ScheduleTask {
  id: string;
  work_package_id: string | null;
  name: string;
  start_date: string;
  end_date: string;
  status: ScheduleTaskStatus;
  contractor_id: string | null;
  is_milestone: boolean;
  depends_on: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  image_urls: string[];
  created_at: string;
}

export interface DesignDecision {
  id: string;
  work_package_id: string | null;
  category: string;
  title: string;
  description: string | null;
  product_name: string | null;
  product_code: string | null;
  brand: string | null;
  price_estimate: number | null;
  status: DesignDecisionStatus;
  image_url: string | null;
  created_at: string;
}

// --------------- Insert Types (omit server-generated fields) ---------------

export type WorkPackageInsert = Omit<WorkPackage, 'id' | 'created_at' | 'updated_at'>;
export type BudgetItemInsert = Omit<BudgetItem, 'id' | 'created_at' | 'updated_at'>;
export type ContractorInsert = Omit<Contractor, 'id' | 'created_at'>;
export type ContractorAssignmentInsert = Omit<ContractorAssignment, 'id'>;
export type FileRecordInsert = Omit<FileRecord, 'id' | 'created_at'>;
export type ScheduleTaskInsert = Omit<ScheduleTask, 'id' | 'created_at' | 'updated_at'>;
export type ChatSessionInsert = Omit<ChatSession, 'id' | 'created_at' | 'updated_at'>;
export type ChatMessageInsert = Omit<ChatMessage, 'id' | 'created_at'>;
export type DesignDecisionInsert = Omit<DesignDecision, 'id' | 'created_at'>;

// --------------- Update Types (all fields optional except id) ---------------

export type WorkPackageUpdate = Partial<Omit<WorkPackage, 'id' | 'created_at'>> & { id: string };
export type BudgetItemUpdate = Partial<Omit<BudgetItem, 'id' | 'created_at'>> & { id: string };
export type ContractorUpdate = Partial<Omit<Contractor, 'id' | 'created_at'>> & { id: string };
export type ContractorAssignmentUpdate = Partial<Omit<ContractorAssignment, 'id'>> & { id: string };
export type FileRecordUpdate = Partial<Omit<FileRecord, 'id' | 'created_at'>> & { id: string };
export type ScheduleTaskUpdate = Partial<Omit<ScheduleTask, 'id' | 'created_at'>> & { id: string };
export type DesignDecisionUpdate = Partial<Omit<DesignDecision, 'id' | 'created_at'>> & { id: string };

// --------------- Joined / Enriched Types ---------------

export interface BudgetItemWithWorkPackage extends BudgetItem {
  work_package: WorkPackage;
}

export interface ContractorAssignmentWithDetails extends ContractorAssignment {
  contractor: Contractor;
  work_package: WorkPackage;
}

export interface ScheduleTaskWithDetails extends ScheduleTask {
  work_package: WorkPackage | null;
  contractor: Contractor | null;
}

export interface FileRecordWithWorkPackage extends FileRecord {
  work_package: WorkPackage | null;
}

export interface WorkPackageSummary extends WorkPackage {
  total_estimated: number;
  total_quoted: number;
  total_actual: number;
  item_count: number;
  task_count: number;
  decision_count: number;
}

// --------------- API Response Types ---------------

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
}

// --------------- Quote Parsing Result ---------------

export interface ParsedQuote {
  contractor_name: string | null;
  company: string | null;
  trade: string | null;
  total_amount: number | null;
  line_items: ParsedQuoteLineItem[];
  notes: string | null;
  valid_until: string | null;
}

export interface ParsedQuoteLineItem {
  description: string;
  quantity: number | null;
  unit_price: number | null;
  total: number;
}
