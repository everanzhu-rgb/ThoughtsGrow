CREATE TABLE IF NOT EXISTS `cabinet_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`cabinet_item_id` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `cabinet_comments_item_idx` ON `cabinet_comments` (`cabinet_item_id`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `usage_daily` (
	`day` text PRIMARY KEY NOT NULL,
	`duration_seconds` integer DEFAULT 0 NOT NULL,
	`last_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
