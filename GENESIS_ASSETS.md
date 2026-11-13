# Genesis visual assets

The Visual Revolution milestone uses original procedural geometry in src/components/GenesisEnvironment.ts and GenesisWorld3D.tsx: gabled buildings, door/window trim, porches, raised gardens, trees, benches, roads, bridge decks and human figures. No third-party models, textures, animations, paid assets or generated photographs were downloaded.

Rendering uses the existing Three.js dependency (MIT; see node_modules/three/LICENSE). Existing legacy AI Town asset credits remain in README.md and are not replaced by this milestone. Geometry is presentation only; it grants no new business, interior or citizen capability.

Scale: approximately 1.8 m citizens, 2.24 m doors, 7 by 6 m building bodies, 5 m roads, 1.2 m sidewalks. Scene x/z map directly to persisted village coordinates with a 50-unit origin offset.


## Build & Decorate foundation — 2026-11-13
Original procedural geometry in src/components/BuildObjects.ts: Sunday sofa, oak double bed, writing desk, little library/books, coffee table, garden planter and garden bench. No game models, textures, interface artwork or paid assets were copied or purchased. Models are assembled from Three.js box/cylinder/icosahedron geometry with original proportions and color choices. Existing Three.js/OrbitControls/SVGRenderer dependencies and licenses remain in use. The grid uses real world-unit coordinates; one unit is one meter. These objects are decorative until simulation actions and navigation are explicitly connected.
