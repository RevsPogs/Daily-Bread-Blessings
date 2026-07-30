(() => {
  "use strict";

  // Use the global supabase client set in HTML
  const supabase = window.__SUPABASE;
  if (!supabase) {
    console.error("Supabase client not initialized. Check your URL and Anon Key in index.html");
    return;
  }

  // Only cart is stored in localStorage
  const KEYS = { cart: "dbb_cart" };

  // Hardcoded initial data (fallback if database is empty)
  const initialCategories = ["Bread", "Pizza", "Cookies", "Drinks"];

  const categoryVisuals = {
    Bread: "assets/brioche-bites.png",
    Pizza: "assets/pepperoni-mini-pizza.png",
    Cookies: "assets/crinkle-cookie-box.png"
  };

  // =========================================================
  // EXACT HANDWRITTEN RECIPES WITH ALLERGEN NOTICES
  // =========================================================

  const briocheRecipe = {
    title: "Custard Brioche Ingredients",
    groups: [
      {
        name: "Brioche Dough",
        items: [
          "2 cups all-purpose flour (250 g)",
          "40 g sugar (about 3½ tbsp)",
          "1 pinch of salt",
          "1 tbsp yeast",
          "½ cup lukewarm milk (120 ml)",
          "40 g softened butter",
          "1 medium egg"
        ]
      },
      {
        name: "Custard Filling",
        items: [
          "200 ml milk",
          "40 g sugar",
          "1 egg yolk",
          "20 g cornstarch (about 2 tbsp)",
          "10 g butter",
          "1 tsp vanilla extract"
        ]
      }
    ],
    allergens: "Contains wheat, milk, and egg."
  };

  const pizzaRecipe = {
    title: "Mini Pizza Ingredients",
    groups: [
      {
        name: "Pizza Dough",
        items: [
          "3 cups all-purpose flour",
          "1 tbsp sugar",
          "1⅓ cups warm water",
          "2¼ tsp dry yeast",
          "2 tbsp oil",
          "1 tsp salt"
        ]
      },
      {
        name: "Fillings and Toppings",
        items: [
          "½ white onion",
          "½ bell pepper",
          "125 g Ham",
          "Mozzarella cheese",
          "Pineapple tidbits",
          "Tomato sauce"
        ]
      }
    ],
    allergens: "Contains wheat and milk."
  };

  const crinkleRecipe = {
    title: "Chocolate Lava Crinkle Ingredients",
    groups: [
      {
        name: "Chocolate Crinkle Dough",
        items: [
          "2 large eggs",
          "1 tsp vanilla extract",
          "¼ cup vegetable oil",
          "1 cup unsweetened cocoa powder",
          "1 tsp baking powder",
          "½ tsp salt",
          "1 cup white or brown sugar",
          "1 cup all-purpose flour"
        ]
      },
      {
        name: "Chocolate Lava Filling",
        items: [
          "½ cup sugar",
          "¼ cup unsweetened cocoa powder",
          "1 tbsp cornstarch",
          "¼ tsp salt",
          "1 cup fresh milk"
        ]
      }
    ],
    allergens: "Contains wheat, milk, and egg."
  };

  const mocktailRecipe = {
    title: "Fresh Fruit Mocktails",
    groups: [
      {
        name: "Base Ingredients",
        items: [
          "Fresh seasonal fruits (mango, pineapple, strawberry)",
          "Ice cubes",
          "Sugar syrup",
          "Sparkling water or lemonade base"
        ]
      }
    ],
    allergens: "Contains fresh fruits. May contain traces of citrus."
  };

  const ingredientCatalog = {
    p4: briocheRecipe,
    p5: pizzaRecipe,
    p6: crinkleRecipe,
    p7: mocktailRecipe
  };

  // =========================================================
  // DEFAULT PRODUCTS (Including Mocktails)
  // =========================================================

  const initialProducts = [
    {
      id: "p4",
      name: "Custard Brioche",
      category: "Bread",
      price: 3.25,
      stock: 14,
      available: true,
      featured: true,
      badge: "Fresh favorite",
      emoji: "🥖",
      image_url: "assets/brioche-bites.png",
      description: "Soft golden brioche filled with smooth homemade custard."
    },
    {
      id: "p5",
      name: "Pizza",
      category: "Pizza",
      price: 4.25,
      stock: 12,
      available: true,
      featured: true,
      badge: "Savory pick",
      emoji: "🍕",
      image_url: "assets/pepperoni-mini-pizza.png",
      description: "Fresh mini pizza with melted mozzarella, tomato sauce, and savory toppings."
    },
    {
      id: "p6",
      name: "Chocolate Lava Crinkles",
      category: "Cookies",
      price: 7.50,
      stock: 9,
      available: true,
      featured: true,
      badge: "Box of 6",
      emoji: "🍪",
      image_url: "assets/crinkle-cookie-box.png",
      description: "Rich chocolate crinkles with a soft lava-style center, packed as a box of six."
    },
    {
      id: "p7",
      name: "Strawberry Blizz Fizz",
      category: "Drinks",
      price: 50.00,
      stock: 50,
      available: true,
      featured: true,
      badge: "Refreshing treat",
      emoji: "🍓",
      image_url: "assets/strawberry-blizz-fizz.jpg",
      description: "Taste the fizz, feel the freeze — Strawberry Blizz Fizz for your refreshment needs!"
    }
  ];

  const fallbackStorage = new Map();

  function storageGetRaw(key) {
    try { return window.localStorage.getItem(key); }
    catch { return fallbackStorage.has(key) ? fallbackStorage.get(key) : null; }
  }
  function storageSetRaw(key, value) {
    const stringValue = String(value);
    try { window.localStorage.setItem(key, stringValue); }
    catch { fallbackStorage.set(key, stringValue); }
  }

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const money = value => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value);
  const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  const dateText = value => value ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";

  let cart = (() => {
    try { return JSON.parse(storageGetRaw(KEYS.cart)) || []; }
    catch { return []; }
  })();

  let activeCategory = "All";
  let searchTerm = "";

  // Cache variables
  let productsCache = [];
  let categoriesCache = [];
  let contentCache = {};

  // DOM elements
  const elements = {
    productGrid: $("#productGrid"),
    categoryFilters: $("#categoryFilters"),
    cartDrawer: $("#cartDrawer"),
    cartItems: $("#cartItems"),
    cartCount: $("#cartCount"),
    cartSubtotal: $("#cartSubtotal"),
    cartTotal: $("#cartTotal"),
    productModal: $("#productModal"),
    productDetail: $("#productDetail"),
    checkoutModal: $("#checkoutModal"),
    checkoutForm: $("#checkoutForm"),
    checkoutReview: $("#checkoutReview"),
    orderConfirmation: $("#orderConfirmation"),
    confirmationNumber: $("#confirmationNumber"),
    confirmationDetails: $("#confirmationDetails"),
    ratingAverage: $("#ratingAverage"),
    ratingStarsDisplay: $("#ratingStarsDisplay"),
    ratingCount: $("#ratingCount"),
    recentRatings: $("#recentRatings"),
    toast: $("#toast")
  };

  // =========================================================
  // SUPABASE HELPERS
  // =========================================================

  async function fetchProducts() {
    const { data, error } = await supabase.from('products').select('*');
    if (error) throw error;
    productsCache = data || [];
    return productsCache;
  }

  async function fetchCategories() {
    const { data, error } = await supabase.from('categories').select('name');
    if (error) throw error;
    categoriesCache = (data || []).map(c => c.name);
    return categoriesCache;
  }

  async function fetchContent() {
    const { data, error } = await supabase.from('content').select('*').eq('id', 1).single();
    if (error && error.code !== 'PGRST116') throw error;
    contentCache = data || {};
    return contentCache;
  }

  async function submitOrderToDB(order, cartItems) {
    // Insert Order
    const { data: orderData, error: orderError } = await supabase.from('orders').insert({
      order_number: order.orderNumber,
      customer_name: order.customerName,
      contact_number: order.contactNumber,
      email: order.email,
      pickup_date: order.pickupDate,
      pickup_time: order.pickupTime,
      payment_method: order.paymentMethod,
      notes: order.notes,
      status: 'pending',
      total: order.total
    }).select().single();
    if (orderError) throw orderError;

    // Insert Order Items
    const orderItems = cartItems.map(item => ({
      order_id: orderData.id,
      product_id: item.productId,
      name_at_order: item.name,
      price_at_order: item.price,
      quantity: item.quantity
    }));
    const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
    if (itemsError) throw itemsError;

    // FIX: Decrease stock directly by fetching and updating (No custom SQL RPC needed!)
    for (const item of cartItems) {
      // Fetch current stock
      const { data: prodData, error: fetchError } = await supabase
        .from('products')
        .select('stock')
        .eq('id', item.productId)
        .single();
      if (fetchError) throw fetchError;
      
      // Ensure enough stock
      if (!prodData || prodData.stock < item.quantity) {
        throw new Error(`Not enough stock for product ${item.productId}`);
      }
      
      // Calculate new stock and update
      const newStock = prodData.stock - item.quantity;
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', item.productId);
      if (updateError) throw updateError;
    }

    return orderData;
  }

  async function submitMessageToDB(messageData) {
    const { error } = await supabase.from('messages').insert(messageData);
    if (error) throw error;
  }

  async function submitRatingToDB(ratingData) {
    const { error } = await supabase.from('ratings').insert({
      order_number: ratingData.order_number,
      rating: ratingData.rating,
      comment: ratingData.comment
    });
    if (error) throw error;
  }

  // =========================================================
  // RENDER FUNCTIONS
  // =========================================================

  function productVisual(product, className = "product-art") {
    return product.image_url
      ? `<img src="${product.image_url}" alt="${escapeHtml(product.name)}">`
      : `<span class="${className}" aria-hidden="true">${product.emoji || "🥐"}</span>`;
  }

  async function renderCategories() {
    const categories = await fetchCategories();
    elements.categoryFilters.innerHTML = ["All", ...categories].map(category => {
      const visual = categoryVisuals[category];
      return `
        <button class="filter-btn ${category === activeCategory ? "active" : ""} ${visual ? "has-thumb" : ""}" data-category="${escapeHtml(category)}">
          ${visual ? `<img src="${visual}" alt="${escapeHtml(category)}">` : ""}
          <span>${escapeHtml(category)}</span>
        </button>
      `;
    }).join("");
  }

  async function renderProducts() {
    const products = await fetchProducts();
    categoriesCache = await fetchCategories();

    const filtered = products.filter(product => {
      const categoryMatch = activeCategory === "All" || product.category === activeCategory;
      const searchMatch = `${product.name} ${product.description} ${product.category}`.toLowerCase().includes(searchTerm.toLowerCase());
      return product.available && categoryMatch && searchMatch;
    });

    elements.productGrid.innerHTML = filtered.length ? filtered.map((product, index) => `
      <article class="product-card" style="--stagger:${index * 70}ms">
        <div class="product-image">
          ${productVisual(product)}
          ${product.badge ? `<span class="product-badge">${escapeHtml(product.badge)}</span>` : ""}
          <span class="stock-badge">${product.stock > 0 ? `${product.stock} available` : "Sold out"}</span>
        </div>
        <div class="product-body">
          <div class="product-meta">
            <div><h3 class="product-title">${escapeHtml(product.name)}</h3><small class="muted">${escapeHtml(product.category)}</small></div>
            <span class="price">${money(product.price)}</span>
          </div>
          <p class="product-description">${escapeHtml(product.description)}</p>
          <div class="product-actions">
            <button class="btn ${product.stock < 1 ? "btn-outline" : ""}" data-add="${product.id}" ${product.stock < 1 ? "disabled" : ""}>${product.stock < 1 ? "Sold Out" : "Add to Cart"}</button>
            <button class="icon-btn" data-view="${product.id}" aria-label="View ${escapeHtml(product.name)} details">ⓘ</button>
          </div>
        </div>
      </article>
    `).join("") : `<div class="empty-state" style="grid-column:1/-1"><span>🥐</span><strong>No products found.</strong><p>Try another category or search phrase.</p></div>`;
    
    requestAnimationFrame(() => {
      $$(".product-card", elements.productGrid).forEach(card => card.classList.add("card-visible"));
    });
  }

  function renderCart() {
    cart = cart.filter(item => productsCache.some(product => product.id === item.productId));
    storageSetRaw(KEYS.cart, JSON.stringify(cart));

    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const previousCount = Number(elements.cartCount.textContent) || 0;
    elements.cartCount.textContent = count;
    if (count !== previousCount) {
      elements.cartCount.classList.remove("pop");
      void elements.cartCount.offsetWidth;
      elements.cartCount.classList.add("pop");
    }

    if (!cart.length) {
      elements.cartItems.innerHTML = `<div class="empty-state"><span>🛒</span><strong>Your cart is empty.</strong><p>Add fresh products from the menu.</p></div>`;
    } else {
      elements.cartItems.innerHTML = cart.map(item => {
        const product = productsCache.find(entry => entry.id === item.productId);
        if (!product) return "";
        return `
          <div class="cart-item">
            <div class="cart-thumb">${productVisual(product, "")}</div>
            <div>
              <strong>${escapeHtml(product.name)}</strong>
              <small class="muted">${money(product.price)} each</small>
              <div class="qty-control">
                <button data-qty="${product.id}" data-change="-1" aria-label="Decrease ${escapeHtml(product.name)} quantity">−</button>
                <span>${item.quantity}</span>
                <button data-qty="${product.id}" data-change="1" aria-label="Increase ${escapeHtml(product.name)} quantity">+</button>
              </div>
            </div>
            <div class="cart-price">${money(product.price * item.quantity)}<br><button class="remove-link" data-remove="${product.id}">Remove</button></div>
          </div>`;
      }).join("");
    }

    const subtotal = getSubtotal();
    elements.cartSubtotal.textContent = money(subtotal);
    elements.cartTotal.textContent = money(subtotal);
  }

  function getSubtotal() {
    return cart.reduce((sum, item) => {
      const product = productsCache.find(entry => entry.id === item.productId);
      return sum + (product ? product.price * item.quantity : 0);
    }, 0);
  }

  function addToCart(productId, quantity = 1) {
    const product = productsCache.find(entry => entry.id === productId);
    if (!product || !product.available || product.stock < 1) return;
    const item = cart.find(entry => entry.productId === productId);
    const current = item ? item.quantity : 0;
    const next = Math.min(current + quantity, product.stock);
    if (item) item.quantity = next;
    else cart.push({ productId, quantity: Math.min(quantity, product.stock) });
    storageSetRaw(KEYS.cart, JSON.stringify(cart));
    renderCart();
    showToast(`${product.name} added to cart.`);
  }

  function updateQuantity(productId, change) {
    const product = productsCache.find(entry => entry.id === productId);
    const item = cart.find(entry => entry.productId === productId);
    if (!product || !item) return;
    item.quantity = Math.max(0, Math.min(item.quantity + change, product.stock));
    if (item.quantity === 0) cart = cart.filter(entry => entry.productId !== productId);
    storageSetRaw(KEYS.cart, JSON.stringify(cart));
    renderCart();
  }

  function removeFromCart(productId) {
    cart = cart.filter(entry => entry.productId !== productId);
    storageSetRaw(KEYS.cart, JSON.stringify(cart));
    renderCart();
  }

  function openLayer(element) {
    element.classList.add("open");
    element.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
  }

  function closeLayer(element) {
    element.classList.remove("open");
    element.setAttribute("aria-hidden", "true");
    if (!document.querySelector(".drawer.open, .modal.open")) document.body.classList.remove("no-scroll");
  }

  function renderProductIngredients(product) {
    const recipe = ingredientCatalog[product.id];
    if (!recipe) return "";
    const groups = recipe.groups.map(group => `
      <section class="ingredient-group">
        <h4>${escapeHtml(group.name)}</h4>
        <ul class="ingredient-list">
          ${group.items.map(item => `<li><span aria-hidden="true">✓</span>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </section>
    `).join("");
    return `
      <section class="product-ingredients" aria-labelledby="ingredients-${escapeHtml(product.id)}">
        <div class="ingredients-heading"><div class="ingredients-icon" aria-hidden="true">🥣</div><div><p class="eyebrow">What goes inside</p><h3 id="ingredients-${escapeHtml(product.id)}">${escapeHtml(recipe.title)}</h3></div></div>
        <div class="ingredients-grid">${groups}</div>
        <p class="allergen-note"><strong>Allergen notice:</strong> ${escapeHtml(recipe.allergens)}</p>
      </section>
    `;
  }

  function showProduct(productId) {
    const product = productsCache.find(entry => entry.id === productId);
    if (!product) return;
    elements.productDetail.innerHTML = `
      <div class="product-detail-grid">
        <div class="detail-art">${productVisual(product, "")}</div>
        <div>
          <p class="eyebrow">${escapeHtml(product.category)}</p>
          <h2>${escapeHtml(product.name)}</h2>
          <p class="price">${money(product.price)}</p>
          <p class="muted">${escapeHtml(product.description)}</p>
          <p><strong>Availability:</strong> ${product.stock} item${product.stock === 1 ? "" : "s"} in stock</p>
          ${renderProductIngredients(product)}
          <div class="form-group">
            <label for="detailQuantity">Quantity</label>
            <input id="detailQuantity" type="number" value="1" min="1" max="${Math.max(product.stock, 1)}">
          </div>
          <button class="btn btn-block" id="detailAdd" ${product.stock < 1 ? "disabled" : ""}>${product.stock < 1 ? "Sold Out" : "Add to Cart"}</button>
        </div>
      </div>`;
    $("#detailAdd")?.addEventListener("click", () => {
      const quantity = Number($("#detailQuantity").value) || 1;
      addToCart(product.id, quantity);
      closeLayer(elements.productModal);
    });
    openLayer(elements.productModal);
  }

  function openCheckout() {
    if (!cart.length) return showToast("Add at least one product before checkout.");
    elements.checkoutForm.classList.remove("hidden");
    elements.orderConfirmation.classList.add("hidden");
    $("#checkoutTitle").textContent = "Checkout";
    $("#confirmStep").classList.remove("active");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    $("#pickupDate").min = tomorrow.toISOString().split("T")[0];

    elements.checkoutReview.innerHTML = cart.map(item => {
      const product = productsCache.find(entry => entry.id === item.productId);
      return product ? `<div class="summary-line"><span>${escapeHtml(product.name)} × ${item.quantity}</span><strong>${money(product.price * item.quantity)}</strong></div>` : "";
    }).join("") + `<div class="summary-line summary-total"><span>Total</span><strong>${money(getSubtotal())}</strong></div>`;

    closeLayer(elements.cartDrawer);
    openLayer(elements.checkoutModal);
  }

  function makeOrderNumber() {
    const date = new Date();
    const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
    return `DBB-${stamp}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  function renderRatingStars(container, value) {
    if (!container) return;
    const rounded = Math.round(value);
    container.innerHTML = [1, 2, 3, 4, 5].map(star => `<span class="${star <= rounded ? "is-filled" : ""}">★</span>`).join("");
    container.setAttribute("aria-label", value > 0 ? `${value.toFixed(1)} out of 5 stars` : "No ratings yet");
  }

  async function renderRatings() {
    const { data: ratings, error } = await supabase.from('ratings').select('*');
    if (error) throw error;
    const validRatings = (ratings || []).filter(entry => entry.rating >= 1 && entry.rating <= 5);

    const average = validRatings.length ? validRatings.reduce((sum, entry) => sum + entry.rating, 0) / validRatings.length : 0;
    if (elements.ratingAverage) elements.ratingAverage.textContent = average.toFixed(1);
    renderRatingStars(elements.ratingStarsDisplay, average);
    if (elements.ratingCount) {
      elements.ratingCount.textContent = validRatings.length ? `${validRatings.length} verified order rating${validRatings.length === 1 ? "" : "s"}` : "No customer ratings yet.";
    }
    if (elements.recentRatings) {
      const recent = validRatings.filter(entry => (entry.comment || "").trim()).slice(0, 3);
      elements.recentRatings.innerHTML = recent.length ? recent.map(entry => `
        <article class="rating-comment">
          <div><span class="mini-stars">${"★".repeat(entry.rating)}${"☆".repeat(5 - entry.rating)}</span><strong>${entry.rating} / 5</strong></div>
          <p>${escapeHtml(entry.comment || "")}</p>
        </article>
      `).join("") : `<p class="muted">Be the first customer to leave a rating.</p>`;
    }
  }

  function initializeFoodRain() {
    const layer = $("#foodRainLayer");
    if (!layer || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const foods = ["🥖", "🍕", "🍪"];
    const spawnFood = () => {
      const item = document.createElement("span");
      item.className = "food-rain-item";
      item.textContent = foods[Math.floor(Math.random() * foods.length)];
      const size = 28 + Math.random() * 32;
      const duration = 11 + Math.random() * 7;
      const drift = -90 + Math.random() * 180;
      const spin = -180 + Math.random() * 360;
      item.style.left = `${Math.random() * 96}%`;
      item.style.setProperty("--food-size", `${size}px`);
      item.style.setProperty("--food-duration", `${duration}s`);
      item.style.setProperty("--food-drift", `${drift}px`);
      item.style.setProperty("--food-spin", `${spin}deg`);
      layer.appendChild(item);
      item.addEventListener("animationend", () => item.remove(), { once: true });
    };
    spawnFood();
    window.setInterval(spawnFood, 5000);
  }

  async function submitOrder(event) {
    event.preventDefault();
    if (!cart.length) return;
    const stockIssue = cart.find(item => {
      const product = productsCache.find(entry => entry.id === item.productId);
      return !product || item.quantity > product.stock || !product.available;
    });
    if (stockIssue) {
      showToast("Some items are no longer available in the requested quantity.");
      await renderProducts();
      renderCart();
      return;
    }

    const order = {
      orderNumber: makeOrderNumber(),
      customerName: $("#customerName").value.trim(),
      contactNumber: $("#customerContact").value.trim(),
      email: $("#customerEmail").value.trim(),
      pickupDate: $("#pickupDate").value,
      pickupTime: $("#pickupTime").value,
      paymentMethod: $("#paymentMethod").value,
      notes: $("#orderNotes").value.trim(),
      total: getSubtotal()
    };

    const cartItems = cart.map(item => {
      const product = productsCache.find(entry => entry.id === item.productId);
      return { productId: item.productId, name: product.name, price: product.price, quantity: item.quantity };
    });

    try {
      await submitOrderToDB(order, cartItems);
      cart = [];
      storageSetRaw(KEYS.cart, JSON.stringify(cart));
      renderCart();
      await renderProducts();

      elements.checkoutForm.classList.add("hidden");
      elements.orderConfirmation.classList.remove("hidden");
      $("#checkoutTitle").textContent = "Order Confirmation";
      $("#confirmStep").classList.add("active");
      elements.confirmationNumber.textContent = order.orderNumber;
      elements.confirmationDetails.innerHTML = `<p><strong>Pickup:</strong> ${escapeHtml(order.pickupDate)} at ${escapeHtml(order.pickupTime)}</p><p><strong>Total:</strong> ${money(order.total)}</p>`;
      
    } catch (error) {
      showToast("Error placing order: " + error.message);
    }
  }

  // =========================================================
  // NEW RATE YOUR ORDER LOGIC (Unlocked only on COMPLETED status)
  // =========================================================
  function initRateOrderSystem() {
    const modal = document.getElementById('rateOrderModal');
    const lookupDiv = document.getElementById('rateOrderLookup');
    const resultDiv = document.getElementById('rateOrderResult');
    const detailsDiv = document.getElementById('rateOrderDetails');
    const formContainer = document.getElementById('rateOrderFormContainer');
    const thankYouDiv = document.getElementById('rateOrderThankYou');
    const starsContainer = document.getElementById('rateOrderStarRating');
    const textDisplay = document.getElementById('rateOrderSelectedText');
    const commentInput = document.getElementById('rateOrderComment');
    const submitBtn = document.getElementById('submitRateOrderBtn');
    const checkBtn = document.getElementById('checkOrderForRating');

    let selectedRating = 0;
    let foundOrderNumber = "";

    // Helper to open the modal
    const openRateModal = () => {
      lookupDiv.classList.remove('hidden');
      resultDiv.classList.add('hidden');
      formContainer.classList.add('hidden');
      thankYouDiv.classList.add('hidden');
      selectedRating = 0;
      foundOrderNumber = "";
      document.getElementById('rateOrderNumber').value = "";
      document.getElementById('rateOrderEmail').value = "";
      starsContainer.querySelectorAll('button').forEach(b => b.classList.remove('is-selected'));
      textDisplay.textContent = "Tap a star to rate";
      openLayer(modal);
    };

    // Event listeners to open modal
    document.getElementById('rateOrderNavButton').addEventListener('click', openRateModal);
    document.getElementById('rateOrderFooterLink').addEventListener('click', (e) => { e.preventDefault(); openRateModal(); });

    // Star selection
    starsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-rating]');
      if (!btn) return;
      selectedRating = parseInt(btn.dataset.rating);
      starsContainer.querySelectorAll('button').forEach((b, index) => {
        if (index < selectedRating) b.classList.add('is-selected');
        else b.classList.remove('is-selected');
      });
      textDisplay.textContent = `You rated ${selectedRating} out of 5`;
    });

    // Check Order
    checkBtn.addEventListener('click', async () => {
      const number = document.getElementById('rateOrderNumber').value.trim();
      const email = document.getElementById('rateOrderEmail').value.trim();
      if (!number || !email) return showToast("Please enter both Order Number and Email.");

      checkBtn.disabled = true;
      checkBtn.textContent = "Searching...";

      try {
        const { data, error } = await supabase.from('orders').select('*').eq('order_number', number).eq('email', email).maybeSingle();
        if (error) throw error;

        if (!data) {
          showToast("Order not found. Please check your details.");
          checkBtn.disabled = false;
          checkBtn.textContent = "Find My Order";
          return;
        }

        lookupDiv.classList.add('hidden');
        resultDiv.classList.remove('hidden');
        foundOrderNumber = data.order_number;

        // Display order info
        detailsDiv.innerHTML = `
          <div class="form-modal-grid" style="background: #f9fcfb; padding: 15px; border-radius: 12px; margin-bottom: 15px;">
            <p><strong>Order:</strong><br>${escapeHtml(data.order_number)}</p>
            <p><strong>Customer:</strong><br>${escapeHtml(data.customer_name)}</p>
            <p><strong>Pickup:</strong><br>${escapeHtml(data.pickup_date)} at ${escapeHtml(data.pickup_time)}</p>
            <p><strong>Status:</strong><br><span class="status ${data.status.replace(/\s+/g, '-')}">${escapeHtml(data.status)}</span></p>
          </div>
        `;

        // Check if status is "completed"
        if (data.status.toLowerCase() === 'completed') {
          formContainer.classList.remove('hidden');
          thankYouDiv.classList.add('hidden');
          textDisplay.textContent = "Tap a star to rate";
          selectedRating = 0;
          starsContainer.querySelectorAll('button').forEach(b => b.classList.remove('is-selected'));
          commentInput.value = "";
          showToast("Order found! You can now leave a rating.");
        } else {
          formContainer.classList.add('hidden');
          thankYouDiv.classList.add('hidden');
          detailsDiv.innerHTML += `<p style="margin-top:10px; color: var(--warning); font-weight:800;">Your order is currently <strong>${escapeHtml(data.status)}</strong>. Please wait until it is marked as "Completed" to leave a review.</p>`;
        }

      } catch (error) {
        showToast("Error looking up order: " + error.message);
      } finally {
        checkBtn.disabled = false;
        checkBtn.textContent = "Find My Order";
      }
    });

    // Submit Rating
    submitBtn.addEventListener('click', async () => {
      if (!foundOrderNumber) return showToast("No order found.");
      if (selectedRating === 0) return showToast("Please select a star rating.");
      
      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting...";
      try {
        await submitRatingToDB({
          order_number: foundOrderNumber,
          rating: selectedRating,
          comment: commentInput.value.trim()
        });
        formContainer.classList.add('hidden');
        thankYouDiv.classList.remove('hidden');
        await renderRatings();
        showToast("Rating submitted successfully!");
      } catch (error) {
        showToast("Error submitting rating: " + error.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Rating";
      }
    });
  }

  async function submitMessage(event) {
    event.preventDefault();
    const messageData = {
      name: $("#contactName").value.trim(),
      email: $("#contactEmail").value.trim(),
      subject: $("#contactSubject").value.trim(),
      message: $("#contactMessage").value.trim(),
      is_read: false,
      created_at: new Date().toISOString()
    };
    try {
      await submitMessageToDB(messageData);
      event.target.reset();
      showToast("Your message has been sent.");
    } catch (error) {
      showToast("Error sending message: " + error.message);
    }
  }

  function applyContent(content) {
    if (!content) return;
    $("#announcement").textContent = content.announcement || "Freshly baked with skill, teamwork, and purpose.";
    $("#heroDescription").textContent = content.hero_description || "Daily Bread Blessings turns baking skills, teamwork, and creativity into fresh products and real entrepreneurship experience.";
    $("#businessDescription").textContent = content.business_description || "Daily Bread Blessings is a student entrepreneurship group built around homemade quality, responsible teamwork, and creative baking.";
    $("#locationText").textContent = content.location || "Oriental Mindoro National High School (OMNHS)";
    $("#scheduleText").textContent = content.schedule || "Junior High - 1:30PM - 2:00PM\nSenior High - 2:00PM - 2:30PM";
    const phone = content.phone || "0965 296 4107";
    const email = content.email || "";
    $("#contactText").textContent = email ? `${phone} · ${email}` : phone;
    
    const fbLink = content.facebook || "#";
    // Update footer
    $("#socialLinks").innerHTML = `
      <a href="${fbLink}" aria-label="Facebook">f</a>
      <a href="${content.instagram || "#"}" aria-label="Instagram">◎</a>
      <a href="${content.tiktok || "#"}" aria-label="TikTok">♪</a>`;
      
    // Update contact page Facebook card
    const fbContact = document.getElementById("facebookContactText");
    if (fbContact) {
      fbContact.href = fbLink;
    }
  }

  // =========================================================
  // AUDIO / INTRO / MOTION SYSTEM
  // =========================================================

  function createIntroAudioController(toggleButton) {
    const welcomeAudio = $("#introWelcomeAudio");
    const readyAudio = $("#introReadyAudio");
    const enterAudio = $("#introEnterAudio");
    const audioFiles = [welcomeAudio, readyAudio, enterAudio].filter(Boolean);
    let isEnabled = false;
    let openingPlayed = false;
    if (welcomeAudio) welcomeAudio.volume = 0.95;
    if (readyAudio) readyAudio.volume = 0.82;
    if (enterAudio) enterAudio.volume = 1;
    const setButtonState = (enabled, label = enabled ? "Sound On" : "Sound Off") => {
      if (!toggleButton) return;
      toggleButton.classList.toggle("is-on", enabled);
      toggleButton.setAttribute("aria-pressed", String(enabled));
      const icon = $(".intro-sound-icon", toggleButton);
      const text = $(".intro-sound-label", toggleButton);
      if (icon) icon.textContent = enabled ? "🔊" : "🔇";
      if (text) text.textContent = label;
    };
    const stopAll = () => audioFiles.forEach(a => { a.pause(); try { a.currentTime = 0; } catch {} });
    const playFile = async (audio, restart = true) => {
      if (!audio || !isEnabled) return false;
      try { if (restart) { audio.pause(); audio.currentTime = 0; } audio.muted = false; await audio.play(); return true; }
      catch (error) { console.warn("Opening sound could not play:", error); setButtonState(false, "Tap Again"); isEnabled = false; return false; }
    };
    const playOpening = async (forceReplay = false) => {
      if (!isEnabled || (!forceReplay && openingPlayed)) return false;
      openingPlayed = true;
      stopAll();
      return playFile(welcomeAudio);
    };
    const playReady = async () => isEnabled && playFile(readyAudio);
    const playEnter = async ({ activateIfNeeded = false } = {}) => {
      if (!isEnabled && activateIfNeeded) { isEnabled = true; setButtonState(true); storageSetRaw("dbb_intro_sound", "on"); }
      if (!isEnabled) return false;
      stopAll();
      return playFile(enterAudio);
    };
    const enable = async ({ playWelcome = true } = {}) => {
      isEnabled = true; setButtonState(true); storageSetRaw("dbb_intro_sound", "on");
      audioFiles.forEach(a => { a.load(); a.muted = false; });
      if (!playWelcome) return true;
      const played = await playOpening(true);
      if (!played) storageSetRaw("dbb_intro_sound", "off");
      return played;
    };
    const disable = () => { isEnabled = false; stopAll(); setButtonState(false); storageSetRaw("dbb_intro_sound", "off"); };
    const stop = () => stopAll();
    setButtonState(false, storageGetRaw("dbb_intro_sound") === "off" ? "Sound Off" : "Tap for Sound");
    return { enable, disable, playOpening, playReady, playEnter, stop, get enabled() { return isEnabled; } };
  }

  function initializeSiteMusic() {
    const audio = $("#siteBackgroundMusic");
    const player = $("#siteMusicPlayer");
    const toggle = $("#siteMusicToggle");
    const muteButton = $("#siteMusicMute");
    const volumeInput = $("#siteMusicVolume");
    const playIcon = $("#siteMusicPlayIcon");
    const status = $("#siteMusicStatus");
    if (!audio || !player || !toggle || !volumeInput) return { startFromGesture: async () => false, reveal: () => {}, pause: () => {} };

    let preferredVolume = Number(storageGetRaw("dbb_music_volume")) || 18;
    let userMuted = storageGetRaw("dbb_music_muted") === "true";
    audio.volume = userMuted ? 0 : preferredVolume / 100;
    volumeInput.value = String(preferredVolume);

    const updateUi = () => {
      const playing = !audio.paused && !audio.ended;
      player.classList.toggle("is-playing", playing);
      toggle.setAttribute("aria-pressed", String(playing));
      playIcon.textContent = playing ? "❚❚" : "▶";
      status.textContent = playing ? (userMuted || audio.volume === 0 ? "Playing silently" : "Soft music is playing") : "Relax music is paused";
      muteButton.textContent = userMuted || audio.volume === 0 ? "🔇" : audio.volume < .35 ? "🔉" : "🔊";
    };

    const fadeTo = (targetVolume, duration = 900) => {
      const startVolume = audio.volume;
      const startedAt = performance.now();
      const step = now => {
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        audio.volume = Math.max(0, Math.min(1, startVolume + (targetVolume - startVolume) * eased));
        updateUi();
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const play = async ({ fadeIn = true } = {}) => {
      try {
        const targetVolume = userMuted ? 0 : Number(volumeInput.value) / 100;
        if (fadeIn) audio.volume = 0;
        await audio.play();
        if (fadeIn) fadeTo(targetVolume, 1400);
        else audio.volume = targetVolume;
        storageSetRaw("dbb_music_enabled", "on");
        updateUi();
        return true;
      } catch (error) { status.textContent = "Tap play to start music"; updateUi(); return false; }
    };

    const pause = ({ fadeOut = true } = {}) => {
      storageSetRaw("dbb_music_enabled", "off");
      if (!fadeOut || audio.paused) { audio.pause(); updateUi(); return; }
      const startingVolume = audio.volume;
      fadeTo(0, 450);
      setTimeout(() => { audio.pause(); audio.volume = startingVolume; updateUi(); }, 470);
    };

    const startFromGesture = async ({ force = false } = {}) => {
      player.classList.add("is-visible");
      let disabled = false;
      try { disabled = storageGetRaw("dbb_music_enabled") === "off"; } catch {}
      if (disabled && !force) { updateUi(); return false; }
      if (force) storageSetRaw("dbb_music_enabled", "on");
      return play({ fadeIn: true });
    };

    toggle.addEventListener("click", async () => {
      player.classList.add("is-expanded");
      if (audio.paused) await play({ fadeIn: true });
      else pause({ fadeOut: true });
    });
    muteButton.addEventListener("click", event => {
      event.stopPropagation();
      userMuted = !userMuted;
      storageSetRaw("dbb_music_muted", String(userMuted));
      if (userMuted) fadeTo(0, 280);
      else fadeTo(Number(volumeInput.value) / 100, 350);
      updateUi();
    });
    volumeInput.addEventListener("input", event => {
      const value = Number(event.target.value);
      preferredVolume = value;
      storageSetRaw("dbb_music_volume", String(value));
      if (value > 0 && userMuted) { userMuted = false; storageSetRaw("dbb_music_muted", "false"); }
      audio.volume = userMuted ? 0 : value / 100;
      updateUi();
    });
    audio.addEventListener("play", updateUi);
    audio.addEventListener("pause", updateUi);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && !audio.paused) fadeTo(Math.min(audio.volume, .055), 450);
      else if (!document.hidden && !audio.paused && !userMuted) fadeTo(Number(volumeInput.value) / 100, 650);
    });
    updateUi();
    return { startFromGesture, reveal: () => player.classList.add("is-visible"), pause };
  }

  function initializeIntroScreen(siteMusic) {
    const intro = $("#introScreen");
    const enterButton = $("#enterWebsite");
    const soundToggle = $("#introSoundToggle");
    if (!intro || !enterButton) { document.body.classList.remove("intro-active"); return; }
    intro.dataset.introController = "active";
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const readyDelay = reduceMotion ? 0 : 1800;
    const exitDuration = reduceMotion ? 20 : 980;
    const audio = createIntroAudioController(soundToggle);
    let readyTimer;
    let hasEntered = false;

    const makeReady = () => {
      if (hasEntered) return;
      intro.classList.add("is-ready");
      enterButton.disabled = false;
      try { audio.playReady(); } catch {}
      try { enterButton.focus({ preventScroll: true }); } catch { enterButton.focus(); }
    };

    const enterWebsite = async () => {
      if (hasEntered || enterButton.disabled) return;
      hasEntered = true;
      clearTimeout(readyTimer);
      enterButton.disabled = true;
      let introSoundDisabled = false;
      try { introSoundDisabled = storageGetRaw("dbb_intro_sound") === "off"; } catch {}
      const entranceSoundPromise = introSoundDisabled ? Promise.resolve(false) : audio.playEnter({ activateIfNeeded: true });
      const backgroundMusicPromise = siteMusic?.startFromGesture({ force: true });
      intro.classList.add("is-leaving");
      document.body.classList.add("site-entered");
      Promise.allSettled([entranceSoundPromise, backgroundMusicPromise].filter(Boolean)).catch(() => {});
      setTimeout(() => { audio.stop(); intro.remove(); siteMusic?.reveal(); document.body.classList.remove("intro-active"); window.scrollTo({ top: 0, behavior: "auto" }); }, exitDuration);
    };

    soundToggle?.addEventListener("click", () => {
      if (audio.enabled) { audio.disable(); showToast("Opening sound turned off."); }
      else { audio.enable({ playWelcome: true }).then(played => showToast(played ? "Opening sound is working." : "Tap again or check the media volume.")); }
    });
    readyTimer = setTimeout(makeReady, readyDelay);
    enterButton.addEventListener("click", enterWebsite);
    intro.addEventListener("keydown", event => {
      if ((event.key === "Enter" || event.key === " ") && !enterButton.disabled && event.target !== soundToggle) {
        event.preventDefault();
        enterWebsite();
      }
    });
    window.addEventListener("load", () => { if (reduceMotion) makeReady(); }, { once: true });
    window.addEventListener("pagehide", () => audio.stop(), { once: true });
  }

  function initializeMotionSystem() {
    const progress = document.createElement("div");
    progress.className = "page-progress";
    progress.setAttribute("aria-hidden", "true");
    document.body.prepend(progress);
    const revealGroups = [
      [".section-title", "reveal-up"], [".about-art", "reveal-left"], ["#about .container > div:last-child", "reveal-right"],
      [".stats-grid", "reveal-scale"], [".feature-item", "reveal-up"], [".process-card", "reveal-up"],
      [".contact-card", "reveal-left"], [".contact-section .form-card", "reveal-right"], [".footer-grid > div", "reveal-up"]
    ];
    revealGroups.forEach(([selector, className]) => {
      $$(selector).forEach((element, index) => {
        element.classList.add(className);
        element.style.transitionDelay = `${Math.min(index * 70, 280)}ms`;
      });
    });
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: .14, rootMargin: "0px 0px -45px" });
    $$(".reveal-up, .reveal-left, .reveal-right, .reveal-scale").forEach(element => revealObserver.observe(element));
    const sections = $$("main section[id]");
    const navLinks = $$(".nav-links a[href^='#']");
    const sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navLinks.forEach(link => link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`));
      });
    }, { rootMargin: "-35% 0px -55%", threshold: 0 });
    sections.forEach(section => sectionObserver.observe(section));
    const handleScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
      progress.style.transform = `scaleX(${Math.min(1, Math.max(0, ratio))})`;
      $(".site-header").classList.toggle("scrolled", window.scrollY > 28);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    if (window.matchMedia("(pointer:fine)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const visual = $(".hero-visual");
      const logo = $(".hero-logo");
      visual?.addEventListener("pointermove", event => {
        const rect = visual.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - .5;
        const y = (event.clientY - rect.top) / rect.height - .5;
        logo.style.transform = `translate3d(${x * 13}px, ${y * 10}px, 0) rotate(${x * 2}deg)`;
      });
      visual?.addEventListener("pointerleave", () => { logo.style.transform = ""; });
    }
  }

  function createRipple(event) {
    const button = event.target.closest(".btn");
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.7;
    const dot = document.createElement("span");
    dot.className = "ripple-dot";
    dot.style.width = `${size}px`;
    dot.style.height = `${size}px`;
    dot.style.left = `${event.clientX - rect.left}px`;
    dot.style.top = `${event.clientY - rect.top}px`;
    button.appendChild(dot);
    dot.addEventListener("animationend", () => dot.remove());
  }

  function flyProductToCart(button, product) {
    if (!button || !product || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = button.getBoundingClientRect();
    const destination = $("#cartButton").getBoundingClientRect();
    const flyer = document.createElement("div");
    flyer.className = "fly-to-cart";
    if (product.image_url) flyer.innerHTML = `<img src="${product.image_url}" alt="${escapeHtml(product.name)}">`;
    else flyer.textContent = product.emoji || "🥐";
    flyer.style.left = `${start.left + start.width / 2 - 27}px`;
    flyer.style.top = `${start.top + start.height / 2 - 27}px`;
    document.body.appendChild(flyer);
    requestAnimationFrame(() => {
      flyer.style.left = `${destination.left + destination.width / 2 - 27}px`;
      flyer.style.top = `${destination.top + destination.height / 2 - 27}px`;
      flyer.style.opacity = ".2";
      flyer.style.transform = "scale(.35) rotate(18deg)";
    });
    setTimeout(() => flyer.remove(), 760);
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => elements.toast.classList.remove("show"), 2300);
  }

  // =========================================================
  // EVENT LISTENERS
  // =========================================================

  document.addEventListener("click", event => {
    createRipple(event);
    const add = event.target.closest("[data-add]");
    const view = event.target.closest("[data-view]");
    const qty = event.target.closest("[data-qty]");
    const remove = event.target.closest("[data-remove]");
    const filter = event.target.closest("[data-category]");
    const close = event.target.closest("[data-close]");

    if (add) {
      const product = productsCache.find(entry => entry.id === add.dataset.add);
      flyProductToCart(add, product);
      addToCart(add.dataset.add);
    }
    if (view) showProduct(view.dataset.view);
    if (qty) updateQuantity(qty.dataset.qty, Number(qty.dataset.change));
    if (remove) removeFromCart(remove.dataset.remove);
    if (filter) {
      activeCategory = filter.dataset.category;
      renderCategories();
      renderProducts();
    }
    if (close) {
      const layer = { cart: elements.cartDrawer, product: elements.productModal, checkout: elements.checkoutModal, rateOrder: document.getElementById('rateOrderModal') }[close.dataset.close];
      if (layer) closeLayer(layer);
    }
  });

  $("#cartButton")?.addEventListener("click", () => openLayer(elements.cartDrawer));
  $("#checkoutButton")?.addEventListener("click", openCheckout);
  $("#productSearch")?.addEventListener("input", event => { searchTerm = event.target.value; renderProducts(); });
  $("#checkoutForm")?.addEventListener("submit", submitOrder);
  $("#contactForm")?.addEventListener("submit", submitMessage);
  $("#menuButton")?.addEventListener("click", () => $("#navLinks")?.classList.toggle("open"));
  $$("#navLinks a").forEach(link => link.addEventListener("click", () => $("#navLinks").classList.remove("open")));

  if ($("#year")) $("#year").textContent = new Date().getFullYear();

  // =========================================================
  // INITIALIZATION
  // =========================================================

  (async () => {
    try {
      const siteMusic = initializeSiteMusic();
      initializeIntroScreen(siteMusic);
      
      const content = await fetchContent();
      applyContent(content);
      
      await renderCategories();
      await renderProducts();
      await renderRatings();

      renderCart();
      initializeMotionSystem();
      initializeFoodRain();
      
      // NEW: Initialize the Rate Your Order system
      initRateOrderSystem();

    } catch (error) {
      console.error("Daily Bread Blessings failed to initialize:", error);
      document.body.classList.remove("intro-active");
      const intro = document.getElementById("introScreen");
      if (intro) intro.remove();
      const grid = document.getElementById("productGrid");
      if (grid) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><span>⚠</span><strong>The menu could not load.</strong><p>Refresh the page with Ctrl + F5.</p></div>`;
      }
    }
  })();

})();