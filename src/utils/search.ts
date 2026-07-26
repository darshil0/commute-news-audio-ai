/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Article } from "../types";

/**
 * Clean and tokenize a query string.
 */
export function tokenize(str?: string | null): string[] {
  if (!str || typeof str !== "string") return [];
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
export function scoreArticle(article: Article | null | undefined, tokens: readonly string[]): number {
  if (!article || !tokens || tokens.length === 0) return 0;

  const titleTokens = tokenize(article.title || "");
  const authorTokens = article.author ? tokenize(article.author) : [];
  const summaryTokens = tokenize(article.summary || "");
  const categoryTokens = tokenize(article.category || "");
  const tagsTokens = Array.isArray(article.tags) ? article.tags.flatMap(tokenize) : [];

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
  articles: readonly Article[] | null | undefined,
  query: string,
  selectedCategory: string
): Article[] {
  if (!articles || !Array.isArray(articles)) return [];
  const normalizedQuery = (query || "").toLowerCase().trim();

  // Handle special filters directly
  const isSavedQuery = normalizedQuery === "saved";
  const isDownloadedQuery = normalizedQuery === "downloaded";

  const tokens = isSavedQuery || isDownloadedQuery ? [] : tokenize(normalizedQuery);

  const scoredArticles = articles
    .filter((art) => {
      // 1. Category Filter
      if (selectedCategory === "Saved") {
        if (!art.isSaved) return false;
      } else if (selectedCategory === "Downloaded") {
        if (!art.isDownloaded) return false;
      } else if (selectedCategory !== "All" && art.category !== selectedCategory) {
        return false;
      }

      // 2. Special Queries
      if (isSavedQuery) return art.isSaved;
      if (isDownloadedQuery) return art.isDownloaded;

      return true;
    })
    .map((art) => ({
      article: art,
      score: tokens.length > 0 ? scoreArticle(art, tokens) : 0,
    }))
    .filter((item) => tokens.length === 0 || item.score > 0);

  scoredArticles.sort((a, b) => {
    if (tokens.length > 0 && a.score !== b.score) {
      return b.score - a.score;
    }
    return new Date(b.article.createdAt).getTime() - new Date(a.article.createdAt).getTime();
  });

  return scoredArticles.map((item) => item.article);
}
