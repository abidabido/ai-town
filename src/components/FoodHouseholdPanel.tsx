import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function FoodHouseholdPanel({ household }: { household: string }) {
  const current = useQuery(api.genesis.current);
  if (!current?.state?.life) return <div className="p-4">Loading world...</div>;
  const s = current.state;
  const inv = s.life.foodInventory?.[household] ?? {};
  const grocery = s.life.grocery;
  const people = s.citizens.filter(c => s.life.people[c.id]?.home === household);

  return (
    <div className="p-4 bg-white/90 rounded-lg max-w-md text-sm">
      <h3 className="font-bold mb-2">Household {household} Pantry</h3>
      <div className="mb-3">
        <strong>Ingredients & Meals:</strong>
        <ul className="list-disc ml-4">
          {Object.entries(inv).map(([k, v]) => (
            <li key={k}>{k}: {String(v)}</li>
          ))}
          {Object.keys(inv).length === 0 && <li>Empty</li>}
        </ul>
      </div>
      <div className="mb-3">
        <strong>Residents:</strong> {people.map(p => p.name).join(", ") || "None"}
      </div>
      {grocery && (
        <div>
          <strong>Willow Market stock (sample):</strong>
          <ul className="list-disc ml-4 text-xs">
            {Object.entries(grocery.inventory).slice(0, 8).map(([k, v]) => (
              <li key={k}>{k}: {String(v)} @ {grocery.prices[k] ?? "—"}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-2 text-xs text-gray-500">Updated from live simulation state.</p>
    </div>
  );
}
