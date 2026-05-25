"use client";

import { clsx } from "clsx";

interface TabSwitcherProps {
  tabs: { key: string; label: string; icon?: React.ReactNode }[];
  activeTab: string;
  onChange: (key: string) => void;
}

export function TabSwitcher({ tabs, activeTab, onChange }: TabSwitcherProps) {
  return (
    <div className="flex gap-0 border-b border-border relative overflow-x-auto scrollbar-none">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={clsx(
            "px-3 sm:px-5 py-3 text-xs sm:text-sm font-semibold uppercase tracking-wider transition-colors relative whitespace-nowrap shrink-0",
            "hover:text-foreground",
            activeTab === tab.key
              ? "text-accent"
              : "text-foreground-muted"
          )}
        >
          <span className="flex items-center gap-1.5 sm:gap-2">
            {tab.icon}
            {tab.label}
          </span>
          {activeTab === tab.key && (
            <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-accent tab-underline rounded-t" />
          )}
        </button>
      ))}
    </div>
  );
}
