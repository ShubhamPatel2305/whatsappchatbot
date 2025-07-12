function parseDateFromId(id, prefix) {
    const datePart = id.replace(prefix, ''); // "13072025"
    const day = datePart.slice(0, 2);
    const month = datePart.slice(2, 4);
    const year = datePart.slice(4);
    return `${year}-${month}-${day}`; // "2025-07-13"
  }

module.exports = {
  parseDateFromId
};