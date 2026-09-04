import type { CSSProperties } from 'react';
import type { Card } from '../types/api';
import { cardLabel } from '../domain/cards';
import './UnoCard.css';

export type CardSize = 'sm' | 'md' | 'lg';

interface UnoCardProps {
  card: Card;
  size?: CardSize;
  /* Unplayable cards are dimmed and taken out of the tab order (UI-07). */
  disabled?: boolean;
  selected?: boolean;
  onSelect?: (card: Card) => void;
  style?: CSSProperties;
}

/*
  UI-06: the symbols are drawn as SVG so they depend on neither icon fonts nor
  pictographic characters, which render differently across platforms.
*/
function CardGlyph({ value }: { value: Card['value'] }) {
  switch (value) {
    case 'Skip':
      return (
        <svg viewBox="0 0 24 24" className="uno-card__glyph" aria-hidden="true">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.6" />
          <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2.6" />
        </svg>
      );
    case 'Reverse':
      return (
        <svg viewBox="0 0 24 24" className="uno-card__glyph" aria-hidden="true">
          <path
            d="M8 4 L4 8 L8 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M4 8 H15 a5 5 0 0 1 5 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M16 20 L20 16 L16 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M20 16 H9 a5 5 0 0 1 -5 -5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'Draw Two':
      return <span className="uno-card__text">+2</span>;
    case 'Wild Card':
      return (
        <svg viewBox="0 0 24 24" className="uno-card__glyph" aria-hidden="true">
          <path d="M12 12 L12 2 A10 10 0 0 1 22 12 Z" fill="var(--card-blue)" />
          <path d="M12 12 L22 12 A10 10 0 0 1 12 22 Z" fill="var(--card-yellow)" />
          <path d="M12 12 L12 22 A10 10 0 0 1 2 12 Z" fill="var(--card-green)" />
          <path d="M12 12 L2 12 A10 10 0 0 1 12 2 Z" fill="var(--card-red)" />
        </svg>
      );
    case 'Wild Draw Four':
      return (
        <span className="uno-card__stack" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="uno-card__glyph">
            <path d="M12 12 L12 2 A10 10 0 0 1 22 12 Z" fill="var(--card-blue)" />
            <path d="M12 12 L22 12 A10 10 0 0 1 12 22 Z" fill="var(--card-yellow)" />
            <path d="M12 12 L12 22 A10 10 0 0 1 2 12 Z" fill="var(--card-green)" />
            <path d="M12 12 L2 12 A10 10 0 0 1 12 2 Z" fill="var(--card-red)" />
          </svg>
          <span className="uno-card__stack-text">+4</span>
        </span>
      );
    default:
      return <span className="uno-card__text">{value}</span>;
  }
}

export function UnoCard({
  card,
  size = 'md',
  disabled = false,
  selected = false,
  onSelect,
  style,
}: UnoCardProps) {
  const label = cardLabel(card);
  const classes = [
    'uno-card',
    `uno-card--${size}`,
    `uno-card--${card.color}`,
    disabled ? 'is-disabled' : '',
    selected ? 'is-selected' : '',
    onSelect && !disabled ? 'is-interactive' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <span className="uno-card__face">
      <span className="uno-card__corner uno-card__corner--tl">
        <CardGlyph value={card.value} />
      </span>
      <span className="uno-card__center">
        <CardGlyph value={card.value} />
      </span>
      <span className="uno-card__corner uno-card__corner--br">
        <CardGlyph value={card.value} />
      </span>
    </span>
  );

  if (!onSelect) {
    return (
      <span className={classes} style={style} role="img" aria-label={label}>
        {content}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={classes}
      style={style}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={label}
      onClick={() => onSelect(card)}
    >
      {content}
    </button>
  );
}

/* Card back: used for the draw pile and for the opponents' hands. */
export function UnoCardBack({
  size = 'md',
  style,
  onClick,
  disabled,
  label,
}: {
  size?: CardSize;
  style?: CSSProperties;
  onClick?: () => void;
  disabled?: boolean;
  label?: string;
}) {
  const classes = [
    'uno-card',
    `uno-card--${size}`,
    'uno-card--back',
    onClick && !disabled ? 'is-interactive' : '',
    disabled ? 'is-disabled' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const face = (
    <span className="uno-card__face">
      <span className="uno-card__back-oval">UNO</span>
    </span>
  );

  if (!onClick) {
    return (
      <span className={classes} style={style} aria-hidden="true">
        {face}
      </span>
    );
  }

  return (
    <button type="button" className={classes} style={style} onClick={onClick} disabled={disabled} aria-label={label}>
      {face}
    </button>
  );
}
