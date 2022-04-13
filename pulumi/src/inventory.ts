import { readFileSync } from "fs";

export const readInventorySync = (): Inventory => {
  return JSON.parse(readFileSync("./inventory/inventory.json", "utf8"));
};

export type Inventory = {
  shellyPlugs: string[];
};
