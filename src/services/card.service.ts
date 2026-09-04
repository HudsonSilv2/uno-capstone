import Card from '../models/card.model';
import { AppError } from '../middlewares/error.middleware';

export class CardService {
  public async createCard(data: { color: string; value: string; gameId: number }) {
    if (!data.color || !data.value || !data.gameId) {
      throw new AppError('Color, value, and gameId are required', 400);
    }

    const validColors = ['red', 'blue', 'yellow', 'green', 'wild'];
    const validValues = [
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      'Skip',
      'Reverse',
      'Draw Two',
      'Wild Card',
      'Wild Draw Four',
    ];

    if (!validColors.includes(data.color)) {
      throw new AppError('Color must be red, blue, yellow, green, or wild', 400);
    }

    if (!validValues.includes(data.value)) {
      throw new AppError('Value must be a valid UNO card', 400);
    }

    return await Card.create(data);
  }

  public async getCardById(id: number) {
    const card = await Card.findByPk(id);
    if (!card) {
      throw new AppError('Card not found', 404);
    }
    return card;
  }

  public async updateCard(id: number, data: { color?: string; value?: string; gameId?: number }) {
    const card = await this.getCardById(id);

    if (data.color !== undefined) {
      const validColors = ['red', 'blue', 'yellow', 'green', 'wild'];
      if (!validColors.includes(data.color)) {
        throw new AppError('Color must be red, blue, yellow, green, or wild', 400);
      }
    }

    if (data.value !== undefined) {
      const validValues = [
        '0',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        'Skip',
        'Reverse',
        'Draw Two',
        'Wild Card',
        'Wild Draw Four',
      ];
      if (!validValues.includes(data.value)) {
        throw new AppError('Value must be a valid UNO card', 400);
      }
    }

    if (data.gameId === null) {
      throw new AppError('gameId cannot be removed', 400);
    }

    return await card.update(data);
  }

  public async deleteCard(id: number) {
    const card = await this.getCardById(id);
    await card.destroy();
    return { message: 'Card deleted successfully' };
  }

  public async getCardsByGameId(gameId: number) {
    const cards = await Card.findAll({ where: { gameId } });
    return cards;
  }
}
