// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { getSidebarConfig } from '../../../../config/sidebar';
import { APP_REGISTRY } from '../../../../config/appRegistry';
import { getAppByPath } from '../../app-dashboard/AppShell';

const mockT = (key: string, options?: { count?: number; defaultValue?: string }) => {
  if (key === 'sidebar.productsSection') return 'المنتجات';
  if (key === 'sidebar.inventorySection') return 'المخزون';
  if (key === 'sidebar.products') return 'المنتجات';
  if (key === 'sidebar.inventory') return 'إدارة المخزون';
  return options?.defaultValue ?? key;
};

describe('Products & Inventory Navigation Separation', () => {
  it('defines explicit distinct routes in APP_REGISTRY for products and inventory', () => {
    const productsApp = APP_REGISTRY.find((app) => app.id === 'products');
    const inventoryApp = APP_REGISTRY.find((app) => app.id === 'inventory');

    expect(productsApp).toBeDefined();
    expect(productsApp?.route).toBe('/products');
    expect(productsApp?.sectionIds).toEqual(['products']);

    expect(inventoryApp).toBeDefined();
    expect(inventoryApp?.route).toBe('/inventory');
    expect(inventoryApp?.sectionIds).toEqual(['inventory']);
  });

  it('orders /products as the first item in products section and /inventory as first in inventory section', () => {
    const mockUser = {
      role: 'COMPANY_ADMIN',
      company: {
        activeApps: ['store-basic', 'inventory-pro', 'multi-warehouse-pro'],
      },
    };

    const sections = getSidebarConfig(mockT as any, mockUser as any);
    const productsSection = sections.find((s) => s.id === 'products');
    const inventorySection = sections.find((s) => s.id === 'inventory');

    expect(productsSection).toBeDefined();
    expect(productsSection?.items[0].to).toBe('/products');

    expect(inventorySection).toBeDefined();
    expect(inventorySection?.items[0].to).toBe('/inventory');
  });

  it('correctly maps product and inventory routes to their respective apps in getAppByPath', () => {
    const mockUser = {
      role: 'COMPANY_ADMIN',
      company: {
        activeApps: ['store-basic', 'inventory-pro', 'multi-warehouse-pro'],
      },
    };

    const sections = getSidebarConfig(mockT as any, mockUser as any);

    // Products routes
    const productsApp = getAppByPath('/products', sections);
    expect(productsApp?.id).toBe('products');

    const productsAvailApp = getAppByPath('/products/products-availability', sections);
    expect(productsAvailApp?.id).toBe('products');

    const categoriesApp = getAppByPath('/categories', sections);
    expect(categoriesApp?.id).toBe('products');

    // Inventory routes
    const inventoryApp = getAppByPath('/inventory', sections);
    expect(inventoryApp?.id).toBe('inventory');

    const movementsApp = getAppByPath('/inventory/movements', sections);
    expect(movementsApp?.id).toBe('inventory');

    const warehousesApp = getAppByPath('/inventory/warehouses', sections);
    expect(warehousesApp?.id).toBe('inventory');

    // Crucial check: /inventory/studio MUST resolve to inventory, NOT products!
    const studioApp = getAppByPath('/inventory/studio', sections);
    expect(studioApp?.id).toBe('inventory');

    // Crucial check: /settings/store/tools/:toolId MUST resolve to storefront-design, NOT settings!
    const conversionToolsApp = getAppByPath('/settings/store/tools', sections);
    expect(conversionToolsApp?.id).toBe('storefront-design');

    const boughtTogetherApp = getAppByPath('/settings/store/tools/boughtTogether', sections);
    expect(boughtTogetherApp?.id).toBe('storefront-design');
  });
});
