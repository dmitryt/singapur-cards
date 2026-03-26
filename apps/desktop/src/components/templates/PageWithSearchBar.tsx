import { Outlet, useNavigate } from "react-router-dom";
import styled from "styled-components";
import GlobalSearchBar from "../organisms/GlobalSearchBar";
import { useStore } from "../../store";
import { useCallback } from "react";

const PageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
`;

const PageContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing.lg};
  background-color: ${({ theme }) => theme.colors.background};
`;

export function PageWithSearchBar() {
  const { searchHeadwords, selectedLanguage } = useStore();
  const navigate = useNavigate();
  const onSearch = useCallback((query: string | null) => {
    if (query !== null) {
      console.log("searching", query);
      searchHeadwords(query ?? "");
    }
  }, []);

  const onWordSelect = useCallback(
    (value: string | undefined) => {
      console.log("search change", value);
      if (value) {
        navigate(
          `/headword/${encodeURIComponent(selectedLanguage)}/${encodeURIComponent(value)}`
        );
      }
    },
    [navigate, selectedLanguage]
  );

  return (
    <PageWrapper>
      <PageContent>
        <GlobalSearchBar onSearch={onSearch} onWordSelect={onWordSelect} />
        <Outlet />
      </PageContent>
    </PageWrapper>
  );
}

export default PageWithSearchBar;
