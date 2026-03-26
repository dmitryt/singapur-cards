import { describe, it, expect } from "vitest";
import { dslToHtml } from "../lib/dslToHtml";

describe("dslToHtml", () => {
  it("converts bold", () => {
    expect(dslToHtml("[b]word[/b]")).toBe("<strong>word</strong>");
  });

  it("converts italic", () => {
    expect(dslToHtml("[i]word[/i]")).toBe("<em>word</em>");
  });

  it("converts underline", () => {
    expect(dslToHtml("[u]word[/u]")).toBe("<u>word</u>");
  });

  it("strips [trn] but keeps content", () => {
    expect(dslToHtml("[trn]translation[/trn]")).toBe("translation");
  });

  it("converts [ex] to em.dsl-example", () => {
    expect(dslToHtml("[ex]example sentence[/ex]")).toBe(
      '<em class="dsl-example">example sentence</em>'
    );
  });

  it("converts [com] to span.dsl-comment", () => {
    expect(dslToHtml("[com]note[/com]")).toBe(
      '<span class="dsl-comment">note</span>'
    );
  });

  it("strips [*] hidden content markers but keeps content", () => {
    expect(dslToHtml("[*]hidden[/*]")).toBe("hidden");
  });

  it("converts [mN] margin", () => {
    expect(dslToHtml("[m2]indented[/m]")).toBe(
      '<span style="margin-left:2em">indented</span>'
    );
  });

  it("converts [c COLOR] to inline color", () => {
    expect(dslToHtml("[c green]text[/c]")).toBe(
      '<span style="color:green">text</span>'
    );
  });

  it("converts bare [c] to dsl-color span", () => {
    expect(dslToHtml("[c]text[/c]")).toBe(
      '<span class="dsl-color">text</span>'
    );
  });

  it("strips unknown tags, keeps content", () => {
    expect(dslToHtml("[!trs]Solariums[/!trs]")).toBe("Solariums");
  });

  it("escapes HTML special characters", () => {
    expect(dslToHtml("a & b < c > d")).toBe(
      "a &amp; b &lt; c &gt; d"
    );
  });

  it("converts newlines to <br />", () => {
    expect(dslToHtml("line1\nline2")).toBe("line1<br />line2");
  });

  it("handles the ugly real-world example", () => {
    const input =
      "[b][c][com][!trs]Solariums, Solarien[/!trs][/com][/c][/b] solarium";
    const result = dslToHtml(input);
    expect(result).toContain("Solariums, Solarien");
    expect(result).not.toContain("[");
    expect(result).not.toContain("]");
  });

  it("handles nested tags", () => {
    expect(dslToHtml("[b][i]bold italic[/i][/b]")).toBe(
      "<strong><em>bold italic</em></strong>"
    );
  });

  it("is case-insensitive for tags", () => {
    expect(dslToHtml("[B]word[/B]")).toBe("<strong>word</strong>");
  });
});
