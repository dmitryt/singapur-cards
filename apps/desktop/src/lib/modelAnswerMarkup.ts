/**
 * Lightweight markup for assistant replies: **strong** and *highlight* (no nested ** inside **).
 * Used for display when the message is complete; copy uses plain text without delimiters.
 */

export type ModelAnswerPart = { type: "text" | "strong" | "highlight"; text: string };

export function parseModelAnswer(text: string): ModelAnswerPart[] {
  const result = [] as ModelAnswerPart[];

  let prev = null;
  let buf = "";
  let stars = 0;
  let isTagOpen = false;

  for (const char of text) {
    if (char !== "*") {
      buf += char;
      prev = char;
      continue;
    }
    if (isTagOpen) {
      if (prev === "*") {
        stars += 1;
      } else {
        isTagOpen = false;
        stars -= 1;
      }
    } else {
      if (prev === "*") {
        stars -= 1;
      } else {
        if (stars === 0 && buf !== "") {
          result.push({ type: "text", text: buf });
          buf = "";
        }
        isTagOpen = true;
        stars += 1;
      }
    }
    if (stars === 0 && buf !== "") {
      result.push({ type: prev === "*" ? "strong" : "highlight", text: buf });
      buf = "";
    }
    prev = char;
  }

  if (buf !== "") {
    result.push({ type: "text", text: buf });
  }

  if (result.length === 0) {
    result.push({ type: "text", text: "" });
  }

  return result;
}
