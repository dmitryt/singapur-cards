const KNOWN_TAGS: Record<string, [string, string]> = {
  b: ["<strong>", "</strong>"],
  i: ["<em>", "</em>"],
  u: ["<u>", "</u>"],
  trn: ["", ""],
  ex: ['<em class="dsl-example">', "</em>"],
  com: ['<span class="dsl-comment">', "</span>"],
  p: ['<span class="dsl-label">', "</span>"],
  "*": ['<span class="dsl-star">', "</span>"],
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function dslToHtml(input: string): string {
  let s = escapeHtml(input);

  // [mN] margin indentation
  s = s.replace(/\[m(\d+)\]/gi, (_, n) => `<span style="margin-left:${n}em">`);
  s = s.replace(/\[\/m\]/gi, "</span>");

  // [c COLOR] and bare [c]
  s = s.replace(/\[c\s+(\w+)\]/gi, (_, color) => `<span style="color:${color}">`);
  s = s.replace(/\[c\]/gi, '<span class="dsl-color">');
  s = s.replace(/\[\/c\]/gi, "</span>");

  // Known simple tags
  for (const [tag, [open, close]] of Object.entries(KNOWN_TAGS)) {
    const t = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    s = s.replace(new RegExp(`\\[${t}\\]`, "gi"), open);
    s = s.replace(new RegExp(`\\[\\/${t}\\]`, "gi"), close);
  }

  // Strip remaining unknown tags, keep their content
  s = s.replace(/\[[^\]]*\]/g, "");

  s = s.replace(/\n/g, "<br />");

  return s;
}
