import { useEffect, useState } from 'react';
import { summarizeQuestion } from '../lib/api';

interface QuestionSummaryProps {
  questionId: string;
}

const QuestionSummary = ({ questionId }: QuestionSummaryProps) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchSummary = async () => {
      try {
        const data = await summarizeQuestion(questionId);
        if (!cancelled) {
          setSummary(data.summary || null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load AI summary');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchSummary();

    return () => {
      cancelled = true;
    };
  }, [questionId]);

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 p-4 mb-4">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Generating AI summary...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 p-4 mb-4">
        <p className="text-sm text-red-600 dark:text-red-400">AI summary unavailable.</p>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 p-4 mb-4">
      <div className="mb-2">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">AI summary</h2>
      </div>
      <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-line">{summary}</p>
    </div>
  );
};

export default QuestionSummary;
