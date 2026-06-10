import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildOrFilter, selectSearchTerms, mapQuestionSummaries } from './search.js';

test('buildOrFilter: single term matches title and description', () => {
  assert.equal(
    buildOrFilter(['react']),
    'title.ilike.%react%,description.ilike.%react%'
  );
});

test('buildOrFilter: multiple terms are joined with commas', () => {
  assert.equal(
    buildOrFilter(['async', 'await']),
    'title.ilike.%async%,description.ilike.%async%,title.ilike.%await%,description.ilike.%await%'
  );
});

test('buildOrFilter: strips PostgREST metacharacters that would break the filter', () => {
  // commas, parens, % and * are removed so a stray keyword can't corrupt .or()
  assert.equal(
    buildOrFilter(['a,b(c)%*d']),
    'title.ilike.%a b c   d%,description.ilike.%a b c   d%'
  );
});

test('buildOrFilter: skips terms that are empty after stripping/trimming', () => {
  assert.equal(
    buildOrFilter(['  ', ',', 'go']),
    'title.ilike.%go%,description.ilike.%go%'
  );
});

test('buildOrFilter: empty / nullish input yields empty string', () => {
  assert.equal(buildOrFilter([]), '');
  assert.equal(buildOrFilter(undefined), '');
});

test('selectSearchTerms: uses AI keywords when present', () => {
  const out = selectSearchTerms('how to async js', { keywords: ['promise', 'event-loop'] });
  assert.deepEqual(out, { terms: ['promise', 'event-loop'], usedFallback: false });
});

test('selectSearchTerms: falls back to raw query when smo-ai is down (null result)', () => {
  const out = selectSearchTerms('  flexbox  ', null);
  assert.deepEqual(out, { terms: ['flexbox'], usedFallback: true });
});

test('selectSearchTerms: falls back when keywords array is empty', () => {
  const out = selectSearchTerms('css grid', { keywords: [] });
  assert.deepEqual(out, { terms: ['css grid'], usedFallback: true });
});

test('selectSearchTerms: ignores non-string / blank keywords, falling back if none remain', () => {
  const out = selectSearchTerms('rust', { keywords: [123, '   ', null] });
  assert.deepEqual(out, { terms: ['rust'], usedFallback: true });
});

test('selectSearchTerms: empty query with no keywords yields no terms', () => {
  const out = selectSearchTerms('   ', null);
  assert.deepEqual(out, { terms: [], usedFallback: true });
});

test('mapQuestionSummaries: flattens answers(count) into answer_count and drops answers', () => {
  const rows = [
    { id: '1', title: 'q1', answers: [{ count: 3 }] },
    { id: '2', title: 'q2', answers: [] },
    { id: '3', title: 'q3' },
  ];
  assert.deepEqual(mapQuestionSummaries(rows), [
    { id: '1', title: 'q1', answer_count: 3, answers: undefined },
    { id: '2', title: 'q2', answer_count: 0, answers: undefined },
    { id: '3', title: 'q3', answer_count: 0, answers: undefined },
  ]);
});

test('mapQuestionSummaries: nullish input yields empty array', () => {
  assert.deepEqual(mapQuestionSummaries(undefined), []);
});
