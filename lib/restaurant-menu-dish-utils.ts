export type RestaurantMenuDishNeedsReviewInput = {
  name: string | null | undefined;
  priceAmount: number | null | undefined;
  ingredients: unknown;
};

export function restaurantMenuDishNeedsReview(input: RestaurantMenuDishNeedsReviewInput): boolean {
  const name = (input.name ?? '').trim();
  const priceMissing = input.priceAmount === null || input.priceAmount === undefined;

  const ingredients = input.ingredients;
  const ingredientsArray = Array.isArray(ingredients) ? ingredients : [];

  const ingredientsMissing = ingredientsArray.length === 0;

  return name.length === 0 || priceMissing || ingredientsMissing;
}

