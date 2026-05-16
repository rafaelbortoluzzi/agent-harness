CREATE TABLE `recommendations` (
	`id` text PRIMARY KEY NOT NULL,
	`repo_path` text NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`rationale` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `items` ADD `quality_score` integer;--> statement-breakpoint
ALTER TABLE `items` ADD `quality_rationale` text;--> statement-breakpoint
ALTER TABLE `items` ADD `judged_at` text;