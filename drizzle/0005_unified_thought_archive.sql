ALTER TABLE `thinking_records` ADD `source` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `thinking_records` ADD `source_url` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `thinking_records` ADD `note` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `thinking_records` ADD `tags_json` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE `thinking_records` ADD `importance` integer DEFAULT 3 NOT NULL;
--> statement-breakpoint
ALTER TABLE `thinking_records` ADD `annotations_json` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE `thinking_records` ADD `analysis_report_json` text DEFAULT '{}' NOT NULL;
--> statement-breakpoint
ALTER TABLE `thinking_records` ADD `report_content` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `thinking_records` ADD `next_review_at` text;
--> statement-breakpoint
ALTER TABLE `thinking_records` ADD `review_count` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `thinking_records` ADD `merged_from_json` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
CREATE TABLE `cabinet_items` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text DEFAULT 'quote' NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`source` text DEFAULT '' NOT NULL,
	`image_url` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT OR IGNORE INTO `thinking_records` (`id`,`title`,`content`,`scene`,`mode`,`status`,`summary`,`primary_issue`,`source`,`note`,`tags_json`,`importance`,`analysis_report_json`,`created_at`,`updated_at`,`deleted_at`,`delete_after`)
SELECT 'legacy-import-' || `id`, substr(CASE WHEN `source` = '' THEN '知识导入' ELSE `source` END,1,80), `content`, '阅读与输入', 'record', CASE WHEN `analysis_json` = '{}' THEN 'saved' ELSE 'analyzed' END, '', '', `source`, `note`, '["知识导入"]', 3, `analysis_json`, `created_at`, `updated_at`, `deleted_at`, `delete_after` FROM `knowledge_imports`;
