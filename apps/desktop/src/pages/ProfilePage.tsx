import { useEffect, useMemo } from "react";
import styled from "styled-components";
import { useStore } from "../store";
import { Dropdown } from "../components/atoms";
import type { DropdownProps } from "semantic-ui-react";
import PageContainer from "../components/templates/PageContainer";

const Section = styled.div`
  max-width: 400px;
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

function ProfilePage() {
  const {
    languages,
    loadLanguages,
    selectedLanguage,
    setSelectedLanguage,
  } = useStore();

  useEffect(() => {
    loadLanguages().then(({ firstLanguageCode }) => {
      if (firstLanguageCode && !selectedLanguage) {
        setSelectedLanguage(firstLanguageCode);
      }
    });
  }, [loadLanguages, selectedLanguage, setSelectedLanguage]);

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
    </PageContainer>
  );
}

export default ProfilePage;
