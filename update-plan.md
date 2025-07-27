# Update Plan: Move @dfb Packages

## Steps

1. Update Imports/Requires
   - Ensure all import paths in the codebase reference the correct new locations for @dfb/* packages (especially if any relative imports were used).

2. Update Workspace References
   - Confirm that package.json in the root and in each package lists the correct workspace paths for @dfb/* (e.g., "workspaces": ["packages/@dfb/*", ...]).

3. Test Scripts
   - Run all test suites (e.g., npm test or vitest) to verify nothing is broken due to the move.

4. Lint and Build
   - Run lint (npm run lint) and build (npm run build) for all packages to catch any path or config issues.

5. Symlinks and Environment
   - Ensure global_env.sh correctly sets up .env symlinks for all packages, including those in @dfb.

6. Documentation
   - Update any documentation, README, or scripts that reference the old package locations.

7. VS Code/IDE Config
   - Check .vscode/launch.json, tasks, and settings for any hardcoded paths to the old locations.

8. CI/CD Pipelines
   - If you use CI/CD, verify that build/test/deploy scripts reference the new structure.

9. TypeScript Configs
   - Make sure each @dfb/* package has its own tsconfig.json and that references are correct.

10. Dependency Graph
    - Run npm ls or similar to ensure dependencies resolve as expected.

---

Progress and completion for each step will be reported below as the update proceeds.
