import React, { useCallback, useEffect, useRef } from "react";
import styled from "styled-components";
import { Input, Dropdown } from "semantic-ui-react";
import type { DropdownProps } from "semantic-ui-react";
import { useStore } from "../../store";

const SearchBarContainer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  align-items: center;
  padding: ${({ theme }) => theme.spacing.md} 0;
`;

const StyledInput = styled(Input)`
  flex: 1;
`;

interface SearchBarProps {
  onSearch: (query: string, language?: string) => void;
}

function SearchBar({ onSearch }: SearchBarProps) {
  const { searchQuery, searchLanguage, setSearchQuery, setSearchLanguage, dictionaries } = useStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const languageOptions = React.useMemo(() => {
    const langs = Array.from(new Set(dictionaries.map(d => d.languageFrom)));
    return [
      { key: "all", value: "", text: "All languages" },
      ...langs.map(l => ({ key: l, value: l, text: l })),
    ];
  }, [dictionaries]);

  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearch(query, searchLanguage);
    }, 300);
  }, [setSearchQuery, onSearch, searchLanguage]);

  const handleLanguageChange = useCallback((_: React.SyntheticEvent<HTMLElement, Event>, data: DropdownProps) => {
    const value = data.value;
    const lang = Array.isArray(value) ? "" : String(value ?? "");
    setSearchLanguage(lang);
    onSearch(searchQuery, lang);
  }, [setSearchLanguage, onSearch, searchQuery]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <SearchBarContainer>
      <StyledInput
        placeholder="Search headwords..."
        value={searchQuery}
        onChange={handleQueryChange}
        icon="search"
        iconPosition="left"
        fluid
        tabIndex={5}
      />
      <Dropdown
        selection
        options={languageOptions}
        value={searchLanguage}
        onChange={handleLanguageChange}
        placeholder="Language"
        style={{ minWidth: "150px" }}
      />
    </SearchBarContainer>
  );
}

export default SearchBar;
