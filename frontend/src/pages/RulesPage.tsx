import { UnoCard } from '../components/UnoCard';
import { MAX_PLAYERS_ALLOWED, MIN_PLAYERS_TO_START } from '../domain/cards';
import type { Card } from '../types/api';
import './RulesPage.css';

const SAMPLES: Array<{ card: Card; title: string; text: string }> = [
  {
    card: { id: -1, color: 'red', value: '7' },
    title: 'Carta numérica',
    text: 'Vale sobre a mesma cor ou sobre o mesmo número. Na contagem vale o próprio número.',
  },
  {
    card: { id: -2, color: 'blue', value: 'Skip' },
    title: 'Pular',
    text: 'O próximo jogador perde a vez. Vale 20 pontos na contagem final.',
  },
  {
    card: { id: -3, color: 'green', value: 'Reverse' },
    title: 'Reverter',
    text: 'Inverte o sentido da partida. Vale 20 pontos na contagem final.',
  },
  {
    card: { id: -4, color: 'yellow', value: 'Draw Two' },
    title: 'Compra 2',
    text: 'O próximo compra duas cartas e perde a vez. Vale 20 pontos.',
  },
  {
    card: { id: -5, color: 'wild', value: 'Wild Card' },
    title: 'Coringa',
    text: 'Pode ser jogado sobre qualquer carta. Quem joga escolhe a nova cor. Vale 50 pontos.',
  },
  {
    card: { id: -6, color: 'wild', value: 'Wild Draw Four' },
    title: 'Coringa +4',
    text: 'Escolhe a cor, o próximo compra quatro cartas e perde a vez. Vale 50 pontos.',
  },
];

export function RulesPage() {
  return (
    <div className="page rules">
      <div className="page__head">
        <div>
          <p className="eyebrow">Referência</p>
          <h1>Como jogar</h1>
          <p className="page__lead">
            O baralho tem 108 cartas: em cada uma das quatro cores há um zero, duas cartas de 1 a 9,
            duas Pular, duas Reverter e duas Compra 2, além de quatro Coringas e quatro Coringas +4.
          </p>
        </div>
      </div>

      <section className="stack">
        <h2>Como a partida corre</h2>
        <ol className="rules__steps">
          <li>
            A mesa aceita de {MIN_PLAYERS_TO_START} a {MAX_PLAYERS_ALLOWED} jogadores e só inicia com
            pelo menos {MIN_PLAYERS_TO_START}.
          </li>
          <li>Ao iniciar, cada jogador recebe sete cartas e a primeira carta vai para o descarte.</li>
          <li>A carta inicial nunca é um Coringa +4, então a cor válida já começa definida.</li>
          <li>
            Na sua vez, jogue uma carta da mesma cor, do mesmo número ou símbolo, ou um coringa. Se
            não tiver jogada, compre uma carta.
          </li>
          <li>
            Ao comprar, se a carta puder ser jogada a vez continua sua; caso contrário a vez passa
            adiante.
          </li>
          <li>Com uma única carta na mão, grite UNO. Os demais jogadores veem esse aviso na mesa.</li>
          <li>
            Quem zera a mão encerra a rodada. Os pontos das cartas que sobraram nas mãos dos outros
            são somados e registrados.
          </li>
          <li>
            A mesa se atualiza sozinha a cada poucos segundos, então as jogadas dos outros aparecem
            com um pequeno atraso.
          </li>
        </ol>
      </section>

      <section className="stack">
        <h2>As cartas</h2>
        <ul className="rules__cards">
          {SAMPLES.map((sample) => (
            <li key={sample.card.id} className="rules__card">
              <UnoCard card={sample.card} size="md" />
              <div>
                <h3>{sample.title}</h3>
                <p className="muted">{sample.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
