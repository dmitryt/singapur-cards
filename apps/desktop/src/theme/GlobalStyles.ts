import { createGlobalStyle } from "styled-components";

export const GlobalStyles = createGlobalStyle`
  *, *::before, *::after {
    box-sizing: border-box;
  }

  html, body, #root {
    height: 100%;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
    background-color: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
    font-size: ${({ theme }) => theme.fontSizes.md};
    line-height: 1.5;
  }

  #root {
    display: flex;
    flex-direction: column;
  }

  .dsl-comment {
    color: ${({ theme }) => theme.colors.dsl.comment};
  }

  .dsl-example {
    color: ${({ theme }) => theme.colors.dsl.example};
  }

  .dsl-color {
    color: ${({ theme }) => theme.colors.dsl.color};
  }

  .dsl-label {
    color: ${({ theme }) => theme.colors.dsl.label};
  }

  .dsl-star {
    color: ${({ theme }) => theme.colors.dsl.star};
  }
`;
