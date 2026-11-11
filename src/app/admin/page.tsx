import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { experience } from "@/src/content/experience";
import { profile } from "@/src/content/profile";
import { projects } from "@/src/content/projects";
import { stack } from "@/src/content/stack";

import AdminPanel from "./admin-panel";
import { authDisabled, isAdmin } from "./session";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

// Local-only: the live site has no admin (404). Run `npm run dev` and open /admin; it asks for the password first.
export default async function AdminPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  if (!(await isAdmin())) redirect("/admin/login");
  return <AdminPanel initial={{ profile, projects, experience, stack }} loginOff={authDisabled()} />;
}
