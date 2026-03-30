# AquaExpert Customer Workbooks

Customer-only frontend for account-level workbook workflows in AquaExpert.

## Routes
- `/login`
- `/forgot-password`
- `/reset-password/:token`
- `/systems`
- `/systems/:id`
- `/systems/:id/edit`
- `/systems/:id/workbook`
- `/systems/:id/inventory`
- `/chat`
- `/profile`

## Security
- Route guard requires `user.accountType === 'customer'`.
- Non-customer users are redirected to `/login`.

## Environment
- `REACT_APP_API_BASE_URL` should point to the backend API.

## Scripts
- `npm start`
- `npm run build`
- `npm test`
