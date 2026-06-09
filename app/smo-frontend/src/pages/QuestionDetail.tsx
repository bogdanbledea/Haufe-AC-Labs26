import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/Navbar';
import VoteButton from '../components/VoteButton';
import AnswerCard from '../components/AnswerCard';
import CommentList from '../components/CommentList';
import TagPill from '../components/TagPill';
import { getQuestion, createAnswer, acceptAnswer, vote, deleteQuestion } from '../lib/api';
import { formatDate } from '../lib/utils';
import type { Question } from '../types';

const QuestionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answerBody, setAnswerBody] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getQuestion(id)
      .then(({ question: q }) => setQuestion(q))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load question'),
      )
      .finally(() => setLoading(false));
  }, [id]);

  const handleVoteQuestion = async (value: 1 | -1) => {
    if (!id) return;
    try {
      const { vote_count } = await vote(id, 'question', value);
      setQuestion((q) => q ? { ...q, vote_count } : q);
    } catch { /* non-blocking */ }
  };

  const handleVoteAnswer = async (answerId: string, value: 1 | -1) => {
    try {
      const { vote_count } = await vote(answerId, 'answer', value);
      setQuestion((q) =>
        q
          ? { ...q, answers: q.answers.map((a) => a.id === answerId ? { ...a, vote_count } : a) }
          : q,
      );
    } catch { /* non-blocking */ }
  };

  const handleAccept = async (answerId: string) => {
    try {
      await acceptAnswer(answerId);
      setQuestion((q) =>
        q
          ? {
              ...q,
              is_solved: true,
              answers: q.answers.map((a) => ({ ...a, is_accepted: a.id === answerId })),
            }
          : q,
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to accept answer');
    }
  };

  const handlePostAnswer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!answerBody.trim() || !id) return;
    setSubmittingAnswer(true);
    setAnswerError(null);
    try {
      const { answer } = await createAnswer(id, answerBody.trim());
      setQuestion((q) => q ? { ...q, answers: [...q.answers, answer] } : q);
      setAnswerBody('');
    } catch (err) {
      setAnswerError(err instanceof Error ? err.message : 'Failed to post answer');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm('Delete this question?')) return;
    try {
      await deleteQuestion(id);
      navigate('/');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete question');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-900">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-zinc-100 dark:bg-zinc-800 rounded w-2/3" />
            <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-full" />
            <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-5/6" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-900">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <p className="text-sm text-red-600 dark:text-red-400">{error ?? 'Question not found.'}</p>
          <Link to="/" className="text-sm text-blue-600 hover:underline dark:text-blue-400 mt-2 block">
            ← Back
          </Link>
        </main>
      </div>
    );
  }

  const isOwner = user?.id === question.author?.id;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-900">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Link
          to="/"
          className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 mb-4 block"
        >
          ← All questions
        </Link>

        <div className="mb-8">
          <div className="flex items-start gap-4">
            <VoteButton
              count={question.vote_count}
              onVote={(v) => void handleVoteQuestion(v)}
              disabled={!user}
            />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 leading-snug mb-1">
                {question.title}
                {question.is_solved && (
                  <span className="ml-2 text-sm font-normal text-green-700 bg-green-100 px-2 py-0.5 rounded dark:text-green-400 dark:bg-green-950">
                    Solved
                  </span>
                )}
              </h1>

              <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4">
                asked by{' '}
                <span className="text-zinc-600 dark:text-zinc-400">{question.author?.username}</span>
                {' '}· {formatDate(question.created_at)}
                {isOwner && (
                  <button
                    onClick={() => void handleDelete()}
                    className="ml-3 text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                  >
                    delete
                  </button>
                )}
              </p>

              <div className="prose text-zinc-800 dark:text-zinc-200 text-sm mb-4">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{question.description}</ReactMarkdown>
              </div>

              <div className="flex flex-wrap gap-2 mb-2">
                {question.question_tags.map(({ tag }) => (
                  <TagPill key={tag.name} name={tag.name} />
                ))}
              </div>

              <CommentList
                comments={question.comments}
                targetId={question.id}
                targetType="question"
              />
            </div>
          </div>
        </div>

        <section>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            {question.answers.length}{' '}
            {question.answers.length === 1 ? 'Answer' : 'Answers'}
          </h2>

          {question.answers.length === 0 && (
            <p className="text-sm text-zinc-400 dark:text-zinc-500 mb-6">
              No answers yet. Be the first to answer.
            </p>
          )}

          <div className="space-y-4 mb-10">
            {question.answers.map((answer) => (
              <AnswerCard
                key={answer.id}
                answer={answer}
                isQuestionOwner={isOwner}
                onAccept={(answerId) => void handleAccept(answerId)}
                onVote={(answerId, v) => void handleVoteAnswer(answerId, v)}
              />
            ))}
          </div>

          {user ? (
            <div className="border-t border-zinc-200 dark:border-zinc-700 pt-6">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                Your Answer
              </h3>
              <form onSubmit={(e) => void handlePostAnswer(e)}>
                <textarea
                  value={answerBody}
                  onChange={(e) => setAnswerBody(e.target.value)}
                  rows={8}
                  placeholder="Write your answer here. Markdown is supported."
                  className="w-full border border-zinc-300 dark:border-zinc-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-zinc-600 dark:focus:border-zinc-400 resize-y font-mono bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
                />
                {answerError && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">{answerError}</p>
                )}
                <button
                  type="submit"
                  disabled={submittingAnswer || !answerBody.trim()}
                  className="mt-3 bg-zinc-900 text-white text-sm px-4 py-2 rounded-md hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 disabled:opacity-50 transition-colors"
                >
                  {submittingAnswer ? 'Posting...' : 'Post your answer'}
                </button>
              </form>
            </div>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 border-t border-zinc-200 dark:border-zinc-700 pt-6">
              <Link to="/signin" className="text-blue-600 hover:underline dark:text-blue-400">
                Sign in
              </Link>{' '}
              to post an answer.
            </p>
          )}
        </section>
      </main>
    </div>
  );
};

export default QuestionDetail;
