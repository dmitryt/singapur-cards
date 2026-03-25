import styled from "styled-components";
import { Label } from "semantic-ui-react";
import type { SearchResult } from "../../lib/tauri/commands";

const Card = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  background: ${({ theme }) => theme.colors.surface};
  cursor: pointer;
  transition: box-shadow 0.15s ease, border-color 0.15s ease;

  &:hover {
    box-shadow: ${({ theme }) => theme.shadows.sm};
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const Headword = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: 600;
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const Preview = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Meta = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

interface SearchResultCardProps {
  result: SearchResult;
  onClick: () => void;
}

function SearchResultCard({ result, onClick }: SearchResultCardProps) {
  return (
    <Card onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onClick()}>
      <Headword>{result.headword}</Headword>
      <Preview>{result.previewText}</Preview>
      <Meta>
        <Label size="tiny" color={result.matchKind === "exact" ? "blue" : "grey"}>
          {result.matchKind}
        </Label>
        {result.contributingDictionaryCount > 1 && (
          <Label size="tiny">{result.contributingDictionaryCount} dicts</Label>
        )}
      </Meta>
    </Card>
  );
}

export default SearchResultCard;
