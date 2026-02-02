CREATE TABLE `daily_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer,
	`event_type` text NOT NULL,
	`event_data` text,
	`timestamp` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `memory_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content` text NOT NULL,
	`content_hash` text,
	`category` text NOT NULL,
	`source` text NOT NULL,
	`created_at` text NOT NULL,
	`last_accessed` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `memory_entries_content_hash_unique` ON `memory_entries` (`content_hash`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`started_at` text NOT NULL,
	`ended_at` text,
	`end_trigger` text,
	`summary` text
);
