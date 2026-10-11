import { useId } from 'react';
import { Info } from 'lucide-react';
import { defaultTone } from './constants';
import { useListItems } from './hooks';
import type { Tone } from '../../types';
import './styles.css';

interface ListBlockProps {
  title: string;
  items?: string[];
  emptyText: string;
  infoText?: string;
  tone?: Tone;
}

export function ListBlock({ title, items, emptyText, infoText, tone = defaultTone }: ListBlockProps) {
  const { hasItems, items: normalizedItems } = useListItems(items);
  const infoTipId = useId();

  return (
    <div className="list-block">
      <div className="list-block-heading">
        <h3>{title}</h3>
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
        <div className={`chip-list ${tone}`}>
          {normalizedItems.map((item) => <span key={item}>{item}</span>)}
        </div>
      )}
    </div>
  );
}
