import { Dashboard } from "@/components/dashboard";
import { Trophy } from "lucide-react";

export default function Page() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6 sm:pt-10">
      <header className="mb-8 sm:mb-10">
        <div className="flex items-center gap-2">
         
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:text-xs sm:tracking-[0.18em]">
            Scrabble Tournament Draw
          </span>
        </div>
        <h1 className="mt-4 py-4 font-display text-3xl font-bold tracking-tight text-primary sm:text-4xl md:text-5xl">
          Draw Day
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
          Add students by class and section, then draw balanced random groups of four.
          Re-draw whenever you like — every roster and draw is saved.
        </p>
      </header>
      <Dashboard />
    </main>
  );
}