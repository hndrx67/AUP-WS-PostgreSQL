import type { Role } from "./types";

export type NavItem = { href: string; label: string; icon: string };

export const NAV: Record<Role, NavItem[]> = {
  student: [
    { href: "/student", label: "Overview", icon: "LayoutDashboard" },
    { href: "/student/timesheet", label: "Time records", icon: "Clock" },
    { href: "/student/schedule", label: "Schedule", icon: "CalendarDays" },
    { href: "/student/earnings", label: "Earnings", icon: "Wallet" },
    { href: "/student/department", label: "My Department", icon: "Building2" },
  ],
  supervisor: [
    { href: "/supervisor", label: "Overview", icon: "LayoutDashboard" },
    { href: "/supervisor/students", label: "Students", icon: "Users" },
    { href: "/supervisor/finances", label: "Finances", icon: "Wallet" },
    { href: "/supervisor/schedules", label: "Schedules", icon: "CalendarClock" },
    { href: "/supervisor/timesheets", label: "Time records", icon: "ClipboardList" },
    { href: "/supervisor/department", label: "My Department", icon: "Building2" },
  ],
  admin: [
    { href: "/admin", label: "Overview", icon: "LayoutDashboard" },
    { href: "/admin/departments", label: "Departments", icon: "Building2" },
    { href: "/admin/users", label: "Users and assignments", icon: "Users" },
    { href: "/admin/schedules", label: "Schedules", icon: "CalendarClock" },
    { href: "/admin/timelogs", label: "Time records", icon: "ClipboardList" },
    { href: "/admin/payouts", label: "Finances", icon: "ReceiptText" },
  ],
};

export const ROLE_LABEL: Record<Role, string> = {
  student: "Work scholar",
  supervisor: "Supervisor",
  admin: "Administrator",
};
