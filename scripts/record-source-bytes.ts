import { Buffer } from 'node:buffer';
import { lstatSync, readFileSync, readlinkSync } from 'node:fs';

export function sourceBytes(file: string): Buffer {
	return lstatSync(file).isSymbolicLink() ? Buffer.from(readlinkSync(file)) : readFileSync(file);
}
