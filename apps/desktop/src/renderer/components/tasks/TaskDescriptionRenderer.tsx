import React, { useState, useMemo } from 'react';
import { Copy, CheckCheck, ChevronDown, ChevronUp } from 'lucide-react';

interface TaskDescriptionRendererProps {
  description: string;
  maxCollapsedHeight?: number;
}

export const TaskDescriptionRenderer: React.FC<TaskDescriptionRendererProps> = ({
  description,
  maxCollapsedHeight = 120,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const cleanText = (description || '').trim();
  const isLong = cleanText.length > 220 || cleanText.split('\n').length > 5;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cleanText) return;
    navigator.clipboard.writeText(cleanText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Safe lightweight markdown formatter for task descriptions
  const renderedContent = useMemo(() => {
    if (!cleanText) return null;

    const lines = cleanText.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();

      // Heading 3
      if (trimmed.startsWith('### ')) {
        return (
          <h4
            key={idx}
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '6px 0 3px',
            }}
          >
            {trimmed.slice(4)}
          </h4>
        );
      }
      // Heading 2 or 1
      if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
        return (
          <h3
            key={idx}
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '8px 0 4px',
            }}
          >
            {trimmed.replace(/^#+\s*/, '')}
          </h3>
        );
      }

      // Bullet lists
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const itemContent = trimmed.slice(2);
        return (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 6,
              margin: '2px 0',
              paddingRight: 6,
            }}
          >
            <span style={{ color: 'var(--accent-blue)', fontSize: 13, lineHeight: '18px' }}>•</span>
            <span style={{ flex: 1, fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
              {renderInlineStyles(itemContent)}
            </span>
          </div>
        );
      }

      // Numbered lists (1. , 2. )
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
      if (numMatch) {
        return (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 6,
              margin: '2px 0',
              paddingRight: 6,
            }}
          >
            <span
              style={{
                color: 'var(--accent-blue)',
                fontSize: 11,
                fontWeight: 600,
                lineHeight: '18px',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {numMatch[1]}.
            </span>
            <span style={{ flex: 1, fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
              {renderInlineStyles(numMatch[2])}
            </span>
          </div>
        );
      }

      // Empty line / paragraph break
      if (!trimmed) {
        return <div key={idx} style={{ height: 6 }} />;
      }

      // Regular paragraph line
      return (
        <p
          key={idx}
          style={{
            margin: '2px 0',
            fontSize: 12,
            lineHeight: 1.55,
            color: 'var(--text-secondary)',
            wordBreak: 'break-word',
          }}
        >
          {renderInlineStyles(line)}
        </p>
      );
    });
  }, [cleanText]);

  if (!cleanText) {
    return (
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
        لا يوجد وصف لهذه المهمة.
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header bar with quick copy button */}
      <div style={styles.topBar}>
        <span style={styles.sectionTitle}>الوصف والتفاصيل</span>
        <button
          type="button"
          onClick={handleCopy}
          style={styles.copyBtn}
          title={copied ? 'تم النسخ إلى الحافظة' : 'نسخ النص كاملاً'}
        >
          {copied ? <CheckCheck size={11} color="var(--accent-green)" /> : <Copy size={11} />}
          <span style={{ color: copied ? 'var(--accent-green)' : 'inherit' }}>
            {copied ? 'تم النسخ' : 'نسخ الوصف'}
          </span>
        </button>
      </div>

      {/* Description Content Box with dynamic clamping */}
      <div
        style={{
          ...styles.contentBox,
          maxHeight: isExpanded || !isLong ? 'none' : maxCollapsedHeight,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div dir="auto" style={{ unicodeBidi: 'plaintext' }}>
          {renderedContent}
        </div>

        {/* Gradient Fade Overlay when collapsed */}
        {!isExpanded && isLong && <div style={styles.fadeOverlay} />}
      </div>

      {/* Expand / Collapse Action */}
      {isLong && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          style={styles.toggleBtn}
        >
          {isExpanded ? (
            <>
              <ChevronUp size={12} />
              <span>عرض أقل</span>
            </>
          ) : (
            <>
              <ChevronDown size={12} />
              <span>اقرأ المزيد</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

// Helper to format inline bold, inline code, and URLs safely
function renderInlineStyles(text: string): React.ReactNode {
  // Regex to match URLs, **bold**, or `code`
  const parts: React.ReactNode[] = [];
  const tokenRegex = /(https?:\/\/[^\s]+)|(\*\*[^*]+\*\*)|(`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('http')) {
      parts.push(
        <a
          key={match.index}
          href={token}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.stopPropagation();
            if (window.electronAPI?.openExternal) {
              e.preventDefault();
              window.electronAPI.openExternal(token);
            }
          }}
          style={{
            color: 'var(--accent-blue)',
            textDecoration: 'underline',
            wordBreak: 'break-all',
          }}
        >
          {token}
        </a>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={match.index}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            padding: '1px 5px',
            borderRadius: 3,
            fontSize: '0.9em',
            fontFamily: 'monospace',
            color: 'var(--accent-blue)',
          }}
        >
          {token.slice(1, -1)}
        </code>
      );
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-dim)',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  copyBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    background: 'none',
    border: 'none',
    color: 'var(--text-dim)',
    fontSize: 10.5,
    cursor: 'pointer',
    padding: '2px 4px',
    borderRadius: 4,
    transition: 'color 120ms ease, background-color 120ms ease',
  },
  contentBox: {
    backgroundColor: 'var(--bg-hover, rgba(255, 255, 255, 0.02))',
    border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.07))',
    borderRadius: 6,
    padding: '10px 12px',
    transition: 'max-height 200ms ease-out',
  },
  fadeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 38,
    background: 'linear-gradient(to top, rgba(18, 18, 20, 0.95) 0%, rgba(18, 18, 20, 0) 100%)',
    pointerEvents: 'none',
  },
  toggleBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    background: 'none',
    border: 'none',
    color: 'var(--accent-blue, var(--accent-blue))',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    padding: '3px 6px',
    alignSelf: 'flex-start',
    borderRadius: 4,
  },
};
