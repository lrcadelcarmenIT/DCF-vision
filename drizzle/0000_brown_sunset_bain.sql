CREATE TABLE `inspection_events` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`line_id` text NOT NULL,
	`category` text NOT NULL,
	`status` text NOT NULL,
	`confidence` real NOT NULL,
	`message` text NOT NULL,
	`affected_units` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`line_id`) REFERENCES `production_lines`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_inspection_events_org_created` ON `inspection_events` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_inspection_events_line_created` ON `inspection_events` (`line_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`site` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_organizations_owner_id` ON `organizations` (`owner_id`);--> statement-breakpoint
CREATE TABLE `production_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`product` text NOT NULL,
	`status` text NOT NULL,
	`target_rate` integer NOT NULL,
	`current_rate` integer NOT NULL,
	`quality_score` real NOT NULL,
	`downtime_minutes` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_production_lines_org_id` ON `production_lines` (`organization_id`);
--> statement-breakpoint
PRAGMA optimize;
