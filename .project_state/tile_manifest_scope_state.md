# Tile Manifest Scope State

Last updated: 2026-08-04

Tile manifest scope was clarified in `docs/workshop-manifest-gate-amendment-tiles.md`.

Decision:

- Do not enumerate individual tile files.
- Include tile datasets at the asset-group, tile-root, or object-storage-prefix level.
- Record organization, client, survey, tile root/prefix, tile folder/style, zoom range if known, source, destination, NGINX route, protection requirement, and rollback source.
- Checksums remain not required for workshop approval.
