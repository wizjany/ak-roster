﻿import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import enSkinTable from "./ArknightsGamedata/en/gamedata/excel/skin_table.json" with { type: "json" };
import cnSkinTable from "./ArknightsGamedata/cn/gamedata/excel/skin_table.json" with { type: "json" };
import cnCharacterTable from "./ArknightsGamedata/cn/gamedata/excel/character_table.json" with { type: "json" };

const isOperator = (charId) => {
  const operator = cnCharacterTable[charId];
  return operator.profession !== "TOKEN" && operator.profession !== "TRAP" && !operator.isNotObtainable;
};

const createSkinsJson = () => {
  const skinObj = {};

  [...Object.values(cnSkinTable.charSkins)].forEach((skin) => {
    if (!isOperator(skin.charId)) return;
    const enSkin = enSkinTable.charSkins[skin.skinId];
    skinObj[skin.charId] ??= [];
    skinObj[skin.charId].push({
      skinId: skin.skinId,
      skinName: (enSkin && enSkin.displaySkin.skinName) ?? skin.displaySkin.skinName,
      avatarId: skin.avatarId,
      sortId: skin.displaySkin.sortId,
    });
  });

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const outDir = path.join(__dirname, "..", "src/data");
  const skinsPath = path.join(outDir, "skins.json");
  fs.writeFileSync(skinsPath, JSON.stringify(skinObj, null, 2));
  console.log(`skins: wrote ${skinsPath}`);
};

export default createSkinsJson;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createSkinsJson();
}
