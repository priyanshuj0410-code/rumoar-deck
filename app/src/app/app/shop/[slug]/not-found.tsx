import { EmptyState } from "@/components/states";

/** A slug that no longer exists — a real state, not an error. */
export default function ProductNotFound() {
  return (
    <div className="max-w-[980px] px-4 mx-auto @lg:px-6 @4xl:px-10 py-6 @4xl:py-10">
      <EmptyState
        icon="search_off"
        title="That piece isn’t here"
        body="It may have sold out or been renamed. The rest of the shop is where you left it."
        action={{ label: "Back to the shop", href: "/app/shop" }}
      />
    </div>
  );
}
