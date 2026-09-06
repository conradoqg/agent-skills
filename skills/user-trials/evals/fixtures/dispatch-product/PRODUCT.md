# Parcel Desk sandbox

Parcel Desk helps dispatch coordinators send order batches to a carrier and
lets warehouse supervisors approve the handoff. All records are fictitious.
There is no external carrier connection; mutations only affect your local sandbox.

Use `node request.mjs METHOD PATH [JSON_BODY] [ROLE]`. Roles are `coordinator`
(default), `supervisor`, and `viewer`. This driver makes a real HTTP request to
an isolated local server. State persists between calls in `.parcel-state.json`.
Run `node request.mjs reset` to start a fresh sandbox. See `GET /help` for the
public contract. Do not inspect the implementation during an experience trial.

The dispatch team's goal is to hand off all eligible orders and give the
warehouse an accurate carrier manifest. An order being submitted does not mean
the carrier has accepted it. The supervisor approves batches; coordinators
prepare them and resolve address problems. Viewers can read status and manifests.
