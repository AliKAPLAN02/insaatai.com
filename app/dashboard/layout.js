// app/dashboard/layout.js
"use client";

import DashboardShell from "./DashboardShell";

export default function DashboardLayout({ children }) {
  return <DashboardShell>{children}</DashboardShell>;
}
