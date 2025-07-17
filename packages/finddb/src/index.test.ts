
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';

import { getCurrentGithubDbPath, copyDbAndUpdatePointer } from './index.js';


describe('path tests', () => {
    describe('getCurrentGithubDbPath', () => {

        const tmp = path.resolve('.test-tmp-finddb');
        const dbDir = path.join(tmp, 'db');
        const dbJsonPath = path.join(dbDir, 'github.db.json');
        const dbFileName = 'github.20250717010101.db';
        const dbFilePath = path.join(dbDir, dbFileName);


        beforeAll(async () => {
            await fs.mkdir(dbDir, { recursive: true });
            await fs.writeFile(dbFilePath, 'dummy', 'utf-8');
            await fs.writeFile(dbJsonPath, JSON.stringify({ current: dbFileName }), 'utf-8');
        });

        afterAll(async () => {
            await fs.rm(tmp, { recursive: true, force: true });
        });


        it('returns the fully qualified path to the current github.db file', async () => {
            const result = await getCurrentGithubDbPath(tmp);
            expect(result).toBe(path.resolve(dbDir, dbFileName));
        });

        it('returns null if github.db.json points to a missing db file', async () => {
            // Remove the db file but keep the pointer
            await fs.rm(dbFilePath, { force: true });
            const result = await getCurrentGithubDbPath(tmp);
            expect(result).toBeNull();
            // Restore for other tests
            await fs.writeFile(dbFilePath, 'dummy', 'utf-8');
        });

        it('returns null if github.db.json does not exist', async () => {
            await fs.rm(dbJsonPath, { force: true });
            const result = await getCurrentGithubDbPath(tmp);
            expect(result).toBeNull();
            // Restore for other tests
            await fs.writeFile(dbJsonPath, JSON.stringify({ current: dbFileName }), 'utf-8');
        });

        it('returns null if github.db.json does not have a current property', async () => {
            await fs.writeFile(dbJsonPath, JSON.stringify({}), 'utf-8');
            const result = await getCurrentGithubDbPath(tmp);
            expect(result).toBeNull();
            // Restore for other tests
            await fs.writeFile(dbJsonPath, JSON.stringify({ current: dbFileName }), 'utf-8');
        });
    });
    describe('copyDbAndUpdatePointer', () => {

        const tmp = path.resolve('.test-tmp-finddb-copy');
        const dbDir = path.join(tmp, 'db');
        const srcDbPath = path.join(dbDir, 'github.db');
        const destDbPath = path.join(dbDir, 'github.20250717010101.db');
        const pointerJsonPath = path.join(dbDir, 'github.db.json');

        beforeAll(async () => {
            await fs.mkdir(dbDir, { recursive: true });
            await fs.writeFile(srcDbPath, 'dummy', 'utf-8');
        });

        afterAll(async () => {
            await fs.rm(tmp, { recursive: true, force: true });
        });

        it('copies the db file and updates the pointer JSON', async () => {
            await copyDbAndUpdatePointer(srcDbPath, destDbPath, pointerJsonPath);
            // Check dest file exists
            const destContent = await fs.readFile(destDbPath, 'utf-8');
            expect(destContent).toBe('dummy');
            // Check pointer JSON
            const jsonStr = await fs.readFile(pointerJsonPath, 'utf-8');
            const dbJson = JSON.parse(jsonStr);
            expect(dbJson.current).toBe(path.basename(destDbPath));
        });
    });
    describe('copyAndUpdateGithubDb', () => {
        it('calls copyDbAndUpdatePointer with correct arguments', async () => {
            // Use a temp directory for generatedDirectory and data root
            const tmp = path.resolve('.test-tmp-finddb-copyandupdate');
            const generatedDirectory = path.join(tmp, 'generated');
            const dataDir = path.join(tmp, 'data');
            const dbDir = path.join(dataDir, 'db');
            await fs.mkdir(generatedDirectory, { recursive: true });
            await fs.mkdir(dbDir, { recursive: true });
            // Create a dummy github.db file so the function can proceed
            const generatedDbPath = path.join(generatedDirectory, 'github.db');
            await fs.writeFile(generatedDbPath, 'dummy', 'utf-8');

            // Patch path.resolve to force the data dir to our temp dir
            const origResolve = path.resolve;
            vi.spyOn(path, 'resolve').mockImplementation((...args: string[]) => {
                if (args.includes('../../../../data')) {
                    return dataDir;
                }
                // fallback to original
                return origResolve.apply(path, args);
            });

            // Use dependency injection for the copy function
            const mockCopy = vi.fn().mockResolvedValue(undefined);
            // Import the function after patching path
            const { copyAndUpdateGithubDb } = await import('./index.js');

            // Use the same timestamp logic as the implementation
            const now = new Date();
            const timestamp = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14);

            const destDbPath = path.join(dbDir, `github.${timestamp}.db`);
            const dbJsonPath = path.join(dbDir, 'github.db.json');

            await copyAndUpdateGithubDb(generatedDirectory, mockCopy);
            expect(mockCopy).toHaveBeenCalledWith(
                generatedDbPath,
                destDbPath,
                dbJsonPath
            );

            // Restore path.resolve
            (path.resolve as unknown as { mockRestore?: () => void }).mockRestore?.();
        });
    });
});