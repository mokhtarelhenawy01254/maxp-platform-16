/**
 * Generates a deterministic "fake" stock number between 3 and 12 based on the productId.
 * This ensures urgency while maintaining consistency for the user.
 * 
 * @param productId Product ID string
 * @param actualStock Actual stock from database
 * @returns A number between 3 and 12, or the actual stock if it's less than 3 but > 0.
 */
export const getFakeStock = (productId: string | undefined, actualStock: number): number => {
    if (actualStock === 0) return 0;
    if (!productId) return Math.min(actualStock, 5);

    // Generate a hash from the productId
    let hash = 0;
    for (let i = 0; i < productId.length; i++) {
        hash = productId.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Map the hash to a number between 3 and 12
    const min = 3;
    const max = 12;
    const fakeStock = min + (Math.abs(hash) % (max - min + 1));

    // If actual stock is lower than our calculated fake stock (but still > 0), 
    // we can use actual stock to avoid showing more than what's available if it's very low.
    // However, for "fake" urgency, we usually want to show a low number even if actual is high.
    return fakeStock;
};
