import { useCallback, useEffect, useRef } from "react";
import "./App.css";

const MAX_FONT_SIZE = 32; // px — comfortable size for reading lyrics at a distance
const MIN_FONT_SIZE = 16; // px — floor before we stop shrinking further
const FONT_STEP = 1; // px
const LEADING_RATIO = 1.625; // matches Tailwind's leading-relaxed
const ABSOLUTE_MIN_COLUMN_WIDTH = 100; // px — sanity floor regardless of font size
const COLUMN_GAP = 48; // px
const MAX_COLUMNS = 12;

// Renders one line in a hidden, non-wrapping probe to find how wide the
// widest lyric line is, in the editor's current font.
function measureLongestLineWidth(editor: HTMLElement): number {
  const style = getComputedStyle(editor);
  const probe = document.createElement("span");
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.whiteSpace = "pre";
  probe.style.fontFamily = style.fontFamily;
  probe.style.fontSize = style.fontSize;
  probe.style.fontWeight = style.fontWeight;
  probe.style.fontStyle = style.fontStyle;
  probe.style.letterSpacing = style.letterSpacing;
  document.body.appendChild(probe);

  let maxWidth = 0;
  for (const line of editor.innerText.split("\n")) {
    probe.textContent = line.length > 0 ? line : " ";
    maxWidth = Math.max(maxWidth, probe.getBoundingClientRect().width);
  }

  document.body.removeChild(probe);
  return maxWidth;
}

function App() {
  const editorRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | undefined>(undefined);

  // Picks the largest font size (and matching column count) that lets every
  // lyric line fit on screen with no wrapping and no scrolling: columns are
  // never narrower than the longest line, and we add columns (or shrink the
  // font, as a fallback) until the full line count fits within the height.
  const recomputeColumns = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const lineCount = Math.max(1, editor.innerText.split("\n").length);

    const style = getComputedStyle(editor);
    const paddingX =
      parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    const paddingY =
      parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const contentWidth = editor.clientWidth - paddingX;
    const availableHeight = editor.clientHeight - paddingY;

    // Measure the widest line once at a reference size, then scale that
    // measurement for each candidate font size instead of re-measuring.
    editor.style.fontSize = `${MAX_FONT_SIZE}px`;
    const longestLineWidthAtMax = measureLongestLineWidth(editor);

    let bestFontSize = MIN_FONT_SIZE;
    let bestColumns = MAX_COLUMNS;

    for (
      let fontSize = MAX_FONT_SIZE;
      fontSize >= MIN_FONT_SIZE;
      fontSize -= FONT_STEP
    ) {
      const scale = fontSize / MAX_FONT_SIZE;
      const minColumnWidth = Math.max(
        longestLineWidthAtMax * scale + 1,
        ABSOLUTE_MIN_COLUMN_WIDTH,
      );
      const maxColumnsByWidth = Math.max(
        1,
        Math.floor((contentWidth + COLUMN_GAP) / (minColumnWidth + COLUMN_GAP)),
      );
      const lineHeight = fontSize * LEADING_RATIO;
      const columnsNeeded = Math.max(
        1,
        Math.ceil((lineCount * lineHeight) / availableHeight),
      );

      bestFontSize = fontSize;
      bestColumns = Math.min(columnsNeeded, maxColumnsByWidth, MAX_COLUMNS);

      if (columnsNeeded <= maxColumnsByWidth) break;
    }

    editor.style.fontSize = `${bestFontSize}px`;
    editor.style.columnGap = `${COLUMN_GAP}px`;
    editor.style.columnFill = "auto";
    editor.style.columnCount = String(bestColumns);
  }, []);

  useEffect(() => {
    recomputeColumns();
    const editor = editorRef.current;
    if (!editor) return;
    const observer = new ResizeObserver(() => recomputeColumns());
    observer.observe(editor);
    return () => observer.disconnect();
  }, [recomputeColumns]);

  const handleInput = () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(recomputeColumns);
  };

  return (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      data-placeholder="Type or paste your lyrics..."
      className="h-screen w-screen overflow-hidden outline-none bg-white p-10 leading-relaxed font-medium text-gray-900 empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300"
      style={{ whiteSpace: "pre-wrap", fontSize: `${MAX_FONT_SIZE}px` }}
    />
  );
}

export default App;
