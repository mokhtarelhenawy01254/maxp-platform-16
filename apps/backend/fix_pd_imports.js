const fs = require('fs');
const filepath = 'h:/max_p_new/frontend/src/pages/storefront/ThemeProductDetails.tsx';
let txt = fs.readFileSync(filepath, 'utf8');

// Replace stitch imports
txt = txt.replace(/const ProductDetailsStitchParity = [^]+?const ProductDetailsStitchModern = React.lazy\(\(\) => import\("\.\/ProductDetailsStitchModern"\)\);/, 'const ProductDetailsStitch = React.lazy(() => import("./ProductDetailsStitch"));');

// Replace variant map items
txt = txt.replace(/  "stitch-parity": ProductDetailsStitchParity,\n  "stitch-luxe": ProductDetailsStitchLuxe,\n  "stitch-dark-mineral": ProductDetailsStitchDarkMineral,\n  "stitch-monochrome": ProductDetailsStitchMonochrome,\n  "stitch-elite": ProductDetailsStitchElite,\n  "stitch-modern": ProductDetailsStitchModern,\n/, '');

// Replace renderVariant function
const oldRenderVariant = `  const renderVariant = (variantId: string): React.ReactNode => {
    if (isDemoWorkspace && !companyIdFromSearch) return fallback;
    
    const Component = VARIANT_MAP[variantId.toLowerCase()];
    if (Component) return <Component />;
    
    // Special case for original stitch
    if (variantId === "stitch") return <ProductDetails variant={runtimeVariant} />;
    
    return fallback;
  };`;

const newRenderVariant = `  const renderVariant = (variantId: string): React.ReactNode => {
    if (isDemoWorkspace && !companyIdFromSearch) return fallback;
    
    const vid = variantId.toLowerCase();
    if (vid.startsWith("stitch-")) {
      const switchVar = vid.replace("stitch-", "");
      return <React.Suspense fallback={null}><ProductDetailsStitch variant={switchVar as any} /></React.Suspense>;
    }
    
    const Component = VARIANT_MAP[vid];
    if (Component) return <Component />;
    
    if (vid === "stitch") return <ProductDetails variant={runtimeVariant} />;
    
    return fallback;
  };`;

txt = txt.replace(oldRenderVariant, newRenderVariant);

fs.writeFileSync(filepath, txt, 'utf8');
console.log('Fixed ThemeProductDetails.tsx');
