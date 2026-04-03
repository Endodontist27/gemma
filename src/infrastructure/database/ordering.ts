import { sql } from 'drizzle-orm';

import { answerSources, summaries } from '@infrastructure/database/schema';

export const summaryKindOrder = sql<number>`case
  when ${summaries.kind} = 'overview' then 0
  when ${summaries.kind} = 'key_points' then 1
  when ${summaries.kind} = 'exam_focus' then 2
  else 99
end`;

export const answerSourcePriorityOrder = sql<number>`case
  when ${answerSources.sourceType} = 'glossary_term' then 0
  when ${answerSources.sourceType} = 'material_chunk' then 1
  when ${answerSources.sourceType} = 'transcript_entry' then 2
  else 99
end`;
