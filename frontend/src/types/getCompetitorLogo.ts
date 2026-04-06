export const getCompetitorLogo = (name: string): string | undefined => {
  if (!name) return undefined;

  const clean = name
    .toLowerCase()
    .replace(/\s+/g, "-")          // spaces → hyphens
    .replace(/[^a-z0-9-]/g, "");   // remove special chars except hyphen

  try {
    return new URL(
      `../assets/images/competitors/${clean}.png`,
      import.meta.url
    ).href;
  } catch (err) {
    return undefined; // IMPORTANT: not null
  }
};