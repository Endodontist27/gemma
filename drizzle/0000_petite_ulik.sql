CREATE TABLE `answer_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`answer_id` text NOT NULL,
	`session_id` text NOT NULL,
	`source_type` text NOT NULL,
	`source_record_id` text NOT NULL,
	`label` text NOT NULL,
	`excerpt` text NOT NULL,
	`relevance_score` real NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`answer_id`) REFERENCES `answers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `lecture_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "answer_sources_type_check" CHECK("answer_sources"."source_type" in ('glossary_term', 'material_chunk', 'transcript_entry'))
);
--> statement-breakpoint
CREATE INDEX `answer_sources_answer_idx` ON `answer_sources` (`answer_id`);--> statement-breakpoint
CREATE INDEX `answer_sources_session_idx` ON `answer_sources` (`session_id`);--> statement-breakpoint
CREATE TABLE `answers` (
	`id` text PRIMARY KEY NOT NULL,
	`question_id` text NOT NULL,
	`session_id` text NOT NULL,
	`text` text NOT NULL,
	`state` text NOT NULL,
	`confidence_score` real NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `lecture_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "answers_state_check" CHECK("answers"."state" in ('grounded', 'unsupported')),
	CONSTRAINT "answers_confidence_check" CHECK("answers"."confidence_score" >= 0 and "answers"."confidence_score" <= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `answers_question_idx` ON `answers` (`question_id`);--> statement-breakpoint
CREATE INDEX `answers_session_idx` ON `answers` (`session_id`);--> statement-breakpoint
CREATE TABLE `bookmarks` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`label` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `lecture_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "bookmarks_target_type_check" CHECK("bookmarks"."target_type" in ('lecture_material', 'material_chunk', 'glossary_term', 'transcript_entry'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bookmarks_session_target_idx` ON `bookmarks` (`session_id`,`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `bookmarks_session_idx` ON `bookmarks` (`session_id`);--> statement-breakpoint
CREATE TABLE `glossary_terms` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`term` text NOT NULL,
	`aliases_json` text DEFAULT '[]' NOT NULL,
	`definition` text NOT NULL,
	`order_index` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `lecture_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `glossary_terms_session_idx` ON `glossary_terms` (`session_id`,`order_index`);--> statement-breakpoint
CREATE UNIQUE INDEX `glossary_terms_session_term_idx` ON `glossary_terms` (`session_id`,`term`);--> statement-breakpoint
CREATE TABLE `lecture_materials` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`title` text NOT NULL,
	`type` text NOT NULL,
	`source_label` text NOT NULL,
	`content_text` text NOT NULL,
	`order_index` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `lecture_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "lecture_materials_type_check" CHECK("lecture_materials"."type" in ('slide_deck', 'handout', 'reading', 'code_sample'))
);
--> statement-breakpoint
CREATE INDEX `lecture_materials_session_idx` ON `lecture_materials` (`session_id`,`order_index`);--> statement-breakpoint
CREATE TABLE `lecture_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`course_code` text NOT NULL,
	`lecturer` text NOT NULL,
	`description` text NOT NULL,
	`location` text NOT NULL,
	`starts_at` text NOT NULL,
	`status` text NOT NULL,
	`source_pack_version` text NOT NULL,
	`tags_json` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "lecture_sessions_status_check" CHECK("lecture_sessions"."status" in ('scheduled', 'live', 'ended'))
);
--> statement-breakpoint
CREATE INDEX `lecture_sessions_starts_at_idx` ON `lecture_sessions` (`starts_at`);--> statement-breakpoint
CREATE TABLE `material_chunks` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`material_id` text NOT NULL,
	`heading` text NOT NULL,
	`text` text NOT NULL,
	`keywords_json` text DEFAULT '[]' NOT NULL,
	`order_index` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `lecture_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`material_id`) REFERENCES `lecture_materials`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `material_chunks_material_idx` ON `material_chunks` (`material_id`,`order_index`);--> statement-breakpoint
CREATE INDEX `material_chunks_session_idx` ON `material_chunks` (`session_id`);--> statement-breakpoint
CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`content` text NOT NULL,
	`anchor_type` text NOT NULL,
	`anchor_id` text,
	`pinned` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `lecture_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "notes_anchor_type_check" CHECK("notes"."anchor_type" in ('session', 'lecture_material', 'material_chunk', 'transcript_entry'))
);
--> statement-breakpoint
CREATE INDEX `notes_session_idx` ON `notes` (`session_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `qa_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`key` text NOT NULL,
	`label` text NOT NULL,
	`description` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `lecture_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `qa_categories_session_key_idx` ON `qa_categories` (`session_id`,`key`);--> statement-breakpoint
CREATE INDEX `qa_categories_session_idx` ON `qa_categories` (`session_id`);--> statement-breakpoint
CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`category_id` text,
	`text` text NOT NULL,
	`normalized_text` text NOT NULL,
	`status` text NOT NULL,
	`visibility` text NOT NULL,
	`origin` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `lecture_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `qa_categories`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "questions_status_check" CHECK("questions"."status" in ('supported', 'unsupported')),
	CONSTRAINT "questions_visibility_check" CHECK("questions"."visibility" in ('public', 'private')),
	CONSTRAINT "questions_origin_check" CHECK("questions"."origin" in ('seed_public', 'user_local'))
);
--> statement-breakpoint
CREATE INDEX `questions_session_idx` ON `questions` (`session_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `questions_session_visibility_idx` ON `questions` (`session_id`,`visibility`);--> statement-breakpoint
CREATE INDEX `questions_normalized_text_idx` ON `questions` (`normalized_text`);--> statement-breakpoint
CREATE TABLE `summaries` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`text` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `lecture_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "summaries_kind_check" CHECK("summaries"."kind" in ('overview', 'key_points', 'exam_focus'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `summaries_session_kind_idx` ON `summaries` (`session_id`,`kind`);--> statement-breakpoint
CREATE TABLE `transcript_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`speaker_label` text NOT NULL,
	`text` text NOT NULL,
	`started_at_seconds` integer NOT NULL,
	`order_index` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `lecture_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `transcript_entries_session_idx` ON `transcript_entries` (`session_id`,`order_index`);