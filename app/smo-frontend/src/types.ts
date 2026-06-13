export interface User {
  id: string;
  email: string;
  username: string;
}

export interface Tag {
  name: string;
}

export interface QuestionTag {
  tag: Tag;
}

export interface Comment {
  id: string;
  body: string;
  target_id: string;
  target_type: 'question' | 'answer';
  created_at: string;
  author: { username: string } | null;
}

export interface Answer {
  id: string;
  body: string;
  question_id: string;
  author_id: string;
  vote_count: number;
  is_accepted: boolean;
  created_at: string;
  author: { id: string; username: string } | null;
  comments: Comment[];
  quality_badge: 'helpful' | 'needs-detail' | 'off-topic' | null;
}

export interface Question {
  id: string;
  title: string;
  description: string;
  author_id: string;
  is_solved: boolean;
  vote_count: number;
  created_at: string;
  author: { id: string; username: string } | null;
  question_tags: QuestionTag[];
  answers: Answer[];
  comments: Comment[];
}

export interface QuestionSummary {
  id: string;
  title: string;
  is_solved: boolean;
  vote_count: number;
  created_at: string;
  author: { id: string; username: string } | null;
  question_tags: QuestionTag[];
  answer_count: number;
}

export interface AiHealthResponse {
  ok: boolean;
  rateLimited: boolean;
  retryAfter?: number;
  provider: string;
  model: string;
}

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  ready: boolean;
  login: (token: string, user: User, refreshToken?: string) => void;
  logout: () => void;
}

export interface ThemeContextValue {
  dark: boolean;
  toggle: () => void;
}
