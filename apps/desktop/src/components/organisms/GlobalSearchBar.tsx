import { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useStore } from "../../store";
import { Dropdown } from "../atoms";
import { Container, type DropdownProps } from "semantic-ui-react";
import useDebounce from "../../hooks/useDebounce";

const StyledContainer = styled(Container)`
  &&& {
    display: flex;
    gap: ${({ theme }) => theme.spacing.sm};
    margin-bottom: ${({ theme }) => theme.spacing.md};
  }
`;

type GlobalSearchBarProps = {
  onSearch: (query: string | null) => void;
  onWordSelect: (value: string | undefined) => void;
};

function GlobalSearchBar({ onSearch, onWordSelect }: GlobalSearchBarProps) {
  const [selectedWordQuery, setSelectedWordQuery] = useState("");
  const debouncedSearch = useDebounce(selectedWordQuery, 300);

  const {
    selectedLanguage,
    searchResults,
    isSearching,
  } = useStore();

  useEffect(() => {
    onSearch(debouncedSearch);
  }, [debouncedSearch, onSearch]);

  useEffect(() => {
    if (selectedLanguage) {
      onSearch("");
    }
  }, [selectedLanguage]); // eslint-disable-line react-hooks/exhaustive-deps

  const headwordOptions = useMemo(
    () => searchResults.map((r) => ({ key: r.headword, text: r.headword, value: r.headword })),
    [searchResults]
  );

  const handleHeadwordChange = useCallback(
    (_e: React.SyntheticEvent, data: DropdownProps) => {
      setSelectedWordQuery(data.value as string);
      onWordSelect(data.value as string);
    },
    [setSelectedWordQuery, onWordSelect]
  );

  const handleSearchChange = useCallback(
    (_e: React.SyntheticEvent, data: { searchQuery: string }) => {
      setSelectedWordQuery(data.searchQuery);
    },
    [setSelectedWordQuery]
  );

  return (
    <StyledContainer fluid>
      <Dropdown
        placeholder="Type word to search"
        selection
        search
        fluid
        clearable
        selectOnNavigation={false}
        loading={isSearching}
        searchQuery={selectedWordQuery}
        value={""}
        options={headwordOptions}
        disabled={!selectedLanguage}
        onChange={handleHeadwordChange}
        onSearchChange={handleSearchChange}
      />
    </StyledContainer>
  );
}

export default GlobalSearchBar;
