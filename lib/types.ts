export type Student = {
  _id: string;
  name: string;
  className: string;
  section: string;
  createdAt?: string;
};

export type GroupMember = {
  _id: string;
  name: string;
  className: string;
  section: string;
};

export type Group = {
  name: string; // e.g. "Group A"
  className: string;
  section: string;
  members: GroupMember[];
  size: number; // requested group size (usually 4)
  winnerIds?: string[]; // member _ids that advance (1 or 2 per group)
  scores?: Record<string, number>; // member _id -> score
};

// A group can send at most this many players to the next round.
export const MAX_ADVANCERS = 2;

// In the final group we rank a podium instead: 1st, 2nd and 3rd place.
export const FINAL_PICKS = 3;

export type Round = {
  name: string; // e.g. "Round 1"
  groupSize: number;
  groups: Group[];
};

export type GroupBatch = {
  _id?: string;
  createdAt: string;
  groupSize: number; // group size used for the first round
  scope: "class-section" | "class" | "all";
  rounds: Round[];
};

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Split n students into groups of `size`.
// Distributes leftovers so we never leave a single lonely student:
// if the remainder is 1 or 2, we spread them across existing groups.
function chunk(members: GroupMember[], size: number): GroupMember[][] {
  if (members.length === 0) return [];
  if (members.length <= size) return [members];

  const fullCount = Math.floor(members.length / size);
  const remainder = members.length % size;
  const groups: GroupMember[][] = [];

  for (let i = 0; i < fullCount; i++) {
    groups.push(members.slice(i * size, i * size + size));
  }
  const leftovers = members.slice(fullCount * size);

  if (remainder === 0) return groups;

  // If the leftover chunk is big enough to stand alone (>= size-1), keep it.
  if (remainder >= size - 1) {
    groups.push(leftovers);
  } else {
    // Otherwise sprinkle leftovers one-by-one into the earliest groups.
    leftovers.forEach((m, idx) => groups[idx % groups.length].push(m));
  }
  return groups;
}

export function generateGroups(
  students: Student[],
  groupSize: number,
  scope: GroupBatch["scope"],
): Group[] {
  const buckets = new Map<
    string,
    { className: string; section: string; members: GroupMember[] }
  >();

  for (const s of students) {
    let key: string;
    if (scope === "all") key = "__ALL__";
    else if (scope === "class") key = s.className;
    else key = `${s.className}||${s.section}`;

    if (!buckets.has(key)) {
      buckets.set(key, {
        className: scope === "all" ? "All classes" : s.className,
        section: scope === "class-section" ? s.section : "—",
        members: [],
      });
    }
    buckets.get(key)!.members.push({
      _id: s._id,
      name: s.name,
      className: s.className,
      section: s.section,
    });
  }

  const result: Group[] = [];
  // Stable, readable order.
  const sortedKeys = [...buckets.keys()].sort();

  for (const key of sortedKeys) {
    const bucket = buckets.get(key)!;
    const chunks = chunk(shuffle(bucket.members), groupSize);
    chunks.forEach((members, i) => {
      const letter = i < LETTERS.length ? LETTERS[i] : `${i + 1}`;
      result.push({
        name: `Group ${letter}`,
        className: bucket.className,
        section: bucket.section,
        members,
        size: groupSize,
        winnerIds: [],
        scores: {},
      });
    });
  }
  return result;
}

// Build the groups for a follow-up round by pooling the given winners and
// splitting them into fresh groups of `size`. Matchups are randomised.
export function makeWinnerGroups(
  winners: GroupMember[],
  size: number,
): Group[] {
  const chunks = chunk(shuffle(winners), size);
  return chunks.map((members, i) => {
    const letter = i < LETTERS.length ? LETTERS[i] : `${i + 1}`;
    return {
      name: `Group ${letter}`,
      className: "Winners",
      section: "—",
      members,
      size,
      winnerIds: [],
      scores: {},
    };
  });
}

// The winner members of a single group, in the order they were picked
// (1st place first). Ignores ids that aren't in the group.
export function groupWinners(g: Group): GroupMember[] {
  return (g.winnerIds ?? [])
    .map((id) => g.members.find((m) => m._id === id))
    .filter((m): m is GroupMember => Boolean(m));
}

// Collect every advancing member across all groups in a round.
export function roundWinners(round: Round): GroupMember[] {
  return round.groups.flatMap(groupWinners);
}

// True when every group in the round has advanced at least one player.
export function roundComplete(round: Round): boolean {
  return round.groups.every((g) => groupWinners(g).length > 0);
}

// The final standings: the ordered picks (1st, 2nd, 3rd) of the last round's
// single group. Empty until the tournament reaches a final group.
export function podium(batch: GroupBatch): GroupMember[] {
  const last = batch.rounds[batch.rounds.length - 1];
  if (!last || last.groups.length !== 1) return [];
  return groupWinners(last.groups[0]);
}

// The champion is whoever was picked 1st in the final group.
export function champion(batch: GroupBatch): GroupMember | null {
  return podium(batch)[0] ?? null;
}
