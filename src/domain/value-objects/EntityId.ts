import { z } from 'zod';

export const EntityIdSchema = z.string().trim().min(1);
export type EntityId = z.infer<typeof EntityIdSchema>;

export const IsoDateTimeSchema = z.string().trim().min(1);
export type IsoDateTime = z.infer<typeof IsoDateTimeSchema>;

export const NonEmptyTextSchema = z.string().trim().min(1);
export type NonEmptyText = z.infer<typeof NonEmptyTextSchema>;
