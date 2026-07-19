CREATE TABLE `analysis_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`record_id` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`structure_json` text DEFAULT '{}' NOT NULL,
	`assessments_json` text DEFAULT '[]' NOT NULL,
	`issues_json` text DEFAULT '[]' NOT NULL,
	`framework_version` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `assessment_frameworks` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`version` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`definition_json` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `conversation_turns` (
	`id` text PRIMARY KEY NOT NULL,
	`record_id` text NOT NULL,
	`kind` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`turn_number` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `thinking_records` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`scene` text NOT NULL,
	`mode` text DEFAULT 'record' NOT NULL,
	`status` text DEFAULT 'saved' NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`primary_issue` text DEFAULT '' NOT NULL,
	`framework_version` text DEFAULT 'Critical Thinking Base V1.0' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `training_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`record_id` text NOT NULL,
	`topic_id` text,
	`focus_element` text NOT NULL,
	`focus_standard` text NOT NULL,
	`before_score` real NOT NULL,
	`after_score` real NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `training_topics` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`focus_element` text NOT NULL,
	`focus_standard` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`session_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
