export type Profile = {
  name: string; tagline: string; craft: string; bio: string; availability: string;
  contactEmail: string; githubUrl: string; linkedinUrl: string; otherUrl: string; photoUrl: string; whatsapp: string; updatedAt: string;
};
export type Project = {
  id: number; title: string; details: string; tools: string; demoUrl: string; repoUrl: string;
  thumbnailUrl: string; featured: boolean; sortOrder: number; createdAt: string; updatedAt: string;
};
export type Skill = { id: number; name: string; category: string; sortOrder: number };
export type Experiment = { id: number; title: string; description: string; kind: string; linkUrl: string; sortOrder: number };
export type Message = { id: number; name: string; email: string; message: string; isRead: boolean; createdAt: string };

export type SiteData = {
  profile: Profile;
  projects: Project[];
  skills: Skill[];
  experiments: Experiment[];
  lastUpdated: Date | null;
};
