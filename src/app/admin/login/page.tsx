import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { authDisabled, isAdmin, passwordConfigured } from "../session";
import LoginForm from "./login-form";

export const metadata: Metadata = { title: "Admin login", robots: { index: false, follow: false } };

// /admin/login (local only, like the rest of the admin).
export default async function AdminLoginPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  if (authDisabled() || (await isAdmin())) redirect("/admin");
  return <LoginForm configured={passwordConfigured()} />;
}
