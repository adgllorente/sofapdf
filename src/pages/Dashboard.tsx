import { useState } from "react";
import clsx from "clsx";
import { Icon, type IconName } from "@/components/Icon";
import { SofaMascot } from "@/components/SofaMascot";
import { ToolCard } from "@/components/ToolCard";
import { t } from "@/i18n";
import { renderInline } from "@/i18n/inline";
import { CATEGORY_IDS, TOOLS } from "@/tools/registry";

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

  const visibleTools = (
    activeTab === "all"
      ? TOOLS
      : TOOLS.filter((tool) => tool.category === activeTab)
  )
    .slice()
    .sort((a, b) => {
      if (a.status === b.status) return 0;
      return a.status === "ready" ? -1 : 1;
    });

  return (
    <div
      id="tools"
      className="mx-auto max-w-6xl space-y-5 px-5 pb-20 sm:scroll-mt-24"
    >
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
      <div className="mx-auto max-w-6xl px-5 pt-8 pb-10 sm:pt-12 sm:pb-12">
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
            <SofaMascot className="w-full max-w-sm sm:max-w-md" />
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
