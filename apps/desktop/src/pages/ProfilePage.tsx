import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useStore } from "../store";
import { Dropdown } from "../components/atoms";
import type { DropdownProps } from "semantic-ui-react";
import PageContainer from "../components/templates/PageContainer";
import { saveApiCredential, deleteApiCredential } from "../lib/tauri/commands";

const Section = styled.div`
  max-width: 400px;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Label = styled.label`
  display: block;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  color: ${({ theme }) => theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const InputRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const ApiKeyInput = styled.input`
  flex: 1;
  padding: ${({ theme }) => theme.spacing.sm};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  border: 1px solid ${({ theme }) => theme.colors.border ?? "#ccc"};
  border-radius: 4px;
  font-family: monospace;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary ?? "#4a90e2"};
  }
`;

const Button = styled.button<{ $variant?: "danger" | "primary" }>`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  background-color: ${({ $variant, theme }) =>
    $variant === "danger" ? "#e74c3c" : theme.colors.primary ?? "#4a90e2"};
  color: white;
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  &:hover:not(:disabled) {
    opacity: 0.85;
  }
`;

const StatusText = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin: ${({ theme }) => theme.spacing.xs} 0 0;
`;

function ProfilePage() {
  const {
    languages,
    loadLanguages,
    selectedLanguage,
    setSelectedLanguage,
    apiKeyExists,
    apiKeyMasked,
    loadApiKeyStatus,
    setApiKeyExists,
  } = useStore();

  const [apiKeyInput, setApiKeyInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    loadLanguages().then(({ firstLanguageCode }) => {
      if (firstLanguageCode && !selectedLanguage) {
        setSelectedLanguage(firstLanguageCode);
      }
    });
    loadApiKeyStatus();
  }, [loadLanguages, selectedLanguage, setSelectedLanguage, loadApiKeyStatus]);

  const languageOptions = useMemo(
    () => languages.map((lang) => ({ key: lang.code, text: lang.title, value: lang.code })),
    [languages]
  );

  const handleLangChange = (_e: React.SyntheticEvent, data: DropdownProps) => {
    const value = data.value as string | undefined;
    if (value) {
      setSelectedLanguage(value);
    }
  };

  const handleSaveKey = async () => {
    if (!apiKeyInput.trim()) return;
    setIsSaving(true);
    setSaveError(null);
    const result = await saveApiCredential({ provider: "openrouter", apiKey: apiKeyInput.trim() });
    setIsSaving(false);
    if (result.ok) {
      setApiKeyInput("");
      await loadApiKeyStatus();
      if (!useStore.getState().apiKeyExists) {
        setSaveError(
          "The key still could not be read from the keychain. Chat and other screens use that check — grant access if macOS prompts, then save again.",
        );
      }
    } else {
      setSaveError(result.message);
    }
  };

  const handleDeleteKey = async () => {
    setIsDeleting(true);
    await deleteApiCredential("openrouter");
    setApiKeyExists(false, null);
    setIsDeleting(false);
  };

  return (
    <PageContainer>
      <Section>
        <Label>Active Language</Label>
        <Dropdown
          placeholder="Select Language"
          selection
          fluid
          options={languageOptions}
          value={selectedLanguage}
          onChange={handleLangChange}
          disabled={languages.length === 0}
        />
      </Section>

      <Section>
        <Label>OpenRouter API Key</Label>
        {apiKeyExists ? (
          <>
            <StatusText>
              Saved key: <code>{apiKeyMasked ?? "••••••••"}</code>
            </StatusText>
            <InputRow style={{ marginTop: "8px" }}>
              <Button $variant="danger" onClick={handleDeleteKey} disabled={isDeleting}>
                {isDeleting ? "Removing…" : "Remove Key"}
              </Button>
            </InputRow>
          </>
        ) : (
          <>
            <InputRow>
              <ApiKeyInput
                type="password"
                placeholder="sk-or-v1-…"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                autoComplete="off"
              />
              <Button onClick={handleSaveKey} disabled={isSaving || !apiKeyInput.trim()}>
                {isSaving ? "Saving…" : "Save Key"}
              </Button>
            </InputRow>
            {saveError && <StatusText style={{ color: "#c0392b" }}>{saveError}</StatusText>}
            <StatusText>Your key is stored securely in the OS keychain.</StatusText>
          </>
        )}
      </Section>
    </PageContainer>
  );
}

export default ProfilePage;
