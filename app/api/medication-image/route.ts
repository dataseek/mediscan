import { NextResponse } from "next/server";

export const runtime = "edge";

type MediaWikiQueryResponse = {
  query?: {
    pages?: Record<
      string,
      {
        pageid?: number;
        title?: string;
        thumbnail?: { source?: string; width?: number; height?: number };
      }
    >;
  };
};

async function fetchWikipediaThumbnail(wiki: "es" | "en", title: string) {
  const api = new URL(`https://${wiki}.wikipedia.org/w/api.php`);
  api.searchParams.set("action", "query");
  api.searchParams.set("format", "json");
  api.searchParams.set("formatversion", "2");
  api.searchParams.set("redirects", "1");
  api.searchParams.set("origin", "*");
  api.searchParams.set("prop", "pageimages");
  api.searchParams.set("piprop", "thumbnail");
  api.searchParams.set("pithumbsize", "720");
  api.searchParams.set("titles", title);

  const response = await fetch(api.toString(), {
    headers: { "User-Agent": "MediScan/1.0 (medication-image; +https://example.invalid)" }
  });

  if (!response.ok) return null;
  const data = (await response.json()) as MediaWikiQueryResponse;
  const pages = data.query?.pages ? Object.values(data.query.pages) : [];
  const page = pages.find((candidate) => candidate?.pageid && candidate?.thumbnail?.source);

  if (!page?.pageid || !page.thumbnail?.source) return null;

  return {
    wiki,
    pageId: page.pageid,
    title: page.title ?? title,
    imageUrl: page.thumbnail.source,
    pageUrl: `https://${wiki}.wikipedia.org/?curid=${page.pageid}`
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const name = (url.searchParams.get("name") ?? "").trim();

  if (!name) {
    return NextResponse.json({ error: "Missing name" }, { status: 400 });
  }

  try {
    const normalized = name.replace(/\s+/g, " ").slice(0, 120);
    const result = (await fetchWikipediaThumbnail("es", normalized)) ?? (await fetchWikipediaThumbnail("en", normalized));

    if (!result) {
      return NextResponse.json({ imageUrl: null, pageUrl: null, source: null });
    }

    return NextResponse.json({
      imageUrl: result.imageUrl,
      pageUrl: result.pageUrl,
      source: result.wiki === "es" ? "Wikipedia (ES)" : "Wikipedia (EN)"
    });
  } catch {
    return NextResponse.json({ imageUrl: null, pageUrl: null, source: null }, { status: 200 });
  }
}

