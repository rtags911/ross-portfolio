import { Metadata } from "next";
import { notFound } from "next/navigation";

import ProjectDetails from "@/src/components/project-details";
import { projects } from "@/src/content/projects";

type Props = {
  params: Promise<{ id: string }>;
};

const find = (id: string) => projects.find((p) => !p.hide && p.slug === id);

export function generateStaticParams() {
  return projects.filter((p) => !p.hide).map((p) => ({ id: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = find(id);
  if (!p) return { title: "Project Not Found" };
  return { title: p.name, description: p.description, alternates: { canonical: `/projects/${id}` } };
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  if (!find(id)) return notFound();
  return <ProjectDetails key={id} id={id} />;
}
