export interface PersonLink {
  id: string;
  title: string;
  url: string;
  createdAt: string;
}

export interface PersonSection {
  id: string;
  title: string;
  body?: string;
  links: PersonLink[];
}

export interface Person {
  id: string;
  name: string;
  notesSummary?: string;
  sections: PersonSection[];
  createdAt: string;
  updatedAt: string;
}

function section(title: string): PersonSection {
  return {
    id: crypto.randomUUID(),
    title,
    body: "",
    links: [],
  };
}

export function createBlankPerson(name: string): Omit<Person, "id" | "createdAt" | "updatedAt"> {
  return {
    name,
    sections: [section("Interests"), section("Possible gifts")],
  };
}

function isHttpsUrl(url: string): boolean {
  return /^https:\/\/.+/i.test(url.trim());
}

export function validatePerson(input: unknown): Person {
  if (!input || typeof input !== "object") throw new Error("Invalid person.");
  const v = input as Record<string, unknown>;
  const name = typeof v.name === "string" ? v.name.trim() : "";
  if (!name || name.length > 100)
    throw new Error("Enter a name between 1 and 100 characters.");

  if (!Array.isArray(v.sections) || v.sections.length < 1)
    throw new Error("Keep at least one section.");

  const sections: PersonSection[] = [];
  for (const raw of v.sections) {
    if (!raw || typeof raw !== "object") throw new Error("Invalid section.");
    const s = raw as Record<string, unknown>;
    const title = typeof s.title === "string" ? s.title.trim() : "";
    if (!title) throw new Error("Section title is required.");
    const body =
      s.body == null
        ? undefined
        : typeof s.body === "string"
          ? s.body
          : "";
    if (body !== undefined && body.length > 5000)
      throw new Error("Section notes must be under 5,000 characters.");

    const links: PersonLink[] = [];
    if (Array.isArray(s.links)) {
      for (const linkRaw of s.links) {
        if (!linkRaw || typeof linkRaw !== "object")
          throw new Error("Invalid link.");
        const l = linkRaw as Record<string, unknown>;
        const linkTitle =
          typeof l.title === "string" ? l.title.trim() : "";
        const url = typeof l.url === "string" ? l.url.trim() : "";
        if (!isHttpsUrl(url))
          throw new Error("Use a full https:// link.");
        const id = typeof l.id === "string" ? l.id : "";
        const createdAt =
          typeof l.createdAt === "string"
            ? l.createdAt
            : new Date().toISOString();
        links.push({ id, title: linkTitle, url, createdAt });
      }
    }

    sections.push({
      id: typeof s.id === "string" ? s.id : crypto.randomUUID(),
      title,
      body: body || undefined,
      links,
    });
  }

  const id = typeof v.id === "string" ? v.id : "";
  const now = new Date().toISOString();
  const createdAt =
    typeof v.createdAt === "string" ? v.createdAt : now;
  const updatedAt =
    typeof v.updatedAt === "string" ? v.updatedAt : now;
  const notesSummary =
    typeof v.notesSummary === "string" && v.notesSummary.trim()
      ? v.notesSummary.trim()
      : undefined;

  return {
    id,
    name,
    notesSummary,
    sections,
    createdAt,
    updatedAt,
  };
}
