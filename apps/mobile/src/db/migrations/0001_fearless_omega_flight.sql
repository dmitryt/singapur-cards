CREATE TABLE `sync_changes` (
	`id` text PRIMARY KEY NOT NULL,
	`device_id` text NOT NULL,
	`table_name` text NOT NULL,
	`row_id` text NOT NULL,
	`op_type` text NOT NULL,
	`logical_clock` integer NOT NULL,
	`payload_json` text NOT NULL,
	`request_id` text,
	`applied_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_sync_changes_device_clock` ON `sync_changes` (`device_id`,`logical_clock`);--> statement-breakpoint
CREATE INDEX `idx_sync_changes_table_row` ON `sync_changes` (`table_name`,`row_id`);--> statement-breakpoint
CREATE INDEX `idx_sync_changes_applied_at` ON `sync_changes` (`applied_at`);--> statement-breakpoint
CREATE TABLE `sync_cursors` (
	`peer_device_id` text PRIMARY KEY NOT NULL,
	`last_remote_logical_clock` integer DEFAULT 0 NOT NULL,
	`last_acknowledged_local_logical_clock` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_devices` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`host` text,
	`port` integer,
	`is_local` integer DEFAULT false NOT NULL,
	`paired_at` text,
	`last_sync_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_state` (
	`id` text PRIMARY KEY DEFAULT 'local' NOT NULL,
	`paired_desktop_id` text,
	`last_sync_at` text,
	`last_sync_result` text,
	`last_sync_error` text,
	`last_request_id` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_tombstones` (
	`id` text PRIMARY KEY NOT NULL,
	`device_id` text NOT NULL,
	`table_name` text NOT NULL,
	`row_id` text NOT NULL,
	`logical_clock` integer NOT NULL,
	`request_id` text,
	`deleted_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_sync_tombstones_device_clock` ON `sync_tombstones` (`device_id`,`logical_clock`);--> statement-breakpoint
CREATE INDEX `idx_sync_tombstones_table_row` ON `sync_tombstones` (`table_name`,`row_id`);