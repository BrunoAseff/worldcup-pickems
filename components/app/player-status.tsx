import { Badge } from "@/components/ui/badge";

export function PlayerStatus() {
  return (
    <>
      <Badge variant="outline" className="px-3 py-1">
        0 pts
      </Badge>
      <Badge variant="outline" className="px-3 py-1">
        4º lugar
      </Badge>
    </>
  );
}
