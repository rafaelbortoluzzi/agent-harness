CREATE TABLE `ai_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`action` text NOT NULL,
	`provider` text,
	`preset_id` text,
	`target` text NOT NULL,
	`system_prompt` text NOT NULL,
	`user_prompt` text NOT NULL,
	`result_summary` text,
	`status` text NOT NULL,
	`created_at` text NOT NULL
);
