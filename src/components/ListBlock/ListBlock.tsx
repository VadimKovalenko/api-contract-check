import { defaultTone } from './constants';
import { useListItems } from './hooks';
import type { Tone } from '../../types';
import './styles.css';

interface ListBlockProps {
  title: string;
  items?: string[];
  emptyText: string;
  tone?: Tone;
}

export function ListBlock({ title, items, emptyText, tone = defaultTone }: ListBlockProps) {
  const { hasItems, items: normalizedItems } = useListItems(items);

  return (
    <div className="list-block">
      <h3>{title}</h3>
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
