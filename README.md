# Daily Bread Blessings Website

## Included files

- `index.html`: Customer storefront
- `admin.html`: Admin dashboard
- `styles.css`: Responsive green, yellow, and white design system
- `script.js`: Product menu, cart, checkout, confirmation, and contact messages
- `admin.js`: Dashboard, product CRUD, order management, categories, messages, and content management
- `assets/logo.svg`: Print-ready vector logo

## Run the website

Open `index.html` in a browser. For the most reliable browser storage behavior, serve the folder with a local server:

```bash
python -m http.server 8000
```

Open `http://localhost:8000`.

## Prototype admin login

- Email: `admin@dailybread.test`
- Password: `DailyBread2026!`

## Important production note

This package is a functional front-end prototype. Browser-only login and `localStorage` are not secure enough for a live business. Production deployment should move authentication, products, stock, orders, uploaded images, messages, and content into a server-side application with:

- Password hashing
- Database-backed accounts
- Role-based authorization
- Server-side validation
- CSRF protection
- Rate limiting
- Secure cookies
- HTTPS
- Audit logs
- Protected file uploads
- Regular backups

## Currency

Prices use the Philippine `en-PH` locale and PHP currency formatting, including the peso sign (`₱`).


## Added premium animations

- Scroll progress indicator
- Staggered section and product reveals
- Animated hero logo and floating product cards
- Smooth button shine and click ripple
- Product-to-cart flying feedback
- Animated cart counter and cart items
- Improved drawer and modal transitions
- Hover motion for features, process cards, contact cards, and admin panels
- Active navigation highlighting while scrolling
- Reduced-motion accessibility support


## Added animated website opening

The customer storefront now opens with:

- Animated bakery logo reveal
- “Daily Bread Blessings” title entrance
- “From Oven to Opportunity” tagline
- Oven-style loading progress animation
- Animated “Enter to Website” button
- Split-curtain transition into the homepage
- Mobile and short-screen adjustments
- Keyboard focus support
- Reduced-motion accessibility support

The opening experience is added only to `index.html`. The admin login remains direct and practical.


## Opening sound

The animated opening now includes:

- A soft four-note bakery-style welcome chime
- Subtle ambient warmth while the intro is visible
- A small confirmation chime when the Enter button becomes ready
- A gentle whoosh and rising tone when entering the website
- A visible Sound On / Sound Off control
- Browser-safe audio activation through a user tap
- No external MP3 dependency because the sounds are generated with the Web Audio API

Modern browsers normally block sound before the first user interaction. Visitors can tap the sound control during the opening. If they press Enter without using the control, the entrance sound plays during that click unless they previously turned sound off.


## Reliable sound fix

The opening now uses local MP3 files with WAV fallbacks instead of relying only on generated Web Audio tones.

Included audio assets:

- `assets/opening-chime.mp3`
- `assets/ready-chime.mp3`
- `assets/enter-whoosh.mp3`
- Matching WAV fallback files

Tap **Tap for Sound** once. A welcome melody should play immediately. Keep the phone media volume turned up. For the most reliable test, run the project through a local server instead of opening it only through a file preview.


## Relaxing music inside the website

The customer storefront now includes an original chill bakery loop:

- Local MP3 file with WAV fallback
- Starts after the visitor presses Enter to Website
- Low default volume
- Floating Bakery Chill player
- Play and pause control
- Mute and unmute control
- Volume slider
- Smooth fade-in and fade-out
- Lower volume when the visitor changes browser tabs
- Saved volume and playback preferences

Audio asset:

- `assets/bakery-chill-loop.mp3`
- `assets/bakery-chill-loop.wav`

Browsers require a user interaction before audio can start. The Enter to Website button provides that interaction.


## Product ingredient details

The Golden Brioche Loaf product details now show the clearly readable Custard Brioche recipe from the supplied handwritten photo.

### Brioche dough

- 2 cups all-purpose flour (250 g)
- 40 g sugar (about 3½ tbsp)
- 1 pinch of salt
- 1 tbsp yeast
- ½ cup lukewarm milk (120 ml)
- 40 g softened butter
- 1 medium egg

### Custard filling

- 200 ml milk
- 40 g sugar
- 1 egg yolk
- 20 g cornstarch (about 2 tbsp)
- 10 g butter
- 1 tsp vanilla extract

The unclear writing near the bottom of the source photo was not added to avoid publishing incorrect ingredient information.


## Complete product ingredients

Ingredient details are now available for all six menu products.

### Brioche products

Applied to:

- Golden Brioche Loaf
- Brioche Bites

Dough:

- 2 cups all-purpose flour (250 g)
- 40 g sugar (about 3½ tbsp)
- 1 pinch of salt
- 1 tbsp yeast
- ½ cup lukewarm milk (120 ml)
- 40 g softened butter
- 1 medium egg

Custard filling:

- 200 ml milk
- 40 g sugar
- 1 egg yolk
- 20 g cornstarch (about 2 tbsp)
- 10 g butter
- 1 tsp vanilla extract

### Pizza products

Applied to:

- Classic Cheese Pizza
- Pepperoni Mini Pizza

Dough:

- 3 cups all-purpose flour
- 1 tbsp sugar
- 1⅓ cups warm water
- 2¼ tsp dry yeast
- 2 tbsp oil
- 1 tsp salt

Fillings and toppings:

- ½ white onion
- ½ bell pepper
- 125 g ham or pepperoni
- Mozzarella cheese
- Pineapple tidbits
- Tomato sauce

The handwritten source lists 125 g ham. “Or pepperoni” was added to keep the ingredients aligned with the Pepperoni Mini Pizza product name.

### Chocolate crinkle products

Applied to:

- Chocolate Lava Crinkle
- Crinkle Cookie Box

Dough:

- 2 large eggs
- 1 tsp vanilla extract
- ¼ cup vegetable oil
- 1 cup unsweetened cocoa powder
- 1 tsp baking powder
- ½ tsp salt
- 1 cup white or brown sugar
- 1 cup all-purpose flour

Chocolate lava filling:

- ½ cup sugar
- ¼ cup unsweetened cocoa powder
- 1 tbsp cornstarch
- ¼ tsp salt
- 1 cup fresh milk


## Real product photos added

The homepage hero showcase and menu cards now use real food images instead of bread, pizza, and cookie emojis.

Added product photo assets:

- `assets/brioche-bites.png`
- `assets/pepperoni-mini-pizza.png`
- `assets/crinkle-cookie-box.png`

Updated areas:

- Home hero floating cards around the large logo
- Menu cards
- Product details modal
- Shopping cart thumbnails
- Add-to-cart flying animation

The same image families were also applied to related matching products for a more reliable and polished bakery presentation.


## Category filter images and storage migration fix

This version also replaces the Bread, Pizza, and Cookies category controls with image thumbnails.

Added improvements:

- Bread filter now shows a brioche image
- Pizza filter now shows a pizza image
- Cookies filter now shows a crinkle cookie image
- Existing browser localStorage data is automatically migrated so old emoji-only product data is upgraded to real product pictures

If an older browser cache or localStorage version was previously opened, this update will still force the correct product images to appear.


## Enter button reliability fix

This version fixes cases where the Enter to Website button stays hidden.

Changes:

- The opening button now appears after about 1.8 seconds
- Audio errors no longer prevent the button from appearing
- An independent HTML fallback reveals and activates the button if the main JavaScript fails
- The latest real product pictures and category thumbnails remain included

Open this exact extracted folder. Do not reuse an older `daily-bread-blessings-chill-music` folder.


## Logo tagline overflow fix

The large logo has been corrected so “FROM OVEN TO OPPORTUNITY” stays fully inside the yellow banner.

Changes include:

- Wider yellow tagline banner
- Smaller and more balanced tagline text
- Reduced letter spacing
- SVG `textLength` protection for consistent browser rendering
- Smaller hero logo width
- Repositioned product photo cards so they do not cover the wordmark or tagline
- Added corrected PNG and JPG logo exports


## Final reliability repair

This build fixes the JavaScript startup error that hid the menu and stopped all sound features. The missing image constants have been restored, product data is migrated safely, old cached sound preferences are reset to working defaults, and both intro and background audio start directly from user clicks. Cache-busting query strings are included in `index.html`.


## Final three-product update

The public menu now contains only:

1. Custard Brioche
2. Pizza
3. Chocolate Lava Crinkles

Removed from the default menu:

- Golden Brioche Loaf
- Classic Cheese Pizza
- Chocolate Lava Crinkle

Existing browser data is migrated automatically. The three removed legacy products are deleted from the default storefront.

## Updated contact information

- Location: Oriental Mindoro National High School (OMNHS)
- Junior High schedule: 1:30PM - 2:00PM
- Senior High schedule: 2:00PM - 2:30PM
- Contact number: 0965 296 4107

## Customer rating system

Customers can submit a verified 1–5 star rating after placing an order. Ratings are stored in the browser and displayed in the public rating section. The admin dashboard also shows the total rating count and average rating.

## Falling food background animation

A soft, blurred bread, pizza, or cookie emoji falls through the page every five seconds. The animation is low-opacity, does not block clicks, and is disabled automatically when reduced-motion mode is enabled.
