# ART ASSET MANIFEST â€” The Last Lantern

Tong cong: **82 file PNG**.

## Cach dung

1. Xuat moi sprite thanh `src/assets/<ten>.png` â€” **nen trong suot**, **dung ten file**
2. Kich thuoc cua mang chinh la xa. Game tu scale theo phoi canh, nen dung noi dung nao cung duoc,
   nhung danh sach nay giup ban bo cuc dung cho hien thi. **Dinh huong toan bo nen TRANH SUOT.**
3. `src/assets/index.json` la danh sach file can co. **File thieu -> game tu dung ban ve Canvas, khong vo.**
4. Sau khi them file: khong can sua code, chi can reload trinh duyet (Ctrl+F5).

## Bao cao tai

| | |
|---|---|
| Che do chinh | Pixel-art, nen **khong duoc khoai muc (no anti-alias)** |
| nen | 1px cua asset = 1px cua man hinh truoc khi Phaser scale |
| Bo cuc game | 640x360, Scale.FIT, top-down |
| Mau sac | Bam theo bang mau trong `Art_References/01_Character_Style_Guide.png` |

## NHÃ‚N Váº¬T â€” Linh (36 file)

4 huong x 3 trang thai den x 3 frame. Frame 0 = dung, 1/2 = buoc chan.
| ten file | kich thuoc |
|---|---|
| `player_{down\|up\|left\|right}_{lit\|unlit\|nolamp}_{0\|1\|2}.png` | 36x42 |

**Dinh nghia mau:** `lit` = dang co den thap sang Â· `unlit` = co den nhung tat Â· `nolamp` = khong co den.
**Pivot:** cham giua, chan sprite phai khop duoi chan nhan vat. Sprite 36x42, chan o ~y=40.

## Lumo (2 file)

| `lumo_0.png` / `lumo_1.png` | 24x24 |

## CÃ‚Y VIá»€N (5 file)

| `tree_{hub\|woods\|creek\|ruins\|dawn}.png` | 76x76 |

## Bá»¤I Cá»Ž (5 file)

| `bush_{hub\|woods\|creek\|ruins\|dawn}.png` | 44x32 |

## Cá»” Tá»° WOODS (7 file)

| `runestone_hidden.png` | 34x46 |
| `runestone_{moon\|leaf\|star}_lit.png` | 34x46 |
| `runestone_{moon\|leaf\|star}_rev.png` | 34x46 |

## GÆ¯Æ NG CREEK (4 file)

| `mirror_0.png` .. `mirror_3.png` | 36x48 |

4 huong xoay. 0 = /, 1 = \, 2 = â€”, 3 = |

## CÃC THÃ€NH PHáº¦N KHÃC

| ten file | kich thuoc |
|---|---|
| `player_down_lit_0.png` | 36x42 |
| `player_down_lit_1.png` | 36x42 |
| `player_down_lit_2.png` | 36x42 |
| `player_down_unlit_0.png` | 36x42 |
| `player_down_unlit_1.png` | 36x42 |
| `player_down_unlit_2.png` | 36x42 |
| `player_down_nolamp_0.png` | 36x42 |
| `player_down_nolamp_1.png` | 36x42 |
| `player_down_nolamp_2.png` | 36x42 |
| `player_up_lit_0.png` | 36x42 |
| `player_up_lit_1.png` | 36x42 |
| `player_up_lit_2.png` | 36x42 |
| `player_up_unlit_0.png` | 36x42 |
| `player_up_unlit_1.png` | 36x42 |
| `player_up_unlit_2.png` | 36x42 |
| `player_up_nolamp_0.png` | 36x42 |
| `player_up_nolamp_1.png` | 36x42 |
| `player_up_nolamp_2.png` | 36x42 |
| `player_left_lit_0.png` | 36x42 |
| `player_left_lit_1.png` | 36x42 |
| `player_left_lit_2.png` | 36x42 |
| `player_left_unlit_0.png` | 36x42 |
| `player_left_unlit_1.png` | 36x42 |
| `player_left_unlit_2.png` | 36x42 |
| `player_left_nolamp_0.png` | 36x42 |
| `player_left_nolamp_1.png` | 36x42 |
| `player_left_nolamp_2.png` | 36x42 |
| `player_right_lit_0.png` | 36x42 |
| `player_right_lit_1.png` | 36x42 |
| `player_right_lit_2.png` | 36x42 |
| `player_right_unlit_0.png` | 36x42 |
| `player_right_unlit_1.png` | 36x42 |
| `player_right_unlit_2.png` | 36x42 |
| `player_right_nolamp_0.png` | 36x42 |
| `player_right_nolamp_1.png` | 36x42 |
| `player_right_nolamp_2.png` | 36x42 |
| `lumo_0.png` | 24x24 |
| `lumo_1.png` | 24x24 |
| `tree_hub.png` | 76x76 |
| `tree_woods.png` | 76x76 |
| `tree_creek.png` | 76x76 |
| `tree_ruins.png` | 76x76 |
| `tree_dawn.png` | 76x76 |
| `bush_hub.png` | 44x32 |
| `bush_woods.png` | 44x32 |
| `bush_creek.png` | 44x32 |
| `bush_ruins.png` | 44x32 |
| `bush_dawn.png` | 44x32 |
| `mirror_0.png` | 36x48 |
| `mirror_1.png` | 36x48 |
| `mirror_2.png` | 36x48 |
| `mirror_3.png` | 36x48 |
| `runestone_hidden.png` | 34x46 |
| `runestone_moon_lit.png` | 34x46 |
| `runestone_moon_rev.png` | 34x46 |
| `runestone_leaf_lit.png` | 34x46 |
| `runestone_leaf_rev.png` | 34x46 |
| `runestone_star_lit.png` | 34x46 |
| `runestone_star_rev.png` | 34x46 |
| `heart_tree_0.png` | 220x210 |
| `heart_tree_1.png` | 220x210 |
| `heart_tree_2.png` | 220x210 |
| `heart_tree_3.png` | 220x210 |
| `heart_tree_dawn.png` | 220x210 |
| `beacon_stone.png` | 34x46 |
| `guardian_statue.png` | 32x46 |
| `mural_tablet.png` | 46x46 |
| `pedestal_empty.png` | 36x46 |
| `pedestal_lit.png` | 36x46 |
| `receiver_off.png` | 40x48 |
| `receiver_on.png` | 40x48 |
| `rock_blocker.png` | 38x32 |
| `ruin_pillar.png` | 32x56 |
| `ruins_altar.png` | 104x52 |
| `ruins_flower.png` | 22x22 |
| `shadow_npc.png` | 44x56 |
| `stepping_stone.png` | 34x24 |
| `tuft_grass.png` | 12x10 |
| `woods_arch_locked.png` | 128x126 |
| `woods_arch_open.png` | 128x126 |
| `mushroom_cyan.png` | 22x22 |
| `mushroom_warm.png` | 14x14 |

## Texture he thong (KHONG can ve)

3 key duoc tao bang gradient nen giu nguyen thu cong, khong can file:

`light_radial` 256x256 Â· `particle_firefly` 8x8 Â· `particle_mist` 96x40

## Bang mau can khop

Lay mau cap o cuoi cua tung panel trong `Art_References/01` va `Art_References/02`:

- **Cloth (Linh):** kem `#f0e2c8` Â· **khÄƒn Ä‘á» `#b5443c`** Â· tÃ³c nÃ¢u `#4a3324`
- **Leather:** `#8a5a2b` Â· `#6b4420` Â· `#4a2f18`
- **Lantern:** kim loáº¡i `#c9a227` Â· kÃ­nh `#ffe9a0`
- **Crystal:** mint `#a8e6d0` Â· ngá»c `#5cd6b8` Â· lam `#4daee6`
- **Glowing mushroom:** `#7df2d4` Â· `#38d9c8` Â· `#e6fffc`
- **Mossy stone:** xam `#687478` Â· rÃªu `#568543`

> Luu y: nen zone hien tai **rat toi** (hub `#132e2b`). Anh nen sprite **phai duoc sang hon nen**
> it nhat 2:1 tuong phan moi thay. Hay test tren nen nen, khong phai nen trang.

