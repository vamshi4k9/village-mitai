// Items are sold by weight (250 / 500 / 1000 g) and, when the item has a piece
// price and piece weight set in the admin, also by the piece. A cart or order
// line bought by the piece carries this marker in its `weight` field, and its
// quantity is the number of pieces.
export const PIECE = "piece";

export const isPiece = (weight) => String(weight) === PIECE;

export const hasPieceOption = (item) =>
  !!item &&
  item.piece_price != null &&
  item.piece_weight != null &&
  Number(item.piece_price) > 0 &&
  Number(item.piece_weight) > 0;

// "250 g", "1 KG", or "Per piece (50 g each)"
export const formatWeight = (weight, item) => {
  if (isPiece(weight)) {
    return item && item.piece_weight ? `Per piece (${item.piece_weight} g each)` : "Per piece";
  }
  const grams = Number(weight);
  if (!grams) return weight || "N/A";
  return grams >= 1000 ? `${grams / 1000} KG` : `${grams} g`;
};

// "Qty: 2", or "6 pieces" for a line bought by the piece
export const formatQuantity = (quantity, weight) =>
  isPiece(weight) ? `${quantity} ${quantity === 1 ? "piece" : "pieces"}` : `Qty: ${quantity}`;
