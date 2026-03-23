# Getting Started with Create React App

## Supabase Setup (Signup Form)

1. Copy `.env.example` to `.env`.
2. Set:
	- `REACT_APP_SUPABASE_URL`
	- `REACT_APP_SUPABASE_ANON_KEY`
3. Start the app with `npm start`.
4. To enable persistent seller uploads, user carts, and wishlists, run the SQL in `supabase/seller-marketplace.sql` inside the Supabase SQL editor.

Do not use your Supabase service role (secret) key in this React app.

## Seller Upload Storage

- Item details are stored in Supabase Postgres table `marketplace_items`.
- Item images are stored in Supabase Storage bucket `marketplace-items`.
- Uploaded items continue to appear after terminal restarts because they are stored in Supabase, not in local component state.

## User Cart And Wishlist Storage

- Cart items are stored in Supabase Postgres table `cart_items`.
- Wishlist items are stored in Supabase Postgres table `wishlist_items`.
- The React app filters both tables by the signed-in user's email so each user sees only their own saved items in the UI.

## Checkout Payments (Card)

Card checkout now uses Stripe for secure payment processing.

1. Get your test keys from https://dashboard.stripe.com/test/apikeys
2. Add these variables to `.env`:
	- `REACT_APP_STRIPE_PUBLIC_KEY` (starts with `pk_test_` or `pk_live_`)
	- `REACT_APP_STRIPE_CURRENCY` (optional, defaults to `usd` e.g. `usd`, `gbp`, `eur`, `zar`)
3. Restart the dev server after updating `.env`.
4. Open the checkout page, select `Card (Stripe)`, fill in the form, and complete the payment.

Notes:

- This frontend uses the Stripe public key only and does NOT directly charge cards.
- Payment intents are created server-side via a `/api/payment-intent` endpoint (you must implement this).
- For production: set up your backend to securely create payment intents and handle webhook confirmations.
- Test card: 4242 4242 4242 4242 with any future date and CVC.

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
