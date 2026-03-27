import { MemoryRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { theme } from "./theme/theme";
import { GlobalStyles } from "./theme/GlobalStyles";
import AppShell from "./components/templates/AppShell";
import PageWithSearchBar from "./components/templates/PageWithSearchBar";
import LanguagePage from "./pages/LanguagePage";
import DictionaryPage from "./pages/DictionaryPage";
import HeadwordDetailPage from "./pages/HeadwordDetailPage";
import LibraryPage from "./pages/LibraryPage";
import CollectionsPage from "./pages/CollectionsPage";
import ReviewPage from "./pages/ReviewPage";
import ProfilePage from "./pages/ProfilePage";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <MemoryRouter initialEntries={["/library"]}>
        <AppShell>
          <Routes>
            <Route path="/" element={<Navigate to="/library" replace />} />
            <Route path="/languages" element={<LanguagePage />} />
            <Route path="/dictionaries" element={<DictionaryPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route element={<PageWithSearchBar />}>
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/collections" element={<CollectionsPage />} />
              <Route path="/review" element={<ReviewPage />} />
              <Route path="/headword/:language/:headword" element={<HeadwordDetailPage />} />
            </Route>
          </Routes>
        </AppShell>
      </MemoryRouter>
    </ThemeProvider>
  );
}

export default App;
