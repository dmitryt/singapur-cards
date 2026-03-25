import styled from "styled-components";
import { Loader, Message } from "semantic-ui-react";
import SearchResultCard from "../molecules/SearchResultCard";
import type { SearchResult } from "../../lib/tauri/commands";

const ListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
  overflow-y: auto;
  flex: 1;
`;

const EmptyState = styled.div`
  color: ${({ theme }) => theme.colors.textSecondary};
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl};
`;

interface SearchResultListProps {
  results: SearchResult[];
  isLoading: boolean;
  query: string;
  onSelect: (result: SearchResult) => void;
}

function SearchResultList({ results, isLoading, query, onSelect }: SearchResultListProps) {
  if (isLoading) {
    return <Loader active inline="centered" />;
  }

  if (query && results.length === 0) {
    return (
      <Message info>
        <Message.Header>No results found</Message.Header>
        <p>No headwords match &quot;{query}&quot;. Try a different search term or select a different language.</p>
      </Message>
    );
  }

  if (!query) {
    return (
      <EmptyState>
        Enter a search term to find headwords in your imported dictionaries.
      </EmptyState>
    );
  }

  return (
    <ListContainer>
      {results.map((result) => (
        <SearchResultCard
          key={`${result.headword}-${result.language}`}
          result={result}
          onClick={() => onSelect(result)}
        />
      ))}
    </ListContainer>
  );
}

export default SearchResultList;
