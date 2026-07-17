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
};

export type GroupBatch = {
  _id?: string;
  createdAt: string;
  groupSize: number;
  scope: "class-section" | "class" | "all";
  groups: Group[];
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
      });
    });
  }
  return result;
}
