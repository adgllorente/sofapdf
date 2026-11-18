import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { Icon, type IconName } from "@/components/Icon";
import { SofaMascot } from "@/components/SofaMascot";
import { ToolCard } from "@/components/ToolCard";
import { applyDocumentSeo, fmt, t } from "@/i18n";
import { APP } from "@/config";
import { useLocale } from "@/i18n/react";
import { renderInline } from "@/i18n/inline";
import { matchScore } from "@/lib/search";
import { CATEGORY_IDS, sortTools, TOOLS } from "@/tools/registry";
import type { Tool } from "@/tools/types";

type PointKey = keyof typeof t.privacyPoints;

const POINTS: { key: PointKey; icon: IconName }[] = [
  { key: "noUpload", icon: "cpu" },
  { key: "offline", icon: "wifiOff" },
  { key: "noTracking", icon: "shield" },
  { key: "private", icon: "lock" },
];

type TabId = "all" | (typeof CATEGORY_IDS)[number];

export function Dashboard() {
  const locale = useLocale()

  useEffect(() => {
    applyDocumentSeo({
      title: fmt(t.meta.homeTitle, { app: APP.name, tagline: t.brand.tagline }),
      description: t.meta.description,
      path: '/',
      structuredData: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            name: APP.name,
            url: `https://${APP.domain}/`,
            description: t.meta.description,
            inLanguage: t.meta.lang,
          },
          {
            '@type': 'SoftwareApplication',
            name: APP.name,
            url: `https://${APP.domain}/`,
            description: t.meta.description,
            applicationCategory: 'UtilitiesApplication',
            applicationSubCategory: 'PDF utility',
            operatingSystem: 'Web',
            isAccessibleForFree: true,
            inLanguage: t.meta.lang,
            featureList: TOOLS.filter((tool) => tool.status === 'ready').map(
              (tool) => t.tools[tool.slug].name,
            ),
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD',
            },
          },
        ],
      },
    })
  }, [locale])

  return (
    <>
      <Hero />
      <ToolsSection />
    </>
  );
}

function ToolsSection() {
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [query, setQuery] = useState("");

  const scores = new Map<Tool, number>();
  for (const tool of TOOLS) {
    const text = t.tools[tool.slug];
    const score = matchScore(query, {
      name: text.name,
      texts: [text.short, text.description],
    });
    if (score > 0) scores.set(tool, score);
  }
  const matchingTools = TOOLS.filter((tool) => scores.has(tool));

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: "all", label: t.tabs.all, count: matchingTools.length },
    ...CATEGORY_IDS.map((id) => ({
      id,
      label: t.categories[id].short,
      count: matchingTools.filter((tool) => tool.category === id).length,
    })),
  ];

  const sortedTools = sortTools(
    activeTab === "all"
      ? matchingTools
      : matchingTools.filter((tool) => tool.category === activeTab),
    (tool) => t.tools[tool.slug].name,
  );
  // Con consulta manda la relevancia; el orden habitual solo desempata.
  const visibleTools = query.trim()
    ? sortedTools
        .map((tool, index) => ({ tool, index }))
        .sort(
          (a, b) =>
            (scores.get(b.tool) ?? 0) - (scores.get(a.tool) ?? 0) ||
            a.index - b.index,
        )
        .map(({ tool }) => tool)
    : sortedTools;

  return (
    <div
      id="tools"
      className="mx-auto max-w-6xl space-y-5 px-5 pb-20 sm:scroll-mt-24"
    >
      <Link
        to="/workflow"
        className="group relative block overflow-hidden rounded-card border border-accent-line bg-accent-soft px-6 py-7 transition hover:border-accent sm:px-8 sm:py-9"
      >
        <div className="pointer-events-none absolute -top-20 -right-16 size-56 rounded-full bg-accent/10 blur-2xl" />
        <div className="relative grid items-center gap-8 sm:grid-cols-[1fr_auto]">
          <span className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent-line bg-surface/70 px-3 py-1 text-xs font-semibold tracking-wide text-accent uppercase">
              <Icon name="workflow" className="size-3.5" strokeWidth={2} />
              {t.workflow.badge}
            </span>
            <span className="mt-4 block max-w-xl text-2xl leading-tight font-semibold tracking-tight text-ink sm:text-3xl">
              {t.workflow.badge}
            </span>
            <span className="mt-2 block max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
              {t.workflow.badgeBody}
            </span>
          </span>

          <span aria-hidden="true" className="hidden items-center gap-2 sm:flex">
            <span className="grid size-14 place-items-center rounded-2xl border border-accent-line bg-surface text-accent shadow-sm">
              <Icon name="file" className="size-6" />
            </span>
            <Icon name="arrowLeft" className="size-5 rotate-180 text-accent/70" />
            <span className="grid size-16 place-items-center rounded-2xl bg-accent text-on-accent shadow-lg shadow-accent/20 transition group-hover:scale-105">
              <Icon name="workflow" className="size-8" strokeWidth={1.5} />
            </span>
            <Icon name="arrowLeft" className="size-5 rotate-180 text-accent/70" />
            <span className="grid size-14 place-items-center rounded-2xl border border-accent-line bg-surface text-accent shadow-sm">
              <Icon name="check" className="size-6" strokeWidth={2} />
            </span>
          </span>
        </div>
      </Link>

      <div className="relative">
        <Icon
          name="search"
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setQuery("");
          }}
          placeholder={t.search.placeholder}
          aria-label={t.search.label}
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-card border border-line bg-surface py-3 pr-12 pl-12 text-base text-ink placeholder:text-muted transition outline-none focus:border-accent [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label={t.search.clear}
            title={t.search.clear}
            className="absolute top-1/2 right-3 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted transition hover:bg-accent-soft hover:text-ink"
          >
            <Icon name="x" className="size-4" />
          </button>
        )}
      </div>

      <div role="tablist" className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition",
                isActive
                  ? "border-accent bg-accent text-on-accent"
                  : "border-line bg-surface text-muted hover:border-line-strong hover:text-ink",
              )}
            >
              {tab.label}
              <span
                className={clsx(
                  "text-xs tabular-nums",
                  isActive ? "opacity-80" : "opacity-50",
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {visibleTools.map((tool) => (
          <ToolCard key={tool.slug} tool={tool} />
        ))}
      </div>

      {visibleTools.length === 0 && (
        <p role="status" className="py-10 text-center text-muted">
          {fmt(t.search.empty, { query: query.trim() })}
        </p>
      )}
    </div>
  );
}

function Hero() {
  return (
    <section>
      <div className="mx-auto max-w-6xl px-5 pt-10 pb-10 sm:pt-16 sm:pb-12">
        <div className="grid items-center gap-10 sm:grid-cols-[1.3fr_1fr] lg:gap-14">
          <div>
            <h1 className="max-w-3xl text-4xl leading-[1.1] font-semibold tracking-tight text-balance text-ink sm:text-6xl">
              {t.brand.tagline}
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
              {renderInline(t.brand.claim)}
            </p>
          </div>

          <div className="flex justify-center sm:justify-end">
            <SofaMascot className="w-full max-w-xs sm:max-w-sm" />
          </div>
        </div>

        {/* Los compromisos, en una sola línea: iconos + etiqueta corta. */}
        <ul className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted sm:mt-4">
          {POINTS.map((point) => (
            <li key={point.key} className="flex items-center gap-2">
              <Icon
                name={point.icon}
                className="size-4 text-accent"
                strokeWidth={1.8}
              />
              <span>{t.privacyPoints[point.key].title}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
