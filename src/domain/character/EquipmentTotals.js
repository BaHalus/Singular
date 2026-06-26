import { validateEquipment } from "./Equipment.js";

export function calculateEquipmentTotals(equipment) {
  validateEquipment(equipment);
  const items = flattenEquipment(equipment);

  return Object.freeze({
    quantity: sumDecimalProducts(items, "quantity", null),
    weightKg: sumDecimalProducts(items, "weightKg", "quantity"),
    cost: sumDecimalProducts(items, "cost", "quantity"),
  });
}

function flattenEquipment(equipment) {
  return equipment.flatMap(item => [item, ...flattenEquipment(item.children)]);
}

function sumDecimalProducts(items, valueField, multiplierField) {
  const terms = items.map(item => {
    const value = numberToDecimalParts(item[valueField]);
    const multiplier = multiplierField === null
      ? { coefficient: 1n, scale: 0 }
      : numberToDecimalParts(item[multiplierField]);

    return {
      coefficient: value.coefficient * multiplier.coefficient,
      scale: value.scale + multiplier.scale,
    };
  });

  const maxScale = terms.reduce(
    (maximum, term) => Math.max(maximum, term.scale),
    0,
  );
  const coefficient = terms.reduce(
    (total, term) => total + (
      term.coefficient * (10n ** BigInt(maxScale - term.scale))
    ),
    0n,
  );

  return decimalPartsToNumber(coefficient, maxScale);
}

function numberToDecimalParts(value) {
  const [mantissa, exponentText] = value.toString().toLowerCase().split("e");
  const exponent = exponentText === undefined ? 0 : Number(exponentText);
  const [integerPart, fractionalPart = ""] = mantissa.split(".");
  let coefficient = BigInt(`${integerPart}${fractionalPart}`);
  let scale = fractionalPart.length - exponent;

  if (scale < 0) {
    coefficient *= 10n ** BigInt(-scale);
    scale = 0;
  }
  while (scale > 0 && coefficient % 10n === 0n) {
    coefficient /= 10n;
    scale -= 1;
  }
  return { coefficient, scale };
}

function decimalPartsToNumber(coefficient, scale) {
  let digits = coefficient.toString();
  let decimal;

  if (scale === 0) {
    decimal = digits;
  } else {
    digits = digits.padStart(scale + 1, "0");
    const splitAt = digits.length - scale;
    decimal = `${digits.slice(0, splitAt)}.${digits.slice(splitAt)}`;
  }

  const result = Number(decimal);
  if (!Number.isFinite(result)) {
    throw new Error("Equipment total exceeds finite number range");
  }
  return Object.is(result, -0) ? 0 : result;
}
