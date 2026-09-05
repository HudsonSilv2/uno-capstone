import { Op } from 'sequelize';
import Card from '../models/card.model';

/*
  Shared deck handling.

  Three places take cards out of the deck: the Draw Two / Wild Draw Four effect
  in advanceTurn, the player drawing on their own turn, and the UNO challenge
  penalty. Each used to query the deck on its own, and only one of them put the
  discard pile back when the deck ran dry — so late in a round, when the deck is
  most likely empty, a penalty could quietly draw nothing at all.

  Everything that pulls cards goes through here now.
*/

/*
  Moves every discarded card except the current top one back into the deck, so
  the round can keep going once the deck runs out.
*/
export async function reshuffleDiscardIntoDeck(gameId: number): Promise<void> {
  const topDiscard = await Card.findOne({
    where: { gameId, location: 'discard' },
    order: [
      ['updatedAt', 'DESC'],
      ['id', 'DESC'],
    ],
  });

  if (!topDiscard) {
    return;
  }

  await Card.update(
    { location: 'deck', playerId: null },
    { where: { gameId, location: 'discard', id: { [Op.ne]: topDiscard.id } } }
  );
}

async function takeFromDeck(gameId: number, count: number): Promise<Card[]> {
  return Card.findAll({
    where: { gameId, location: 'deck', playerId: null },
    limit: count,
    order: [['id', 'ASC']],
  });
}

/*
  Moves up to `count` cards from the deck into the player's hand, reshuffling
  the discard pile back in when the deck cannot cover the request. Returns the
  cards actually drawn, which is fewer than asked only when the discard pile
  had nothing left to recycle either.
*/
export async function drawCardsForPlayer(
  gameId: number,
  playerId: number,
  count: number
): Promise<Card[]> {
  let deckCards = await takeFromDeck(gameId, count);

  if (deckCards.length < count) {
    await reshuffleDiscardIntoDeck(gameId);
    deckCards = await takeFromDeck(gameId, count);
  }

  if (deckCards.length === 0) {
    return [];
  }

  await Card.update(
    { playerId, location: 'hand' },
    { where: { id: { [Op.in]: deckCards.map((card) => card.id) } } }
  );

  return deckCards;
}
