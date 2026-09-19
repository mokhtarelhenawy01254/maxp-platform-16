// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useEditorHistory } from '../../pages/advertising/product-landing/useEditorHistory';

interface EditorStub {
  title: string;
  sections: string[];
}

const initial: EditorStub = { title: 'صفحة', sections: ['a'] };

describe('useEditorHistory', () => {
  it('updateEditor pushes history and clears redo', () => {
    const { result } = renderHook(() => useEditorHistory<EditorStub>(initial));

    act(() => {
      result.current.updateEditor((c) => ({ ...c, title: 'نسخة 2' }));
    });
    expect(result.current.editor.title).toBe('نسخة 2');
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);

    act(() => result.current.undo());
    act(() => {
      result.current.updateEditor((c) => ({ ...c, title: 'مسار جديد' }));
    });
    expect(result.current.editor.title).toBe('مسار جديد');
    expect(result.current.canRedo).toBe(false);
  });

  it('undo/redo walk the stack in order', () => {
    const { result } = renderHook(() => useEditorHistory<EditorStub>(initial));

    act(() => result.current.updateEditor((c) => ({ ...c, title: 'v2' })));
    act(() => result.current.updateEditor((c) => ({ ...c, title: 'v3' })));
    expect(result.current.editor.title).toBe('v3');

    act(() => result.current.undo());
    expect(result.current.editor.title).toBe('v2');
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.undo());
    expect(result.current.editor.title).toBe('صفحة');
    expect(result.current.canUndo).toBe(false);

    act(() => result.current.redo());
    expect(result.current.editor.title).toBe('v2');
  });

  it('accepts plain values as well as updater functions', () => {
    const { result } = renderHook(() => useEditorHistory<EditorStub>(initial));

    act(() => result.current.updateEditor({ title: 'قيمة مباشرة', sections: [] }));
    expect(result.current.editor).toEqual({ title: 'قيمة مباشرة', sections: [] });

    act(() => result.current.undo());
    expect(result.current.editor).toEqual(initial);
  });

  it('resetEditor switches pages without polluting history', () => {
    const { result } = renderHook(() => useEditorHistory<EditorStub>(initial));

    act(() => result.current.updateEditor((c) => ({ ...c, title: 'v2' })));
    act(() => result.current.resetEditor({ title: 'صفحة تانية', sections: ['x'] }));

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.editor.title).toBe('صفحة تانية');
  });

  it('caps the history at 60 entries', () => {
    const { result } = renderHook(() => useEditorHistory<number>(0));

    for (let i = 1; i <= 75; i += 1) {
      act(() => result.current.updateEditor(i));
    }
    expect(result.current.editor).toBe(75);
    // Undoing everything lands on the oldest kept entry, not the initial 0.
    act(() => {
      for (let i = 0; i < 100; i += 1) result.current.undo();
    });
    expect(result.current.editor).toBe(15);
  });
});
