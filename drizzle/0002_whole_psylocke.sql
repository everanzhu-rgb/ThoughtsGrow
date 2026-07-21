CREATE TABLE `source_materials` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`source_url` text,
	`object_key` text,
	`mime_type` text DEFAULT 'text/plain' NOT NULL,
	`size_bytes` integer DEFAULT 0 NOT NULL,
	`extracted_text` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
