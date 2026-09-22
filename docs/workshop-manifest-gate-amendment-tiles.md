# Workshop Manifest Gate Amendment: Tile Scope

Last updated: 2026-08-04

This amendment clarifies tile handling for `docs/workshop-manifest-gate-decisions.md`.

## Decision

The workshop manifest should not enumerate individual tile files.

GIS tiles can contain thousands of files per survey, so the manifest should include tiles only at the asset-group, tile-root, or object-storage-prefix level.

## Required Tile Fields

For each included tile dataset, record:

- related organization reference;
- related legacy client reference, if needed for compatibility;
- related survey ID;
- tile root or object-storage prefix;
- tile folder or style, such as `round-corners` or `sharp-corners`;
- minimum and maximum zoom, if known;
- source location reference;
- destination bucket or origin reference;
- NGINX route pattern;
- protected-delivery requirement;
- rollback source or previous prefix.

## Not Required

Do not list every `{z}/{x}/{y}.png` tile object in the manifest.

Checksums remain not required for this workshop approval unless the project lead later requires them.

## Updated Interpretation

When the decision record says the manifest includes tiles, interpret that as:

- include tile datasets, asset groups, roots, or prefixes;
- exclude individual tile files.
