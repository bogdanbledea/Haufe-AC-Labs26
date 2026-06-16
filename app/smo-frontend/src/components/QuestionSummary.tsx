import { useState } from 'react';
import { summarizeQuestion } from '../lib/api';

interface QuestionSummaryProps {
  questionId: string;
  initialSummary?: string | null;
}

const QuestionSummary = ({ questionId, initialSummary }: QuestionSummaryProps) => {
  const [summary, setSummary] = useState<string | null>(initialSummary || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);

  const handleSummarize = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await summarizeQuestion(questionId);
      setSummary(data.summary || null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load AI summary';
      setError(errorMessage);
      
      // If AI service is down (503), hide the button
      if (errorMessage.includes('503') || errorMessage.toLowerCase().includes('unavailable')) {
        setServiceUnavailable(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // If AI service is unavailable, don't show the button
  if (serviceUnavailable) {
    return null;
  }

  // If summary is already loaded, show it
  if (summary) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 p-4 mb-4">
        <div className="mb-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">AI summary</h2>
        </div>
        <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-line">{summary}</p>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <button
        onClick={handleSummarize}
        disabled={loading}
        className="bg-zinc-900 text-white text-sm px-4 py-2 rounded-md hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Generating summary...' : 'Summarize'}
      </button>
      {error && !loading && (
        <p className="text-sm text-red-600 dark:text-red-400 mt-2">{error}</p>
      )}
    </div>
  );
};

export default QuestionSummary;
