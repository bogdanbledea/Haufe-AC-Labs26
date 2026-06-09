import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { createComment } from '../lib/api';
import type { Comment } from '../types';

interface CommentListProps {
  comments: Comment[];
  targetId: string;
  targetType: 'question' | 'answer';
}

const CommentList = ({ comments: initial, targetId, targetType }: CommentListProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>(initial);
  const [body, setBody] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const { comment } = await createComment(targetId, targetType, body.trim());
      setComments((prev) => [...prev, comment]);
      setBody('');
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setOpen(false);
    setBody('');
    setError(null);
  };

  return (
    <div className="mt-4 border-t border-zinc-100 dark:border-zinc-700 pt-3">
      {comments.length > 0 && (
        <ul className="space-y-2 mb-3">
          {comments.map((c) => (
            <li key={c.id} className="text-sm text-zinc-600 dark:text-zinc-400 flex gap-2">
              <span className="font-medium text-zinc-800 dark:text-zinc-200 shrink-0">
                {c.author?.username}
              </span>
              <span>{c.body}</span>
            </li>
          ))}
        </ul>
      )}

      {user && !open && (
        <button
          onClick={() => setOpen(true)}
          className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
        >
          Add a comment
        </button>
      )}

      {user && open && (
        <form onSubmit={(e) => void handleSubmit(e)} className="flex gap-2 items-start">
          <input
            type="text"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a comment..."
            className="flex-1 border border-zinc-300 dark:border-zinc-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-400 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
            autoFocus
          />
          <button
            type="submit"
            disabled={saving || !body.trim()}
            className="text-sm bg-zinc-900 text-white px-3 py-1 rounded hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 disabled:opacity-50 transition-colors"
          >
            {saving ? '...' : 'Post'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="text-sm text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 py-1"
          >
            Cancel
          </button>
        </form>
      )}
      {error && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>}
    </div>
  );
};

export default CommentList;
