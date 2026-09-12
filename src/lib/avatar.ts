// Generates a deterministic initials avatar (data URI) so users never need a
// photo to look present in chat and voice huddles. No external image services.
const AVATAR_PALETTE = ["#6366f1", "#10b981", "#0ea5e9", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"];

export function initialsAvatar(name: string, size = 96): string {
  const clean = (name || "?").trim() || "?";
  const initials = clean
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";
  const hash = [...clean].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const bg = AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>` +
    `<rect width='100%' height='100%' fill='${bg}'/>` +
    `<text x='50%' y='54%' dominant-baseline='middle' text-anchor='middle' ` +
    `font-family='-apple-system,Segoe UI,Roboto,sans-serif' font-size='${Math.round(size * 0.38)}' ` +
    `font-weight='600' fill='#ffffff'>${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}