import type { CardColor } from '../types/api';
import { COLOR_LABELS, PLAYABLE_COLORS } from '../domain/cards';
import './ColorChoice.css';

/*
  UI-07 / GAME-07: the color picker only shows up when a wild card is played,
  and the back-end rejects the play without `chosenColor`.
*/
export function ColorChoice({
  onChoose,
  disabled,
}: {
  onChoose: (color: CardColor) => void;
  disabled?: boolean;
}) {
  return (
    <div className="color-choice">
      {PLAYABLE_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          className={`color-choice__option color-choice__option--${color}`}
          onClick={() => onChoose(color)}
          disabled={disabled}
        >
          <span className="color-choice__swatch" aria-hidden="true" />
          {COLOR_LABELS[color]}
        </button>
      ))}
    </div>
  );
}
