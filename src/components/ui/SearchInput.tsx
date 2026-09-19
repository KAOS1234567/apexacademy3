"use client";

import { useRef } from "react";
import { X } from "lucide-react";

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  function handleClear() {
    onChange("");
    ref.current?.blur();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  }

  return (
    <div className="relative">
      <input
        ref={ref}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="done"
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pl-9"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute left-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="مسح البحث"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
