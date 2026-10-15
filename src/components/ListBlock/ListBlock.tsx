import { useId } from 'react';
import { AlertCircle, CheckCircle2, CircleAlert, CircleCheck, Info } from 'lucide-react';
import { defaultTone } from './constants';
import { useListItems } from './hooks';
import type { Tone } from '../../types';
import './styles.css';

interface ListBlockProps {
  className?: string;
  title: string;
  items?: string[];
  emptyText: string;
  infoText?: string;
  onItemClick?: (item: string) => void;
  itemActionTarget?: string;
  tone?: Tone;
}

const toneIcons = {
  bad: AlertCircle,
  cool: CircleCheck,
  good: CheckCircle2,
  missing: CheckCircle2,
  neutral: CircleCheck,
  optional: CircleAlert,
  present: CircleCheck,
  unlisted: AlertCircle,
  warn: CircleAlert,
} satisfies Record<Tone, typeof CircleCheck>;

export function ListBlock({ className = '', title, items, emptyText, infoText, itemActionTarget, onItemClick, tone = defaultTone }: ListBlockProps) {
  const { hasItems, items: normalizedItems } = useListItems(items);
  const infoTipId = useId();
  const titleId = useId();
  const Icon = toneIcons[tone];

  return (
    <section aria-labelledby={titleId} className={`list-block ${tone} ${className}`}>
      <div className="list-block-heading">
        <span className="list-block-icon" aria-hidden="true">
          <Icon size={16} />
        </span>
        <h3 id={titleId}>{title}</h3>
        {infoText ? (
          <span className="info-tip">
            <button
              aria-describedby={infoTipId}
              aria-label={`${title} info`}
              className="info-tip-button"
              type="button"
            >
              <Info size={15} />
            </button>
            <span className="info-tip-text" id={infoTipId} role="tooltip">{infoText}</span>
          </span>
        ) : null}
      </div>
      {!hasItems ? (
        <p className="muted">{emptyText}</p>
      ) : (
        <ul className={`chip-list ${tone}`}>
          {normalizedItems.map((item) => (
            <li key={item}>
              {onItemClick ? (
                <button aria-label={`Show ${item} in ${itemActionTarget ?? 'the related editor'}`} onClick={() => onItemClick(item)} type="button">
                  {item}
                </button>
              ) : item}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
