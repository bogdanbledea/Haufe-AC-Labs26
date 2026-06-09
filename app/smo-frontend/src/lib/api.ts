import type {
  User,
  Question,
  QuestionSummary,
  Answer,
  Comment,
  AiHealthResponse,
} from '../types';

const BASE = import.meta.env.VITE_API_URL || '/api';

function getToken(): string | null {
  return localStorage.getItem('smo_token');
}

let _onForceLogout: (() => void) | null = null;
let _onTokenRefreshed: ((token: string, refreshToken: string) => void) | null = null;

export function registerAuthCallbacks(
  onForceLogout: () => void,
  onTokenRefreshed: (token: string, refreshToken: string) => void,
) {
  _onForceLogout = onForceLogout;
  _onTokenRefreshed = onTokenRefreshed;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  retried = false,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !retried && path !== '/auth/refresh') {
    const storedRefreshToken = localStorage.getItem('smo_refresh_token');
    if (storedRefreshToken) {
      try {
        const refreshed = await request<{ token: string; refreshToken: string }>(
          'POST',
          '/auth/refresh',
          { refreshToken: storedRefreshToken },
          true,
        );
        localStorage.setItem('smo_token', refreshed.token);
        localStorage.setItem('smo_refresh_token', refreshed.refreshToken);
        _onTokenRefreshed?.(refreshed.token, refreshed.refreshToken);
        return request<T>(method, path, body, true);
      } catch {
        localStorage.removeItem('smo_token');
        localStorage.removeItem('smo_refresh_token');
        localStorage.removeItem('smo_user');
        _onForceLogout?.();
        throw new Error('Session expired. Please sign in again.');
      }
    } else {
      localStorage.removeItem('smo_token');
      localStorage.removeItem('smo_user');
      _onForceLogout?.();
      throw new Error('Session expired. Please sign in again.');
    }
  }

  const data = await res.json().catch((): Record<string, unknown> => ({})) as Record<string, unknown>;
  if (!res.ok) {
    const message = typeof data['error'] === 'string' ? data['error'] : `HTTP ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

const get = <T>(path: string): Promise<T> => request<T>('GET', path);
const post = <T>(path: string, body?: unknown): Promise<T> => request<T>('POST', path, body);
const patch = <T>(path: string, body?: unknown): Promise<T> => request<T>('PATCH', path, body);
const del = <T>(path: string): Promise<T> => request<T>('DELETE', path);

// Auth
export const register = (email: string, password: string, username: string) =>
  post<{ token: string; refreshToken: string; user: User }>('/auth/register', { email, password, username });

export const login = (email: string, password: string) =>
  post<{ token: string; refreshToken: string; user: User }>('/auth/login', { email, password });

// Questions
export const getQuestions = (tag?: string) =>
  get<{ questions: QuestionSummary[] }>(
    tag ? `/questions?tag=${encodeURIComponent(tag)}` : '/questions',
  );

export const getQuestion = (id: string) =>
  get<{ question: Question }>(`/questions/${id}`);

export const createQuestion = (data: {
  title: string;
  description: string;
  tags: string[];
}) => post<{ question: Question }>('/questions', data);

export const deleteQuestion = (id: string) =>
  del<{ ok: boolean }>(`/questions/${id}`);

// Answers
export const createAnswer = (questionId: string, body: string) =>
  post<{ answer: Answer }>(`/questions/${questionId}/answers`, { body });

export const acceptAnswer = (answerId: string) =>
  patch<Record<string, never>>(`/answers/${answerId}/accept`);

// Votes
export const vote = (targetId: string, targetType: 'question' | 'answer', value: 1 | -1) =>
  post<{ vote_count: number }>('/votes', { target_id: targetId, target_type: targetType, value });

// Comments
export const createComment = (
  targetId: string,
  targetType: 'question' | 'answer',
  body: string,
) => post<{ comment: Comment }>('/comments', { target_id: targetId, target_type: targetType, body });

// AI
export const suggestTags = (title: string) =>
  post<{ tags: string[] }>('/ai/tags', { title });

export const aiHealth = () => get<AiHealthResponse>('/ai/health');
