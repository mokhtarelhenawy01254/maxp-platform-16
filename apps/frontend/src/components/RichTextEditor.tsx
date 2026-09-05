import React, { useMemo, useRef, useCallback, useId, useState, useEffect } from "react";
import i18n from "../i18n";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { uploadFiles } from "../utils/apiHelpers";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

// Suppress findDOMNode warning from react-quill (known issue with React 18)
const originalError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === "string" &&
    (args[0].includes("findDOMNode") ||
      args[0].includes("turbo/governments") ||
      args[0].includes("Failed to fetch governments"))
  ) {
    return;
  }
  originalError.call(console, ...args);
};

export const DEFAULT_TABLE_TEMPLATE = `<div class="overflow-x-auto my-3">
  <table style="width: 100%; border-collapse: collapse; text-align: center; border: 1px solid #d1d5db;" class="w-full border-collapse border border-gray-300 text-sm text-center">
    <thead>
      <tr style="background-color: #f3f4f6;">
        <th style="border: 1px solid #d1d5db; padding: 10px; font-weight: bold;">المقاس</th>
        <th style="border: 1px solid #d1d5db; padding: 10px; font-weight: bold;">الوزن المناسب</th>
        <th style="border: 1px solid #d1d5db; padding: 10px; font-weight: bold;">توصيات المقاس</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="border: 1px solid #d1d5db; padding: 10px; font-weight: 600;">L</td>
        <td style="border: 1px solid #d1d5db; padding: 10px;">من 60 ك إلى 70 ك</td>
        <td style="border: 1px solid #d1d5db; padding: 10px;">مقاس مريح ومناسب</td>
      </tr>
      <tr>
        <td style="border: 1px solid #d1d5db; padding: 10px; font-weight: 600;">XL</td>
        <td style="border: 1px solid #d1d5db; padding: 10px;">من 70 ك إلى 80 ك</td>
        <td style="border: 1px solid #d1d5db; padding: 10px;">اختاري الأكبر غالبًا للراحة</td>
      </tr>
    </tbody>
  </table>
</div>`;

// Helper: parse HTML string containing table to header array and 2D row array
const parseTableHtml = (html: string): { headers: string[]; rows: string[][] } | null => {
  if (!html || typeof html !== "string" || !html.includes("<table")) return null;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const table = doc.querySelector("table");
    if (!table) return null;

    const headers = Array.from(table.querySelectorAll("thead th, thead td")).map(el => el.textContent?.trim() || "");
    const bodyRows = Array.from(table.querySelectorAll("tbody tr")).map(tr =>
      Array.from(tr.querySelectorAll("td, th")).map(td => td.textContent?.trim() || "")
    );

    const finalHeaders = headers.length > 0 ? headers : ["المقاس", "الوزن المناسب", "توصيات المقاس"];
    const finalRows = bodyRows.length > 0 ? bodyRows : [
      ["L", "من 60 ك إلى 70 ك", "مقاس مريح ومناسب"],
      ["XL", "من 70 ك إلى 80 ك", "اختاري الأكبر غالبًا للراحة"]
    ];

    return { headers: finalHeaders, rows: finalRows };
  } catch (e) {
    return null;
  }
};

// Helper: generate HTML table string from header array and 2D row array
const generateTableHtml = (headers: string[], rows: string[][]): string => {
  let html = `<div class="overflow-x-auto my-3">\n  <table style="width: 100%; border-collapse: collapse; text-align: center; border: 1px solid #d1d5db;" class="w-full border-collapse border border-gray-300 text-sm text-center">\n    <thead>\n      <tr style="background-color: #f3f4f6;">\n`;
  headers.forEach(h => {
    html += `        <th style="border: 1px solid #d1d5db; padding: 10px; font-weight: bold;">${h}</th>\n`;
  });
  html += `      </tr>\n    </thead>\n    <tbody>\n`;
  rows.forEach(r => {
    html += `      <tr>\n`;
    r.forEach((c, idx) => {
      const isHeaderCol = idx === 0;
      html += `        <td style="border: 1px solid #d1d5db; padding: 10px; ${isHeaderCol ? 'font-weight: 600;' : ''}">${c}</td>\n`;
    });
    html += `      </tr>\n`;
  });
  html += `    </tbody>\n  </table>\n</div>`;
  return html;
};

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "اكتب الوصف هنا...",
  minHeight = "200px",
}) => {
  const quillRef = useRef<ReactQuill>(null);
  const toolbarId = useId().replace(/:/g, "");
  
  // Determine mode: 'table' if value has <table>, otherwise 'visual' or 'code'
  const hasTable = Boolean(value && typeof value === "string" && value.includes("<table"));
  const [editorMode, setEditorMode] = useState<"table" | "code" | "visual">(() =>
    hasTable ? "table" : "visual"
  );

  // Table Grid State
  const parsed = parseTableHtml(value || DEFAULT_TABLE_TEMPLATE);
  const [tableHeaders, setTableHeaders] = useState<string[]>(parsed?.headers || ["المقاس", "الوزن المناسب", "توصيات المقاس"]);
  const [tableRows, setTableRows] = useState<string[][]>(parsed?.rows || [
    ["L", "من 60 ك إلى 70 ك", "مقاس مريح ومناسب"],
    ["XL", "من 70 ك إلى 80 ك", "اختاري الأكبر غالبًا للراحة"]
  ]);

  // Sync grid changes back to parent
  const updateGridValue = (newHeaders: string[], newRows: string[][]) => {
    setTableHeaders(newHeaders);
    setTableRows(newRows);
    const newHtml = generateTableHtml(newHeaders, newRows);
    onChange(newHtml);
  };

  // Sync if value changes externally
  useEffect(() => {
    if (value && value.includes("<table")) {
      const p = parseTableHtml(value);
      if (p) {
        setTableHeaders(p.headers);
        setTableRows(p.rows);
      }
    }
  }, [value]);

  // Handle cell edit
  const handleCellChange = (rowIndex: number, colIndex: number, newValue: string) => {
    const nextRows = tableRows.map((r, rIdx) =>
      rIdx === rowIndex ? r.map((c, cIdx) => (cIdx === colIndex ? newValue : c)) : r
    );
    updateGridValue(tableHeaders, nextRows);
  };

  // Handle header edit
  const handleHeaderChange = (colIndex: number, newValue: string) => {
    const nextHeaders = tableHeaders.map((h, idx) => (idx === colIndex ? newValue : h));
    updateGridValue(nextHeaders, tableRows);
  };

  // Add row
  const handleAddRow = () => {
    const emptyRow = tableHeaders.map(() => "");
    updateGridValue(tableHeaders, [...tableRows, emptyRow]);
  };

  // Remove row
  const handleRemoveRow = (rowIndex: number) => {
    if (tableRows.length <= 1) return;
    const nextRows = tableRows.filter((_, idx) => idx !== rowIndex);
    updateGridValue(tableHeaders, nextRows);
  };

  // Add column
  const handleAddColumn = () => {
    const nextHeaders = [...tableHeaders, "عمود جديد"];
    const nextRows = tableRows.map(r => [...r, ""]);
    updateGridValue(nextHeaders, nextRows);
  };

  // Image Upload handler
  const handleImageUpload = useCallback(() => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        const result = await uploadFiles([file]);
        if (result.success && result.data?.[0]) {
          const imageUrl = result.data[0].fullUrl || result.data[0].url;

          const quill = quillRef.current?.getEditor();
          if (quill) {
            const range = quill.getSelection();
            if (range) {
              quill.insertEmbed(range.index, "image", imageUrl);
              quill.setSelection({ index: range.index + 1, length: 0 });
            } else {
              quill.insertEmbed(quill.getLength(), "image", imageUrl);
            }
          }
        }
      } catch (error) {
        console.error("Error uploading image:", error);
        alert(i18n.t("RichTextEditor.msg_c246"));
      }
    };
  }, []);

  // Insert Table Template Action
  const handleInsertTableTemplate = () => {
    const p = parseTableHtml(DEFAULT_TABLE_TEMPLATE);
    if (p) {
      updateGridValue(p.headers, p.rows);
    } else {
      onChange(DEFAULT_TABLE_TEMPLATE);
    }
    setEditorMode("table");
  };

  const modules = useMemo(
    () => ({
      toolbar: {
        container: `#${toolbarId}`,
        handlers: {
          image: handleImageUpload,
        },
      },
    }),
    [handleImageUpload, toolbarId]
  );

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "blockquote",
    "list",
    "bullet",
    "indent",
    "color",
    "background",
    "align",
    "link",
    "image",
    "video",
    "code-block",
  ];

  const editorValue = value || "";

  return (
    <div className="rich-text-editor rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
      {/* Editor Control Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-gray-100 dark:bg-gray-700/80 border-b border-gray-300 dark:border-gray-600">
        <div className="flex items-center gap-1 font-semibold text-xs text-gray-700 dark:text-gray-200">
          <span>وضع التعديل:</span>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1 bg-gray-200 dark:bg-gray-800 p-0.5 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => {
              if (!value || !value.includes("<table")) {
                handleInsertTableTemplate();
              }
              setEditorMode("table");
            }}
            className={`px-2.5 py-1 rounded-md transition-all font-bold flex items-center gap-1 ${
              editorMode === "table"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            <svg className="w-3.5 h-3.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18M14 3v18M3 3h18v18H3V3z" />
            </svg>
            <span>جدول المقاسات</span>
          </button>

          <button
            type="button"
            onClick={() => setEditorMode("visual")}
            className={`px-2.5 py-1 rounded-md transition-all font-bold flex items-center gap-1 ${
              editorMode === "visual"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            <span>✏️ نص عادي</span>
          </button>

          <button
            type="button"
            onClick={() => setEditorMode("code")}
            className={`px-2.5 py-1 rounded-md transition-all font-bold flex items-center gap-1 ${
              editorMode === "code"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            <span>&lt;/&gt; كود HTML</span>
          </button>
        </div>
      </div>

      {/* Mode 1: Table Grid Editor */}
      {editorMode === "table" && (
        <div className="p-3 bg-white dark:bg-gray-800 space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
              عدّل قيم الجدول وسينعكس فوراً كجدول منظم في صفحة المنتج:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddRow}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold transition-colors flex items-center gap-1"
              >
                <span>+ إضافة صف</span>
              </button>
              <button
                type="button"
                onClick={handleAddColumn}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition-colors flex items-center gap-1"
              >
                <span>+ إضافة عمود</span>
              </button>
              <button
                type="button"
                onClick={handleInsertTableTemplate}
                className="px-2.5 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded text-xs font-medium transition-colors"
              >
                إعادة ضبط الجدول
              </button>
            </div>
          </div>

          {/* Table Input Grid */}
          <div className="overflow-x-auto rounded-lg border border-gray-300 dark:border-gray-600 shadow-xs">
            <table className="w-full text-xs text-center border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                  {tableHeaders.map((header, colIdx) => (
                    <th key={colIdx} className="p-2 border border-gray-300 dark:border-gray-600 min-w-[110px]">
                      <input
                        type="text"
                        value={header}
                        onChange={(e) => handleHeaderChange(colIdx, e.target.value)}
                        className="w-full text-center font-bold bg-transparent border border-gray-300 dark:border-gray-500 rounded px-1.5 py-1 focus:bg-white dark:focus:bg-gray-900 text-gray-900 dark:text-gray-100"
                        placeholder={`عنوان ${colIdx + 1}`}
                      />
                    </th>
                  ))}
                  <th className="p-2 border border-gray-300 dark:border-gray-600 w-12">حذف</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="p-1.5 border border-gray-300 dark:border-gray-600">
                        <input
                          type="text"
                          value={cell}
                          onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                          className={`w-full text-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-indigo-500 ${
                            cIdx === 0 ? "font-bold text-indigo-700 dark:text-indigo-400" : ""
                          }`}
                          placeholder={`قيمة...`}
                        />
                      </td>
                    ))}
                    <td className="p-1.5 border border-gray-300 dark:border-gray-600 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(rIdx)}
                        disabled={tableRows.length <= 1}
                        className="p-1 text-red-500 hover:text-red-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="حذف هذا الصف"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Live Preview Box */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-1">
              معاينة الجدول كما سيظهر للعميل في المتجر:
            </span>
            <div
              className="p-3 bg-secondary/15 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: generateTableHtml(tableHeaders, tableRows) }}
            />
          </div>
        </div>
      )}

      {/* Mode 2: Raw HTML Code View */}
      {editorMode === "code" && (
        <textarea
          value={editorValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder="أدخل كود HTML أو جدول Markdown هنا..."
          style={{ minHeight }}
          className="w-full p-3 font-mono text-xs border-0 bg-gray-900 text-emerald-400 focus:outline-none focus:ring-0"
          dir="ltr"
        />
      )}

      {/* Mode 3: Visual Rich Text Editor */}
      {editorMode === "visual" && (
        <div>
          <div id={toolbarId} className="rich-text-toolbar flex flex-wrap items-center gap-1 p-1 bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600">
            <span className="ql-formats">
              <select className="ql-header" defaultValue="" title="نمط النص">
                <option value="1">عنوان كبير</option>
                <option value="2">عنوان متوسط</option>
                <option value="">نص عادي</option>
              </select>
            </span>

            <span className="ql-formats">
              <button type="button" className="ql-bold" title="عريض" />
              <button type="button" className="ql-italic" title="مائل" />
              <button type="button" className="ql-underline" title="تحته خط" />
              <button type="button" className="ql-strike" title="يتوسطه خط" />
              <button type="button" className="ql-blockquote" title="اقتباس" />
            </span>

            <span className="ql-formats">
              <button type="button" className="ql-list" value="ordered" title="قائمة رقمية" />
              <button type="button" className="ql-list" value="bullet" title="قائمة نقطية" />
              <button type="button" className="ql-indent" value="-1" title="تقليل المسافة" />
              <button type="button" className="ql-indent" value="+1" title="زيادة المسافة" />
            </span>

            <span className="ql-formats">
              <button type="button" className="ql-align" value="" title="محاذاة تلقائية" />
              <button type="button" className="ql-align" value="center" title="توسيط" />
              <button type="button" className="ql-align" value="justify" title="ضبط" />
            </span>

            <span className="ql-formats">
              <select className="ql-color" title="لون النص" />
              <select className="ql-background" title="لون الخلفية" />
            </span>

            <span className="ql-formats">
              <button type="button" className="ql-code-block" title="كود" />
              <button type="button" className="ql-link" title="إضافة رابط" />
              <button type="button" className="ql-image" title="إضافة صورة" />
              <button type="button" className="ql-video" title="إضافة فيديو" />
              <button type="button" className="ql-clean" title="مسح التنسيق" />
            </span>
          </div>

          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={editorValue}
            onChange={onChange}
            modules={modules}
            formats={formats}
            placeholder={placeholder}
            style={{ minHeight }}
          />
        </div>
      )}

      <style>{`
        .rich-text-editor .ql-container {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 14px;
          direction: rtl;
        }
        .rich-text-editor .ql-editor {
          min-height: ${minHeight};
          direction: rtl;
          text-align: right;
        }
        .rich-text-editor .ql-toolbar {
          direction: rtl;
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
          align-items: center;
          background: #ffffff;
          border: 0;
        }
        .rich-text-editor .ql-toolbar .ql-formats {
          margin-left: 0 !important;
          margin-right: 0 !important;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }
        .rich-text-editor .ql-toolbar button {
          border-radius: 0.375rem;
        }
        .rich-text-editor .ql-toolbar .ql-picker {
          border-radius: 0.375rem;
        }
        .rich-text-editor .ql-toolbar .ql-picker-label {
          border-radius: 0.375rem;
        }
        .rich-text-editor .ql-toolbar button:hover {
          background-color: #f3f4f6;
        }
        .rich-text-editor .ql-toolbar button.ql-active {
          background-color: #e0e7ff;
        }
        .rich-text-editor .ql-container {
          border: 0;
        }
        .rich-text-editor .ql-editor.ql-blank::before {
          right: 15px;
          left: auto;
          font-style: normal;
          color: #9ca3af;
        }
        
        /* Dark mode styles */
        .dark .rich-text-editor .ql-toolbar {
          background-color: #374151;
        }
        .dark .rich-text-editor .ql-editor {
          background-color: #374151;
          color: #f9fafb;
        }
        .dark .rich-text-editor .ql-editor.ql-blank::before {
          color: #9ca3af;
        }
        .dark .rich-text-editor .ql-toolbar .ql-stroke {
          stroke: #d1d5db;
        }
        .dark .rich-text-editor .ql-toolbar .ql-fill {
          fill: #d1d5db;
        }
        .dark .rich-text-editor .ql-toolbar button:hover {
          background-color: #4b5563;
        }
        .dark .rich-text-editor .ql-toolbar button.ql-active {
          background-color: rgba(99, 102, 241, 0.25);
        }
        .dark .rich-text-editor .ql-toolbar .ql-picker-label {
          color: #d1d5db;
        }
        .dark .rich-text-editor .ql-toolbar .ql-picker-options {
          background-color: #374151;
          border-color: #4b5563;
        }
        .dark .rich-text-editor .ql-toolbar .ql-picker-item {
          color: #d1d5db;
        }
        .dark .rich-text-editor .ql-toolbar .ql-picker-item:hover {
          background-color: #4b5563;
        }

        @media (max-width: 640px) {
          .rich-text-editor .ql-toolbar {
            padding: 0.5rem;
            overflow-x: auto;
          }

          .rich-text-editor .ql-toolbar button,
          .rich-text-editor .ql-toolbar .ql-picker {
            flex-shrink: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;


