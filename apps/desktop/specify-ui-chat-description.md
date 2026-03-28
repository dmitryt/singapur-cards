You are a senior full-stack engineer specializing in React, TypeScript, and Tauri v2 (Rust backend). Your task is to implement an AI-powered chat feature for a desktop language learning application.

## ⚙️ Tech Stack

* UI Library: assistant-ui (chat interface)
* Backend: Tauri v2 (Rust commands)
* AI Provider: OpenRouter (multi-model support) or maybe it's possible to use selectors with other providers
* No traditional backend server (all requests go through Tauri Rust layer)

---

## 🎯 Goals

1. Implement a fully functional AI Chat UI
2. Integrate with AI Provider via Tauri backend
3. Allow user to:

   * Provide their own API key OR use a default OpenRouter key
   * Select model (e.g., GPT, Claude, etc.)
   * Pass selected collection of words into AI context
4. Display:

   * Chat messages
   * Token usage per message (input/output/total)

---

## 🖥️ Frontend Requirements (React)

### 1. Chat UI

* Use `assistant-ui` to render chat interface
* Features:

  * Message list (user + assistant)
  * Input box
  * Send button
  * Loading state
  * Streaming support (if possible)
  * Display the number of spent tokens

### 2. Token Display

* Show per-message token usage:

  * prompt_tokens
  * completion_tokens
  * total_tokens

---

## 🔐 API Key Logic

* If user provides API key → use it
* Else → fallback to default OpenRouter key (stored securely or env)
* Never expose default key in frontend

---

## 🧠 AI Behavior Requirements

System prompt should enforce:

* Generate texts using provided vocabulary naturally
* Adapt difficulty based on words
* Highlight or reuse vocabulary when possible
* Be concise but educational

---

## ✨ Optional Enhancements

* Streaming responses (SSE or chunked)
* Highlight learned words in response
* Save chat history per session
* Allow "Regenerate" button
* Temperature / creativity control

---

## ✅ Success Criteria

* User can send a message and receive AI response
* AI uses selected vocabulary in generated text
* Token usage is visible
* API key system works correctly
* UI is responsive and clean
