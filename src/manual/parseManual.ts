import { marked } from "marked";
import DOMPurify from "dompurify";

export interface ManualSection {
  /** Slugified id e.g. "3-2-machines" */
  id: string;
  /** Number prefix e.g. "3.2" or "6 bis.2" or "" */
  number: string;
  /** Title without numbering */
  title: string;
  /** Parent chapter id (## level), null if section is itself a chapter */
  chapterId: string | null;
  /** "##" => 2 (chapter), "###" => 3 (section) */
  level: 2 | 3;
  /** Raw markdown body (heading excluded) */
  markdown: string;
  /** Rendered & sanitized HTML body */
  html: string;
  /** Plain text body (for search) */
  text: string;
}

export interface ManualToc {
  chapters: {
    id: string;
    number: string;
    title: string;
    sections: { id: string; number: string; title: string }[];
  }[];
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function splitNumberTitle(headingText: string): { number: string; title: string } {
  // Examples: "3. Module GMAO — Maintenance", "3.2 Machines", "6 bis. Notifications & Emails", "6 bis.2 Configuration SMTP (`/parametres/smtp`)"
  const m = headingText.match(/^([0-9]+(?:\s*bis)?(?:\.[0-9]+)?)\.?\s+(.*)$/i);
  if (m) return { number: m[1].replace(/\s+/g, " "), title: m[2].trim() };
  return { number: "", title: headingText.trim() };
}

let cached: { sections: ManualSection[]; toc: ManualToc } | null = null;

export function parseManual(raw: string): { sections: ManualSection[]; toc: ManualToc } {
  if (cached) return cached;

  // Drop the top H1 + TOC. Split by "\n## " lines.
  const lines = raw.split("\n");
  type Block = { level: 2 | 3; heading: string; bodyLines: string[] };
  const blocks: Block[] = [];
  let current: Block | null = null;

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.*)$/);
    const h3 = line.match(/^###\s+(.*)$/);
    if (h2) {
      if (current) blocks.push(current);
      current = { level: 2, heading: h2[1].trim(), bodyLines: [] };
    } else if (h3 && current) {
      blocks.push(current);
      current = { level: 3, heading: h3[1].trim(), bodyLines: [] };
    } else if (current) {
      current.bodyLines.push(line);
    }
  }
  if (current) blocks.push(current);

  // Skip the "Table des matières" chapter
  const filtered = blocks.filter((b) => !/^table des mati/i.test(b.heading));

  const sections: ManualSection[] = [];
  let chapterId: string | null = null;

  for (const b of filtered) {
    const { number, title } = splitNumberTitle(b.heading);
    const idBase = number ? `${number.replace(/[.\s]+/g, "-")}-${slugify(title)}` : slugify(title);
    const id = idBase || `section-${sections.length}`;
    if (b.level === 2) chapterId = id;

    const markdown = b.bodyLines.join("\n").trim();
    const rawHtml = marked.parse(markdown, { async: false, gfm: true, breaks: false }) as string;
    const html = typeof window !== "undefined" ? DOMPurify.sanitize(rawHtml) : rawHtml;
    const text = markdown
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`[^`]*`/g, " ")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/[#>*_~`|-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    sections.push({
      id,
      number,
      title,
      chapterId: b.level === 3 ? chapterId : null,
      level: b.level,
      markdown,
      html,
      text,
    });
  }

  // Build TOC
  const chaptersMap = new Map<string, ManualToc["chapters"][number]>();
  for (const s of sections) {
    if (s.level === 2) {
      chaptersMap.set(s.id, { id: s.id, number: s.number, title: s.title, sections: [] });
    } else if (s.chapterId && chaptersMap.has(s.chapterId)) {
      chaptersMap.get(s.chapterId)!.sections.push({ id: s.id, number: s.number, title: s.title });
    }
  }
  const toc: ManualToc = { chapters: Array.from(chaptersMap.values()) };

  cached = { sections, toc };
  return cached;
}

/** Returns sections matching the query, scored. */
export function searchManual(sections: ManualSection[], query: string, max = 20) {
  const q = query
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (q.length < 2) return [];
  const norm = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const tokens = q.split(/\s+/).filter(Boolean);

  const scored = sections
    .map((s) => {
      const title = norm(s.title);
      const text = norm(s.text);
      let score = 0;
      for (const t of tokens) {
        if (title.includes(t)) score += 10;
        if (text.includes(t)) score += 1;
      }
      // bonus exact title match
      if (title === q) score += 50;
      // small bonus for sections (more specific) over chapters
      if (s.level === 3) score += 0.5;
      return { section: s, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max);

  return scored;
}

export function getExcerpt(section: ManualSection, query: string, length = 160): string {
  const q = query.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (!q) return section.text.slice(0, length) + (section.text.length > length ? "…" : "");
  const text = section.text;
  const normText = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const idx = normText.indexOf(q.split(/\s+/)[0] ?? "");
  if (idx < 0) return text.slice(0, length) + (text.length > length ? "…" : "");
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, start + length);
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}
