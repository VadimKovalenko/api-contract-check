import { defaultTone } from './constants';
import { useListItems } from './hooks';
import './styles.css';

export function ListBlock({ title, items, emptyText, tone = defaultTone }) {
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
