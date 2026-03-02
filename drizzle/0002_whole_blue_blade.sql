CREATE TABLE `academy_progress` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` text NOT NULL,
	`topic_id` text NOT NULL,
	`status` text DEFAULT 'not_started' NOT NULL,
	`started_at` text,
	`completed_at` text,
	`interaction_count` integer DEFAULT 0 NOT NULL,
	`teaching_notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `academy_progress_project_topic_idx` ON `academy_progress` (`project_id`,`topic_id`);--> statement-breakpoint
CREATE TABLE `behavior_rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`rule` text NOT NULL,
	`category` text NOT NULL,
	`source` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`rationale` text,
	`example` text,
	`created_at` text NOT NULL,
	`superseded_at` text
);
--> statement-breakpoint
CREATE TABLE `conversation_evaluations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer,
	`scores` text NOT NULL,
	`overall` text NOT NULL,
	`strengths` text NOT NULL,
	`improvements` text NOT NULL,
	`model` text NOT NULL,
	`active_rule_ids` text,
	`evaluated_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `observations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pattern` text NOT NULL,
	`pattern_type` text NOT NULL,
	`evidence` text,
	`session_id` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `bills` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`notion_id` text,
	`title` text NOT NULL,
	`amount` real,
	`due_date` text,
	`paid` integer DEFAULT false,
	`category` text,
	`frequency` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bills_notion_id_unique` ON `bills` (`notion_id`);--> statement-breakpoint
CREATE TABLE `goals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`notion_id` text,
	`title` text NOT NULL,
	`status` text DEFAULT 'not_started' NOT NULL,
	`target_date` text,
	`progress` real DEFAULT 0,
	`area` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `goals_notion_id_unique` ON `goals` (`notion_id`);--> statement-breakpoint
CREATE TABLE `habits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`notion_id` text,
	`title` text NOT NULL,
	`frequency` text DEFAULT 'daily' NOT NULL,
	`streak` integer DEFAULT 0,
	`last_completed` text,
	`area` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `habits_notion_id_unique` ON `habits` (`notion_id`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`notion_id` text,
	`title` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`area` text,
	`priority` text,
	`timeline_start` text,
	`timeline_end` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_notion_id_unique` ON `projects` (`notion_id`);--> statement-breakpoint
CREATE TABLE `sync_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`domain` text NOT NULL,
	`direction` text NOT NULL,
	`local_id` integer,
	`notion_id` text,
	`action` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`error_message` text,
	`created_at` text NOT NULL,
	`synced_at` text
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`notion_id` text,
	`title` text NOT NULL,
	`status` text DEFAULT 'not_started' NOT NULL,
	`due_date` text,
	`priority` text,
	`frequency` text,
	`project_id` integer,
	`notion_project_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`synced_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_notion_id_unique` ON `tasks` (`notion_id`);--> statement-breakpoint
ALTER TABLE `memory_entries` ADD `deleted_at` text;