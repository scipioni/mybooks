ALTER TABLE `books` ADD `updated_at` integer;--> statement-breakpoint
UPDATE `books` SET `updated_at` = `created_at` WHERE `updated_at` IS NULL;
