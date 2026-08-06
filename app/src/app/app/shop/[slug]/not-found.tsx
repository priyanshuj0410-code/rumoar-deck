import { EmptyState } from "@/components/states";

/** A slug that no longer exists — a real state, not an error. */
export default function ProductNotFound() {
  return (
    <div className="max-w-[720px] px-4 sm:px-6 xl:px-8 py-6">
      <EmptyState
        icon="search_off"
        title="That piece isn’t here"
        body="It may have sold out or been renamed. The rest of the shop is where you left it."
        action={{ label: "Back to the shop", href: "/app/shop" }}
      />
    </div>
  );
}
