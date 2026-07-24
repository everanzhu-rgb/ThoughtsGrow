ALTER TABLE `inspiration_favorites` ADD `translation` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `inspiration_favorites` ADD `source` text DEFAULT '' NOT NULL;
--> statement-breakpoint
CREATE TABLE `framework_node_positions` (
	`node_id` text PRIMARY KEY NOT NULL,
	`x` real NOT NULL,
	`y` real NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
