# Level 05 — relay and ink environment continuation

Approved in chat on 2026-10-21. Scope: finish the two remaining environments; the entry artwork and all gameplay remain unchanged.

## Visual philosophy — Quiet Conduits

Space describes cooperation without words. Weighty, carefully joined masonry encloses broad, level paths; deliberately quiet floor planes give small characters and mechanisms room to speak. The composition is meticulously crafted through clear silhouettes, not additional obstacles.

Cool slate and desaturated teal-grey carry the underground station's age. Sparse moss inhabits joints, pale mineral deposits remember receding water, and occasional old brass fixtures stay embedded in solid walls. Painstaking material control keeps every decorative accent weaker than the actual interactive machinery.

The rhythm changes between rooms without changing the visual language. Relay has a spacious, horizontal working hall beneath a measured stone partition. Ink compresses that rhythm into one narrow, level band between large masonry masses. Expert alignment of these forms must agree with the real collision boundaries at every doorway.

The emotional thread is trust: two paths share one destination. It is suggested by parallel joints and restrained construction details, never by new symbols pretending to be clues. Master-level execution means removing noise until the living light, genuine ink trail and existing memory engraving own the visual hierarchy. No text or luminous marks are baked into the environment.

## Production contract

- Reference the unchanged [entry base](../sprites/entry-environment-base.png) for materials, pixel scale and values, not its room layout.
- Use GPT Image 2.5 Sunburst, explicitly approved by the user, with a room-specific geometry guide. Remove all guide colours/annotations from the result.
- Relay: slate working hall, masonry partition, wall-bound low-contrast mineral marks and understated brass construction details; no extra mechanisms or freestanding props.
- Ink: strong upper/lower masonry slabs enclosing the existing 348×48 walkable corridor; low-noise floor, no scenic glow competing with runtime ink; existing east-wall memory and exit remain runtime objects.
- Both bases: opaque native 640×360, nearest sampling, bounded 128-colour palette, no dithering, origin (0,0), depth 0. Top HUD and bottom controls retain subdued architectural backing.
- Keep all room walls/solids, door footprints/openings, object sprites/stands, tube/cable paths, map plaques, lighting, story flags and saves unchanged. Bake no gates, arches, stairs, pipes, controls, actors, UI, water surfaces, pits or new walk-blocking features into the art.
- Retain raw masters byte-for-byte with source hashes, reference IDs, measured registration profiles and export reports outside the runtime sprites directory.

## Acceptance

Test the shipped renderer for every room and missing-art fallback, preserving colliders/state and dynamic overlays. Rebuild derivatives and verify native size, palette, opacity and hashes. Run repository checks, TypeScript and production build without replacing tracked build output. Inspect actual game fixtures with lantern on/off and gate states, and use keyboard movement for route/door clearance on an isolated browser origin. Label fixture evidence separately from a full playthrough.
