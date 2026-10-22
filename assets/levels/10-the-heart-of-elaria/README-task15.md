# Level 10 ending artwork

The original generated seated pose remains in `sources/task15-nhinh-seated-original.png`, with its historical prompt in `task15-generation-prompts.json`. Art v2 removes low-alpha outliers before normalizing the full character into unchanged 36×42 gameplay and 144×168 detail canvases. The hood, scarf, seated boots, dark lantern and leaf retain the source identity. Lumo remains a separate runtime layer.

The dawn overlay, seated exports and title are authored by `prepare_assets.py`. `prepare_ending.py` calls that pipeline and reuses those outputs, so rebuilding the ending package cannot revert v2 art. The exact title is **THE LAST DAWN**. Sanctuary now uses the documented depth lighting polish; original background geometry and carry references remain intact.

Rebuild with `python assets/levels/10-the-heart-of-elaria/prepare_ending.py`, then follow the main README's capture steps. The six ending exports and twelve offline staging previews are recorded in `task15-asset-map.json`. These staging compositions differ from the engine; the green trail preview is a historical study while the engine uses sanctuary. Actual WebGL dawn, seated and title screenshots are in `previews/runtime-v2/`, bound to final sprite and provenance hashes.

The actor positions, dialogue, timeline, darkness, montage effects and controls belong to the existing renderer. No sit/stand or belt-attachment animation is supplied. The root/controller art is not drawn by EndingScene; therefore the distinct core-dawn asset is reviewed on the native asset contact, while the actual ending shows the bare Mother Tree plus dawn light. This is an existing rendering limitation, recorded in10-art-v2-report.md.
