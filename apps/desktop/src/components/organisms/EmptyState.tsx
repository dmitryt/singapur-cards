import React from "react";
import { Message, Icon } from "semantic-ui-react";
import type { SemanticICONS } from "semantic-ui-react";

export type EmptyStateVariant =
  | "no-dictionaries"
  | "no-search-results"
  | "no-cards"
  | "no-collections"
  | "custom";

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  message?: string;
  icon?: SemanticICONS;
  action?: React.ReactNode;
}

const VARIANT_DEFAULTS: Record<
  Exclude<EmptyStateVariant, "custom">,
  { title: string; message: string; icon: SemanticICONS }
> = {
  "no-dictionaries": {
    title: "No dictionaries imported",
    message: "Import a DSL dictionary file to start searching for words.",
    icon: "book",
  },
  "no-search-results": {
    title: "No results found",
    message: "Try a different search term or check the selected language.",
    icon: "search",
  },
  "no-cards": {
    title: "No cards in library",
    message: "Save words as cards from the headword detail page to build your library.",
    icon: "copy outline",
  },
  "no-collections": {
    title: "No collections yet",
    message: "Create a collection to organise your study cards.",
    icon: "folder outline",
  },
};

function EmptyState({
  variant = "custom",
  title,
  message,
  icon,
  action,
}: EmptyStateProps) {
  const defaults = variant !== "custom" ? VARIANT_DEFAULTS[variant] : null;
  const resolvedTitle = title ?? defaults?.title ?? "Nothing here yet";
  const resolvedMessage = message ?? defaults?.message ?? "";
  const resolvedIcon = icon ?? defaults?.icon;

  return (
    <Message info>
      {resolvedIcon && <Icon name={resolvedIcon} />}
      <Message.Header>{resolvedTitle}</Message.Header>
      {resolvedMessage && <p>{resolvedMessage}</p>}
      {action && <div style={{ marginTop: "8px" }}>{action}</div>}
    </Message>
  );
}

export default EmptyState;
