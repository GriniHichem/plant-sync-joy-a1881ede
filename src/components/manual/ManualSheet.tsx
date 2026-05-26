import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { BookOpen, Search, ChevronRight, Home, ExternalLink, X } from "lucide-react";
import manualRaw from "../../../MANUAL.md?raw";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { useManual } from "@/contexts/ManualContext";
import { getManualSectionForRoute } from "@/manual/manualRouteMap";
import { parseManual, searchManual, getExcerpt, type ManualSection } from "@/manual/parseManual";

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return v;
}

export default function ManualSheet() {
  const { open, sectionId, openManual, closeManual, setSectionId } = useManual();
  const location = useLocation();
  const articleRef = useRef<HTMLDivElement>(null);

  const { sections, toc } = useMemo(() => parseManual(manualRaw), []);

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query, 150);

  // Resolve current section (URL > stored > route default > first chapter)
  const currentSection: ManualSection | null = useMemo(() => {
    if (sectionId) {
      const found = sections.find((s) => s.id === sectionId);
      if (found) return found;
    }
    const routeId = getManualSectionForRoute(location.pathname);
    if (routeId) {
      const found = sections.find((s) => s.id === routeId);
      if (found) return found;
    }
    return sections[0] ?? null;
  }, [sectionId, sections, location.pathname]);

  // Scroll to top of article whenever section changes
  useEffect(() => {
    if (articleRef.current) articleRef.current.scrollTop = 0;
  }, [currentSection?.id]);

  const results = useMemo(() => searchManual(sections, debouncedQuery, 25), [sections, debouncedQuery]);
  const searching = debouncedQuery.trim().length >= 2;

  const chapterOf = (s: ManualSection) =>
    s.chapterId ? toc.chapters.find((c) => c.id === s.chapterId) : toc.chapters.find((c) => c.id === s.id);

  return (
    <Sheet open={open} onOpenChange={(v) => (v ? openManual() : closeManual())}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[640px] p-0 flex flex-col gap-0"
      >
        <SheetHeader className="px-5 py-4 border-b bg-card/50">
          <SheetTitle className="flex items-center gap-2 text-base">
            <BookOpen size={18} className="text-primary" />
            Manuel utilisateur
            <Badge variant="outline" className="ml-2 text-[10px] font-normal">
              PROD IN TIME
            </Badge>
          </SheetTitle>
          {currentSection && !searching && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <button
                onClick={() => setSectionId(toc.chapters[0]?.id ?? null)}
                className="hover:text-foreground inline-flex items-center gap-1"
                title="Sommaire"
              >
                <Home size={11} />
                Manuel
              </button>
              {chapterOf(currentSection) && currentSection.level === 3 && (
                <>
                  <ChevronRight size={11} />
                  <button
                    className="hover:text-foreground truncate max-w-[160px]"
                    onClick={() => setSectionId(currentSection.chapterId)}
                  >
                    {chapterOf(currentSection)?.title}
                  </button>
                </>
              )}
              <ChevronRight size={11} />
              <span className="text-foreground font-medium truncate">{currentSection.title}</span>
            </div>
          )}
        </SheetHeader>

        <div className="px-5 py-3 border-b">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher dans le manuel…"
              className="pl-9 pr-9 h-9"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Effacer"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[220px_1fr]">
          {/* TOC */}
          <ScrollArea className="hidden md:block border-r bg-muted/20">
            <div className="p-2">
              <Accordion
                type="multiple"
                defaultValue={toc.chapters.map((c) => c.id)}
                className="w-full"
              >
                {toc.chapters.map((ch) => (
                  <AccordionItem key={ch.id} value={ch.id} className="border-b-0">
                    <AccordionTrigger
                      className={cn(
                        "py-1.5 px-2 text-xs font-semibold hover:no-underline rounded-md hover:bg-accent/50",
                        currentSection?.id === ch.id && "text-primary",
                      )}
                    >
                      <span className="text-left flex-1 truncate">
                        <span className="text-muted-foreground mr-1">{ch.number}</span>
                        {ch.title}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-0">
                      <button
                        onClick={() => setSectionId(ch.id)}
                        className={cn(
                          "w-full text-left text-[11px] px-3 py-1 rounded hover:bg-accent/60 text-muted-foreground",
                          currentSection?.id === ch.id && "bg-primary/10 text-primary font-medium",
                        )}
                      >
                        Présentation
                      </button>
                      {ch.sections.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setSectionId(s.id)}
                          className={cn(
                            "w-full text-left text-[11px] px-3 py-1 rounded hover:bg-accent/60",
                            currentSection?.id === s.id
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-foreground/80",
                          )}
                        >
                          <span className="text-muted-foreground mr-1">{s.number}</span>
                          {s.title}
                        </button>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </ScrollArea>

          {/* Content */}
          <div ref={articleRef} className="overflow-y-auto">
            {searching ? (
              <div className="p-5 space-y-2">
                <p className="text-xs text-muted-foreground mb-2">
                  {results.length} résultat{results.length > 1 ? "s" : ""} pour « {debouncedQuery} »
                </p>
                {results.length === 0 && (
                  <div className="text-sm text-muted-foreground py-6 text-center">
                    Aucun résultat. Essayez d&apos;autres mots-clés.
                  </div>
                )}
                <ul className="space-y-2">
                  {results.map(({ section }) => (
                    <li key={section.id}>
                      <button
                        onClick={() => {
                          setSectionId(section.id);
                          setQuery("");
                        }}
                        className="w-full text-left rounded-md border border-border/60 hover:border-primary/40 hover:bg-accent/40 p-3 transition-colors"
                      >
                        <div className="flex items-center gap-2 text-sm font-medium">
                          {section.number && (
                            <span className="text-muted-foreground text-[11px]">{section.number}</span>
                          )}
                          <span className="text-foreground">{section.title}</span>
                          {section.level === 2 && (
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                              Chapitre
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                          {getExcerpt(section, debouncedQuery)}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : currentSection ? (
              <article className="p-5 pb-12">
                <header className="mb-4">
                  {currentSection.number && (
                    <div className="text-xs font-semibold tracking-wider text-primary/80 uppercase">
                      Section {currentSection.number}
                    </div>
                  )}
                  <h2 className="text-xl font-bold tracking-tight mt-1">{currentSection.title}</h2>
                </header>
                <div
                  className="manual-prose"
                  // html is sanitized by parseManual (DOMPurify)
                  dangerouslySetInnerHTML={{ __html: currentSection.html }}
                />

                {/* Sub-sections quick links if chapter */}
                {currentSection.level === 2 && chapterOf(currentSection)?.sections.length ? (
                  <div className="mt-6 border-t pt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Dans ce chapitre
                    </p>
                    <ul className="space-y-1">
                      {chapterOf(currentSection)!.sections.map((s) => (
                        <li key={s.id}>
                          <button
                            onClick={() => setSectionId(s.id)}
                            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                          >
                            <ChevronRight size={12} />
                            <span className="text-muted-foreground mr-1">{s.number}</span>
                            {s.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </article>
            ) : (
              <div className="p-6 text-sm text-muted-foreground">Manuel indisponible.</div>
            )}
          </div>
        </div>

        <div className="border-t px-5 py-2 text-[11px] text-muted-foreground flex items-center justify-between bg-card/40">
          <span>
            Astuce : appuyez sur <kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px]">?</kbd> pour ouvrir/fermer.
          </span>
          <a
            href="/MANUAL.md"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            Source <ExternalLink size={11} />
          </a>
        </div>
      </SheetContent>
    </Sheet>
  );
}
