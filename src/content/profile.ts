import type { Profile } from "@/src/types";

import data from "./profile.json";

/**
 * Everything about you: name, text, links. Edit profile.json by hand,
 * or run `npm run dev` and use http://localhost:3240/admin.
 * Field notes: alias = preloader letters + tab title (2–6 letters looks best);
 * birthDate "" hides your age; heroTitle has two lines (the first is accent-coloured).
 */
export const profile: Profile = data;
