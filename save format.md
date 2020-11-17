# *Sonic Mania* save file format

This is a specification for the save file format used by the game *Sonic Mania*, released in 2017 for Windows and various console and mobile platforms. This specification refers specifically to the Windows version but may accurately describe other platforms as well.

This document uses the following terms to represent data sizes, consistent with their use in Win32 API:

| Term | Length | Range |
| - | - | - |
| **BYTE** | 1 byte (8 bits) | 0–255 |
| **WORD** | 2 bytes (16 bits) |0–65,535 |
| **DWORD** | 4 bytes (32 bits) | 0–4,294,967,295 |

All numbers are little endian integers, meaning that the word `$FF00` has the decimal value of 255 and not 65,280.

## Overview

The file is named "SaveData.bin" by default. On Windows, the file is located in `C:\Program Files (x86)\Steam\userdata\[identifier]\584400\remote\SaveData.bin`. The game can save up to 8 different save slots for *Mania Mode* and 3 different save slots for *Encore Mode*. *Time Attack* and options are saved in separate files. The file is always 65,535 bytes in length.

The file is divided into the following sections:

| Offset | Size | Description |
| - | - | - |
| `$0000`–`$03FF` | 1,024 bytes | *Mania Mode* slot 1 |
| `$0400`–`$07FF` | 1,024 bytes | *Mania Mode* slot 2 |
| `$0800`–`$0BFF` | 1,024 bytes | *Mania Mode* slot 3 |
| `$0C00`–`$0FFF` | 1,024 bytes | *Mania Mode* slot 4 |
| `$1000`–`$13FF` | 1,024 bytes | *Mania Mode* slot 5 |
| `$1400`–`$17FF` | 1,024 bytes | *Mania Mode* slot 6 |
| `$1800`–`$1BFF` | 1,024 bytes | *Mania Mode* slot 7 |
| `$1C00`–`$1FFF` | 1,024 bytes | *Mania Mode* slot 8 |
| `$2000`–`$23FF` | 1,024 bytes | Always 0 |
| `$2400`–`$27FF` | 1,024 bytes | *Extras* |
| `$2800`–`$2BFF` | 1,024 bytes | *Encore Mode* slot 1 |
| `$2C00`–`$2FFF` | 1,024 bytes | *Encore Mode* slot 2 |
| `$3000`–`$33FF` | 1,024 bytes | *Encore Mode* slot 3 |
| `$3400`–`$FFFF` | 52,223 bytes | Always 0 |

## Slot contents

Each slot is 1,024 bytes long. Offsets are given relative to the beginning of the slot. The first *Mania Mode* slot starts at the beginning of the file; the first *Encore Mode* slot starts at the offset `$2800`. The *n*th slot of each mode is offset by (*n* − 1) × 1024 bytes.

| Offset | Size | Format | Description |
| - | - | - | - |
| `$0058` | **BYTE** | Number | Slot state |
| `$005C` | **BYTE** | Number | Character |
| `$0060` | **BYTE** | Number | Current stage |
| `$0064` | **BYTE** | Number | Lives |
| `$0068`–`$006B` | **DWORD** | Number | Score |
| `$0070` | **BYTE** | Bit field | Chaos Emeralds |
| `$0074` | **BYTE** | Number | Continues |
| `$0078` | **BYTE** | Number | Unknown |
| `$007C` | **BYTE** | Number | Next Special Stage |
| `$0080` | **BYTE** | Bit field | Giant Rings |
| `$0084` | **BYTE** | Bit field | Options |
| `$006C`–`$006F` | **DWORD** | Number | Next extra life score |
| `$0088`–`$00FF` | 100 bytes | Section | Play times (see subsection) |
| `$0108` | **BYTE** | Bit field | *Encore Mode* collected characters |
| `$010C`–`$010E` | 3 bytes | Number | *Encore Mode* collected characters order |
| `$0110` | **BYTE** | Number | *Encore Mode* primary character |
| `$0111` | **BYTE** | Number | *Encore Mode* secondary character |

All other bytes are zero.

### Slot state

| Value | State |
| - | - |
| `$00` | New |
| `$01` | In-progress |
| `$02` | Clear |

### Character

| Value | Character |
| - | - |
| `$00` | Sonic & Tails |
| `$01` | Sonic |
| `$02` | Tails |
| `$03` | Knuckles |
| `$04` | Mighty |
| `$05` | Ray |

This value is always set to `$06` for *Encore Mode* slots.

### Current stage

The current Zone:

| Value | Round |
| - | - |
| `$00` | Green Hill |
| `$01` | Chemical Plant |
| `$02` | Studiopolis |
| `$03` | Flying Battery |
| `$04` | Press Garden |
| `$05` | Stardust Speedway |
| `$06` | Hydrocity |
| `$07` | Mirage Saloon |
| `$08` | Oil Ocean |
| `$09` | Lava Reef |
| `$0A` | Metallic Madness |
| `$0B` | Titanic Monarch |

New games have a value of `$00`. Cleared games have a value of `$0C`.

If this value is set to `$0C` (for Egg Reverie) on an in-progress game, the game shows Titanic Monarch's artwork with an incorrect palette and launches Green Hill when selected.

Angel Island in *Encore Mode* is not selectable. The game only saves a slot if Angel Island has been completed.

### Lives

The number of extra lives, between 0 and 99 (`$63`).

This value is tracked for *Encore Mode* slots but not used.

### Score

The current score as a 32-bit integer. The highest possible value is 9,999,999 (`$98967F`). The game stops incrementing the score after this value.

On cleared games, the score is reset to 0 when starting a new game, but the score value is still saved after completing a Zone.

### Chaos Emeralds

Tracks the Chaos Emeralds collected by the player. Each Chaos Emerald is associated with a particular Special Stage.

This is stored as a bit field of seven bits, each representing one Chaos Emerald, starting with the least significant bit:

```
0 1 1 1 1 1 1 1
  | | | | | | |
  | | | | | | Green
  | | | | | Yellow
  | | | | Purple
  | | | Pink
  | | Grey
  | Blue
  Red
```

This can also be expressed as a sum of the powers of 2:

| Chaos Emerald | Value |
| - | - |
| Green | 1 |
| Yellow | 2 |
| Purple | 4 |
| Pink | 8 |
| Grey | 16 |
| Blue | 32 |
| Red | 64 |

A value of `$7F` means that all of the Chaos Emeralds have been collected.

### Continues

The number of continues, between 0 and 99 (`$63`).

### Unknown

The purpose of this value is not known.

### Next Special Stage

The next Special Stage to be played, between `$00` and `$06`. The game repeats the same Special Stage until it has been successfully completed. This value is set to `$00` after the player has collected all of the Chaos Emeralds.

It is possible to set this value to that of a Special Stage that has already been completed. In this case, the selected Special Stage will be played next but will not award another Chaos Emerald if completed successfully (since each Special Stage is associated with a particular Chaos Emerald).

### Giant Rings

Tracks the Giant Rings collected in each Zone. Resets to `$00` at the start of a new Zone or after the game has been completed.

This is stored as a bit field of seven bits, each representing one Giant Ring:

```
1 1 1 1 1 1 1 1
| | | | | | | |
| | | | | | | 1st Giant Ring
| | | | | | 2nd Giant Ring
| | | | | 3rd Giant Ring
| | | | 4th Giant Ring
| | | 5th Giant Ring
| | 6th Giant Ring
| 7th Giant Ring
8th Giant Ring
```

This can also be expressed as a sum of the powers of 2:

| Giant Ring | Value |
| - | - |
| 1st | 1 |
| 2nd | 2 |
| 3rd | 4 |
| 4th | 8 |
| 5th | 16 |
| 6th | 32 |
| 7th | 64 |
| 8th | 128 |

### Options

The game options for the slot.

```
0 0 1 1 1 1 1 1
    | | | | | |
    | | | | | Debug Mode
    | | | | & Knuckles Mode
    | | | Sonic ability
    | | Sonic ability
    | Sonic ability
    Time limit
```

*Debug Mode* and *& Knuckles Mode* are `%0` for off or `%1` for on.

*Time limit* is `%1` for off or `%0` for on.

*Sonic ability* is `%000` for Mania, `%101` for CD, or `%110` for S3K.

This can also be expressed as a sum of the following values:

| Option | Value |
| - | - |
| *Debug Mode* on | 1 |
| *& Knuckles Mode* on | 2 |
| CD abilities on | 20 |
| S3K abilities on | 24 |
| Time limit off | 32 |

The Sonic abilities are mutually exclusive and do not work if combined.

### Next extra life score

The game rewards the player with an extra life every 50,000 points. This value stores the next multiple of 50,000 at which the player is given an extra life. Its initial value is `$50C3` (50,000).

This value can be calculated by *score* + (50,000 − *score* mod 50,000). For a score of 126,400, for example, this gives a next extra life score value of 150,000.

This value is set to 500,000 (`$20A107`) on cleared games.

### Play times

The game stores the total play time for each of the 24 Acts, plus Egg Reverie, Bonus Stages, and Special Stages. Times are cumulative and include time spent replaying each stage (rather than representing the first playthrough or fastest time). Angel Island in *Encore Mode* does not have its play time recorded.

See **Appendix A** for a complete list of time position offsets. Each position consists of a **DWORD** number for the time in ticks.

Time in *Sonic Mania* is kept in minutes, seconds, and ticks. Ticks are 1/60 of a second but displayed in-game as 1/100 of a second.

### *Encore Mode* collected characters

Tracks the characters collected in *Encore Mode*. This value does not include the primary and secondary characters and should contain at most 3 characters. This value is set to `$00` if the player has no collected characters.

This is stored as a bit field of seven bits, each representing a separate character:

```
0 0 0 1 1 1 1 1
      | | | | |
      | | | | Sonic
      | | | Tails
      | | Knuckles
      | Mighty
      Ray
```

This can also be expressed as a sum of the powers of 2:

| Character | Value |
| - | - |
| Sonic | 1 |
| Tails | 2 |
| Knuckles | 4 |
| Mighty | 8 |
| Ray | 16 |

### *Encore Mode* collected characters order

Three bytes representing the same collected characters as above but with a separate byte for each character. The values for each character are the same as above, which is different from the *Mania Mode* character value. A value of `$00` represents no character.

For example, if the player has Sonic as the primary character, Tails as the secondary character, and Mighty and Ray collected, this value is set to `$081000` for Mighty, Ray, and no additional character.

This value is ignored if there is no secondary character.

### *Encore Mode* primary character

The player character for *Encore Mode*. Uses the same values as the other *Encore Mode* character values.

This value is also written for *Mania Mode* slots. It is set to the *Encore Mode* equivalent of the currently selected character. See **Appendix B** for a conversion table. For Sonic & Tails, this value is set to `%01` for Sonic.

### *Encore Mode* secondary character

The AI-controlled secondary character for *Encore Mode*. Uses the same values as the other *Encore Mode* character values. This value can be set to `$00` if there is no secondary character.

This value is also written for *Mania Mode* slots. It is set to the *Encore Mode* equivalent of the secondary character. See **Appendix B** for a conversion table. For Sonic & Tails, this value is set to `$02` for Tails. For *& Knuckles* mode, this value is set to `$04` for Knuckles.

## Extras

Offsets are given relative to the position `$2400`.

| Offset | Size | Format | Description |
| - | - | - | - |
| `$0058`–`$0075` | 32 bytes | Section | Medallions |
| `$0078`–`$00F7` | 128 bytes | Section | Flags |
| `$0118` | **BYTE** | Number | Unknown |
| `$011C` | **BYTE** | Number | Total gold medallions |
| `$0120` | **BYTE** | Number | Total silver medallions |

### Medallions

Each byte represents one of the 32 *Blue Spheres* Bonus Stages:

| Value | Status |
| - | - |
| `$00` | Not successfully completed |
| `$01` | Completed with silver medallion |
| `$02` | Completed with gold medallion |

### Flags

This section contains 32 **DWORD** values:

| Offset | Function |
| - | - |
| 0 | *Blue Spheres* if set to `$00`, pinball if set to `$01` |
| 1 | Unknown or unused |
| 2 | Unknown or unused |
| 3 | Unknown or unused |
| 4 | Unknown or unused |
| 5 | Unknown or unused |
| 6 | Unknown or unused |
| 7 | Unknown or unused |
| 8 | Unknown or unused |
| 9 | Unknown or unused |
| 10 | Unknown or unused |
| 11 | Unknown or unused |
| 12 | Unknown or unused |
| 13 | Unknown or unused |
| 14 | Unknown or unused |
| 15 | Unknown or unused |
| 16 | Unknown or unused |
| 17 | Unknown or unused |
| 18 | Unknown or unused |
| 19 | Unknown or unused |
| 20 | Unknown or unused |
| 21 | Unknown or unused |
| 22 | Unknown or unused |

The remaining values show alert messages when the game is started:

| Offset | Message |
| - | - |
| 23 | "Are you the fastest thing alive? *Time Attack* is now unlocked!" |
| 24 | "Prepare to challenge! *Competition* is now unlocked!" |
| 25 | "Super Peel-out, Sonic's ability from *Sonic CD*, is now unlocked!" |
| 26 | "Insta-Shield, Sonic's ability from *Sonic 3&K*, is now unlocked!" |
| 27 | "Knock Knock! *& Knuckles Mode* is now unlocked!" |
| 28 | "You can do anything! *Debug Mode* is now unlocked!" |
| 29 | "Yeehaw! *Mean Bean* is now unlocked!" |
| 30 | "Jammin'! *D.A. Garden* is now unlocked!" |
| 31 | "No way! *Blue Spheres* is now unlocked!" |

`$00` shows the alert, `$01` suppresses it.

### Unknown

The purpose of this value is not known.

### Total gold medallions

The total number of gold medallions. This value is equal to the number of bytes in the Medallions section set to `$02`.

### Total silver medallions

The total number of silver medallions. This value also counts gold medallions, so it is equal to the number of bytes in the Medallions section set to `$01` or `$02`.

## Appendices

### A. Play time offsets

| Offset | Size | Format | Description |
| - | - | - | - |
| `$88`–`$8B` | **DWORD** | Number | Green Hill Zone Act 1 time |
| `$8C`–`$8F` | **DWORD** | Number | Green Hill Zone Act 2 time |
| `$90`–`$93` | **DWORD** | Number | Chemical Plant Zone Act 1 time |
| `$94`–`$97` | **DWORD** | Number | Chemical Plant Zone Act 2 time |
| `$98`–`$9B` | **DWORD** | Number | Studiopolis Zone Act 1 time |
| `$9C`–`$9F` | **DWORD** | Number | Studiopolis Zone Act 2 time |
| `$A0`–`$A3` | **DWORD** | Number | Flying Battery Zone Act 1 time |
| `$A4`–`$A7` | **DWORD** | Number | Flying Battery Zone Act 2 time |
| `$A8`–`$AB` | **DWORD** | Number | Press Garden Zone Act 1 time |
| `$AC`–`$AF` | **DWORD** | Number | Press Garden Zone Act 2 time |
| `$B0`–`$B3` | **DWORD** | Number | Stardust Speedway Zone Act 1 time |
| `$B4`–`$B7` | **DWORD** | Number | Stardust Speedway Zone Act 2 time |
| `$B8`–`$BB` | **DWORD** | Number | Hydrocity Zone Act 1 time |
| `$BC`–`$BF` | **DWORD** | Number | Hydrocity Zone Act 2 time |
| `$C0`–`$C3` | **DWORD** | Number | Mirage Saloon Zone Act 1 time |
| `$C4`–`$C7` | **DWORD** | Number | Mirage Saloon Zone Act 2 time |
| `$C8`–`$CB` | **DWORD** | Number | Oil Ocean Zone Act 1 time |
| `$CC`–`$CF` | **DWORD** | Number | Oil Ocean Zone Act 2 time |
| `$D0`–`$D3` | **DWORD** | Number | Lava Reef Zone Act 1 time |
| `$D4`–`$D7` | **DWORD** | Number | Lava Reef Zone Act 2 time |
| `$D8`–`$DB` | **DWORD** | Number | Metallic Madness Zone Act 1 time |
| `$DC`–`$DF` | **DWORD** | Number | Metallic Madness Zone Act 2 time |
| `$E0`–`$E3` | **DWORD** | Number | Titanic Monarch Zone Act 1 time |
| `$E4`–`$E7` | **DWORD** | Number | Titanic Monarch Zone Act 2 time |
| `$EC`–`$F7` | **DWORD** | Number | Always 0 |
| `$E8`–`$EB` | **DWORD** | Number | Egg Reverie time |
| `$EC`–`$EB` | **DWORD** | Number | Bonus Stages time |
| `$FC`–`$FF` | **DWORD** | Number | Special Stages time |

### B. Character values

| Character | *Mania Mode* | *Encore Mode* (hex) | *Encore Mode* (bin)
| - | - | - | - |
| Sonic & Tails | `$00` | — | — |
| Sonic | `$01` | `$01` | `%00000001` |
| Tails | `$02` | `$02` | `%00000010` |
| Knuckles | `$03` | `$04` | `%00000100` |
| Mighty | `$04` | `$08` | `%00001000` |
| Ray | `$05` | `$10` | `%00010000` |

## Authors

- J.C. Fields <jcfields@jcfields.dev>
