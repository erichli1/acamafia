export const identifyIfIndexIfDone = (statuses: Array<boolean | null>) => {
  for (let i = 0; i < statuses.length; i++) {
    if (statuses[i] === false) continue;
    if (statuses[i] === true) return i; // returns i if matched to a group
    else if (statuses[i] === null) return -1; // returns -1 if unmatched
  }
  return -2; // returns -2 if didn't match to a group
};
