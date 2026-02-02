export const formatCurrency = (amount, currency = "USD", locale = "en-US") => {
  // Handle undefined, null, or NaN values
  if (amount === undefined || amount === null || isNaN(amount)) {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(0);
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Format cents to dollars
export const formatCentsToDollars = (
  cents,
  currency = "USD",
  locale = "en-US",
) => {
  const dollars = cents / 100;
  return formatCurrency(dollars, currency, locale);
};

export const centsToUSD = formatCentsToDollars;
