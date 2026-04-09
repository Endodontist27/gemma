export const parseCsv = (raw: string) => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let index = 0; index < raw.length; index += 1) {
    const character = raw[index];
    const nextCharacter = raw[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === ',' && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
      continue;
    }

    if ((character === '\n' || character === '\r') && !inQuotes) {
      if (character === '\r' && nextCharacter === '\n') {
        index += 1;
      }

      if (currentCell.length || currentRow.length) {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
      }

      currentRow = [];
      currentCell = '';
      continue;
    }

    currentCell += character;
  }

  if (currentCell.length || currentRow.length) {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }

  if (!rows.length) {
    return [];
  }

  const [headerRow, ...bodyRows] = rows;
  const headers = headerRow.map((header) => header.trim().toLowerCase());

  return bodyRows
    .filter((row) => row.some((cell) => cell.length > 0))
    .map((row) =>
      headers.reduce<Record<string, string>>((record, header, columnIndex) => {
        record[header] = row[columnIndex]?.trim() ?? '';
        return record;
      }, {}),
    );
};
