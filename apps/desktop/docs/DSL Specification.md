Here is a **clean, AI-agent-friendly Markdown documentation** of the **ABBYY Lingvo DSL format**, distilled from the official docs you provided.

---

# 📘 ABBYY Lingvo DSL Format — Structured Reference

## 1. Overview

**DSL (Dictionary Specification Language)** is a plain-text format used to define dictionaries for ABBYY Lingvo.

* File type: `.dsl` (plain text)
* Encoding: **Unicode (preferred)** or ANSI ([lingvo.helpmax.net][1])
* Compiled into: `.lsd` dictionary via DSL Compiler ([serptools.github.io][2])

A DSL dictionary consists of:

* A **header** (metadata)
* A sequence of **entries (cards)**

---

## 2. File Structure

```text
#HEADER

ENTRY 1
ENTRY 2
ENTRY 3
...
```

---

## 3. Header Section (Required)

The header must appear at the **top of the file**.

### Required fields

```dsl
#NAME "Dictionary Name"
#INDEX_LANGUAGE "Source Language"
#CONTENTS_LANGUAGE "Target Language"
```

### Example

```dsl
#NAME "General"
#INDEX_LANGUAGE "English"
#CONTENTS_LANGUAGE "Russian"
```

### Optional fields

#### Include other DSL files

```dsl
#INCLUDE "C:\\path\\to\\file.dsl"
#INCLUDE "relative\\path.dsl"
#INCLUDE "..\\parent.dsl"
```

* Use **double backslashes (`\\`)** in paths ([lingvo.helpmax.net][1])

#### Code page (ANSI only)

```dsl
#SOURCE_CODE_PAGE "Latin"        // 1252
#SOURCE_CODE_PAGE "Cyrillic"     // 1251
#SOURCE_CODE_PAGE "EasternEuropean" // 1250
```

* Not required for Unicode ([lingvo.helpmax.net][1])

---

## 4. Entry (Card) Structure

Each dictionary entry consists of:

```text
HEADWORD
    BODY (indented)
```

### Rules

* **Headword**

  * Must start at **beginning of line**
  * Represents the indexed word/phrase
* **Body**

  * Must start with **space or tab**
  * Continues until next headword or EOF ([documentation.help][3])

---

## 5. Entry Example

```dsl
abandon
    [b]1.[/b] гл.
    [m1][trn]покидать, оставлять[/trn][/m]
    [m2][ex]to abandon ship — покинуть корабль[/ex][/m]
```

---

## 6. Logical Sections Inside Entry

Common semantic sections (via tags):

* Translation
* Examples
* Comments
* Labels
* Multimedia (audio/images)
* References ([documentation.help][3])

---

## 7. DSL Tags (Formatting & Semantics)

Tags use bracket syntax:

```dsl
[tag] ... [/tag]
```

### Text formatting

| Tag   | Meaning      |
| ----- | ------------ |
| `[b]` | bold         |
| `[i]` | italic       |
| `[u]` | underline    |
| `[c]` | colored text |

### Structural tags

| Tag     | Meaning                 |
| ------- | ----------------------- |
| `[trn]` | translation             |
| `[ex]`  | example                 |
| `[com]` | comment                 |
| `[*]`   | hidden/extended content |

### Layout

| Tag    | Meaning                |
| ------ | ---------------------- |
| `[mN]` | left margin (N spaces) |

([documentation.help][4])

---

## 8. Entry Parsing Rules (Important for AI)

### Headword detection

* Line **without leading whitespace** → new entry
* Allowed characters:

  * letters, numbers, space, `- , ' " { }` ([documentation.help][3])

### Body detection

* Line **with leading space/tab** → belongs to current entry

### Entry termination

* Next headword OR end-of-file

---

## 9. Encoding Rules

| Encoding | Requirement                  |
| -------- | ---------------------------- |
| Unicode  | Recommended, no extra config |
| ANSI     | Requires `#SOURCE_CODE_PAGE` |

([lingvo.helpmax.net][1])

---

## 10. Compilation

* DSL files are compiled using **DSL Compiler**
* Output format: `.lsd` dictionary ([documentation.help][5])

---

## 11. Minimal Valid DSL Example

```dsl
#NAME "My Dictionary"
#INDEX_LANGUAGE "English"
#CONTENTS_LANGUAGE "German"

hello
    [trn]Hallo[/trn]

world
    [trn]Welt[/trn]
```

---

## 12. AI Parsing Guidelines (Recommended)

When building a parser:

### Step-by-step

1. Read header until first non-`#` line
2. Split entries:

   * Detect headword (no leading whitespace)
3. Accumulate body lines:

   * Lines starting with whitespace
4. Parse inline tags:

   * `[tag]...[/tag]`
5. Normalize sections:

   * Extract translations, examples, etc.

---

## 13. Key Characteristics

* Human-readable
* Line-based structure
* Indentation-sensitive (for entries)
* Tag-based formatting system
* Easily composable via `#INCLUDE`

---

## 14. Common Pitfalls

* Missing indentation → broken entry parsing
* Wrong encoding → corrupted characters
* Missing header → invalid dictionary
* Incorrect path escaping in `#INCLUDE`

---
## Additional Resources

[1]: https://lingvo.helpmax.net/en/troubleshooting/dsl-compiler/dsl-dictionary-structure "DSL Dictionary Structure | ABBYY Lingvo"
[2]: https://serptools.github.io/files/dsl "DSL File - Lingvo Dictionary File | What is .dsl?"
[3]: https://documentation.help/ABBYY-Lingvo8/EntryStructure.htm "Structure of DSL card - Lingvo Documentation"
[4]: https://documentation.help/ABBYY-Lingvo8/dsl_commands.htm "DSL tags - Lingvo Documentation"
[5]: https://documentation.help/ABBYY-Lingvo8/dictionary_conp.htm "How to compile a dictionary - Lingvo Documentation"
