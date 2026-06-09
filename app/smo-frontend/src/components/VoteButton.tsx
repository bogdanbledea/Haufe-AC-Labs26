interface VoteButtonProps {
  count: number;
  onVote?: (value: 1 | -1) => void;
  disabled: boolean;
}

const VoteButton = ({ count, onVote, disabled }: VoteButtonProps) => (
  <div className="flex flex-col items-center gap-1 min-w-[36px]">
    <button
      onClick={() => onVote?.(1)}
      disabled={disabled}
      className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      aria-label="Upvote"
    >
      ▲
    </button>
    <span className="text-base font-semibold text-zinc-800 dark:text-zinc-200 tabular-nums">
      {count}
    </span>
    <button
      onClick={() => onVote?.(-1)}
      disabled={disabled}
      className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      aria-label="Downvote"
    >
      ▼
    </button>
  </div>
);

export default VoteButton;
