import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import DictionaryManager from "../components/organisms/DictionaryManager";
import SearchBar from "../components/molecules/SearchBar";
import SearchResultList from "../components/organisms/SearchResultList";
import PageContainer from "../components/templates/PageContainer";
import { useStore } from "../store";
import type { SearchResult } from "../lib/tauri/commands";

const SearchLayout = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: ${({ theme }) => theme.spacing.sm};
`;

function SearchPage() {
  const { searchQuery, searchResults, isSearching, searchHeadwords } = useStore();
  const navigate = useNavigate();

  const handleSearch = useCallback((query: string, language?: string) => {
    searchHeadwords(query, language);
  }, [searchHeadwords]);

  const handleSelect = useCallback((result: SearchResult) => {
    navigate(`/search/headword/${encodeURIComponent(result.language)}/${encodeURIComponent(result.headword)}`);
  }, [navigate]);

  return (
    <PageContainer as="div" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <SearchLayout>
        <DictionaryManager />
        <SearchBar onSearch={handleSearch} />
        <SearchResultList
          results={searchResults}
          isLoading={isSearching}
          query={searchQuery}
          onSelect={handleSelect}
        />
      </SearchLayout>
    </PageContainer>
  );
}

export default SearchPage;
