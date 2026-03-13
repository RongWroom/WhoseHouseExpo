export const getChildAgeFromDateOfBirth = (dateOfBirth?: string | null): number | null => {
  if (!dateOfBirth) {
    return null;
  }

  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) {
    return null;
  }

  const ageDiffMs = Date.now() - dob.getTime();
  if (Number.isNaN(ageDiffMs) || ageDiffMs < 0) {
    return null;
  }

  return Math.floor(ageDiffMs / (1000 * 60 * 60 * 24 * 365.25));
};

export const formatChildAgeForReferral = (age: number | null): string | null => {
  if (age === null || age < 0) {
    return null;
  }

  return `${age}`;
};
