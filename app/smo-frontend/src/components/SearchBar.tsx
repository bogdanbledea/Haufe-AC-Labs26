import { useState, useEffect, useRef } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  loading?: boolean;
}

export default function SearchBar({ onSearch, loading = false }: SearchBarProps) {
  const [value, setValue] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearch(value.trim());
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  return (
    <div className="relative flex items-center mb-6">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search questions..."
        className="w-full border border-zinc-300 dark:border-zinc-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400 pr-16"
      />
      {loading && (
        <span className="absolute right-8 text-xs text-zinc-400">searching...</span>
      )}
      {value && (
        <button
          onClick={() => setValue('')}
          className="absolute right-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-lg leading-none"
          aria-label="Clear search"
        >
          ×
        </button>
      )}
    </div>
  );
}
