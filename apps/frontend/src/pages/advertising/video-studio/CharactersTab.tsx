// Characters library: create (upload refs or generate sheet), manage, reuse
import React, { useState } from "react";
import { Loader2, Plus, Sparkles, Trash2, UserRound } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { ReferenceImagesInput } from "./components/ReferenceImagesInput";
import { useCharacterMutations, useVideoCharacters, useVideoJobs } from "./useVideoStudioQueries";
import type { VideoCharacter } from "./types";

const GENDERS = ["امرأة", "رجل"];
const AGE_RANGES = ["شباب (20-29)", "ثلاثينات (30-39)", "أربعينات (40-49)"];

function CharacterCard({
  character,
  onDelete,
  onGenerateSheet,
  sheetPending,
}: {
  character: VideoCharacter;
  onDelete: (id: string) => void;
  onGenerateSheet: (id: string) => void;
  sheetPending: boolean;
}) {
  const refs = Array.isArray(character.referenceImages) ? character.referenceImages : [];
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex gap-3 p-3">
        <div className="size-16 shrink-0 overflow-hidden rounded-md bg-muted">
          {character.thumbnailUrl || refs[0] ? (
            <img src={character.thumbnailUrl || refs[0]} alt={character.name} className="size-full object-cover" loading="lazy" />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <UserRound className="size-6" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{character.name}</p>
          {character.description && (
            <p className="line-clamp-2 text-xs text-muted-foreground">{character.description}</p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {character.gender && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{character.gender}</span>}
            {character.ageRange && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{character.ageRange}</span>}
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] tabular-nums">{refs.length} مراجع</span>
          </div>
        </div>
      </div>
      {refs.length > 1 && (
        <div className="flex gap-1.5 border-t border-border/70 p-2">
          {refs.slice(0, 4).map((r) => (
            <img key={r} src={r} alt="" className="h-10 w-8 rounded object-cover" loading="lazy" />
          ))}
        </div>
      )}
      <div className="flex items-center gap-1.5 border-t border-border/70 px-2 py-1.5">
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => onGenerateSheet(character.id)}
          disabled={sheetPending}
        >
          {sheetPending ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          {refs.length > 0 ? "إعادة توليد الشيت" : "توليد شيت الشخصية"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="ms-auto h-7 px-2 text-destructive hover:text-destructive"
          onClick={() => onDelete(character.id)}
          aria-label={`حذف ${character.name}`}
          title="حذف"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

export const CharactersTab: React.FC = () => {
  const { data: characters = [] } = useVideoCharacters();
  const { data: jobs = [] } = useVideoJobs();
  const { create, remove, generateSheet } = useCharacterMutations();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [gender, setGender] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [referenceImages, setReferenceImages] = useState<string[]>([]);

  const pendingSheetJobIds = new Set(
    jobs
      .filter((j) => j.type === "CHARACTER_SHEET" && (j.status === "QUEUED" || j.status === "PROCESSING"))
      .map((j) => String(j.params?.["characterId"] ?? "")),
  );

  const submit = () => {
    if (!name.trim()) return;
    create.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        gender: gender || undefined,
        ageRange: ageRange || undefined,
        referenceImages,
      },
      {
        onSuccess: () => {
          setName("");
          setDescription("");
          setGender("");
          setAgeRange("");
          setReferenceImages([]);
          setOpen(false);
        },
      },
    );
  };

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-4 p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">مكتبة الشخصيات</h2>
            <p className="text-xs text-muted-foreground">مراجع ثابتة تُحقن في كل مشهد لتثبيت الشكل</p>
          </div>
          <Button size="sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            <Plus className="size-4" />
            شخصية جديدة
          </Button>
        </div>

        {open && (
          <div className="space-y-3 rounded-lg border border-border bg-card p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="char-name">الاسم</Label>
                <Input id="char-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: سلمى — عارضة العطور" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>النوع</Label>
                  <div className="flex gap-1.5">
                    {GENDERS.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGender(gender === g ? "" : g)}
                        aria-pressed={gender === g}
                        className={`flex-1 rounded-md border px-2 py-1.5 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${gender === g ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>الفئة العمرية</Label>
                  <select
                    value={ageRange}
                    onChange={(e) => setAgeRange(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    aria-label="الفئة العمرية"
                  >
                    <option value="">بدون</option>
                    {AGE_RANGES.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="char-desc">الوصف</Label>
              <Textarea
                id="char-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="resize-none"
                placeholder="مثال: بشرة دافئة، شعر أسود طويل، أناقة كاجوال راقية"
              />
            </div>
            <ReferenceImagesInput
              images={referenceImages}
              onChange={setReferenceImages}
              label="صور مرجعية مرفوعة (اختياري — أو ولّد الشيت بالذكاء الاصطناعي)"
              max={4}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>إلغاء</Button>
              <Button size="sm" onClick={submit} disabled={!name.trim() || create.isPending}>
                {create.isPending && <Loader2 className="size-4 animate-spin" />}
                إنشاء
              </Button>
            </div>
          </div>
        )}

        {characters.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-8 text-center">
            <UserRound className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">مفيش شخصيات بعد</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              أنشئ شخصية وصفية وولّد لها شيت مراجع، وبعدها ثبّتها في أي مشهد أو قصة
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {characters.map((c) => (
              <CharacterCard
                key={c.id}
                character={c}
                onDelete={(id) => remove.mutate(id)}
                onGenerateSheet={(id) => generateSheet.mutate(id)}
                sheetPending={pendingSheetJobIds.has(c.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
