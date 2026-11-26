export type Priority = 'low' | 'medium' | 'high';

export interface Profile {
  id: string;
  login_key: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  must_change_password: boolean;
  timezone: string;
  notify_tasks: boolean;
  notify_events: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  category: string;
  due_date: string | null;
  due_time: string | null;
  priority: Priority;
  done: boolean;
  notify_enabled: boolean;
  reminder_preset?: string;
  reminder_presets?: string[];
  notified_presets?: string[];
  notified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinanceMonth {
  id: string;
  user_id: string;
  month_key: string;
  estimated_income: number;
  created_at: string;
  updated_at: string;
}

export interface FinanceExpense {
  id: string;
  user_id: string;
  month_key: string;
  title: string;
  amount: number;
  category: string;
  due_day: number | null;
  paid: boolean;
  recurrence_group_id: string | null;
  installment_index: number | null;
  installment_total: number | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  event_date: string;
  event_time: string;
  location: string | null;
  notes: string | null;
  category: string;
  notify_enabled: boolean;
  notify_minutes_before: number;
  reminder_preset?: string;
  notified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinanceMonth {
  id: string;
  user_id: string;
  month_key: string;
  estimated_income: number;
  created_at: string;
  updated_at: string;
}

export interface FinanceExpense {
  id: string;
  user_id: string;
  month_key: string;
  title: string;
  amount: number;
  category: string;
  due_day: number | null;
  paid: boolean;
  recurrence_group_id: string | null;
  installment_index: number | null;
  installment_total: number | null;
  created_at: string;
  updated_at: string;
}

