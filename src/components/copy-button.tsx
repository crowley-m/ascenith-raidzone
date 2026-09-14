"use client";

import { useState } from "react";

/** Copy-to-clipboard button with a brief checkmark micro-animation on success. */
export function CopyButton({ value, className = "" }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className={`btn-ghost inline-flex items-center gap-1.5 text-xs ${className}`}
      onClick={() => {
        navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
          copied ? "scale-110 text-teal" : "text-slate-400"
        }`}
      >
        {copied ? <path d="M4 10.5l3.5 3.5L16 5.5" /> : <rect x="5.5" y="5.5" width="9" height="9" rx="1.5" />}
      </svg>
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
