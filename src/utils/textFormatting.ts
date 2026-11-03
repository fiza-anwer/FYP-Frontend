export function formatTitleCase(value?: string | null): string {
  return (value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[A-Za-zÀ-ÖØ-öø-ÿ]+(?:['’][A-Za-zÀ-ÖØ-öø-ÿ]+)*/g, (word) => {
      if (word.length <= 4 && word === word.toLocaleUpperCase()) return word;
      if (/[a-z]/.test(word.slice(1)) && /[A-Z]/.test(word.slice(1))) return word;
      const lower = word.toLocaleLowerCase();
      return lower.charAt(0).toLocaleUpperCase() + lower.slice(1);
    });
}

export function formatSentenceCase(value?: string | null): string {
  const normalized = (value ?? "").trim().replace(/\s+/g, " ");
  if (/^(?:XXS|XS|S|M|L|XL|XXL|XXXL|XXXXL)$/.test(normalized)) return normalized;
  const lower = normalized.toLocaleLowerCase();
  return lower.charAt(0).toLocaleUpperCase() + lower.slice(1);
}
