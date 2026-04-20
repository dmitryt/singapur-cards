import { dslToHtml, dslToPlainText, dslToStyledSegments } from './dslToHtml';

describe('dslToHtml utilities', () => {
  it('converts known DSL tags to html', () => {
    const result = dslToHtml('[b]bold[/b]\n[c red]red[/c]');
    expect(result).toContain('<strong>bold</strong>');
    expect(result).toContain('<span style="color:red">red</span>');
    expect(result).toContain('<br />');
  });

  it('returns plain text output with tags removed', () => {
    const result = dslToPlainText('[i]hello[/i] [u]world[/u]');
    expect(result).toBe('hello world');
  });

  it('builds styled segments for native renderer', () => {
    const segments = dslToStyledSegments('[b]hello[/b] [c green]world[/c]');
    expect(segments.map((segment) => segment.text).join('')).toBe('hello world');
    expect(segments[0]?.style.fontWeight).toBe('700');
    expect(segments[2]?.style.color).toBe('green');
  });
});
