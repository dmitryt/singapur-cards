You are an AI coding assistant working on a Tauri v2 + React (TypeScript) application.

### Goal

Enhance the @src/components/molecules/ChatComposer.tsx by adding support for **custom AI model management** in a user-friendly way.

---

### Requirements

#### 1. Model Selection Dropdown

* Use **Semantic UI React `Dropdown`** component.
* Enable `allowAdditions` so users can input new values.
* The dropdown should:

  * Display a list of available AI models.
  * Allow selecting an existing model.
  * Allow adding a new model if it doesn't exist.

---

#### 2. Adding a New Model

When the user types a new value and clicks **"Add new"**:

* Open a **modal/popup dialog**.

* The dialog should contain:

  * `Model Name` (e.g., `openai/gpt-4`)
  * `Display Title` (e.g., `GPT-4 (OpenAI)`)

* Actions:

  * **Save** → adds the model to storage and updates dropdown
  * **Cancel** → closes modal without saving

---

#### 3. Data Persistence

* Store custom models so they persist across sessions.

* Prefer:

  * `localStorage` for simplicity (initial implementation)
  * Structure example:

    ```json
    [
      { "name": "openai/gpt-4", "title": "GPT-4 (OpenAI)" }
    ]
    ```

* Load models from storage when `ChatPage` initializes.

---

#### 4. Removing Models

* Users must be able to remove previously added models.

Implement one of:

* Option A: Add a small **"delete" (×) button** next to custom models in dropdown

* Option B: Add a **"Manage Models"** button that opens a modal with:

  * List of saved models
  * Delete button per model

* On delete:

  * Remove from storage
  * Update dropdown immediately

---

#### 5. State Management

* Keep models in React state (e.g., `useState`)
* Sync state with `localStorage`:

  * On load → hydrate state
  * On add/remove → update both state and storage

---

#### 6. UX Considerations

* Prevent duplicate models (by `name`)
* Validate inputs (non-empty fields)
* Provide feedback (optional toast/snackbar)
* Keep UI clean and minimal

---

### Expected Output

* Updated `ChatPage` with:

  * Model dropdown (with additions)
  * Add Model modal
  * Remove model functionality
* Utility functions for:

  * Loading models
  * Saving models
  * Deleting models

---

### Notes

* Keep implementation modular and reusable
* Use TypeScript types for model structure:

  ```ts
  type AIModel = {
    name: string;
    title: string;
    provider?: string;
  };
  ```
* Avoid overengineering; prioritize simplicity and clarity

If you want, I can also generate the full React implementation (components + hooks) based on this prompt.
