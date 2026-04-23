import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";

const CONVEX_URL = "https://amiable-moose-236.convex.cloud";
const api = anyApi;

export const convex = new ConvexHttpClient(CONVEX_URL);

// ---------------------------------------------------------------------------
// Types matching the Convex article schema (public-facing subset)
// ---------------------------------------------------------------------------

export interface ArticleSummary {
  id: string;
  slug: string;
  title: string;
  filePath?: string;
  sortOrder?: number;
  parentPath?: string;
  visibility: string;
}

export interface Article extends ArticleSummary {
  content: string;
  frontmatter?: Record<string, unknown>;
  assetMap?: [string, string][];
}

// ---------------------------------------------------------------------------
// Build-time fetchers
// ---------------------------------------------------------------------------

export async function fetchArticlesInFolder(
  folderPath: string,
): Promise<ArticleSummary[]> {
  return convex.query(api.articles.getArticlesInFolder, { folderPath });
}

export async function fetchArticle(slug: string): Promise<Article | null> {
  return convex.query(api.articles.getArticle, { slug });
}

export async function fetchEventTabs(folderPath: string) {
  const summaries = await fetchArticlesInFolder(folderPath);

  const articles = await Promise.all(
    summaries.map((s) => fetchArticle(s.slug)),
  );

  return articles
    .filter((a): a is Article => a !== null)
    .sort((a, b) => {
      const aOrder =
        (a.frontmatter?.tab_order as number) ??
        a.sortOrder ??
        Number.MAX_SAFE_INTEGER;
      const bOrder =
        (b.frontmatter?.tab_order as number) ??
        b.sortOrder ??
        Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder;
    })
    .map((a) => ({
      slug: a.slug,
      label: (a.frontmatter?.tab_label as string) ?? a.title,
      title: a.title,
      content: a.content,
      order: (a.frontmatter?.tab_order as number) ?? a.sortOrder ?? 99,
    }));
}
