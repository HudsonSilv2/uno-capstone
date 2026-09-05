import { Op } from 'sequelize';
import Card from '../../models/card.model';
import { drawCardsForPlayer, reshuffleDiscardIntoDeck } from '../deck.service';

jest.mock('../../models/card.model', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
  },
}));

const mockedCard = Card as unknown as {
  findOne: jest.Mock;
  findAll: jest.Mock;
  update: jest.Mock;
};

describe('reshuffleDiscardIntoDeck', () => {
  it('does nothing when the discard pile is empty', async () => {
    mockedCard.findOne.mockResolvedValue(null);

    await reshuffleDiscardIntoDeck(1);

    expect(mockedCard.update).not.toHaveBeenCalled();
  });

  it('moves every discarded card back except the current top one', async () => {
    mockedCard.findOne.mockResolvedValue({ id: 42 });
    mockedCard.update.mockResolvedValue([1]);

    await reshuffleDiscardIntoDeck(1);

    expect(mockedCard.update).toHaveBeenCalledWith(
      { location: 'deck', playerId: null },
      { where: { gameId: 1, location: 'discard', id: { [Op.ne]: 42 } } }
    );
  });
});

describe('drawCardsForPlayer', () => {
  it('moves the requested cards into the hand when the deck can cover it', async () => {
    const cards = [{ id: 1 }, { id: 2 }];
    mockedCard.findAll.mockResolvedValue(cards);
    mockedCard.update.mockResolvedValue([2]);

    const result = await drawCardsForPlayer(10, 7, 2);

    expect(result).toEqual(cards);
    expect(mockedCard.findAll).toHaveBeenCalledTimes(1);
    expect(mockedCard.update).toHaveBeenCalledWith(
      { playerId: 7, location: 'hand' },
      { where: { id: { [Op.in]: [1, 2] } } }
    );
  });

  /*
    This is the case that used to fail: late in a round the deck is empty, which
    is exactly when a penalty is most likely to be handed out.
  */
  it('recycles the discard pile when the deck cannot cover the request', async () => {
    mockedCard.findAll
      .mockResolvedValueOnce([]) // deck vazio na primeira tentativa
      .mockResolvedValueOnce([{ id: 5 }, { id: 6 }]); // depois de reciclar
    mockedCard.findOne.mockResolvedValue({ id: 99 }); // topo do descarte
    mockedCard.update.mockResolvedValue([2]);

    const result = await drawCardsForPlayer(10, 7, 2);

    expect(result).toEqual([{ id: 5 }, { id: 6 }]);
    expect(mockedCard.findAll).toHaveBeenCalledTimes(2);
    /* A reciclagem devolve o descarte, e só então as cartas vão para a mão. */
    expect(mockedCard.update).toHaveBeenCalledWith(
      { location: 'deck', playerId: null },
      { where: { gameId: 10, location: 'discard', id: { [Op.ne]: 99 } } }
    );
    expect(mockedCard.update).toHaveBeenLastCalledWith(
      { playerId: 7, location: 'hand' },
      { where: { id: { [Op.in]: [5, 6] } } }
    );
  });

  it('recycles when the deck has some cards but not enough', async () => {
    mockedCard.findAll
      .mockResolvedValueOnce([{ id: 5 }])
      .mockResolvedValueOnce([{ id: 5 }, { id: 6 }, { id: 7 }, { id: 8 }]);
    mockedCard.findOne.mockResolvedValue({ id: 99 });
    mockedCard.update.mockResolvedValue([4]);

    const result = await drawCardsForPlayer(10, 7, 4);

    expect(result).toHaveLength(4);
    expect(mockedCard.findAll).toHaveBeenCalledTimes(2);
  });

  it('returns nothing when there is no card left anywhere', async () => {
    mockedCard.findAll.mockResolvedValue([]);
    mockedCard.findOne.mockResolvedValue(null);

    const result = await drawCardsForPlayer(10, 7, 2);

    expect(result).toEqual([]);
    expect(mockedCard.update).not.toHaveBeenCalled();
  });
});
