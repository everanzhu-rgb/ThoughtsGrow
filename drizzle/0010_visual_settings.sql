CREATE TABLE IF NOT EXISTS `visual_settings` (
	`page` text PRIMARY KEY NOT NULL,
	`object_key` text NOT NULL,
	`mime_type` text DEFAULT 'image/jpeg' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
