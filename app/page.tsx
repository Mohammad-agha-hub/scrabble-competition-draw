import { Dashboard } from "@/components/dashboard";
import { Trophy } from "lucide-react";

export default function Page() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6">
      <header className="mb-10">
        <div className="flex items-center gap-2 text-gold">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-gold">
            <Trophy className="h-5 w-5" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Ali Model High School · Tournament Draw
          </span>
        </div>
        <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-primary sm:text-5xl">
          Draw Day
        </h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Add students by class and section, then draw balanced random groups of four.
          Re-draw whenever you like — every roster and draw is saved.
        </p>
      </header>
      <Dashboard />
    </main>
  );
}
