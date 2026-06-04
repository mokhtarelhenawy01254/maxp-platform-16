import { STOREFRONT_THEME_PRESETS } from '../themes';
import { validateStorefrontTheme } from '../engine/themeValidation';

const main = () => {
  const failures: string[] = [];

  Object.values(STOREFRONT_THEME_PRESETS).forEach((theme) => {
    const errors = validateStorefrontTheme(theme);
    if (errors.length === 0) {
      console.log(`PASS ${theme.id}`);
      return;
    }

    failures.push(`${theme.id}: ${errors.join(' | ')}`);
  });

  if (failures.length > 0) {
    console.error('Storefront theme validation failed:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log(`Validated ${Object.keys(STOREFRONT_THEME_PRESETS).length} storefront theme presets.`);
};

main();
