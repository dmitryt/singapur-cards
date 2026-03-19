# Tauri Event Contracts

**Branch**: `001-vocab-learning-app` | **Date**: 2026-03-19

Events are emitted from Rust to all windows via `AppHandle::emit`. Frontend subscribes with `listen` from `@tauri-apps/api/event`. All listeners must clean up via the returned unlisten function in a `useEffect` return.

---

## `import-progress`

Emitted during and at completion of a dictionary import. The `import_dictionary` command returns immediately; this event stream is the only way to track import state.

**Payload**:
```typescript
interface ImportProgressPayload {
  processed: number;     // entries processed so far
  total: number;         // estimated total (0 if unknown)
  status: 'parsing' | 'indexing' | 'done' | 'error';
  errorMessage?: string; // only present when status === 'error'
}
```

**Lifecycle**:

| Event | When | Notes |
|-------|------|-------|
| `status: 'parsing'` | After each 1000-entry parse batch | `total` is estimated from file size |
| `status: 'indexing'` | During FTS index rebuild | `processed` equals final entry count |
| `status: 'done'` | Import completed successfully | `processed` equals `total` |
| `status: 'error'` | Import failed at any point | `errorMessage` present; existing data unaffected |

**Frontend usage**:
```typescript
import { listen } from '@tauri-apps/api/event'

useEffect(() => {
  const unlisten = listen<ImportProgressPayload>('import-progress', (event) => {
    const { status, processed, total, errorMessage } = event.payload
    if (status === 'done') {
      setImporting(false)
      store.loadDictionaries()
    } else if (status === 'error') {
      setImporting(false)
      setImportError(errorMessage ?? 'Import failed')
    } else {
      const pct = total > 0 ? processed / total : null
      setProgress(pct)
    }
  })
  return () => { unlisten.then(fn => fn()) }
}, [])
```

**Guarantees**:
- Either `done` or `error` is always emitted — no silent failures.
- On `error`, no partial data is committed (import runs in a single transaction that is rolled back on failure).
- `total` may be 0 during `parsing` phase if file size cannot be used to estimate entry count; UI should show an indeterminate progress bar in that case.
