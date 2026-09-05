/*
  Verificação ao vivo de GAME-09, GAME-10 e GAME-11 contra a API real.
  As mãos e o descarte são manipulados direto no banco para tornar cada
  cenário determinístico.
*/
import { execFileSync } from 'child_process';

const BASE = `${process.env.API_URL ?? 'http://localhost:3000'}/api`;
const stamp = Date.now();
let pass = 0;
let fail = 0;

function sql(query) {
  return execFileSync(
    'docker',
    ['exec', 'uno-postgres', 'psql', '-U', 'postgres', '-d', process.env.DB_NAME ?? 'uno_game', '-t', '-A', '-c', query],
    { encoding: 'utf8' }
  ).trim();
}

async function call(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

function check(label, condition, detail = '') {
  if (condition) {
    pass += 1;
    console.log(`  OK   ${label}`);
  } else {
    fail += 1;
    console.log(`  FALHA ${label} ${detail}`);
  }
}

async function mkPlayer(name) {
  const email = `${name}.${stamp}@uno.test`;
  await call('/auth/register', { method: 'POST', body: { name, email, password: 'senha123' } });
  const login = await call('/auth/login', { method: 'POST', body: { email, password: 'senha123' } });
  return { name, token: login.data.token, id: login.data.player.id };
}

async function newGame(players, maxPlayers, markReady = true) {
  const g = await call('/games', {
    method: 'POST',
    body: { title: `Verif ${stamp}-${Math.random().toString(36).slice(2, 6)}`, maxPlayers },
  });
  const gameId = g.data.id;
  for (const p of players) {
    await call(`/games/${gameId}/join`, { method: 'POST', token: p.token });
    if (markReady) {
      /* O início exige que todos tenham confirmado presença na sala. */
      await call(`/games/${gameId}/ready`, { method: 'POST', token: p.token });
    }
  }
  if (!markReady) {
    return gameId;
  }
  const started = await call(`/games/${gameId}/start`, { method: 'POST' });
  if (started.status !== 200) {
    throw new Error(`não foi possível iniciar a partida: ${JSON.stringify(started.data)}`);
  }
  return gameId;
}

/* Ordem de assento = ordem de entrada, que é como o motor ordena os jogadores. */
function seatOrder(gameId) {
  return sql(
    `SELECT "playerId" FROM game_players WHERE "gameId"=${gameId} ORDER BY id ASC`
  )
    .split('\n')
    .filter(Boolean)
    .map(Number);
}

/*
  Deixa o jogador com a carta pedida mais `filler` cartas de enchimento, para
  que jogar a carta alvo não zere a mão e dispare o fim da rodada (GAME-11).
*/
function setHand(gameId, playerId, color, value, filler = 0) {
  sql(
    `UPDATE cards SET location='deck', "playerId"=NULL WHERE "gameId"=${gameId} AND "playerId"=${playerId} AND location='hand'`
  );
  const out = sql(
    `UPDATE cards SET location='hand', "playerId"=${playerId}, color='${color}', value='${value}' WHERE id=(SELECT id FROM cards WHERE "gameId"=${gameId} AND location='deck' AND "playerId" IS NULL ORDER BY id LIMIT 1) RETURNING id`
  );
  for (let i = 0; i < filler; i += 1) {
    /* Enchimento neutro: cor que não bate com nada usado nos cenários. */
    sql(
      `UPDATE cards SET location='hand', "playerId"=${playerId}, color='green', value='0' WHERE id=(SELECT id FROM cards WHERE "gameId"=${gameId} AND location='deck' AND "playerId" IS NULL ORDER BY id LIMIT 1)`
    );
  }
  /* psql imprime o RETURNING e depois a tag do comando ("UPDATE 1"). */
  return Number(out.match(/[0-9]+/)[0]);
}

function setDiscard(gameId, color, value) {
  sql(`UPDATE cards SET location='deck', "playerId"=NULL WHERE "gameId"=${gameId} AND location='discard'`);
  sql(
    `UPDATE cards SET location='discard', "playerId"=NULL, color='${color}', value='${value}' WHERE id=(SELECT id FROM cards WHERE "gameId"=${gameId} AND location='deck' AND "playerId" IS NULL ORDER BY id DESC LIMIT 1)`
  );
}

function setTurn(gameId, playerId) {
  sql(`UPDATE games SET "currentPlayerId"=${playerId}, direction='clockwise' WHERE id=${gameId}`);
}

function handCount(gameId, playerId) {
  return Number(
    sql(`SELECT COUNT(*) FROM cards WHERE "gameId"=${gameId} AND "playerId"=${playerId} AND location='hand'`)
  );
}

/* ------------------------------------------------------------------ */

async function game09() {
  console.log('\nGAME-09 - alternância de turno e sentido');
  const [a, b, c] = await Promise.all([mkPlayer('ana'), mkPlayer('bruno'), mkPlayer('caio')]);
  const gameId = await newGame([a, b, c], 3);
  const seats = seatOrder(gameId);
  const byId = Object.fromEntries([a, b, c].map((p) => [p.id, p.name]));
  const [s0, s1, s2] = seats;
  const tokenOf = Object.fromEntries([a, b, c].map((p) => [p.id, p.token]));

  const play = async (playerId, color, value) => {
    setDiscard(gameId, color === 'wild' ? 'red' : color, value === 'Skip' ? 'Skip' : '5');
    if (color === 'wild') setDiscard(gameId, 'red', '5');
    const cardId = setHand(gameId, playerId, color, value, 2);
    setTurn(gameId, playerId);
    return call(`/games/${gameId}/play`, {
      method: 'POST',
      token: tokenOf[playerId],
      body: color === 'wild' ? { cardId, chosenColor: 'red' } : { cardId },
    });
  };

  // Jogada normal: vez passa para o próximo assento
  setDiscard(gameId, 'red', '5');
  let cardId = setHand(gameId, s0, 'red', '7', 2);
  setTurn(gameId, s0);
  let r = await call(`/games/${gameId}/play`, { method: 'POST', token: tokenOf[s0], body: { cardId } });
  check(
    `jogada normal: vez vai para o próximo (${byId[s1]})`,
    r.data.currentPlayerId === s1,
    `-> ${JSON.stringify(r.data.currentPlayerId)}`
  );

  // Pular
  r = await play(s0, 'red', 'Skip');
  check(`Pular: salta ${byId[s1]} e vai para ${byId[s2]}`, r.data.currentPlayerId === s2, `-> ${r.data.currentPlayerId}`);

  // Reverter com 3 jogadores: inverte o sentido
  r = await play(s0, 'red', 'Reverse');
  check(
    'Reverter (3 jogadores): sentido vira anti-horário',
    r.data.direction === 'counter-clockwise',
    `-> ${r.data.direction}`
  );
  check(`Reverter: vez volta para ${byId[s2]}`, r.data.currentPlayerId === s2, `-> ${r.data.currentPlayerId}`);

  // Compra 2
  const beforeD2 = handCount(gameId, s1);
  r = await play(s0, 'red', 'Draw Two');
  const afterD2 = handCount(gameId, s1);
  check('+2: alvo compra exatamente 2 cartas', afterD2 - beforeD2 === 2, `-> ${beforeD2} para ${afterD2}`);
  check(`+2: alvo ${byId[s1]} perde a vez`, r.data.currentPlayerId === s2, `-> ${r.data.currentPlayerId}`);

  // Coringa +4
  const beforeD4 = handCount(gameId, s1);
  r = await play(s0, 'wild', 'Wild Draw Four');
  const afterD4 = handCount(gameId, s1);
  check('+4: alvo compra exatamente 4 cartas', afterD4 - beforeD4 === 4, `-> ${beforeD4} para ${afterD4}`);
  check(`+4: alvo ${byId[s1]} perde a vez`, r.data.currentPlayerId === s2, `-> ${r.data.currentPlayerId}`);

  // Reverter com 2 jogadores age como Pular
  const [d, e] = await Promise.all([mkPlayer('dora'), mkPlayer('elias')]);
  const duo = await newGame([d, e], 2);
  const duoSeats = seatOrder(duo);
  setDiscard(duo, 'blue', '5');
  const revId = setHand(duo, duoSeats[0], 'blue', 'Reverse', 2);
  setTurn(duo, duoSeats[0]);
  r = await call(`/games/${duo}/play`, { method: 'POST', token: [d, e].find((p) => p.id === duoSeats[0]).token, body: { cardId: revId } });
  check(
    'Reverter com 2 jogadores: quem jogou continua na vez',
    r.data.currentPlayerId === duoSeats[0],
    `-> ${r.data.currentPlayerId}`
  );
}

async function game10() {
  console.log('\nGAME-10 - chamar UNO');
  const [a, b] = await Promise.all([mkPlayer('fabio'), mkPlayer('gina')]);
  const gameId = await newGame([a, b], 2);
  const seats = seatOrder(gameId);
  const me = [a, b].find((p) => p.id === seats[0]);
  const other = [a, b].find((p) => p.id === seats[1]);

  // Com 2 cartas na mão, a chamada é recusada
  setDiscard(gameId, 'green', '5');
  setHand(gameId, me.id, 'green', '3');
  sql(
    `UPDATE cards SET location='hand', "playerId"=${me.id}, color='green', value='4' WHERE id=(SELECT id FROM cards WHERE "gameId"=${gameId} AND location='deck' AND "playerId" IS NULL ORDER BY id LIMIT 1)`
  );
  let r = await call(`/games/${gameId}/uno`, { method: 'POST', token: me.token });
  check('com 2 cartas: recusa a chamada', r.status === 400, `-> ${r.status} ${r.data?.error}`);

  // Com exatamente 1 carta, aceita
  setHand(gameId, me.id, 'green', '3');
  r = await call(`/games/${gameId}/uno`, { method: 'POST', token: me.token });
  check('com 1 carta: aceita a chamada', r.status === 200 && r.data.saidUno === true, `-> ${r.status}`);

  // O adversário enxerga o estado
  const seen = await call(`/games/${gameId}/state`, { token: other.token });
  const flagged = seen.data.players.find((p) => p.id === me.id);
  check('adversário enxerga saidUno pelo estado da partida', flagged?.saidUno === true, `-> ${flagged?.saidUno}`);

  const viaPlayers = await call(`/games/${gameId}/players`, { token: other.token });
  check(
    'adversário enxerga saidUno pela lista de jogadores',
    viaPlayers.data.find((p) => p.id === me.id)?.saidUno === true
  );

  // Ao comprar, a mão cresce e a marca cai
  setTurn(gameId, me.id);
  await call(`/games/${gameId}/draw`, { method: 'POST', token: me.token });
  const after = await call(`/games/${gameId}/state`, { token: other.token });
  check(
    'a marca cai quando a mão volta a crescer',
    after.data.players.find((p) => p.id === me.id)?.saidUno === false
  );
}

async function game11() {
  console.log('\nGAME-11 - vitória da rodada');
  const [a, b] = await Promise.all([mkPlayer('hugo'), mkPlayer('iris')]);
  const gameId = await newGame([a, b], 2);
  const seats = seatOrder(gameId);
  const winner = [a, b].find((p) => p.id === seats[0]);
  const loser = [a, b].find((p) => p.id === seats[1]);

  // Vencedor com uma carta só; perdedor com um Pular (20 pontos)
  setDiscard(gameId, 'yellow', '5');
  const lastCard = setHand(gameId, winner.id, 'yellow', '9');
  setHand(gameId, loser.id, 'blue', 'Skip');
  setTurn(gameId, winner.id);

  const r = await call(`/games/${gameId}/play`, {
    method: 'POST',
    token: winner.token,
    body: { cardId: lastCard },
  });

  check('a rodada encerra sozinha ao zerar a mão', r.data.roundFinished === true, `-> ${r.data.roundFinished}`);
  check('a partida fica com status finished', r.data.status === 'finished', `-> ${r.data.status}`);
  check('não passa a vez adiante', r.data.currentPlayerId === null, `-> ${r.data.currentPlayerId}`);
  check(
    `vencedor registrado é quem zerou (${winner.name})`,
    r.data.winner?.playerId === winner.id,
    `-> ${JSON.stringify(r.data.winner)}`
  );

  const scores = await call(`/games/${gameId}/scores`, { token: winner.token });
  const rows = Object.fromEntries(scores.data.map((s) => [Number(s.playerId), s.score]));
  check('pontuação gravada no banco para os dois jogadores', scores.data.length === 2, `-> ${scores.data.length}`);
  check('vencedor com 0 pontos em mão', rows[winner.id] === 0, `-> ${rows[winner.id]}`);
  check('Pular vale 20 na contagem do perdedor', rows[loser.id] === 20, `-> ${rows[loser.id]}`);

  // Depois de encerrada, novas jogadas são recusadas
  const after = await call(`/games/${gameId}/draw`, { method: 'POST', token: loser.token });
  check('recusa jogada depois de encerrada', after.status === 400, `-> ${after.status} ${after.data?.error}`);
}

async function lobbyReady() {
  console.log('');
  console.log('Sala de espera - confirmação de presença');
  const [a, b] = await Promise.all([mkPlayer('joana'), mkPlayer('kleber')]);
  const gameId = await newGame([a, b], 2, false);

  let r = await call(`/games/${gameId}/start`, { method: 'POST' });
  check('recusa iniciar com ninguém confirmado', r.status === 400, `-> ${r.status} ${r.data?.error}`);

  await call(`/games/${gameId}/ready`, { method: 'POST', token: a.token });
  r = await call(`/games/${gameId}/start`, { method: 'POST' });
  check('recusa iniciar com apenas um confirmado', r.status === 400, `-> ${r.status}`);

  await call(`/games/${gameId}/ready`, { method: 'POST', token: b.token });
  r = await call(`/games/${gameId}/start`, { method: 'POST' });
  check('inicia quando todos confirmam', r.status === 200, `-> ${r.status} ${r.data?.error}`);

  const players = await call(`/games/${gameId}/players`, { token: a.token });
  check('a lista de jogadores expõe isReady', players.data.every((p) => p.isReady === true));

  r = await call(`/games/${gameId}/ready`, { method: 'POST', token: a.token });
  check('recusa confirmar depois de iniciada', r.status === 400, `-> ${r.status}`);
}

async function challengeUno() {
  console.log('');
  console.log('Desafio de UNO não chamado');
  const [a, b] = await Promise.all([mkPlayer('lucas', ), mkPlayer('marina')]);
  const gameId = await newGame([a, b], 2);
  const seats = seatOrder(gameId);
  const target = [a, b].find((p) => p.id === seats[0]);
  const challenger = [a, b].find((p) => p.id === seats[1]);

  setDiscard(gameId, 'red', '5');

  /* Alvo com mais de uma carta: não há o que desafiar. */
  setHand(gameId, target.id, 'red', '3', 2);
  let r = await call(`/games/${gameId}/challenge`, {
    method: 'POST',
    token: challenger.token,
    body: { targetPlayerId: target.id },
  });
  check('recusa desafiar quem tem mais de uma carta', r.status === 400, `-> ${r.status} ${r.data?.error}`);

  /* Alvo com uma carta e sem ter chamado UNO: penalidade de 2 cartas. */
  setHand(gameId, target.id, 'red', '3');
  const before = handCount(gameId, target.id);
  r = await call(`/games/${gameId}/challenge`, {
    method: 'POST',
    token: challenger.token,
    body: { targetPlayerId: target.id },
  });
  const after = handCount(gameId, target.id);
  check('aceita o desafio quando o UNO não foi chamado', r.status === 200, `-> ${r.status} ${r.data?.error}`);
  check('penalidade é de exatamente 2 cartas', after - before === 2, `-> ${before} para ${after}`);

  /* Alvo que chamou UNO está protegido. */
  setHand(gameId, target.id, 'red', '3');
  await call(`/games/${gameId}/uno`, { method: 'POST', token: target.token });
  r = await call(`/games/${gameId}/challenge`, {
    method: 'POST',
    token: challenger.token,
    body: { targetPlayerId: target.id },
  });
  check('recusa desafiar quem já chamou UNO', r.status === 400, `-> ${r.status} ${r.data?.error}`);

  /* Ninguém desafia a si mesmo. */
  setHand(gameId, challenger.id, 'red', '3');
  r = await call(`/games/${gameId}/challenge`, {
    method: 'POST',
    token: challenger.token,
    body: { targetPlayerId: challenger.id },
  });
  check('recusa desafiar a si mesmo', r.status === 400, `-> ${r.status} ${r.data?.error}`);
}

async function emptyDeck() {
  console.log('');
  console.log('Baralho vazio - reciclagem do descarte');
  const [a, b] = await Promise.all([mkPlayer('nadia'), mkPlayer('otavio')]);
  const gameId = await newGame([a, b], 2);
  const seats = seatOrder(gameId);
  const target = [a, b].find((p) => p.id === seats[0]);
  const other = [a, b].find((p) => p.id === seats[1]);

  /* Esvazia o baralho: tudo que não está em mão vai para o descarte. */
  const emptyTheDeck = () =>
    sql(
      `UPDATE cards SET location='discard', "playerId"=NULL WHERE "gameId"=${gameId} AND location='deck'`
    );

  /* Desafio com o baralho vazio ainda aplica a penalidade. */
  setHand(gameId, target.id, 'red', '3');
  emptyTheDeck();
  const beforeChallenge = handCount(gameId, target.id);
  let r = await call(`/games/${gameId}/challenge`, {
    method: 'POST',
    token: other.token,
    body: { targetPlayerId: target.id },
  });
  const afterChallenge = handCount(gameId, target.id);
  check(
    'desafio com baralho vazio aplica as 2 cartas',
    r.status === 200 && r.data.penaltyCards === 2 && afterChallenge - beforeChallenge === 2,
    `-> ${r.data?.penaltyCards} carta(s), mão ${beforeChallenge} para ${afterChallenge}`
  );

  /* +2 com o baralho vazio também. */
  setDiscard(gameId, 'blue', '5');
  const cardId = setHand(gameId, other.id, 'blue', 'Draw Two', 2);
  setTurn(gameId, other.id);
  emptyTheDeck();
  const beforeD2 = handCount(gameId, target.id);
  r = await call(`/games/${gameId}/play`, { method: 'POST', token: other.token, body: { cardId } });
  const afterD2 = handCount(gameId, target.id);
  check(
    '+2 com baralho vazio compra as 2 cartas',
    afterD2 - beforeD2 === 2,
    `-> mão ${beforeD2} para ${afterD2}`
  );
  check(
    '+2 com baralho vazio informa o efeito',
    r.data?.drawEffect?.cardsDrawn === 2,
    `-> ${JSON.stringify(r.data?.drawEffect)}`
  );
}

await game09();
await game10();
await game11();
await lobbyReady();
await challengeUno();
await emptyDeck();

console.log(`\n=== ${pass} verificações OK, ${fail} falha(s) ===`);
process.exit(fail === 0 ? 0 : 1);
