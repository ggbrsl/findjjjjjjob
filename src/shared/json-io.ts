import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function loadJsonFile(filePath: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    return null;
  }
}

export async function saveJsonFile(filePath: string, data: unknown): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  const json = JSON.stringify(data, null, 2).replace(/\\u[\dA-Fa-f]{4}/g, (match) =>
    String.fromCharCode(parseInt(match.slice(2), 16))
  );
  await writeFile(filePath, json);
}
