const { getSharedPrismaClient } = require('./sharedDatabase');

/**
 * Recipe Service for Cafe & Restaurant Suite
 * Handles calculation of recipe theoretical costs, raw ingredient stock deductions, and BOM management.
 */

/**
 * Fetch recipe for a specific product
 */
async function getRecipeByProductId(companyId, productId) {
  const prisma = getSharedPrismaClient();
  const recipe = await prisma.recipe.findFirst({
    where: { companyId, productId },
    include: {
      product: {
        select: { id: true, name: true, price: true, sku: true, images: true }
      },
      ingredients: {
        include: {
          rawProduct: {
            select: { id: true, name: true, sku: true, cost: true, price: true, stock: true }
          }
        }
      }
    }
  });

  if (!recipe) return null;

  // Calculate live theoretical cost
  let totalCost = 0;
  const ingredientsWithCost = recipe.ingredients.map((ing) => {
    const rawCost = Number(ing.rawProduct?.cost || 0);
    const qty = Number(ing.quantity || 0);
    const ratio = Number(ing.unitConversionRatio || 1);
    const yieldPct = Number(ing.yieldPercentage || 100) / 100;
    
    // Effective cost considering yield / waste factor
    const effectiveQty = yieldPct > 0 ? (qty * ratio) / yieldPct : qty * ratio;
    const ingredientCost = effectiveQty * rawCost;
    totalCost += ingredientCost;

    return {
      ...ing,
      effectiveCost: Math.round(ingredientCost * 100) / 100
    };
  });

  const sellingPrice = Number(recipe.product?.price || 0);
  const profitMargin = sellingPrice > 0 ? ((sellingPrice - totalCost) / sellingPrice) * 100 : 0;

  return {
    ...recipe,
    ingredients: ingredientsWithCost,
    liveTheoreticalCost: Math.round(totalCost * 100) / 100,
    profitMarginPercentage: Math.round(profitMargin * 10) / 10
  };
}

/**
 * Create or update recipe with ingredients
 */
async function upsertRecipe(companyId, data) {
  const prisma = getSharedPrismaClient();
  const { productId, name, description, prepTimeMinutes, yieldQuantity, ingredients = [] } = data;

  if (!productId) {
    throw new Error('رقم المنتج النهائي مطلوب');
  }

  // Calculate estimated total cost
  let estimatedCost = 0;
  for (const ing of ingredients) {
    if (ing.rawProductId) {
      const rawProd = await prisma.product.findFirst({
        where: { id: ing.rawProductId, companyId }
      });
      if (rawProd) {
        const rawCost = Number(rawProd.cost || 0);
        const qty = Number(ing.quantity || 0);
        const ratio = Number(ing.unitConversionRatio || 1);
        const yieldPct = Number(ing.yieldPercentage || 100) / 100;
        const effectiveQty = yieldPct > 0 ? (qty * ratio) / yieldPct : qty * ratio;
        estimatedCost += effectiveQty * rawCost;
      }
    }
  }

  // Check if recipe already exists
  const existing = await prisma.recipe.findFirst({
    where: { companyId, productId }
  });

  if (existing) {
    // Update existing recipe: delete old ingredients and recreate
    return await prisma.$transaction(async (tx) => {
      await tx.recipeIngredient.deleteMany({
        where: { recipeId: existing.id }
      });

      const updated = await tx.recipe.update({
        where: { id: existing.id },
        data: {
          name: name || existing.name,
          description,
          prepTimeMinutes: prepTimeMinutes !== undefined ? prepTimeMinutes : existing.prepTimeMinutes,
          yieldQuantity: yieldQuantity || existing.yieldQuantity,
          estimatedCost: Math.round(estimatedCost * 100) / 100,
          ingredients: {
            create: ingredients.map((ing) => ({
              rawProductId: ing.rawProductId,
              quantity: ing.quantity,
              unit: ing.unit || 'G',
              unitConversionRatio: ing.unitConversionRatio || 1.0,
              yieldPercentage: ing.yieldPercentage || 100.0,
              costPerUnit: ing.costPerUnit || null,
              notes: ing.notes || null
            }))
          }
        },
        include: {
          ingredients: {
            include: { rawProduct: true }
          }
        }
      });
      return updated;
    });
  } else {
    // Create new recipe
    return await prisma.recipe.create({
      data: {
        companyId,
        productId,
        name: name || 'معيار الصنف القياسي',
        description,
        prepTimeMinutes: prepTimeMinutes || 3,
        yieldQuantity: yieldQuantity || 1.0,
        estimatedCost: Math.round(estimatedCost * 100) / 100,
        ingredients: {
          create: ingredients.map((ing) => ({
            rawProductId: ing.rawProductId,
            quantity: ing.quantity,
            unit: ing.unit || 'G',
            unitConversionRatio: ing.unitConversionRatio || 1.0,
            yieldPercentage: ing.yieldPercentage || 100.0,
            costPerUnit: ing.costPerUnit || null,
            notes: ing.notes || null
          }))
        }
      },
      include: {
        ingredients: {
          include: { rawProduct: true }
        }
      }
    });
  }
}

/**
 * List all recipes for a company
 */
async function listRecipes(companyId, { page = 1, limit = 50, search = '' } = {}) {
  const prisma = getSharedPrismaClient();
  const where = {
    companyId,
    isActive: true,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { product: { name: { contains: search, mode: 'insensitive' } } }
          ]
        }
      : {})
  };

  const [total, recipes] = await Promise.all([
    prisma.recipe.count({ where }),
    prisma.recipe.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        product: {
          select: { id: true, name: true, price: true, sku: true, images: true, categoryId: true }
        },
        ingredients: {
          include: {
            rawProduct: {
              select: { id: true, name: true, sku: true, cost: true, stock: true }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })
  ]);

  return { total, page, limit, recipes };
}

/**
 * Delete recipe
 */
async function deleteRecipe(companyId, recipeId) {
  const prisma = getSharedPrismaClient();
  const recipe = await prisma.recipe.findFirst({
    where: { id: recipeId, companyId }
  });

  if (!recipe) {
    throw new Error('الرسيبي غير موجود أو تم حذفه');
  }

  return await prisma.recipe.delete({
    where: { id: recipeId }
  });
}

/**
 * Deducts recipe ingredients for POS/Order items in real-time.
 * Used inside a transaction tx during order placement.
 */
async function deductRecipeIngredients({ companyId, warehouseId, orderItems, orderNumber, userId, tx }) {
  const deductions = [];

  for (const item of orderItems) {
    // 1. Check if item has an active recipe
    const recipe = await tx.recipe.findFirst({
      where: {
        companyId,
        productId: item.productId,
        isActive: true
      },
      include: {
        ingredients: {
          include: { rawProduct: true }
        }
      }
    });

    if (!recipe || !recipe.ingredients || recipe.ingredients.length === 0) {
      // No recipe: caller will handle regular finished product stock decrement
      continue;
    }

    // 2. Decrement each ingredient
    for (const ing of recipe.ingredients) {
      const rawProdId = ing.rawProductId;
      const orderQty = Number(item.quantity || 1);
      const ingQty = Number(ing.quantity || 0);
      const ratio = Number(ing.unitConversionRatio || 1);
      const yieldPct = Number(ing.yieldPercentage || 100) / 100;

      // Calculate total raw units needed for this order quantity
      const totalRawUnits = yieldPct > 0 ? (orderQty * ingQty * ratio) / yieldPct : orderQty * ingQty * ratio;
      const roundedUnitsToDeduct = Math.max(1, Math.round(totalRawUnits));

      // A. Decrement global product stock
      await tx.product.update({
        where: { id: rawProdId },
        data: {
          stock: { decrement: roundedUnitsToDeduct }
        }
      });

      // B. Decrement warehouse inventory
      let inventoryWhere = {
        productId: rawProdId,
        warehouse: { companyId }
      };
      if (warehouseId) {
        inventoryWhere.warehouseId = warehouseId;
      }

      const invRecord = await tx.inventory.findFirst({
        where: inventoryWhere
      });

      if (invRecord) {
        await tx.inventory.update({
          where: { id: invRecord.id },
          data: {
            quantity: { decrement: roundedUnitsToDeduct },
            available: { decrement: roundedUnitsToDeduct }
          }
        });

        // C. Record Stock Movement
        await tx.stockMovement.create({
          data: {
            productId: rawProdId,
            warehouseId: invRecord.warehouseId,
            type: 'OUT',
            reason: 'SALE',
            quantity: roundedUnitsToDeduct,
            reference: orderNumber,
            notes: `استهلاك رسيبي: ${orderQty}x ${item.productName || 'مشروب'} (طلب #${orderNumber})`,
            userId: userId || null,
            isApproved: true
          }
        });
      }

        deductions.push({
          rawProductId: rawProdId,
          rawProductName: ing.rawProduct?.name,
          quantityDeducted: roundedUnitsToDeduct,
          unit: ing.unit,
          orderItemId: item.id || item.productId
        });
      }

      // 3. Deduct additional raw materials linked to selected modifiers (e.g. Almond milk, syrups)
      const selectedModifiers = item.selectedModifiers || item.modifiers || [];
      if (Array.isArray(selectedModifiers) && selectedModifiers.length > 0) {
        for (const mod of selectedModifiers) {
          const rawModId = mod.rawProductId;
          const modQty = Number(mod.rawQuantity || 0);
          if (rawModId && modQty > 0) {
            const totalModUnits = Math.max(1, Math.round(orderQty * modQty));
            await tx.product.update({
              where: { id: rawModId },
              data: { stock: { decrement: totalModUnits } }
            });

            const modInv = await tx.inventory.findFirst({
              where: warehouseId ? { warehouseId, productId: rawModId } : { productId: rawModId, warehouse: { companyId } }
            });

            if (modInv) {
              await tx.inventory.update({
                where: { id: modInv.id },
                data: {
                  quantity: { decrement: totalModUnits },
                  available: { decrement: totalModUnits }
                }
              });

              await tx.stockMovement.create({
                data: {
                  productId: rawModId,
                  warehouseId: modInv.warehouseId,
                  type: 'OUT',
                  reason: 'SALE',
                  quantity: totalModUnits,
                  reference: orderNumber,
                  notes: `استهلاك خامة تعديل (${mod.name || 'إضافة'}) لطلب #${orderNumber}`,
                  userId: userId || null,
                  isApproved: true
                }
              });

              deductions.push({
                rawProductId: rawModId,
                rawProductName: mod.name,
                quantityDeducted: totalModUnits,
                unit: 'UNIT',
                orderItemId: item.id || item.productId
              });
            }
          }
        }
      }
    }

  return deductions;
}

module.exports = {
  getRecipeByProductId,
  upsertRecipe,
  listRecipes,
  deleteRecipe,
  deductRecipeIngredients
};
