export type Role = "client" | "builder";

export interface Profile { id: string; full_name: string; role: Role }

export interface Project {
  id: string; name: string; address: string; client_names: string; description: string;
  current_phase: string; schedule_status: string; schedule_note: string;
  contract_amount: number; target_completion: string | null; archived: boolean;
}
export interface Phase { id: string; project_id: string; name: string; start_date: string; end_date: string; percent_complete: number; sort_order: number }
export interface LookaheadItem { id: string; item_date: string; body: string }
export interface DailyLog { id: string; log_date: string; weather: string; crew: string; note: string; photos: LogPhoto[] }
export interface LogPhoto { id: string; log_id: string; storage_path: string; caption: string; url?: string }
export interface BudgetLine { id: string; category: string; budget: number; billed: number; sort_order: number }
export interface PayApp { id: string; number: number; period_ending: string; amount: number; status: "due" | "paid"; status_date: string | null; waiver_note: string }
export interface ChangeOrder { id: string; code: string; title: string; amount: number; description: string; status: "pending" | "approved" | "declined"; sent_date: string; decided_date: string | null }
export interface SelectionOption { id: string; selection_id: string; name: string; price_delta: number; sort_order: number }
export interface Selection { id: string; item: string; needed_by: string | null; chosen_option_id: string | null; options: SelectionOption[] }
export interface Doc { id: string; title: string; category: string; doc_date: string; storage_path: string }
export interface Message { id: string; sender_id: string; body: string; created_at: string; sender_name: string }
export interface Update { id: string; update_date: string; body: string }

export interface JobRecord {
  project: Project;
  phases: Phase[];
  lookahead: LookaheadItem[];
  logs: DailyLog[];
  budget: BudgetLine[];
  payApps: PayApp[];
  changeOrders: ChangeOrder[];
  selections: Selection[];
  docs: Doc[];
  messages: Message[];
  updates: Update[];
  members: number;
  viewerId: string;
}
