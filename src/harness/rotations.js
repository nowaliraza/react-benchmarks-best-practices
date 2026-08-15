export function balancedRotations(items, count) {
  if (items.length === 0 || count < 1) return [];
  const forward = [...items];
  const reverse = [...items].reverse();
  return Array.from({ length: count }, (_, rotation) => {
    const source = rotation % 2 === 0 ? forward : reverse;
    const offset = Math.floor(rotation / 2) % source.length;
    return [...source.slice(offset), ...source.slice(0, offset)];
  });
}

export function positionCounts(rotations) {
  const result = {};
  rotations.forEach((order) => order.forEach((item, position) => {
    result[item] ??= Array(order.length).fill(0);
    result[item][position] += 1;
  }));
  return result;
}
