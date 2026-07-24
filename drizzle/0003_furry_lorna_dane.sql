CREATE TABLE `activity_events` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`occurred_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `framework_node_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`node_id` text NOT NULL,
	`title` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `inspiration_favorites` (
	`id` text PRIMARY KEY NOT NULL,
	`quote` text NOT NULL,
	`author` text DEFAULT '' NOT NULL,
	`language` text DEFAULT 'zh' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE `knowledge_imports` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `knowledge_imports` ADD `delete_after` text;--> statement-breakpoint
ALTER TABLE `thinking_records` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `thinking_records` ADD `delete_after` text;