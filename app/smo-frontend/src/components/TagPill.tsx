interface TagPillProps {
  name: string;
  onClick?: () => void;
  removable?: boolean;
  onRemove?: (name: string) => void;
}

const TagPill = ({ name, onClick, removable, onRemove }: TagPillProps) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-700 rounded dark:bg-zinc-700 dark:text-zinc-300
      ${onClick ? 'cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors' : ''}`}
    onClick={onClick}
  >
    {name}
    {removable && (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove?.(name); }}
        className="text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200 leading-none"
      >
        ×
      </button>
    )}
  </span>
);

export default TagPill;
