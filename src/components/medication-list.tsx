import { Badge } from "@/components/ui/badge";
import type { Dictionary } from "@/lib/i18n";

type Medication = {
  nameAsWritten: string;
  doseAsWritten: string;
  frequencyAsWritten: string;
  durationAsWritten: string;
  uncertain?: boolean;
};

/** Medicines exactly as written on the paper. Never mapped to another name. */
export function MedicationList({ medications, dict }: { medications: Medication[]; dict: Dictionary }) {
  return (
    <ul className="flex flex-col gap-2">
      {medications.map((m, i) => {
        const details = [m.doseAsWritten, m.frequencyAsWritten, m.durationAsWritten].filter(Boolean).join(", ");
        return (
          <li key={`${m.nameAsWritten}-${i}`}>
            <span className="block font-medium">{m.nameAsWritten}</span>
            {details && <span className="block text-sm text-muted-foreground">{details}</span>}
            {m.uncertain && <Badge variant="warning" className="mt-1">{dict.timeline.uncertain}</Badge>}
          </li>
        );
      })}
    </ul>
  );
}
