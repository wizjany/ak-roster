import { useCallback, useEffect, useState } from "react";
import supabase from "supabase/supabaseClient";
import DepotItem from "types/depotItem";
import handlePostgrestError from "util/fns/handlePostgrestError";
import itemJson from "data/items.json";
import useLocalStorage from "./useLocalStorage";
import debounce from "lodash/debounce";

type Depot = Record<string, DepotItem>;

function useDepot() {
  const [depot, _setDepot] = useLocalStorage<Depot>("v3_depot", {});
  const [depotTrackers, setDepotTrackers] = useState({
    rawUpdate: {} as Depot,
    ogValues: {} as Depot,
  });
  const debounceSyncDelay = 5000; //5s of no changes before updating db

  //Function for direct upsert to db and reset change trackers
  const syncDepotToDB = useCallback(async (items: DepotItem[]) => {
    if (items.length === 0) return;
    //Docs && Yesod30: "Add filters to every query", so user_id:
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user_id = session?.user.id;
    if (!user_id) return;

    const { error } = await supabase.from("depot").upsert(items).eq("user_id", user_id);
    if (error) {
      handlePostgrestError(error);
    } else {
      setDepotTrackers({ rawUpdate: {}, ogValues: {} });
    }
  }, []);

  //Debounced call of syncDepotToDB
  const debouncedSyncDepot = useCallback(
    debounce((items: DepotItem[]) => {
      syncDepotToDB(items);
    }, debounceSyncDelay),
    [syncDepotToDB]
  );

  // update local storage and agregate depot changes into rawDepotUpdate
  //immediate - to sync depot to db without debounce
  const putDepot = useCallback(
    (items: DepotItem[], immediate?: boolean) => {
      //dont copy user_id
      //mixing items with/w/o user_id, provokes row-level security error in upsert
      const depotCopy: Depot = {};
      for (const key in depot) {
        const { user_id, ...rest } = depot[key];
        depotCopy[key] = rest;
      }
      const _rawDepotUpdate = { ...depotTrackers.rawUpdate };
      const _ogDepotValues = { ...depotTrackers.ogValues };
      let hasChanges = false;

      items.forEach((item) => {
        //need to create item in local storage, if it didnt exist
        //if exist - agregate only changes
        if ((depotCopy[item.material_id]?.stock ?? 0) !== item.stock) {
          //keep og item before first change.
          if (!_ogDepotValues[item.material_id] && depotCopy[item.material_id])
            _ogDepotValues[item.material_id] = { ...depotCopy[item.material_id] };
          //ignore user_id
          depotCopy[item.material_id] = {
            material_id: item.material_id,
            stock: item.stock,
          };
          //ensure stock change from og value
          if (depotCopy[item.material_id].stock !== (_ogDepotValues[item.material_id]?.stock ?? 0)) {
            _rawDepotUpdate[item.material_id] = { ...depotCopy[item.material_id] };
          } else if (_rawDepotUpdate[item.material_id]) {
            //remove change if stock returned
            delete _rawDepotUpdate[item.material_id];
          }
          hasChanges = true;
        }
      });

      if (!hasChanges) return; //less function calls

      _setDepot(depotCopy);
      setDepotTrackers({ rawUpdate: _rawDepotUpdate, ogValues: _ogDepotValues });

      immediate ? syncDepotToDB(Object.values(_rawDepotUpdate)) : debouncedSyncDepot(Object.values(_rawDepotUpdate));
    },
    [depot, _setDepot, debouncedSyncDepot, depotTrackers.ogValues, depotTrackers.rawUpdate, syncDepotToDB]
  );

  //export function to set zero values to local storage and db
  const resetDepot = useCallback(() => {
    const depotCopy: Depot = {};
    for (const key in depot) {
      const { user_id, ...rest } = depot[key];
      depotCopy[key] = { ...rest, stock: 0 };
    }
    _setDepot(depotCopy);
    syncDepotToDB(Object.values(depotCopy));
  }, [depot, _setDepot, syncDepotToDB]);

  // fetch data from db
  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      let isCanceled = false;
      const user_id = session?.user.id;

      if (!user_id) return;
      //fetch depot
      const { data: _depot } = await supabase.from("depot").select().eq("user_id", user_id);

      const depotResult: Depot = {};
      const depotTrash: string[] = [];
      if (_depot?.length) {
        _depot.forEach((x) => {
          if (x.material_id in itemJson) {
            //unless will specifically need - ignore user_id on fetch too, for consistency
            //depotResult[x.material_id] = x;
            depotResult[x.material_id] = {
              material_id: x.material_id,
              stock: x.stock,
            };
          } else {
            depotTrash.push(x.material_id);
          }
        });
      }

      if (depotTrash.length) await supabase.from("depot").delete().in("material_id", depotTrash);

      if (!isCanceled) _setDepot(depotResult);
      return () => {
        isCanceled = true;
      };
    };

    fetchData();
  }, []);

  //export state of unSavedChanges and debounce
  const hasUnsavedChanges = Object.keys(depotTrackers.rawUpdate).length > 0;

  //export function to refresh debounce timer with current changes data
  const refreshDebounce = useCallback(() => {
    //not do anything without active debounce
    if (hasUnsavedChanges) debouncedSyncDepot(Object.values(depotTrackers.rawUpdate));
  }, [debouncedSyncDepot, depotTrackers.rawUpdate, hasUnsavedChanges]);

  return [depot, putDepot, resetDepot, hasUnsavedChanges, refreshDebounce] as const;
}

export default useDepot;
