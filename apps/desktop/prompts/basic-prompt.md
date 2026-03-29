I am building a modern desktop application for language learning focused on vocabulary acquisition. The application should have a clean, sleek, and intuitive user interface (similar in quality to apps like Notion or Duolingo).

#### Core Requirements (MVP)

1. **Dictionary Import**

   * Users must be able to upload and manage multiple dictionaries in **DSL (Dictionary Specification Language) format**.
   * The system should parse and index these dictionaries efficiently for fast lookup.
   * Support large dictionaries (potentially hundreds of thousands of entries).

2. **Word Search**

   * Provide fast, responsive search across all imported dictionaries.
   * Include features like:

     * Fuzzy search / partial matching
     * Instant results as the user types
   * Display structured dictionary entries (word, transcription, meanings, examples, etc.).

3. **Card Creation (Core Learning Unit)**

   * When a user selects a word, they can add it to a personal collection as a “card”.
   * Each card should support:

     * Word
     * Translation and/or definition
     * Example sentences
     * Optional audio pronunciation
     * Optional notes

4. **Collections / Decks**

   * Users can organize cards into collections (decks/sets).
   * Cards can belong to one or multiple collections.

5. **Learning / Review Mode**

   * Users can browse and review their saved cards.
   * Basic learning mode (MVP):

     * Flip card (front/back)
     * Mark as learned / not learned
   * (Optional future extension: spaced repetition system)

#### Non-Functional Requirements

* The application should:

  * Feel fast and responsive even with large datasets
  * Work fully offline
  * Store data locally
* UI/UX should be minimalistic, modern, and distraction-free

#### Optional (Nice-to-Have for Later)

* Synchronization between desktop and mobile clients
* Audio playback (TTS or imported audio)
* Tagging system for cards
* Advanced filtering and sorting
