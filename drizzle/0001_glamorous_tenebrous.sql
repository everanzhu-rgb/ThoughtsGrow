CREATE TABLE `knowledge_imports` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`source` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`analysis_json` text DEFAULT '{}' NOT NULL,
	`disposition` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
