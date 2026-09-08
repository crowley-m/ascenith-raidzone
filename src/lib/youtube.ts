// NOT POTATOZIE — https://www.youtube.com/@Potatozie
const HANDLE = "Potatozie";
const CHANNEL_ID = "UCOfwgW9Al8fc5Hk6nQ30P_g";

export type YtVideo = { id: string; title: string };

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36";

const ENTS: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
};
function decode(s: string) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&(amp|lt|gt|quot|#39|apos);/g, (m) => ENTS[m] ?? m);
}

function parseChannelPage(html: string, count: number): YtVideo[] {
  const key = "ytInitialData = ";
  const start = html.indexOf(key);
  if (start < 0) return [];
  const from = start + key.length;
  const end = html.indexOf(";</script>", from);
  if (end < 0) return [];
  let data: any;
  try {
    data = JSON.parse(html.slice(from, end));
  } catch {
    return [];
  }
  const out: YtVideo[] = [];
  const seen = new Set<string>();
  const walk = (node: any) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const x of node) walk(x);
      return;
    }
    const lv = node.lockupViewModel;
    if (lv) {
      const id: string | undefined = lv.contentId;
      const title: string | undefined =
        lv.metadata?.lockupMetadataViewModel?.title?.content;
      if (id && title && id.length === 11 && !seen.has(id)) {
        seen.add(id);
        out.push({ id, title: decode(title.trim()) });
      }
    }
    for (const k in node) walk(node[k]);
  };
  walk(data);
  return out.slice(0, count);
}

function parseRss(xml: string, count: number): YtVideo[] {
  const entries = xml.split("<entry>").slice(1, count + 1);
  const out: YtVideo[] = [];
  for (const e of entries) {
    const id = e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
    const title =
      e.match(/<media:title>([\s\S]*?)<\/media:title>/)?.[1] ??
      e.match(/<title>([\s\S]*?)<\/title>/)?.[1];
    if (id && title) out.push({ id, title: decode(title.trim()) });
  }
  return out;
}

/** Recent uploads from the channel. Tries the channel page, then RSS. [] on failure. */
export async function latestVideos(count = 10): Promise<YtVideo[]> {
  const headers = {
    "user-agent": UA,
    "accept-language": "en-US,en;q=0.9",
    cookie: "SOCS=CAI; CONSENT=YES+; PREF=hl=en&tz=UTC",
  };
  try {
    const res = await fetch(`https://www.youtube.com/@${HANDLE}/videos`, {
      headers,
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const vids = parseChannelPage(await res.text(), count);
      if (vids.length) return vids;
    }
  } catch {
    /* fall through */
  }
  try {
    const res = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`,
      { headers, next: { revalidate: 3600 } },
    );
    if (res.ok) return parseRss(await res.text(), count);
  } catch {
    /* fall through */
  }
  return [];
}
