export type Role = "student" | "supervisor" | "admin";

export type ActionState = { error?: string; ok?: string } | null;

export type Department = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  bio: string;
  avatar_path: string | null;
  cover_path: string | null;
  role: Role;
  department_id: string | null;
  student_id: string | null;
  work_assignment: string | null;
  hourly_rate: number;
  school_tuition_balance: number;
  financials_started_at: string;
  personal_wallet_opening_balance: number;
  is_active: boolean;
  created_at: string;
};

export type ProfileWithDept = Profile & {
  department: { id: string; name: string } | null;
};

export type TimeLog = {
  id: string;
  student_id: string;
  time_in: string;
  time_out: string | null;
  earning_rate: number | null;
  note: string | null;
  overridden_by: string | null;
  override_reason: string | null;
};

export type Schedule = {
  id: string;
  student_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  label: string | null;
};

export type Payout = {
  id: string;
  student_id: string;
  amount: number;
  note: string | null;
  paid_at: string;
};

export type WalletTransfer = {
  id: string;
  student_id: string;
  amount: number;
  note: string | null;
  allocated_at: string;
  created_by: string | null;
};
