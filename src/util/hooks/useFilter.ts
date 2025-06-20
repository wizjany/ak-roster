import { matchOperatorName } from "components/planner/OperatorSearch";
import { useCallback, useState } from "react";
import { OpInfo } from "types/operators/operator";

const checkClasses = (op: OpInfo, value: Set<Value>) => value.has(op.class);
const checkBranches = (op: OpInfo, value: Set<Value>) => value.has(op.branch);
const checkOwned = (op: OpInfo, value: Set<Value>) => value.has(op.potential > 0);
const checkElite = (op: OpInfo, value: Set<Value>) => value.has(op.elite);
const checkRarity = (op: OpInfo, value: Set<Value>) => value.has(op.rarity);
const checkCNOnly = (op: OpInfo, value: Set<Value>) => value.has(op.isCnOnly);
const checkModuleCNOnly = (op: OpInfo, value: Set<Value>) =>
  op.moduleData && op.moduleData.some((m) => value.has(m.isCnOnly));
const checkSkillLevel = (op: OpInfo, value: Set<Value>) => value.has(op.skill_level);
const checkMastery = (op: OpInfo, value: Set<Value>) =>
  op.masteries &&
  value.values().some((v) =>
    (v === 0 && op.masteries.every((m) => m === v))
    || (v !== 0 && op.masteries.some((m) => m === v))
  );
const checkModuleLevel = (op: OpInfo, value: Set<Value>) =>
  op.modules &&
  value.values().some((v) =>
    (v === 0 && Object.values(op.modules).every((m) => m === v))
    || (v !== 0 && Object.values(op.modules).some((m) => m === v))
  );;


export type Value = string | boolean | number;

export type Filters = {
  CLASS: Set<Value>;
  BRANCH: Set<Value>;
  OWNED: Set<Value>;
  ELITE: Set<Value>;
  RARITY: Set<Value>;
  CN: Set<Value>;
  MODULECN: Set<Value>;
  MASTERY: Set<Value>;
  SKILLLEVEL: Set<Value>;
  MODULELEVEL: Set<Value>;
};
export type ToggleFilter = (category: keyof Filters, value: Value) => void;

export default function useFilter(init: Partial<Filters> = {}) {
  const [filters, setFilters] = useState<Filters>({
    CLASS: init.CLASS ?? new Set(),
    BRANCH: init.BRANCH ?? new Set(),
    OWNED: init.OWNED ?? new Set(),
    ELITE: init.ELITE ?? new Set(),
    RARITY: init.RARITY ?? new Set(),
    CN: init.CN ?? new Set(),
    MODULECN: init.MODULECN ?? new Set(),
    MASTERY: init.MASTERY ?? new Set(),
    SKILLLEVEL: init.SKILLLEVEL ?? new Set(),
    MODULELEVEL: init.MODULELEVEL ?? new Set(),
  });

  const [search, setSearch] = useState("");

  const toggleFilter = useCallback(
    (category: keyof Filters, value: Value) => {
      const cloneFilter = structuredClone(filters);
      const set = cloneFilter[category];
      if (set.has(value)) {
        set.delete(value);
      } else set.add(value);
      setFilters(cloneFilter);
    },
    [filters]
  );

  const clearFilters = useCallback(() => {
    setFilters((f: Filters) => Object.fromEntries(Object.keys(f).map((k) => [k, new Set()])) as Filters);
  }, []);

  const filterFunction = useCallback(
    (op: OpInfo) => {
      if (filters.CLASS.size && !checkClasses(op, filters.CLASS)) return false;
      if (filters.BRANCH.size && !checkBranches(op, filters.BRANCH)) return false;
      if (filters.OWNED.size && !checkOwned(op, filters.OWNED)) return false;
      if (filters.ELITE.size && !checkElite(op, filters.ELITE)) return false;
      if (filters.RARITY.size && !checkRarity(op, filters.RARITY)) return false;
      if (filters.CN.size && !checkCNOnly(op, filters.CN)) return false;
      if (filters.MODULECN.size && !checkModuleCNOnly(op, filters.MODULECN)) return false;
      if (filters.MASTERY.size && !checkMastery(op, filters.MASTERY)) return false;
      if (filters.SKILLLEVEL.size && !checkSkillLevel(op, filters.SKILLLEVEL)) return false;
      if (filters.MODULELEVEL.size && !checkModuleLevel(op, filters.MODULELEVEL)) return false;
      if (!matchOperatorName(op.name, search)) return false;
      return true;
    },
    [filters, search]
  );

  return {
    filters,
    toggleFilter,
    clearFilters,
    filterFunction,
    search,
    setSearch,
  } as const;
}
