/**
 * Modal منبثق لاختيار قوالب ميتا المعتمدة — يُستخدم في صفحات المناسبات/الميلاد/العروض
 * يعرض قوالب Meta المعتمدة (APPROVED) ويحقن محتوى القالب في النموذج الحالي.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../../services/apiClient';

interface MetaTemplate {
    id: string;
    name: string;
    eventType: string | null;
    content: string;
    metaTemplateName: string | null;
    metaTemplateStatus: string | null;
    category?: string | null;
    channel?: string | null;
}

interface Props {
    open: boolean;
    onClose: () => void;
    /** يُستدعى عند اختيار قالب — النص الجاهز للحقن */
    onPick: (content: string, template: MetaTemplate) => void;
    title?: string;
}

export default function MetaTemplatesModal({ open, onClose, onPick, title }: Props) {
    const [templates, setTemplates] = useState<MetaTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        setError('');
        apiClient.get('/whatsapp-notifications/templates')
            .then((res) => {
                const all: MetaTemplate[] = res.data?.templates || [];
                const approved = all.filter(
                    (t) => t.metaTemplateName && String(t.metaTemplateStatus || '').toUpperCase() === 'APPROVED' && t.isActive !== false,
                );
                setTemplates(approved);
            })
            .catch((e) => setError(e?.message || 'فشل تحميل القوالب'))
            .finally(() => setLoading(false));
    }, [open]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return templates;
        return templates.filter(
            (t) => (t.name || '').toLowerCase().includes(q) || (t.metaTemplateName || '').toLowerCase().includes(q) || (t.eventType || '').toLowerCase().includes(q),
        );
    }, [templates, search]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div
                className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-background)] shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-[color:var(--shell-control-border)] p-4">
                    <div>
                        <h3 className="text-lg font-bold">{title || '📚 قوالب ميتا المعتمدة'}</h3>
                        <p className="text-xs text-[color:var(--color-muted-foreground)]">
                            اختاري قالباً معتمداً ليُحمَّل نصه في الرسالة — القوالب دي بتتصل بـ Meta Cloud API
                        </p>
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 hover:bg-[color:var(--color-muted)]">✕</button>
                </div>

                <div className="p-4">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="ابحث بالاسم أو نوع الحدث..."
                        className="mb-3 w-full rounded-xl border border-[color:var(--shell-control-border)] bg-transparent px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <span className="size-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                        </div>
                    ) : error ? (
                        <p className="py-8 text-center text-sm text-red-500">{error}</p>
                    ) : filtered.length === 0 ? (
                        <p className="py-8 text-center text-sm text-[color:var(--color-muted-foreground)]">لا توجد قوالب ميتا معتمدة بعد</p>
                    ) : (
                        <div className="max-h-[50vh] space-y-2 overflow-y-auto pl-1">
                            {filtered.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => { onPick(t.content || '', t); onClose(); }}
                                    className="w-full rounded-2xl border border-[color:var(--shell-control-border)] p-3 text-right transition-colors hover:border-emerald-500/60 hover:bg-emerald-500/5"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-bold">{t.name || t.metaTemplateName}</span>
                                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                                            ✓ معتمد
                                        </span>
                                    </div>
                                    <p className="mt-1 line-clamp-2 text-xs text-[color:var(--color-muted-foreground)]">
                                        {(t.content || '').slice(0, 140)}
                                    </p>
                                    {t.eventType ? (
                                        <span className="mt-1 inline-block text-[10px] text-[color:var(--color-muted-foreground)]">{t.eventType}</span>
                                    ) : null}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
