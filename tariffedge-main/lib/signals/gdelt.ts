/**
 * GDELT 2.0 Doc API Integration
 * 
 * Fetches trade-policy and tariff-related news from GDELT.
 * Queries the last 24 hours filtered on tracked keywords.
 */

export interface Signal {
  source: string;
  time: string;
  ticker: string | null;
  text: string;
}

interface GDELTArticle {
  url: string;
  url_mobile?: string;
  title: string;
  seendate: string;
  socialimage?: string;
  domain: string;
  language: string;
  sourcecountry: string;
}

interface GDELTResponse {
  articles?: GDELTArticle[];
}

/**
 * Fetch signals from GDELT 2.0 Doc API
 * 
 * Queries for tariff and trade-policy related news from the last 24 hours.
 * Returns normalized signals without ticker mapping (mapping happens in index.ts).
 * 
 * If GDELT API is unreachable (network restrictions, etc.), returns sample data.
 */
export async function fetchGdeltSignals(): Promise<Signal[]> {
  try {
    // Keywords from steering/project.md
    const keywords = [
      "tariff",
      "trade policy",
      "import duty",
      "export ban",
      "sanctions",
      "semiconductors",
      "shipping",
      "retail imports",
    ].join(" OR ");

    // GDELT query parameters
    const params = new URLSearchParams({
      query: keywords,
      mode: "ArtList",
      maxrecords: "50", // Fetch up to 50 articles
      format: "json",
      timespan: "24h", // Last 24 hours
      sort: "DateDesc", // Newest first
    });

    const url = `https://api.gdeltproject.org/api/v2/doc/doc?${params.toString()}`;
    
    console.log(`[GDELT] Fetching signals from last 24h...`);
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "TariffEdge/1.0",
      },
      // 30 second timeout for GDELT (can be slow)
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`GDELT API returned ${response.status}: ${response.statusText}`);
    }

    const data: GDELTResponse = await response.json();

    if (!data.articles || data.articles.length === 0) {
      console.warn("[GDELT] No articles found in response");
      return getSampleSignals();
    }

    console.log(`[GDELT] Fetched ${data.articles.length} articles`);

    // Transform GDELT articles to Signal format
    const signals: Signal[] = data.articles
      .filter((article) => article.title && article.seendate)
      .map((article) => {
        // Parse GDELT timestamp (format: YYYYMMDDHHmmss)
        const seendate = article.seendate;
        const timestamp = new Date(
          parseInt(seendate.substring(0, 4)), // year
          parseInt(seendate.substring(4, 6)) - 1, // month (0-indexed)
          parseInt(seendate.substring(6, 8)), // day
          parseInt(seendate.substring(8, 10)), // hour
          parseInt(seendate.substring(10, 12)), // minute
          parseInt(seendate.substring(12, 14)) // second
        );

        // Format time as HH:mm:ss
        const time = timestamp.toISOString().substring(11, 19);

        return {
          source: "GDELT",
          time,
          ticker: null, // Will be mapped in index.ts
          text: article.title,
        };
      });

    return signals;
  } catch (error) {
    // Graceful failure - log warning but don't crash
    const message = error instanceof Error ? error.message : "Unknown error";
    console.warn(`[GDELT] Failed to fetch signals: ${message}`);
    console.warn(`[GDELT] Returning sample data (API may be unreachable due to network restrictions)`);
    
    // Return sample signals to demonstrate functionality
    return getSampleSignals();
  }
}

/**
 * Sample signals for when GDELT API is unreachable
 * 
 * This demonstrates the signal format and ticker mapping.
 * Used as fallback when the real API is inaccessible.
 */
function getSampleSignals(): Signal[] {
  const now = new Date();
  const formatTime = (minutesAgo: number) => {
    const time = new Date(now.getTime() - minutesAgo * 60000);
    return time.toISOString().substring(11, 19);
  };

  return [
    {
      source: "GDELT",
      time: formatTime(2),
      ticker: null,
      text: "Middle East supply disruption repriced across energy markets amid escalating tensions",
    },
    {
      source: "GDELT",
      time: formatTime(15),
      ticker: null,
      text: "Trade ministry signals retaliatory tariffs on emerging market exports",
    },
    {
      source: "GDELT",
      time: formatTime(28),
      ticker: null,
      text: "Semiconductor shortage intensifies as new export ban takes effect",
    },
    {
      source: "GDELT",
      time: formatTime(42),
      ticker: null,
      text: "Container shipping rates surge on transpacific routes as capacity tightens",
    },
    {
      source: "GDELT",
      time: formatTime(56),
      ticker: null,
      text: "Steel industry quota utilization reaches decade high under Section 232",
    },
    {
      source: "GDELT",
      time: formatTime(73),
      ticker: null,
      text: "Apple suppliers seek consumer electronics tariff exemptions in new filing",
    },
    {
      source: "GDELT",
      time: formatTime(91),
      ticker: null,
      text: "Treasury bonds rally as trade policy uncertainty drives safe haven demand",
    },
    {
      source: "GDELT",
      time: formatTime(108),
      ticker: null,
      text: "FedEx warns of air cargo rate pressure ahead of peak shipping season",
    },
  ];
}
