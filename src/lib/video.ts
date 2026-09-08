export type ParsedVideo = {
  url: string;
  kind: "youtube" | "twitch" | "tiktok" | "other";
  ytId: string | null;
  thumb: string | null;
  host: string;
};

export function parseVideo(url: string): ParsedVideo {
  let u: URL | null = null;
  try {
    u = new URL(url);
  } catch {
    return { url, kind: "other", ytId: null, thumb: null, host: "link" };
  }
  const h = u.hostname.replace(/^www\./, "");

  // YouTube — youtu.be/ID, watch?v=ID, /live/ID, /embed/ID, /shorts/ID
  if (h === "youtu.be" || h.endsWith("youtube.com")) {
    let id: string | null = null;
    if (h === "youtu.be") id = u.pathname.slice(1).split("/")[0] || null;
    else if (u.searchParams.get("v")) id = u.searchParams.get("v");
    else {
      const m = u.pathname.match(/\/(embed|live|shorts)\/([\w-]{6,})/);
      id = m?.[2] ?? null;
    }
    return {
      url,
      kind: "youtube",
      ytId: id,
      thumb: id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null,
      host: "YouTube",
    };
  }

  if (h.endsWith("twitch.tv")) {
    return { url, kind: "twitch", ytId: null, thumb: null, host: "Twitch" };
  }
  if (h.endsWith("tiktok.com")) {
    return { url, kind: "tiktok", ytId: null, thumb: null, host: "TikTok" };
  }
  return { url, kind: "other", ytId: null, thumb: null, host: h };
}
