import { useQuery } from "@tanstack/react-query";

import { experience } from "@/src/content/experience";
import { projects } from "@/src/content/projects";
import { stack } from "@/src/content/stack";

// Content comes from src/content/*.ts. Kept as queries so the components (and their loading/animation logic) stay unchanged.
const bySort = <T extends { sortIndex: number }>(a: T, b: T) => a.sortIndex - b.sortIndex;
const visible = <T extends { hide: boolean }>(list: T[]) => list.filter((x) => !x.hide);

export const useGetProjects = () =>
  useQuery({ queryKey: ["projects"], queryFn: async () => visible(projects).sort(bySort) });

export const useGetProject = (id?: string) =>
  useQuery({
    enabled: !!id,
    queryKey: ["project", id],
    queryFn: async () => {
      const p = visible(projects).find((x) => x.slug === id || x._id === id);
      if (!p) throw new Error("Project not found");
      return p;
    },
  });

export const useGetExperience = () =>
  useQuery({ queryKey: ["experience"], queryFn: async () => visible(experience).sort(bySort) });

export const useGetStack = () =>
  useQuery({
    queryKey: ["stack"],
    queryFn: async () =>
      stack
        .map((g) => ({ ...g, items: visible(g.items).sort(bySort) }))
        .filter((g) => g.items.length > 0),
  });
