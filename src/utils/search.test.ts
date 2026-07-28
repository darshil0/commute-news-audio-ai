import { test, describe } from "node:test";
import assert from "node:assert";
import { tokenize, scoreArticle, searchAndFilterArticles } from "./search";
import { Article } from "../types";

// Helper function to easily construct mock articles for testing
function makeMockArticle(overrides: Partial<Article>): Article {
  return {
    id: overrides.id || "id-" + Math.random().toString(36).slice(2, 9),
    title: overrides.title ?? "Mock Title",
    author: overrides.author,
    summary: overrides.summary ?? "Mock Summary",
    originalText: overrides.originalText,
    url: overrides.url,
    category: overrides.category ?? "Technology",
    tags: overrides.tags ?? ["mock", "test"],
    voiceName: overrides.voiceName ?? "Kore",
    duration: overrides.duration,
    audioUrl: overrides.audioUrl,
    isDownloaded: overrides.isDownloaded ?? false,
    isSaved: overrides.isSaved ?? false,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    playCount: overrides.playCount ?? 0,
  };
}

describe("Search Utility Suite", () => {

  describe("tokenize()", () => {
    test("tokenizes standard lowercase words and handles punctuation", () => {
      const result = tokenize("Hello, World! This is a test.");
      assert.deepStrictEqual(result, ["hello", "world", "this", "is", "a", "test"]);
    });

    test("normalizes accented characters correctly", () => {
      const result = tokenize("Café résumé coöperation");
      assert.deepStrictEqual(result, ["cafe", "resume", "cooperation"]);
    });

    test("handles hyphens, underscores, dots, and slashes as separators", () => {
      const result = tokenize("self-driving_cars/electric.vehicles");
      assert.deepStrictEqual(result, ["self", "driving", "cars", "electric", "vehicles"]);
    });

    test("handles empty inputs, null, and undefined gracefully", () => {
      assert.deepStrictEqual(tokenize(null), []);
      assert.deepStrictEqual(tokenize(undefined), []);
      assert.deepStrictEqual(tokenize(""), []);
      assert.deepStrictEqual(tokenize("   "), []);
    });
  });

  describe("scoreArticle()", () => {
    test("returns 0 for empty or invalid parameters", () => {
      assert.strictEqual(scoreArticle(null, ["test"]), 0);
      assert.strictEqual(scoreArticle(undefined, ["test"]), 0);
      assert.strictEqual(scoreArticle(makeMockArticle({}), []), 0);
      assert.strictEqual(scoreArticle(makeMockArticle({}), null as any), 0);
    });

    test("weights matches in title highly", () => {
      const article = makeMockArticle({ title: "Vaporware Release", summary: "unrelated content" });
      const exactScore = scoreArticle(article, ["vaporware"]);
      const partialScore = scoreArticle(article, ["vapor"]);

      assert.ok(exactScore > partialScore, "Exact match score should be higher than partial match score");
      assert.ok(exactScore >= 10, "Exact title match weight should be high (at least 10)");
    });

    test("calculates category and tag match weightings correctly", () => {
      const article = makeMockArticle({ category: "Business", tags: ["growth", "funding"] });
      const categoryScore = scoreArticle(article, ["business"]);
      const tagScore = scoreArticle(article, ["growth"]);
      const otherScore = scoreArticle(article, ["funding"]);

      assert.ok(categoryScore > 0, "Category score should be positive");
      assert.ok(tagScore > 0, "Tag score should be positive");
      assert.ok(otherScore > 0, "Other tag score should be positive");
    });

    test("calculates author match weighting correctly", () => {
      const article = makeMockArticle({ author: "Jane Doe" });
      const authorScore = scoreArticle(article, ["jane"]);
      assert.ok(authorScore > 0, "Author score should be positive");
    });

    test("weights matches in summary less than titles or categories", () => {
      const titleMatchArticle = makeMockArticle({ title: "Quantum Computing", summary: "nothing special" });
      const summaryMatchArticle = makeMockArticle({ title: "Nothing Special", summary: "Quantum computing is near" });

      const titleScore = scoreArticle(titleMatchArticle, ["quantum"]);
      const summaryScore = scoreArticle(summaryMatchArticle, ["quantum"]);

      assert.ok(titleScore > summaryScore, "Title matches must score significantly higher than summary matches");
    });

    test("applies significant bonus (+15) when all query tokens are matched", () => {
      const article = makeMockArticle({ title: "EV Battery Breakthrough", category: "Science" });
      // Match both tokens: "ev" and "battery"
      const scoreBoth = scoreArticle(article, ["ev", "battery"]);
      // Match only one: "ev"
      const scoreOne = scoreArticle(article, ["ev"]);

      // scoreBoth should be: title_exact("ev") + title_exact("battery") + matchesAll_bonus
      // scoreOne should be: title_exact("ev")
      // matchesAll_bonus is 15, plus title_exact("battery") is 10.
      assert.ok(scoreBoth > (scoreOne + 10), "Match-all multi-token bonus should be applied");
    });
  });

  describe("searchAndFilterArticles()", () => {
    const artTech = makeMockArticle({
      id: "art-1",
      title: "EV Battery",
      category: "Technology",
      tags: ["car", "green"],
      createdAt: "2026-01-01T12:00:00.000Z",
    });
    const artScience = makeMockArticle({
      id: "art-2",
      title: "Quantum Leap",
      category: "Science",
      isSaved: true,
      createdAt: "2026-01-02T12:00:00.000Z",
    });
    const artBusiness = makeMockArticle({
      id: "art-3",
      title: "Battery Startups",
      category: "Business",
      isDownloaded: true,
      createdAt: "2026-01-03T12:00:00.000Z",
    });

    const articles = [artTech, artScience, artBusiness];

    test("returns empty list if articles input is null or undefined", () => {
      assert.deepStrictEqual(searchAndFilterArticles(null, "", "All"), []);
      assert.deepStrictEqual(searchAndFilterArticles(undefined, "", "All"), []);
    });

    test("filters by category correctly", () => {
      const result = searchAndFilterArticles(articles, "", "Science");
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].id, "art-2");
    });

    test("filters special categories (Saved, Downloaded) correctly", () => {
      const savedResult = searchAndFilterArticles(articles, "", "Saved");
      assert.strictEqual(savedResult.length, 1);
      assert.strictEqual(savedResult[0].id, "art-2");

      const downloadedResult = searchAndFilterArticles(articles, "", "Downloaded");
      assert.strictEqual(downloadedResult.length, 1);
      assert.strictEqual(downloadedResult[0].id, "art-3");
    });

    test("filters by special query values 'saved' or 'downloaded'", () => {
      const savedQueryResult = searchAndFilterArticles(articles, "saved", "All");
      assert.strictEqual(savedQueryResult.length, 1);
      assert.strictEqual(savedQueryResult[0].id, "art-2");

      const downloadedQueryResult = searchAndFilterArticles(articles, "downloaded", "All");
      assert.strictEqual(downloadedQueryResult.length, 1);
      assert.strictEqual(downloadedQueryResult[0].id, "art-3");
    });

    test("filters and scores queries properly, sorting by highest relevance score", () => {
      // "Battery" matches "EV Batteries" (title) and "Battery Startups" (title)
      const result = searchAndFilterArticles(articles, "Battery", "All");
      assert.strictEqual(result.length, 2);
      // Let's make sure both are in the result.
      const ids = result.map(r => r.id);
      assert.ok(ids.includes("art-1"));
      assert.ok(ids.includes("art-3"));
    });

    test("sorts items with identical search score by creation date descending", () => {
      // When query is empty, all match score is 0. Sorting is done purely by createdAt date descending.
      const result = searchAndFilterArticles(articles, "", "All");
      assert.strictEqual(result.length, 3);
      assert.strictEqual(result[0].id, "art-3"); // 2026-01-03
      assert.strictEqual(result[1].id, "art-2"); // 2026-01-02
      assert.strictEqual(result[2].id, "art-1"); // 2026-01-01
    });

    test("excludes articles with 0 match score when search query is non-empty", () => {
      const result = searchAndFilterArticles(articles, "Unobtainium", "All");
      assert.strictEqual(result.length, 0);
    });
  });
});
