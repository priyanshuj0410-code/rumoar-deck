"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { camera, haptics } from "@/lib/platform";
import { createClient } from "@/lib/supabase/client";
import { ITEM_KINDS, type ItemKind } from "@/lib/types";
import { useToast } from "./toast";

type Draft = { label: string; kind: ItemKind; colour: string; path: string; preview: string };

export function AddWardrobeItem() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const toast = useToast();

  async function pick() {
    setError(null);
    const picked = await camera.pick();
    if (picked.length === 0) return;

    setBusy(true);
    haptics.tap();

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Your session expired. Sign in again.");
      setBusy(false);
      return;
    }

    const next: Draft[] = [];
    for (const image of picked) {
      // Storage policy authorises on the first path segment, so it must be the user id.
      const path = `${user.id}/${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("wardrobe")
        .upload(path, image.file, { contentType: "image/jpeg" });

      if (uploadError) {
        setError(uploadError.message);
        continue;
      }
      next.push({ label: "", kind: "other", colour: "", path, preview: image.dataUrl });
    }

    setDrafts(next);
    setBusy(false);
    if (next.length === 0) return;

    // Ask the model to name the pieces. A failure here is not fatal — the fields stay
    // editable and the user can type.
    try {
      const response = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: picked.map((p) => p.dataUrl) }),
      });
      const json = (await response.json()) as {
        items?: { label: string; kind: ItemKind; colour: string | null }[];
      };
      if (json.items?.length) {
        setDrafts((current) =>
          current.map((draft, index) => {
            const read = json.items![index];
            return read
              ? { ...draft, label: read.label, kind: read.kind, colour: read.colour ?? "" }
              : draft;
          }),
        );
      }
    } catch {
      /* manual entry remains available */
    }
  }

  function saveAll() {
    startSaving(async () => {
      const { addWardrobeItem } = await import("@/app/app/actions");
      for (const draft of drafts) {
        if (!draft.label.trim()) continue;
        const form = new FormData();
        form.set("label", draft.label);
        form.set("kind", draft.kind);
        form.set("colour", draft.colour);
        form.set("image_path", draft.path);
        await addWardrobeItem(form);
      }
      const added = drafts.filter((d) => d.label.trim()).length;
      setDrafts([]);
      haptics.success();
      toast(`${added} ${added === 1 ? "piece" : "pieces"} added to your wardrobe`);
      router.refresh();
    });
  }

  return (
    <>
      <button className="btn btn-sm" onClick={pick} disabled={busy}>
        <span className="mi text-[18px]" aria-hidden>
          add_a_photo
        </span>
        {busy ? "Uploading…" : "Add"}
      </button>

      {error && (
        <p role="alert" className="text-sm text-ink w-full mt-3">
          {error}
        </p>
      )}

      {drafts.length > 0 && (
        <div
          role="dialog"
          aria-label="Name your pieces"
          className="fixed inset-0 z-[70] bg-paper flex flex-col"
        >
          <header className="flex-none px-4 py-4 border-b border-line flex items-start justify-between">
            <div>
              <p className="k">New pieces</p>
              <h2 className="text-[21px] mt-1">Check the names</h2>
            </div>
            <button onClick={() => setDrafts([])} aria-label="Cancel" className="mi text-[24px]">
              close
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
            {drafts.map((draft, index) => (
              <div key={draft.path} className="flex gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={draft.preview}
                  alt=""
                  className="w-24 h-24 object-cover bg-wash flex-none"
                />
                <div className="flex-1 flex flex-col gap-2 min-w-0">
                  <label className="sr-only" htmlFor={`label-${index}`}>
                    Name
                  </label>
                  <input
                    id={`label-${index}`}
                    className="field"
                    placeholder="Olive linen shirt"
                    value={draft.label}
                    onChange={(e) =>
                      setDrafts((current) =>
                        current.map((d, i) => (i === index ? { ...d, label: e.target.value } : d)),
                      )
                    }
                  />
                  <label className="sr-only" htmlFor={`kind-${index}`}>
                    Kind
                  </label>
                  <select
                    id={`kind-${index}`}
                    className="field"
                    value={draft.kind}
                    onChange={(e) =>
                      setDrafts((current) =>
                        current.map((d, i) =>
                          i === index ? { ...d, kind: e.target.value as ItemKind } : d,
                        ),
                      )
                    }
                  >
                    {ITEM_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {kind}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div className="flex-none px-4 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))]">
            <button className="btn w-full" onClick={saveAll} disabled={saving}>
              {saving ? "Saving…" : `Add ${drafts.length} to wardrobe`}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
