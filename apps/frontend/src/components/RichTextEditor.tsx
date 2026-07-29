import React, { useMemo, useRef, useCallback, useId } from "react";
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

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "اكتب الوصف هنا...",
  minHeight = "200px",
}) => {
  const quillRef = useRef<ReactQuill>(null);
  const toolbarId = useId().replace(/:/g, "");

  // Handle image upload
  const handleImageUpload = useCallback(() => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        // Upload image to server
        const result = await uploadFiles([file]);
        if (result.success && result.data?.[0]) {
          const imageUrl = result.data[0].fullUrl || result.data[0].url;

          // Insert image into editor
          const quill = quillRef.current?.getEditor();
          if (quill) {
            const range = quill.getSelection();
            if (range) {
              quill.insertEmbed(range.index, "image", imageUrl);
              quill.setSelection({ index: range.index + 1, length: 0 });
            }
          }
        }
      } catch (error) {
        console.error("Error uploading image:", error);
        alert(i18n.t("RichTextEditor.msg_c246"));
      }
    };
  }, []);

  const modules = useMemo(
    () => ({
      toolbar: {
        container: `#${toolbarId}`,
        handlers: {
          image: handleImageUpload,
        },
      },
    }),
    [handleImageUpload, toolbarId],
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

  // Ensure value is always a string
  const editorValue = value || "";

  return (
    <div className="rich-text-editor">
      <div id={toolbarId} className="rich-text-toolbar">
        <span className="ql-formats">
          <select
            className="ql-header"
            defaultValue=""
            title="نمط النص"
          >
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
          <button
            type="button"
            className="ql-list"
            value="ordered"
            title="قائمة رقمية"
          />
          <button
            type="button"
            className="ql-list"
            value="bullet"
            title="قائمة نقطية"
          />
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
          border-top-right-radius: 0.375rem;
          border-top-left-radius: 0.375rem;
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
          align-items: center;
          background: #ffffff;
          border: 1px solid #d1d5db;
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
          border-bottom-right-radius: 0.375rem;
          border-bottom-left-radius: 0.375rem;
          border: 1px solid #d1d5db;
          border-top: 0;
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
          border-color: #4b5563;
        }

        .dark .rich-text-editor .ql-container {
          border-color: #4b5563;
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
