CREATE TABLE IF NOT EXISTS `record_relations` (
	`id` text PRIMARY KEY NOT NULL,
	`from_record_id` text NOT NULL,
	`to_record_id` text NOT NULL,
	`relation` text DEFAULT 'related' NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `record_relations_from_idx` ON `record_relations` (`from_record_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `record_relations_to_idx` ON `record_relations` (`to_record_id`);
