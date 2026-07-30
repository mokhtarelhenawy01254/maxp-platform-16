import { X as XMarkIcon, Plus as PlusIcon } from 'lucide-react';
import React, { useState } from "react";
;

interface TagsInputProps {
  tags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  label?: string;
  placeholder?: string;
}

export const TagsInput: React.FC<TagsInputProps> = ({
  tags,
  onAddTag,
  onRemoveTag,
  label = "العلامات (Tags)",
  placeholder = "أضف علامة جديدة واضغط Enter",
}) => {
  const [newTag, setNewTag] = useState("");

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      onAddTag(newTag.trim());
      setNewTag("");
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>
      <div className="flex flex-wrap gap-2 mb-3">
        {tags && Array.isArray(tags) && tags.map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center pl-3 pr-2 py-1 rounded-full text-sm font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300"
          >
            {tag}
            <button
              type="button"
              onClick={() => onRemoveTag(tag)}
              className="mr-1 flex-shrink-0 ml-1 h-4 w-4 rounded-full inline-flex items-center justify-center text-indigo-400 dark:text-indigo-500 hover:bg-indigo-200 dark:hover:bg-indigo-700 hover:text-indigo-500 dark:hover:text-indigo-400 focus:outline-none focus:bg-indigo-500 dark:focus:bg-indigo-600 focus:text-white"
            >
              <XMarkIcon className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddTag();
            }
          }}
          className="flex-1 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={handleAddTag}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 dark:hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 focus:ring-indigo-500"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
          إضافة
        </button>
      </div>
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        اضغط Enter لإضافة العلامة
      </p>
    </div>
  );
};
