import type { ProjectResponse } from "@/src/types";

import data from "./projects.json";

/**
 * Your projects. Edit projects.json by hand, or run `npm run dev` and use /admin.
 * Order on the site = sortIndex (low first). slug = the URL /projects/<slug>.
 * Screenshots live in public/images/projects/. hide: true keeps a project off the site.
 */
export const projects: ProjectResponse[] = data;
