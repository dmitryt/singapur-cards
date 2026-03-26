import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { Button, Loader, Message, Divider } from "semantic-ui-react";
import PageContainer from "../components/templates/PageContainer";
import { useStore } from "../store";
import { dslToHtml } from "../lib/dslToHtml";

const DetailHeader = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const Headword = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes.xxl};
  margin: 0 0 ${({ theme }) => theme.spacing.xs};
`;

const EntryCard = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.surface};
`;

const DictName = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const Definition = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.md};
  line-height: 1.6;
`;

const Example = styled.div`
  font-style: italic;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: ${({ theme }) => theme.spacing.sm};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

function HeadwordDetailPage() {
  const { headword: encodedHeadword, language: encodedLanguage } = useParams<{
    headword: string;
    language: string;
  }>();
  const navigate = useNavigate();

  const headword = encodedHeadword ? decodeURIComponent(encodedHeadword) : "";
  const language = encodedLanguage ? decodeURIComponent(encodedLanguage) : "";

  const { headwordDetail, isLoadingDetail, getHeadwordDetail, createCard } = useStore();

  useEffect(() => {
    if (headword && language) {
      getHeadwordDetail(headword, language);
    }
  }, [headword, language, getHeadwordDetail]);

  const handleSaveCard = async () => {
    if (!headwordDetail) return;

    const firstEntry = headwordDetail.entries[0];
    const answerText = headwordDetail.entries
      .map(e => e.definitionText)
      .join("\n\n");

    const result = await createCard({
      headword: headwordDetail.headword,
      language: headwordDetail.language,
      sourceEntryIds: headwordDetail.sourceEntryIds,
      overrideAnswerText: answerText,
      overrideExampleText: firstEntry?.exampleText ?? undefined,
    });

    if (result) {
      if ("existingCardId" in result) {
        // Navigate to existing card
        navigate(`/library`);
      } else {
        navigate(`/library`);
      }
    }
  };

  if (isLoadingDetail) {
    return (
      <PageContainer>
        <Loader active inline="centered" />
      </PageContainer>
    );
  }

  if (!headwordDetail) {
    return (
      <PageContainer>
        <Button icon="arrow left" content="Back to search" onClick={() => navigate(-1)} />
        <Message warning>
          <Message.Header>Not found</Message.Header>
          <p>No entries found for &quot;{headword}&quot; in {language}.</p>
        </Message>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Button icon="arrow left" content="Back to search" size="small" onClick={() => navigate(-1)} />

      <DetailHeader style={{ marginTop: "16px" }}>
        <Headword>{headwordDetail.headword}</Headword>
        <div style={{ color: "#666", fontSize: "13px" }}>
          {language} · {headwordDetail.entries.length} {headwordDetail.entries.length === 1 ? "entry" : "entries"}
        </div>
      </DetailHeader>

      <Divider />

      {headwordDetail.entries.map((entry) => (
        <EntryCard key={entry.entryId}>
          <DictName>{entry.dictionaryName} → {entry.languageTo}</DictName>
          {entry.transcription && (
            <div
              style={{ color: "#888", marginBottom: "4px" }}
              dangerouslySetInnerHTML={{ __html: `[${dslToHtml(entry.transcription)}]` }}
            />
          )}
          <Definition dangerouslySetInnerHTML={{ __html: dslToHtml(entry.definitionText) }} />
          {entry.exampleText && (
            <Example dangerouslySetInnerHTML={{ __html: dslToHtml(entry.exampleText) }} />
          )}
        </EntryCard>
      ))}

      <Actions>
        <Button primary icon="bookmark" content="Save as Card" onClick={handleSaveCard} />
      </Actions>
    </PageContainer>
  );
}

export default HeadwordDetailPage;
