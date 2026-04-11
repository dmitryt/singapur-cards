CREATE TABLE IF NOT EXISTS `ai_credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`label` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `ux_ai_credentials_provider_active` ON `ai_credentials` (`provider`) WHERE "ai_credentials"."is_active" = 1;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `app_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `cards` (
	`id` text PRIMARY KEY NOT NULL,
	`language` text NOT NULL,
	`headword` text NOT NULL,
	`answer_text` text NOT NULL,
	`example_text` text,
	`notes` text,
	`audio_reference` text,
	`source_entry_ids` text DEFAULT '[]' NOT NULL,
	`learning_status` text DEFAULT 'unreviewed' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`last_reviewed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `ux_cards_headword_language` ON `cards` (`headword`,`language`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `chat_conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`model` text,
	`collection_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`role` text NOT NULL,
	`body` text NOT NULL,
	`metadata_json` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `chat_conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_chat_messages_conversation_created` ON `chat_messages` (`conversation_id`,`created_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `collection_memberships` (
	`collection_id` text NOT NULL,
	`card_id` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`collection_id`, `card_id`),
	FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `collections` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `collections_name_unique` ON `collections` (`name`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `custom_chat_models` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`title` text NOT NULL,
	`provider` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `custom_chat_models_name_unique` ON `custom_chat_models` (`name`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `dictionaries` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`language_from` text NOT NULL,
	`language_to` text NOT NULL,
	`source_filename` text NOT NULL,
	`source_path` text,
	`import_status` text DEFAULT 'queued' NOT NULL,
	`entry_count` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `dictionaries_name_unique` ON `dictionaries` (`name`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `dictionary_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`dictionary_id` text NOT NULL,
	`headword` text NOT NULL,
	`normalized_headword` text NOT NULL,
	`transcription` text,
	`definition_text` text NOT NULL,
	`example_text` text,
	`audio_reference` text,
	`source_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`dictionary_id`) REFERENCES `dictionaries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_dictionary_entries_dictionary_id` ON `dictionary_entries` (`dictionary_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_dictionary_entries_normalized_headword` ON `dictionary_entries` (`normalized_headword`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `languages` (
	`code` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `review_events` (
	`id` text PRIMARY KEY NOT NULL,
	`card_id` text NOT NULL,
	`result` text NOT NULL,
	`reviewed_at` text NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT OR IGNORE INTO `languages` (`code`, `title`, `created_at`) VALUES ('en', 'English', datetime('now'));
