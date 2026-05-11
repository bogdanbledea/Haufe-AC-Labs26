# Homework — Lab 4: Ask a Question Form

This homework builds on what you did in **Lab 4 — Frontend Basics**. You built the Home page and the Question Detail page, both showing mocked data. Now you are going to add the form that lets users ask a new question.

There is no backend yet. The form should validate and catch errors — but clicking "Post your question" does nothing for now. That connection happens in Lab 5.

---

## Context

Your `smo-frontend` project already has this structure:

```
smo-frontend/
  src/
    App.tsx               ← routing lives here, including the /questions/new route
    types.ts              ← TypeScript interfaces for your data
    hooks/
      useAuth.tsx         ← mock auth hook (returns a hardcoded user for now)
    lib/
      utils.ts            ← formatDate helper
    components/
      Navbar.tsx
      QuestionCard.tsx
      TagPill.tsx         ← you'll need this
    pages/
      Home.tsx
      QuestionDetail.tsx
      SignIn.tsx
      SignUp.tsx
```

The route `/questions/new` is already wired up in `App.tsx` inside a `ProtectedRoute`. Because your `useAuth` hook returns a hardcoded user, the protected route will let you through even though real auth isn't set up yet.

---

## What to build

Create `src/pages/AskQuestion.tsx`. This page lives at `/questions/new`.

The form has three fields:

**Title** — a single-line text input. This is required.

**Description** — a multi-line textarea. This is required and must be at least 20 characters long. Encourage users to be detailed: the placeholder text should hint that markdown is supported and they should describe what they've already tried.

**Tags** — this one has two parts. There's a text input where the user types a tag name, and when they press Enter or comma, the tag is added to a list and the input clears. Tags are shown as removable `TagPill` components. You already have `TagPill` built — look at how it's used in `QuestionDetail.tsx` to understand its props. Tags are optional.

A good detail: normalize tags as you add them — trim whitespace, lowercase, replace spaces with hyphens. So "React Hooks" becomes "react-hooks".

---

## Validation

Validation should run when the user tries to submit, not on every keystroke. If something is wrong, show a short error message inline, directly below the field that has the problem. If the user fixes everything and submits again, the errors go away.

Keep it simple: a title that isn't empty, and a description with at least 20 characters. No submission happens yet — when the form is valid, just `console.log` the values so you can confirm it works.

---

## Data types

Here are the TypeScript types your question-related data uses. Keep these in `types.ts` — you'll build on them in future labs.

```ts
export interface Tag {
  name: string;
}

export interface QuestionTag {
  tag: Tag;
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

export interface Answer {
  id: string;
  body: string;
  question_id: string;
  author_id: string;
  vote_count: number;
  is_accepted: boolean;
  is_ai_generated: boolean;
  created_at: string;
  author: { id: string; username: string } | null;
  comments: Comment[];
}

export interface Question {
  id: string;
  title: string;
  description: string;
  author_id: string;
  is_solved: boolean;
  allow_ai_companion: boolean;
  vote_count: number;
  created_at: string;
  author: { id: string; username: string } | null;
  question_tags: QuestionTag[];
  answers: Answer[];
  comments: Comment[];
}
```

---

## A note on styling

Look at how `Home.tsx` and `QuestionDetail.tsx` are styled — your new page should feel consistent with them. Same background, same max-width container, same label and input styling. Don't invent a new visual language; match what's there.

---

## Acceptance Criteria

- Navigating to `/questions/new` shows the Ask a Question form
- Clicking submit with an empty title shows an error message below the title field
- Clicking submit with a description shorter than 20 characters shows an error message below the description field
- Clicking submit when both fields are valid logs `{ title, description, tags }` to the console — no error messages shown
- Pressing Enter or comma in the tag input adds the tag as a removable pill
- Tags are normalized (trimmed, lowercased, spaces to hyphens) before being added
- Clicking the × on a tag pill removes it
- Adding the same tag twice has no effect (no duplicates)

---

## Up next — Lab 5: Connect to a Real Backend

In Lab 5 the mock data disappears. You'll build an Express API with real routes, and the frontend will talk to it over HTTP. By the end of the lab, questions you post through the form will be saved on a running server and everyone in the room will be able to see them. The form you built in this homework will finally do something when you click submit.
