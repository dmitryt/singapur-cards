import { describe, it, expect } from "vitest";
import { parseModelAnswer } from "../lib/modelAnswerMarkup";

describe("parseModelAnswer", () => {
  it("returns empty array for empty string", () => {
    expect(parseModelAnswer("")).toEqual([{ type: "text", text: "" }]);
  });

  it("returns a single text part for plain text", () => {
    expect(parseModelAnswer("plain")).toEqual([{ type: "text", text: "plain" }]);
  });

  it("wraps *single-asterisk* spans as highlight", () => {
    expect(parseModelAnswer("*hi*")).toEqual([{ type: "highlight", text: "hi" }]);
    expect(parseModelAnswer("a *b* c")).toEqual([
      { type: "text", text: "a " },
      { type: "highlight", text: "b" },
      { type: "text", text: " c" },
    ]);
  });

  it("treats ** as paired delimiters with highlight type (empty inner allowed)", () => {
    expect(parseModelAnswer("**")).toEqual([{ type: "text", text: "" }]);
    expect(parseModelAnswer("**bold**")).toEqual([
      { type: "strong", text: "bold" },
    ]);
  });

  it("parses text between ** pairs in longer strings", () => {
    expect(parseModelAnswer("Intro **The** outro")).toEqual([
      { type: "text", text: "Intro " },
      { type: "strong", text: "The" },
      { type: "text", text: " outro" },
    ]);
    expect(parseModelAnswer("x**y**z")).toEqual([
      { type: "text", text: "x" },
      { type: "strong", text: "y" },
      { type: "text", text: "z" },
    ]);
  });

  it("drops a lone opening * from output and keeps following text", () => {
    expect(parseModelAnswer("no * close")).toEqual([
      { type: "text", text: "no " },
      { type: "text", text: " close" },
    ]);
  });

  it("returns empty array for a single unmatched asterisk", () => {
    expect(parseModelAnswer("*")).toEqual([{ type: "text", text: "" }]);
  });

  it("handles runs of asterisks at start", () => {
    expect(parseModelAnswer("***")).toEqual([{ type: "text", text: "" }]);
    expect(parseModelAnswer("****")).toEqual([{ type: "text", text: "" }]);
  });

  it("preserves newlines inside text and highlight bodies", () => {
    expect(parseModelAnswer("a\n*b\n*c")).toEqual([
      { type: "text", text: "a\n" },
      { type: "highlight", text: "b\n" },
      { type: "text", text: "c" },
    ]);
  });
});
