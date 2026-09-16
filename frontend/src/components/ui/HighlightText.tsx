import React from 'react';

interface HighlightTextProps {
  /** The full text to display */
  text: string;
  /** The search query to highlight (case-insensitive) */
  query: string;
  /** Additional className for the wrapper span */
  className?: string;
}

/**
 * Renders `text` with every occurrence of `query` wrapped in a <mark> element
 * that applies a yellow highlight. Safe against empty/whitespace queries.
 */
const HighlightText: React.FC<HighlightTextProps> = ({ text, query, className }) => {
  const trimmed = query.trim();

  if (!trimmed || !text) {
    return <span className={className}>{text}</span>;
  }

  const escapedQuery = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-yellow-200 text-yellow-900 dark:bg-yellow-400/30 dark:text-yellow-200 rounded-[2px] px-0.5"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </span>
  );
};

export default HighlightText;
