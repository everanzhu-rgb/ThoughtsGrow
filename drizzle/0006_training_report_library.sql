CREATE TABLE `training_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`source` text DEFAULT '' NOT NULL,
	`source_url` text DEFAULT '' NOT NULL,
	`domain` text DEFAULT '' NOT NULL,
	`article_excerpt` text DEFAULT '' NOT NULL,
	`report_content` text DEFAULT '' NOT NULL,
	`analysis_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `training_reports_created_idx` ON `training_reports` (`created_at`);
