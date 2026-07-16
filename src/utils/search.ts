/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Article } from "../types";

/**
 * Clean and tokenize a query string.
 */
export function tokenize(str: string): string[] {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .split(/[\s\-_\/,\.]+/)
    .filter((token) => token.length > 0);
}

/**
 * Computes a simple matching score for an article against a set of search tokens.
 * A higher score means a better match.
 * Returns 0 if there is no match or if the search tokens are empty.
 */
export function scoreArticle(article: Article, tokens: readonly string[]): number {
  if (tokens.length === 0) return 0;

  const titleTokens = article.title ? tokenize(article.title) : [];
  const authorTokens = article.author ? tokenize(article.author) : [];
  const summaryTokens = article.summary ? tokenize(article.summary) : [];
  const categoryTokens = article.category ? tokenize(article.category) : [];
  const tagsTokens = Array.isArray(article.tags) ? article.tags.flatMap((t) => t ? tokenize(t) : []) : [];

  let score = 0;
  let matchesAll = true;

  for (const token of tokens) {
    let tokenScore = 0;

    // Exact or partial matches on title (highest weight)
    for (const titleToken of titleTokens) {
      if (titleToken === token) {
        tokenScore += 10;
      } else if (titleToken.includes(token)) {
        tokenScore += 4;
      }
    }

    // Exact or partial matches on category
    for (const catToken of categoryTokens) {
      if (catToken === token) {
        tokenScore += 8;
      } else if (catToken.includes(token)) {
        tokenScore += 3;
      }
    }

    // Exact or partial matches on tags
    for (const tagToken of tagsTokens) {
      if (tagToken === token) {
        tokenScore += 6;
      } else if (tagToken.includes(token)) {
        tokenScore += 2;
      }
    }

    // Exact or partial matches on author
    for (const authorToken of authorTokens) {
      if (authorToken === token) {
        tokenScore += 5;
      } else if (authorToken.includes(token)) {
        tokenScore += 2;
      }
    }

    // Exact or partial matches on summary
    for (const sumToken of summaryTokens) {
      if (sumToken === token) {
        tokenScore += 2;
      } else if (sumToken.includes(token)) {
        tokenScore += 0.5;
      }
    }

    if (tokenScore === 0) {
      matchesAll = false;
    } else {
      score += tokenScore;
    }
  }

  // If we match all search tokens, we give a significant bonus
  if (matchesAll && tokens.length > 1) {
    score += 15;
  }

  return score;
}

/**
 * Filter and sort a list of articles based on search query and categories.
 * Built for performance with larger dataset support.
 */
export function searchAndFilterArticles(
  articles: readonly Article[],
  query: string,
  selectedCategory: string
): Article[] {
  const normalizedQuery = query.toLowerCase().trim();

  // Handle special filters directly
  const isSavedQuery = normalizedQuery === "saved";
  const isDownloadedQuery = normalizedQuery === "downloaded";

  const tokens = (isSavedQuery || isDownloadedQuery) ? [] : tokenize(normalizedQuery);

  return articles
    .filter((art) => {
      // 1. Category Filter
      if (selectedCategory !== "All" && art.category !== selectedCategory) {
        return false;
      }

      // 2. Special Queries
      if (isSavedQuery) return art.isSaved;
      if (isDownloadedQuery) return art.isDownloaded;

      // 3. No search query -> pass all items
      if (tokens.length === 0) return true;

      // 4. Compute matching score. Must match at least some tokens
      return scoreArticle(art, tokens) > 0;
    })
    .sort((a, b) => {
      if (tokens.length === 0) {
        // Default sort: newest first
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      // Search result sort: highest match score first, with date as tie-breaker
      const scoreA = scoreArticle(a, tokens);
      const scoreB = scoreArticle(b, tokens);
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}
