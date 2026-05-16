CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`runtime` text NOT NULL,
	`scope` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`path` text NOT NULL,
	`repo_path` text,
	`health` text DEFAULT 'ok' NOT NULL,
	`issues` text DEFAULT '[]' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`scanned_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `repos` (
	`path` text PRIMARY KEY NOT NULL,
	`label` text,
	`source` text NOT NULL,
	`added_at` text NOT NULL,
	`last_scanned_at` text,
	`health_score` integer
);
--> statement-breakpoint
CREATE TABLE `scans` (
	`id` text PRIMARY KEY NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`repos_scanned` integer DEFAULT 0,
	`items_found` integer DEFAULT 0,
	`items_broken` integer DEFAULT 0,
	`status` text DEFAULT 'running' NOT NULL,
	`error` text
);
--> statement-breakpoint
CREATE TABLE `snoozed_items` (
	`item_id` text PRIMARY KEY NOT NULL,
	`reason` text,
	`snoozed_at` text NOT NULL,
	`until_date` text
);
