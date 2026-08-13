CREATE TABLE IF NOT EXISTS `base_default_deletions` (
  `entity_id` text PRIMARY KEY NOT NULL,
  `entity_type` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
