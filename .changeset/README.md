# Changesets

This folder is used by [Changesets](https://github.com/changesets/changesets) to manage versioning and changelogs.

## Workflow

1. **When making changes**, create a changeset:
   ```bash
   pnpm changeset
   ```
   Select which packages changed and describe the changes.

2. **Before release**, version packages:
   ```bash
   pnpm version
   ```
   This updates package versions and generates CHANGELOGs.

3. **Publish to npm**:
   ```bash
   pnpm publish
   ```
   This builds all packages and publishes to npm.

## Access

All packages are published with `"access": "public"` for the `@demokit-ai` scope.
