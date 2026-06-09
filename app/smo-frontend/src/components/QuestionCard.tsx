import { Link } from 'react-router-dom';
import TagPill from './TagPill';
import { formatDate } from '../lib/utils';
import type { QuestionSummary } from '../types';

interface QuestionCardProps {
  question: QuestionSummary;
  onTagClick?: (tag: string) => void;
}

const QuestionCard = ({ question, onTagClick }: QuestionCardProps) => {
  const { id, title, is_solved, vote_count, created_at, author, question_tags, answer_count } = question;

  return (
    <div className="border border-zinc-200 rounded-lg p-4 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500 transition-colors">
      <div className="flex gap-4">
        <div className="flex flex-col items-end gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 min-w-[72px] shrink-0 pt-0.5">
          <span>{vote_count} votes</span>
          <span
            className={`px-1.5 py-0.5 rounded border ${
              is_solved
                ? 'border-green-500 text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950 dark:border-green-700'
                : 'border-zinc-300 text-zinc-500 dark:border-zinc-600 dark:text-zinc-400'
            }`}
          >
            {answer_count} {answer_count === 1 ? 'answer' : 'answers'}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <Link
            to={`/questions/${id}`}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium leading-snug"
          >
            {title}
          </Link>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            {question_tags.map(({ tag }) => (
              <TagPill
                key={tag.name}
                name={tag.name}
                onClick={onTagClick ? () => onTagClick(tag.name) : undefined}
              />
            ))}
          </div>

          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
            asked by{' '}
            <span className="text-zinc-600 dark:text-zinc-400">{author?.username}</span>
            {' '}· {formatDate(created_at)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default QuestionCard;
