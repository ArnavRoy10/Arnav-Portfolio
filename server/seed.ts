import type { DB } from "./db.ts";

/** Starting content, written to data/db.json the first time the server runs. */
export function seed(): DB {
  const now = new Date().toISOString();
  return {
    profile: {
      name: "Arnav Roy",
      tagline: "I spot problems in society and build websites that solve them.",
      craft: "Full-stack developer, mainly 3D designer",
      bio: "I'm Arnav, a full-stack developer who is mainly a 3D designer. I notice problems around me and turn them into websites that help. Replace this with your own background.",
      availability: "Open to new projects",
      contactEmail: "",
      githubUrl: "https://github.com/",
      linkedinUrl: "https://www.linkedin.com/",
      otherUrl: "",
      photoUrl: "",
      whatsapp: "",
      updatedAt: now,
    },
    projects: [
      { id: 1, title: "Sample: Community Help Board", details: "Replace this with what the project is and anything worth knowing about it.", tools: "React, Node, PostgreSQL", demoUrl: "", repoUrl: "", thumbnailUrl: "", featured: true, sortOrder: 1, createdAt: now, updatedAt: now },
      { id: 2, title: "Sample: 3D Awareness Experience", details: "Replace this with the real project description.", tools: "Three.js, React", demoUrl: "", repoUrl: "", thumbnailUrl: "", featured: false, sortOrder: 2, createdAt: now, updatedAt: now },
      { id: 3, title: "Sample: Local Resource Finder", details: "Replace this with the real project description.", tools: "TypeScript, Cursor, Claude Code", demoUrl: "", repoUrl: "", thumbnailUrl: "", featured: false, sortOrder: 3, createdAt: now, updatedAt: now },
    ],
    skills: [
      { id: 1, name: "Full-stack development", category: "Craft", sortOrder: 1 },
      { id: 2, name: "3D design", category: "Craft", sortOrder: 2 },
      { id: 3, name: "React", category: "Tools", sortOrder: 3 },
      { id: 4, name: "Three.js", category: "Tools", sortOrder: 4 },
      { id: 5, name: "Claude Code", category: "AI tools", sortOrder: 5 },
      { id: 6, name: "Cursor", category: "AI tools", sortOrder: 6 },
    ],
    experiments: [
      { id: 1, title: "Sample: Prompt sketch", description: "Add a prompt you are proud of, a code sketch, or a visual experiment here.", kind: "Prompt", linkUrl: "", sortOrder: 1 },
      { id: 2, title: "Sample: Wireframe study", description: "Add a short description of a rapid visual experiment here.", kind: "Visual", linkUrl: "", sortOrder: 2 },
    ],
    messages: [],
    nextId: { project: 4, message: 1 },
  };
}
