# StickerBook3D Assets

These assets are built for a page-flip sticker book where the visible page and the flipping page share the same source texture.

The current texture set contains two generated book variants:
- `boy`: adventure-themed inside pages and cover
- `girl`: sea-friends-themed inside pages and cover

`tools/build_sticker_book_generated_texture_pack.py` now emits the inside left/right pages and front/back covers as fixed-size production renders. These are stand-ins for the real app page screenshots/canvas renders that will be pasted onto the Three.js page meshes. GPT Image 2 source art is retained only as style reference, not as the source of the inside page layout or cover mask.

Use `sb3d_page_grid_32.obj` for a bendable page. Its hinge is local X=0 and the page extends toward +X.
Use `sb3d_binding_overlay.png` above the page mesh so the rings and metal fasteners cover the hinge.
Use runtime RenderTextures for real sticker pages; the test page PNGs are only defaults and visual checks.

Suggested layer order:
1. `sb3d_book_floor_shadow.png`
2. spine / binder base below the paper
3. side-tab transparent layers tucked under page edges
4. left/right page RenderTextures
5. moving page mesh with current/next RenderTextures
6. inner shadows / flip shadow
7. ring meshes or binding overlay hardware

If Unity page deformation is difficult, the same textures and OBJ can be used in a Three.js/WebGL prototype first, then ported back to Unity.
