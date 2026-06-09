import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import VoteButton from './VoteButton';
import CommentList from './CommentList';
import { useAuth } from '../hooks/useAuth';
import { formatDate } from '../lib/utils';
import type { Answer } from '../types';

interface AnswerCardProps {
  answer: Answer;
  isQuestionOwner: boolean;
  onAccept?: (id: string) => void;
  onVote?: (id: string, value: 1 | -1) => void;
}

const AnswerCard = ({ answer, isQuestionOwner, onAccept, onVote }: AnswerCardProps) => {
  const { user } = useAuth();
  const { id, body, is_accepted, vote_count, created_at, author, comments } = answer;

  return (
    <div
      className={`border rounded-lg p-4 ${
        is_accepted
          ? 'border-green-400 bg-green-50 dark:border-green-700 dark:bg-green-950'
          : 'border-zinc-200 dark:border-zinc-700'
      }`}
    >
      <div className="flex gap-4">
        <div className="flex flex-col items-center gap-2 shrink-0">
          <VoteButton
            count={vote_count}
            onVote={(v) => onVote?.(id, v)}
            disabled={!user}
          />
          {is_accepted && (
            <span className="text-green-600 dark:text-green-400 text-lg" title="Accepted answer">
              ✓
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {is_accepted && (
            <span className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide block mb-2">
              Accepted Answer
            </span>
          )}

          <div className="prose text-zinc-800 dark:text-zinc-200 text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
          </div>

          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              answered by{' '}
              <span className="text-zinc-600 dark:text-zinc-400">{author?.username}</span>
              {' '}· {formatDate(created_at)}
            </p>
            {isQuestionOwner && !is_accepted && (
              <button
                onClick={() => onAccept?.(id)}
                className="text-xs text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 font-medium transition-colors"
              >
                ✓ Accept this answer
              </button>
            )}
          </div>

          <CommentList comments={comments} targetId={id} targetType="answer" />
        </div>
      </div>
    </div>
  );
};

export default AnswerCard;
