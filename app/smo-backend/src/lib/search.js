// Pure helpers for the smart-search route.
// Kept free of Express/Supabase so they can be unit tested in isolation.

// Build a PostgREST `.or()` filter that matches any term in title OR description.
// Strips characters that have meaning in the filter grammar (commas, parens,
// wildcards) so a stray keyword can't break the query. Returns '' when no term
// produces a usable clause.
export function buildOrFilter(terms) {
  const clauses = [];
  for (const term of terms ?? []) {
    const safe = String(term).replace(/[,()%*]/g, ' ').trim();
    if (!safe) continue;
    clauses.push(`title.ilike.%${safe}%`, `description.ilike.%${safe}%`);
  }
  return clauses.join(',');
}

// Decide which terms to search with: the AI keywords when smo-ai returned any,
// otherwise fall back to the raw query. Returns { terms, usedFallback } so the
// caller can log when it degraded.
export function selectSearchTerms(query, aiResult) {
  const raw = String(query ?? '').trim();
  const keywords = (aiResult?.keywords ?? []).filter(
    (k) => typeof k === 'string' && k.trim()
  );
  if (keywords.length) return { terms: keywords, usedFallback: false };
  return { terms: raw ? [raw] : [], usedFallback: true };
}

// Shape raw question rows into the QuestionSummary form GET /questions returns,
// flattening the answers(count) aggregate into answer_count.
export function mapQuestionSummaries(rows) {
  return (rows ?? []).map((q) => ({
    ...q,
    answer_count: q.answers?.[0]?.count ?? 0,
    answers: undefined,
  }));
}
