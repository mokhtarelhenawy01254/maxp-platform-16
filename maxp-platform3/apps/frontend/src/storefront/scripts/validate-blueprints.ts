import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  cairoStrideBlueprint,
  nileBistroBlueprint,
  shopOrbitBlueprint,
  novaMobileBlueprint,
  kidsPlayBlueprint,
  compileStorefrontBlueprint,
} from "../blueprints";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const THEMES_DIR = path.resolve(__dirname, "../themes");

const BLUEPRINTS = [
  shopOrbitBlueprint,
  cairoStrideBlueprint,
  nileBistroBlueprint,
  novaMobileBlueprint,
  kidsPlayBlueprint,
];

const main = () => {
  const failures: string[] = [];

  BLUEPRINTS.forEach((blueprint) => {
    try {
      const compiled = compileStorefrontBlueprint(blueprint);
      const filePath = path.join(THEMES_DIR, `${blueprint.id}.json`);
      
      fs.writeFileSync(filePath, JSON.stringify(compiled.theme, null, 2));
      console.log(`PASS ${blueprint.id} -> ${blueprint.id}.json`);
    } catch (error) {
      failures.push(`${blueprint.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  if (failures.length > 0) {
    console.error("Storefront blueprint validation/compilation failed:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log(`Successfully compiled ${BLUEPRINTS.length} storefront blueprints.`);
};

main();
