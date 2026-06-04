# AI Channel Reply Delivery Service - 2026-05-07

## What was extracted

Added a conservative standalone service:

- `backend/services/aiAgent/channelReplyDeliveryService.js`

It isolates helper logic around the final reply delivery phase without wiring it into
`backend/services/CoreAIAgent.js` yet.

## Scope

The service currently covers:

- reply image preparation and cleanup
- image-offer prompt stripping
- reply grounding metadata assembly
- conversation grounding metadata merge
- base message metadata creation
- outbound message persistence payload shaping
- conversation update patch shaping
- Facebook delivery result normalization
- Socket payload shaping for operator inbox updates
- image-delivery skip decisions after failed primary-text delivery
- typing socket payload shaping

## Why this slice stayed standalone

`CoreAIAgent.js` is being edited concurrently in the main integration path. This
service was extracted in isolation first to reduce merge risk and give the main
integrator a ready-to-wire delivery helper once the current Core slices settle.
