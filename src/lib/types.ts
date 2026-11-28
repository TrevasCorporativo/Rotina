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
  end_time?: string | null;
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

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  category: string;
  target_date: string | null;
  progress: number;
  done: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinanceIncome {
  id: string;
  user_id: string;
  month_key: string;
  title: string;
  amount: number;
  category: string;
  receive_day: number | null;
  recurrence_group_id: string | null;
  installment_index: number | null;
  installment_total: number | null;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  category: string;
  target_date: string | null;
  progress: number;
  done: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  event_date: string;
  event_time: string;
  end_time?: string | null;
  location: string | null;
  notes: string | null;
  category: string;
  notify_enabled: boolean;
  notify_minutes_before: number;
  reminder_preset?: string;
  recurrence_days?: number[] | null;
  last_notified_date?: string | null;
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

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  category: string;
  target_date: string | null;
  progress: number;
  done: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinanceIncome {
  id: string;
  user_id: string;
  month_key: string;
  title: string;
  amount: number;
  category: string;
  receive_day: number | null;
  recurrence_group_id: string | null;
  installment_index: number | null;
  installment_total: number | null;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  category: string;
  target_date: string | null;
  progress: number;
  done: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}


export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: string;
  image_url: string | null;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecoveryTrack {
  id: string;
  user_id: string;
  title: string;
  category: string;
  why_statement: string;
  triggers: string;
  replacement_action: string;
  streak_started_at: string;
  best_streak_days: number;
  last_checkin_date: string | null;
  relapse_count: number;
  created_at: string;
  updated_at: string;
}

export interface RecoveryLog {
  id: string;
  user_id: string;
  track_id: string;
  log_type: 'victory' | 'temptation_overcome' | 'relapse' | 'reflection';
  note: string | null;
  created_at: string;
}

export interface CourseProgress {
  id: string;
  user_id: string;
  course_id: string;
  lesson_id: string;
  completed: boolean;
  notes: string;
  checklist_done?: string[];
  updated_at: string;
}

export interface DevotionalCheckin {
  id: string;
  user_id: string;
  day_number: number;
  completed_date: string;
  reflection: string;
  created_at: string;
}

export interface BibleHighlight {
  id: string;
  user_id: string;
  book_abbrev: string;
  chapter: number;
  verse: number;
  color: 'yellow' | 'green' | 'blue' | 'pink';
  created_at: string;
}

export interface BibleNote {
  id: string;
  user_id: string;
  book_abbrev: string;
  chapter: number;
  verse: number;
  verse_text: string;
  comment: string;
  created_at: string;
}
