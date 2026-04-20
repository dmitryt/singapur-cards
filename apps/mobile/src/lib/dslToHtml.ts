const KNOWN_TAGS: Record<string, [string, string]> = {
  b: ['<strong>', '</strong>'],
  i: ['<em>', '</em>'],
  u: ['<u>', '</u>'],
  trn: ['', ''],
  ex: ['<em class="dsl-example">', '</em>'],
  com: ['<span class="dsl-comment">', '</span>'],
  p: ['<span class="dsl-label">', '</span>'],
  '*': ['<span class="dsl-star">', '</span>'],
};

export type DslTextSegment = {
  text: string;
  style: {
    fontWeight?: '700';
    fontStyle?: 'italic';
    textDecorationLine?: 'underline';
    color?: string;
  };
};

type DslStyleState = {
  tag: string;
  style: DslTextSegment['style'];
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function dslToHtml(input: string): string {
  let s = escapeHtml(input);

  // [mN] margin indentation
  s = s.replace(/\[m(\d+)\]/gi, (_, n) => `<span style="margin-left:${n}em">`);
  s = s.replace(/\[\/m\]/gi, '</span>');

  // [c COLOR] and bare [c]
  s = s.replace(/\[c\s+(\w+)\]/gi, (_, color) => `<span style="color:${color}">`);
  s = s.replace(/\[c\]/gi, '<span class="dsl-color">');
  s = s.replace(/\[\/c\]/gi, '</span>');

  // Known simple tags
  for (const [tag, [open, close]] of Object.entries(KNOWN_TAGS)) {
    const t = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    s = s.replace(new RegExp(`\\[${t}\\]`, 'gi'), open);
    s = s.replace(new RegExp(`\\[\\/${t}\\]`, 'gi'), close);
  }

  // Strip remaining unknown tags, keep their content
  s = s.replace(/\[[^\]]*\]/g, '');

  s = s.replace(/\n/g, '<br />');

  return s;
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

export function dslToPlainText(input: string): string {
  const html = dslToHtml(input);
  const withLineBreaks = html.replace(/<br\s*\/?>/gi, '\n');
  const withoutTags = withLineBreaks.replace(/<[^>]+>/g, '');
  return decodeHtmlEntities(withoutTags).trim();
}

function styleFromTag(tag: string, rawTag: string): DslTextSegment['style'] {
  if (tag === 'b') return { fontWeight: '700' };
  if (tag === 'i') return { fontStyle: 'italic' };
  if (tag === 'u') return { textDecorationLine: 'underline' };
  if (tag === 'ex') return { fontStyle: 'italic', color: '#999999' };
  if (tag === 'p') return { color: '#008000' };
  if (tag === '*') return { color: '#f2711c' };
  if (tag === 'c') {
    const colorMatch = rawTag.match(/^c\s+([^\]\s]+)$/i);
    if (colorMatch?.[1]) return { color: colorMatch[1] };
    return { color: '#008000' };
  }
  return {};
}

function flattenStyle(stack: DslStyleState[]): DslTextSegment['style'] {
  return stack.reduce<DslTextSegment['style']>((acc, entry) => ({ ...acc, ...entry.style }), {});
}

function sameStyle(a: DslTextSegment['style'], b: DslTextSegment['style']): boolean {
  return (
    a.fontWeight === b.fontWeight &&
    a.fontStyle === b.fontStyle &&
    a.textDecorationLine === b.textDecorationLine &&
    a.color === b.color
  );
}

export function dslToStyledSegments(input: string): DslTextSegment[] {
  const segments: DslTextSegment[] = [];
  const stack: DslStyleState[] = [];
  const tagRegex = /\[\/?[^\]]+\]/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  const pushText = (text: string) => {
    if (!text) return;
    const style = flattenStyle(stack);
    const last = segments[segments.length - 1];
    if (last && sameStyle(last.style, style)) {
      last.text += text;
      return;
    }
    segments.push({ text, style });
  };

  while ((match = tagRegex.exec(input)) !== null) {
    if (match.index > cursor) {
      pushText(input.slice(cursor, match.index));
    }

    const rawTag = match[0].slice(1, -1).trim();
    const lowerRawTag = rawTag.toLowerCase();

    if (lowerRawTag.startsWith('/')) {
      const closingTag = lowerRawTag.slice(1);
      for (let i = stack.length - 1; i >= 0; i -= 1) {
        if (stack[i].tag === closingTag) {
          stack.splice(i, 1);
          break;
        }
      }
    } else {
      let tagName = lowerRawTag;
      if (lowerRawTag.startsWith('c ')) tagName = 'c';
      if (lowerRawTag.startsWith('m')) tagName = 'm';
      if (tagName === 'trn' || tagName === 'm' || tagName.startsWith('!')) {
        // no-op in native renderer
      } else if (['b', 'i', 'u', 'ex', 'com', 'p', '*', 'c'].includes(tagName)) {
        stack.push({ tag: tagName, style: styleFromTag(tagName, lowerRawTag) });
      }
    }

    cursor = tagRegex.lastIndex;
  }

  if (cursor < input.length) {
    pushText(input.slice(cursor));
  }

  return segments;
}
