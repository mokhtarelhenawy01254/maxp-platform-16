# Store Delivery Options

## Route

- page route: `/settings/delivery-options`

## Current UI model

- the page no longer uses `MUI`
- it now uses the shared internal UI primitives in `frontend/src/components/ui`
- it also reuses shared settings-page wrappers from `frontend/src/pages/settings/components`
- the surface is now responsive and card-based instead of a legacy admin table/dialog shell

## Behavior preserved

- loads options from `GET /delivery-options`
- creates options through `POST /delivery-options`
- updates options through `PUT /delivery-options/:id`
- toggles status through `PATCH /delivery-options/:id/toggle`
- deletes options through `DELETE /delivery-options/:id`

## Fields still managed

- `name`
- `description`
- `deliveryTime`
- `price`
- `isDefault`
- `isActive`
- `sortOrder`

## Notes

- migration was intentionally front-end only; payload shape stayed unchanged
- options are displayed in `sortOrder` ascending order for a steadier admin view
