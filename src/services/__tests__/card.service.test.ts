import { CardService } from '../card.service';
import Card from '../../models/card.model';

jest.mock('../../models/card.model', () => ({
  __esModule: true,
  default: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  },
}));

const mockedCard = Card as unknown as {
  findByPk: jest.Mock;
  findAll: jest.Mock;
  create: jest.Mock;
};

describe('CardService', () => {
  const cardService = new CardService();

  describe('createCard', () => {
    it('creates a card when color, value and gameId are valid', async () => {
      const data = { color: 'blue', value: '3', gameId: 1 };
      mockedCard.create.mockResolvedValue({ id: 1, ...data });

      const result = await cardService.createCard(data);

      expect(mockedCard.create).toHaveBeenCalledWith(data);
      expect(result).toEqual({ id: 1, ...data });
    });

    it('throws AppError(400) when color is missing', async () => {
      await expect(
        cardService.createCard({ color: '', value: '3', gameId: 1 })
      ).rejects.toMatchObject({
        message: 'Color, value, and gameId are required',
        statusCode: 400,
      });
      expect(mockedCard.create).not.toHaveBeenCalled();
    });

    it('throws AppError(400) when value is missing', async () => {
      await expect(
        cardService.createCard({ color: 'blue', value: '', gameId: 1 })
      ).rejects.toMatchObject({
        message: 'Color, value, and gameId are required',
        statusCode: 400,
      });
    });

    it('throws AppError(400) when gameId is missing', async () => {
      await expect(
        cardService.createCard({ color: 'blue', value: '3', gameId: 0 })
      ).rejects.toMatchObject({
        message: 'Color, value, and gameId are required',
        statusCode: 400,
      });
    });

    it('throws AppError(400) when color is not one of the valid colors', async () => {
      await expect(
        cardService.createCard({ color: 'pink', value: '3', gameId: 1 })
      ).rejects.toMatchObject({
        message: 'Color must be red, blue, yellow, green, or wild',
        statusCode: 400,
      });
      expect(mockedCard.create).not.toHaveBeenCalled();
    });

    it('throws AppError(400) when value is not a valid UNO card value', async () => {
      await expect(
        cardService.createCard({ color: 'blue', value: 'Joker', gameId: 1 })
      ).rejects.toMatchObject({
        message: 'Value must be a valid UNO card',
        statusCode: 400,
      });
      expect(mockedCard.create).not.toHaveBeenCalled();
    });
  });

  describe('getCardById', () => {
    it('returns the card when found', async () => {
      const card = { id: 1, color: 'blue', value: '3', gameId: 1 };
      mockedCard.findByPk.mockResolvedValue(card);

      const result = await cardService.getCardById(1);

      expect(mockedCard.findByPk).toHaveBeenCalledWith(1);
      expect(result).toBe(card);
    });

    it('throws AppError(404) when the card does not exist', async () => {
      mockedCard.findByPk.mockResolvedValue(null);

      await expect(cardService.getCardById(999)).rejects.toMatchObject({
        message: 'Card not found',
        statusCode: 404,
      });
    });
  });

  describe('updateCard', () => {
    it('updates the card when the new color and value are valid', async () => {
      const update = jest.fn().mockResolvedValue({ id: 1, color: 'red', value: 'Skip', gameId: 1 });
      const existingCard = { id: 1, color: 'blue', value: '3', gameId: 1, update };
      mockedCard.findByPk.mockResolvedValue(existingCard);

      await cardService.updateCard(1, { color: 'red', value: 'Skip' });

      expect(update).toHaveBeenCalledWith({ color: 'red', value: 'Skip' });
    });

    it('throws AppError(400) when the new color is invalid', async () => {
      const update = jest.fn();
      mockedCard.findByPk.mockResolvedValue({
        id: 1,
        color: 'blue',
        value: '3',
        gameId: 1,
        update,
      });

      await expect(cardService.updateCard(1, { color: 'pink' })).rejects.toMatchObject({
        message: 'Color must be red, blue, yellow, green, or wild',
        statusCode: 400,
      });
      expect(update).not.toHaveBeenCalled();
    });

    it('throws AppError(400) when the new value is invalid', async () => {
      const update = jest.fn();
      mockedCard.findByPk.mockResolvedValue({
        id: 1,
        color: 'blue',
        value: '3',
        gameId: 1,
        update,
      });

      await expect(cardService.updateCard(1, { value: 'Joker' })).rejects.toMatchObject({
        message: 'Value must be a valid UNO card',
        statusCode: 400,
      });
      expect(update).not.toHaveBeenCalled();
    });

    it('throws AppError(400) when gameId is explicitly set to null', async () => {
      const update = jest.fn();
      mockedCard.findByPk.mockResolvedValue({
        id: 1,
        color: 'blue',
        value: '3',
        gameId: 1,
        update,
      });

      await expect(
        cardService.updateCard(1, { gameId: null as unknown as number })
      ).rejects.toMatchObject({
        message: 'gameId cannot be removed',
        statusCode: 400,
      });
      expect(update).not.toHaveBeenCalled();
    });

    it('throws AppError(404) when the card does not exist', async () => {
      mockedCard.findByPk.mockResolvedValue(null);

      await expect(cardService.updateCard(999, { color: 'red' })).rejects.toMatchObject({
        message: 'Card not found',
        statusCode: 404,
      });
    });
  });

  describe('deleteCard', () => {
    it('deletes the card when it exists', async () => {
      const destroy = jest.fn().mockResolvedValue(undefined);
      mockedCard.findByPk.mockResolvedValue({ id: 1, destroy });

      const result = await cardService.deleteCard(1);

      expect(destroy).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Card deleted successfully' });
    });

    it('throws AppError(404) when the card does not exist', async () => {
      mockedCard.findByPk.mockResolvedValue(null);

      await expect(cardService.deleteCard(999)).rejects.toMatchObject({
        message: 'Card not found',
        statusCode: 404,
      });
    });
  });

  describe('getCardsByGameId', () => {
    it('returns every card that belongs to the game', async () => {
      const cards = [
        { id: 1, color: 'blue', value: '3', gameId: 1 },
        { id: 2, color: 'red', value: '5', gameId: 1 },
      ];
      mockedCard.findAll.mockResolvedValue(cards);

      const result = await cardService.getCardsByGameId(1);

      expect(mockedCard.findAll).toHaveBeenCalledWith({ where: { gameId: 1 } });
      expect(result).toEqual(cards);
    });

    it('returns an empty array when the game has no cards', async () => {
      mockedCard.findAll.mockResolvedValue([]);

      const result = await cardService.getCardsByGameId(999);

      expect(result).toEqual([]);
    });
  });
});
