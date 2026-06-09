import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import TagPill from '../components/TagPill';
import { createQuestion, suggestTags, aiHealth } from '../lib/api';

const AskQuestion = () => {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const [generatingTags, setGeneratingTags] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiDisabled, setAiDisabled] = useState(false);

  useEffect(() => {
    aiHealth()
      .then((data) => { if (data.rateLimited) setAiDisabled(true); })
      .catch(() => {});
  }, []);

  const handleGenerateTags = async () => {
    if (!title.trim() || aiDisabled) return;
    setGeneratingTags(true);
    try {
      const result = await suggestTags(title.trim());
      if (result.tags.length) {
        setTags((prev) => [...new Set([...prev, ...result.tags])]);
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'groq_rate_limited') setAiDisabled(true);
    } finally {
      setGeneratingTags(false);
    }
  };

  const addTag = (name: string) => {
    const cleaned = name.toLowerCase().trim().replace(/\s+/g, '-');
    if (cleaned && !tags.includes(cleaned)) {
      setTags((prev) => [...prev, cleaned]);
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (tagInput.trim()) { addTag(tagInput); setTagInput(''); }
    }
  };

  const handleTagBlur = () => {
    if (tagInput.trim()) { addTag(tagInput); setTagInput(''); }
  };

  const removeTag = (name: string) => setTags((prev) => prev.filter((t) => t !== name));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const { question } = await createQuestion({
        title: title.trim(),
        description: description.trim(),
        tags,
      });
      navigate(`/questions/${question.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post question');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-900">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-6">
          Ask a Question
        </h1>

        {aiDisabled && (
          <div className="mb-6 text-sm text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded px-3 py-2">
            Congrats, someone speed-ran the entire token budget. AI features are on a mandatory timeout — tag suggestions are sitting in the corner thinking about what they've done.
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Title</label>
              <button
                type="button"
                onClick={() => void handleGenerateTags()}
                disabled={generatingTags || !title.trim() || aiDisabled}
                className="text-xs text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {generatingTags ? 'Generating tags...' : '✦ Generate tags'}
              </button>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="What's your question? Be specific."
              className="w-full border border-zinc-300 dark:border-zinc-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-zinc-600 dark:focus:border-zinc-400 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={10}
              placeholder="Describe your problem in detail. Include what you've already tried. Markdown is supported."
              className="w-full border border-zinc-300 dark:border-zinc-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-zinc-600 dark:focus:border-zinc-400 resize-y font-mono bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((t) => (
                <TagPill key={t} name={t} removable onRemove={removeTag} />
              ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={handleTagBlur}
              placeholder="Type a tag and press Enter"
              className="w-full border border-zinc-300 dark:border-zinc-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-zinc-600 dark:focus:border-zinc-400 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
            />
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
              Press Enter or comma to add a tag. Or use the generate button above.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="bg-zinc-900 text-white text-sm px-5 py-2 rounded-md hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Posting...' : 'Post your question'}
          </button>
        </form>
      </main>
    </div>
  );
};

export default AskQuestion;
