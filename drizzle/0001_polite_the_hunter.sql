PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`content` text NOT NULL,
	`anchor_type` text NOT NULL,
	`anchor_id` text,
	`pinned` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `lecture_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "notes_anchor_type_check" CHECK("__new_notes"."anchor_type" in ('session', 'lecture_material', 'material_chunk', 'glossary_term', 'transcript_entry'))
);
--> statement-breakpoint
INSERT INTO `__new_notes`("id", "session_id", "content", "anchor_type", "anchor_id", "pinned", "created_at", "updated_at") SELECT "id", "session_id", "content", "anchor_type", "anchor_id", "pinned", "created_at", "updated_at" FROM `notes`;--> statement-breakpoint
DROP TABLE `notes`;--> statement-breakpoint
ALTER TABLE `__new_notes` RENAME TO `notes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `notes_session_idx` ON `notes` (`session_id`,`updated_at`);