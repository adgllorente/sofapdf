import { useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { Icon, type IconName } from "@/components/Icon";
import { SofaMascot } from "@/components/SofaMascot";
import { ToolCard } from "@/components/ToolCard";
import { t } from "@/i18n";
import { renderInline } from "@/i18n/inline";
import { CATEGORY_IDS, sortTools, TOOLS } from "@/tools/registry";

type PointKey = keyof typeof t.privacyPoints;

const POINTS: { key: PointKey; icon: IconName }[] = [
  { key: "noUpload", icon: "cpu" },
  { key: "offline", icon: "wifiOff" },
  { key: "noTracking", icon: "shield" },
  { key: "private", icon: "lock" },
];

type TabId = "all" | (typeof CATEGORY_IDS)[number];

export function Dashboard() {
  return (
    <>
      <Hero />
      <ToolsSection />
    </>
  );
}

function ToolsSection() {
  const [activeTab, setActiveTab] = useState<TabId>("all");

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: "all", label: t.tabs.all, count: TOOLS.length },
    ...CATEGORY_IDS.map((id) => ({
      id,
      label: t.categories[id].short,
      count: TOOLS.filter((tool) => tool.category === id).length,
    })),
  ];

  const visibleTools = sortTools(
    activeTab === "all"
      ? TOOLS
      : TOOLS.filter((tool) => tool.category === activeTab),
    (tool) => t.tools[tool.slug].name,
  );

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
