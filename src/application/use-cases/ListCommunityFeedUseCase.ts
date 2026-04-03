import type { CommunityQuestionDto } from '@application/dto/CommunityQuestionDto';
import type { AnswerRepository } from '@domain/repository-contracts/AnswerRepository';
import type { AnswerSourceRepository } from '@domain/repository-contracts/AnswerSourceRepository';
import type { QACategoryRepository } from '@domain/repository-contracts/QACategoryRepository';
import type { QuestionRepository } from '@domain/repository-contracts/QuestionRepository';

export class ListCommunityFeedUseCase {
  constructor(
    private readonly questionRepository: QuestionRepository,
    private readonly answerRepository: AnswerRepository,
    private readonly answerSourceRepository: AnswerSourceRepository,
    private readonly qaCategoryRepository: QACategoryRepository,
  ) {}

  async execute(sessionId: string): Promise<CommunityQuestionDto[]> {
    const questions = await this.questionRepository.listPublicBySession(sessionId);
    const answers = await this.answerRepository.listByQuestionIds(
      questions.map((question) => question.id),
    );
    const answerByQuestionId = new Map(answers.map((answer) => [answer.questionId, answer]));
    const sources = await this.answerSourceRepository.listByAnswerIds(
      answers.map((answer) => answer.id),
    );
    const categories = await this.qaCategoryRepository.listBySession(sessionId);
    const categoryById = new Map(categories.map((category) => [category.id, category]));

    return questions.map((question) => {
      const answer = answerByQuestionId.get(question.id) ?? null;
      return {
        question,
        answer,
        sources: answer ? sources.filter((source) => source.answerId === answer.id) : [],
        category: question.categoryId ? (categoryById.get(question.categoryId) ?? null) : null,
      };
    });
  }
}
