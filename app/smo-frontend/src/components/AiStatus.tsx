import { useEffect, useState } from 'react';
import { aiHealth } from '../lib/api';

const PROVIDER_LABELS: Record<string, string> = {
  groq: 'Cloud',
  ollama: 'Self-hosted',
};

interface Status {
  loading: boolean;
  ok: boolean;
  rateLimited: boolean;
  provider: string | null;
  model: string | null;
}

const AiStatus = () => {
  const [status, setStatus] = useState<Status>({
    loading: true,
    ok: false,
    rateLimited: false,
    provider: null,
    model: null,
  });

  const fetchStatus = async () => {
    try {
      const data = await aiHealth();
      setStatus({ loading: false, ok: !!data.ok, rateLimited: !!data.rateLimited, provider: data.provider, model: data.model });
    } catch {
      setStatus({ loading: false, ok: false, rateLimited: false, provider: null, model: null });
    }
  };

  useEffect(() => {
    void fetchStatus();
    const id = setInterval(() => void fetchStatus(), 30_000);
    return () => clearInterval(id);
  }, []);

  if (status.loading) return null;

  const providerLabel = status.provider ? (PROVIDER_LABELS[status.provider] ?? status.provider) : null;

  const dotColor = status.ok
    ? 'bg-green-500'
    : status.rateLimited
      ? 'bg-yellow-500'
      : 'bg-red-500';

  const dotColorSmall = status.ok
    ? 'bg-green-400'
    : status.rateLimited
      ? 'bg-yellow-400'
      : 'bg-red-400';

  return (
    <div className="group relative flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
      <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
      <span className="hidden sm:inline">
        {status.ok ? (
          <>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">{status.model}</span>
            {providerLabel && (
              <span className="ml-1 text-zinc-400 dark:text-zinc-500">· {providerLabel}</span>
            )}
          </>
        ) : status.rateLimited ? (
          <span className="text-yellow-600 dark:text-yellow-400">AI on a forced break</span>
        ) : (
          <span className="text-zinc-400 dark:text-zinc-500">AI unavailable</span>
        )}
      </span>

      <div className="pointer-events-none absolute top-full right-0 mt-2 hidden group-hover:flex flex-col gap-1 bg-zinc-900 dark:bg-zinc-700 text-white text-xs rounded-md px-3 py-2 whitespace-nowrap z-50 shadow-lg">
        <div className="flex items-center gap-1.5">
          <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColorSmall}`} />
          <span>
            {status.ok
              ? 'AI service online'
              : status.rateLimited
                ? 'Groq rate limit reached'
                : 'AI service offline'}
          </span>
        </div>
        {status.rateLimited && (
          <div className="text-yellow-300 max-w-[240px] whitespace-normal leading-relaxed">
            Congrats, someone speed-ran the entire token budget. AI features are on a mandatory timeout. They'll be back.
          </div>
        )}
        {status.ok && (
          <>
            <div className="text-zinc-400 dark:text-zinc-300">
              Model: <span className="text-white">{status.model}</span>
            </div>
            {providerLabel && (
              <div className="text-zinc-400 dark:text-zinc-300">
                Hosting: <span className="text-white">{providerLabel}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AiStatus;
