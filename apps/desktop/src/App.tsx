import { MemoryRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { theme } from "./theme/theme";
import { GlobalStyles } from "./theme/GlobalStyles";
import AppShell from "./components/templates/AppShell";
import SearchPage from "./pages/SearchPage";
import HeadwordDetailPage from "./pages/HeadwordDetailPage";
import LibraryPage from "./pages/LibraryPage";
import CollectionsPage from "./pages/CollectionsPage";
import ReviewPage from "./pages/ReviewPage";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <MemoryRouter initialEntries={["/search"]}>
        <AppShell>
          <Routes>
            <Route path="/" element={<Navigate to="/search" replace />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/search/headword/:language/:headword" element={<HeadwordDetailPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/collections" element={<CollectionsPage />} />
            <Route path="/review" element={<ReviewPage />} />
          </Routes>
        </AppShell>
      </MemoryRouter>
    </ThemeProvider>
  );
}

export default App;
