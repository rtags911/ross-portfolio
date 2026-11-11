export type Variant =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "light"
  | "dark"
  | "link"
  | "no-color";

/** Shapes of the files in src/content/. */
export type ProjectResponse = {
  _id: string;
  slug: string; // URL: /projects/<slug>
  name: string;
  year: number;
  description: string;
  features: string[];
  techStack: string[];
  liveUrl?: string;
  sourceCode?: string;
  thumbnail: string;
  sortIndex: number;
  hide: boolean;
};

export type ExperienceResponse = {
  _id: string;
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  sortIndex: number;
  hide: boolean;
};

export type StackItem = {
  _id: string;
  name: string;
  icon: string;
  type: string;
  sortIndex: number;
  hide: boolean;
};

export type StackGroup = { type: string; items: StackItem[] };

export type Profile = {
  name: string;
  firstName: string;
  alias: string;
  birthDate: string; // YYYY-MM-DD, or "" to hide the age
  location: string;
  siteUrl: string;
  email: string;
  resume: string;
  socials: { name: string; url: string }[];
  heroTitle: string[]; // two lines
  heroIntro: string;
  heroButton: string;
  heroCode: string[];
  aboutStatement: string;
  aboutLead: string;
  aboutBody: string[];
  aboutTagline: string;
  role: string;
  description: string;
};
