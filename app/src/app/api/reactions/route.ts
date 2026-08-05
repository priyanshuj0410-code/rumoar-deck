import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const KINDS = ["like", "dislike", "save", "share"] as const;
type Kind = (typeof KINDS)[number];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as {
    subjectType?: "style" | "look";
    subjectId?: string;
    kind?: Kind;
    on?: boolean;
  } | null;

  const subjectType = body?.subjectType === "look" ? "look" : "style";
  const subjectId = body?.subjectId;
  const kind = body?.kind;
  const on = body?.on !== false;

  if (!subjectId || !kind || !KINDS.includes(kind)) {
    return NextResponse.json({ error: "subjectId and kind required" }, { status: 400 });
  }

  if (!on) {
    await supabase
      .from("reactions")
      .delete()
      .eq("user_id", user.id)
      .eq("subject_type", subjectType)
      .eq("subject_id", subjectId)
      .eq("kind", kind);
    return NextResponse.json({ ok: true });
  }

  // Like and dislike are a single opinion — turning one on turns the other off.
  const opposite = kind === "like" ? "dislike" : kind === "dislike" ? "like" : null;
  if (opposite) {
    await supabase
      .from("reactions")
      .delete()
      .eq("user_id", user.id)
      .eq("subject_type", subjectType)
      .eq("subject_id", subjectId)
      .eq("kind", opposite);
  }

  const { error } = await supabase
    .from("reactions")
    .upsert(
      { user_id: user.id, subject_type: subjectType, subject_id: subjectId, kind },
      { onConflict: "user_id,subject_type,subject_id,kind" },
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
