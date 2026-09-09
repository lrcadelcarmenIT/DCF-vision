ALTER TABLE `inspection_events` ADD `source` text DEFAULT 'demo' NOT NULL;--> statement-breakpoint
ALTER TABLE `inspection_events` ADD `scenario` text;--> statement-breakpoint
ALTER TABLE `inspection_events` ADD `expected` text;--> statement-breakpoint
ALTER TABLE `inspection_events` ADD `observed` text;--> statement-breakpoint
ALTER TABLE `inspection_events` ADD `review_status` text DEFAULT 'unreviewed' NOT NULL;--> statement-breakpoint
ALTER TABLE `inspection_events` ADD `review_note` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `inspection_events` ADD `reviewed_at` text;--> statement-breakpoint
ALTER TABLE `inspection_events` ADD `reviewed_by` text;