import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/Navbar';
import QuestionCard from '../components/QuestionCard';
import SearchBar from '../components/SearchBar';
import { getQuestions, smartSearch } from '../lib/api';
import type { QuestionSummary } from '../types';

const Home = () => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<QuestionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<QuestionSummary[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [showTagFilter, setShowTagFilter] = useState(false);
  const tagFilterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getQuestions(activeTag ?? undefined)
      .then(({ questions: q }) => setQuestions(q ?? []))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load questions'),
      )
      .finally(() => setLoading(false));
  }, [activeTag]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tagFilterRef.current && !tagFilterRef.current.contains(e.target as Node)) {
        setShowTagFilter(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const allTags = [
    ...new Set(questions.flatMap((q) => q.question_tags.map(({ tag }) => tag.name))),
  ].sort();

  const handleTagClick = (tag: string) => {
    setActiveTag((current) => (current === tag ? null : tag));
    setShowTagFilter(false);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const res = await smartSearch(query);
      setSearchResults(res.questions);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const displayedQuestions = searchResults ?? questions;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-900">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">All Questions</h1>
          {user && (
            <Link
              to="/questions/new"
              className="bg-zinc-900 text-white text-sm px-3 py-1.5 rounded-md hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 transition-colors"
            >
              Ask a question
            </Link>
          )}
        </div>

        <SearchBar onSearch={handleSearch} loading={searching} />

        {allTags.length > 0 && !searchQuery && (
          <div ref={tagFilterRef} className="relative mb-6">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTagFilter((v) => !v)}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded border transition-colors ${
                  showTagFilter
                    ? 'border-zinc-400 text-zinc-700 bg-zinc-50 dark:border-zinc-500 dark:text-zinc-200 dark:bg-zinc-800'
                    : 'border-zinc-300 text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-300'
                }`}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 4h12M4 8h8M6 12h4" />
                </svg>
                <span>Tags</span>
                {allTags.length > 0 && (
                  <span className="text-zinc-400 dark:text-zinc-500">({allTags.length})</span>
                )}
                <svg
                  className={`w-3 h-3 transition-transform ${showTagFilter ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 16 16"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6l4 4 4-4" />
                </svg>
              </button>

              {activeTag && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">·</span>
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                    {activeTag}
                    <button
                      onClick={() => setActiveTag(null)}
                      className="leading-none opacity-60 hover:opacity-100 transition-opacity"
                      aria-label="Clear tag filter"
                    >
                      ×
                    </button>
                  </span>
                </div>
              )}
            </div>

            {showTagFilter && (
              <div className="absolute top-full mt-1.5 left-0 z-10 w-72 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg p-3">
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  <button
                    onClick={() => { setActiveTag(null); setShowTagFilter(false); }}
                    className={`text-xs px-2 py-1 rounded border transition-colors ${
                      !activeTag
                        ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                        : 'border-zinc-300 text-zinc-600 hover:border-zinc-500 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-zinc-400'
                    }`}
                  >
                    All
                  </button>
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleTagClick(tag)}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${
                        activeTag === tag
                          ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                          : 'border-zinc-300 text-zinc-600 hover:border-zinc-500 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-zinc-400'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {(loading || searching) && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="border border-zinc-100 dark:border-zinc-700 rounded-lg p-4 animate-pulse"
              >
                <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-3/4 mb-2" />
                <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-1/4" />
              </div>
            ))}
          </div>
        )}

        {!loading && !searching && error && (
          <p className="text-sm text-red-600 dark:text-red-400">
            Failed to load questions: {error}
          </p>
        )}

        {!loading && !searching && !error && displayedQuestions.length === 0 && (
          <div className="text-center py-16 text-zinc-400 dark:text-zinc-500">
            <p className="text-lg mb-2">
              {searchQuery ? `No results for "${searchQuery}".` : 'No questions yet.'}
            </p>
            {!searchQuery && user && (
              <p className="text-sm">
                Be the first —{' '}
                <Link to="/questions/new" className="text-blue-600 hover:underline dark:text-blue-400">
                  ask one
                </Link>
                .
              </p>
            )}
            {!searchQuery && !user && (
              <p className="text-sm">
                <Link to="/signin" className="text-blue-600 hover:underline dark:text-blue-400">
                  Sign in
                </Link>{' '}
                to ask the first question.
              </p>
            )}
          </div>
        )}

        {!loading && !searching && !error && displayedQuestions.length > 0 && (
          <div className="space-y-3">
            {displayedQuestions.map((q) => (
              <QuestionCard key={q.id} question={q} onTagClick={handleTagClick} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;