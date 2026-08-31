# Hand asset

`robotic_hand.glb` — the model rendered in the hero.

## Provenance

This file was supplied by the site owner. Confirm you hold a licence that
permits commercial use before deploying publicly, and record the source and
licence here.

## How the app uses it

The GLB is a set of loose rigid parts with **no skeleton and no animation
tracks**. `src/components/hand/roboticRig.ts` assembles those parts into real
kinematic chains at load time — one nested pivot per joint — so the fingers
articulate from the same pose data that drives the procedural hand.

The part names are read from the model:

| Finger | Parts, knuckle → tip                                                     |
| ------ | ------------------------------------------------------------------------ |
| Index  | `Cylinder.008` `Cube.026` `Cylinder.006` `Cube.027` `Cylinder.007` `Cube.028` |
| Middle | `Cylinder.009` `Cube.031` `Cylinder.011` `Cube.030` `Cylinder.010` `Cube.029` |
| Ring   | `Cylinder.012` `Cube.034` `Cylinder.014` `Cube.033` `Cylinder.013` `Cube.032` |
| Pinky  | `Cylinder.017` `Cube.035` `Cylinder.015` `Cube.036` `Cylinder.016` `Cube.037` |
| Thumb  | `Cylinder.004` `Cube.018` `Cylinder.005` `Cube.019`                       |

Hinge axes are measured from the geometry (the knuckle line across the hand),
not hard-coded, so the rig survives a re-export that changes the model's
orientation.

## Replacing the model

1. Drop the new file in this folder.
2. Point `HAND_MODEL_URL` in `src/components/hand/HandModel.tsx` at it.
3. If it is **rigged** (has a skeleton), drive its bones instead of
   `buildRoboticRig` — the rig builder returns `null` when part names do not
   resolve, and the hand then moves as a single piece.
4. If it is **unrigged**, update the part-name tables in `roboticRig.ts`.

Two dev-only URL parameters help when aiming a new model:

- `?handrot=x,y,z` — override the model orientation, in radians.
- `?curl=0.85` — freeze every finger at a fixed curl to check the joints.

Tune `MODEL_ORIENTATION`, `TARGET_HEIGHT` and `CURL_SIGN` in `HandModel.tsx`
once the values look right.

## If the file is missing

The hero still works. `HandModel` probes for the asset and falls back to the
fully articulated procedural hand in `ProceduralHand.tsx`, which needs no
external asset at all.
