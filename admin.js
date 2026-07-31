(() => {
  "use strict";

  const supabase = window.__SUPABASE;
  if (!supabase) {
    console.error("Supabase client not initialized. Check your URL and Anon Key in admin.html");
    return;
  }

  const STATUS_OPTIONS = ["pending", "confirmed", "preparing", "ready for pickup", "completed", "cancelled"];

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

  let uploadedImageUrl = "";
  let productSearch = "";
  let productCategoryFilter = "";
  let orderSearch = "";
  let orderStatusFilter = "";

  // =========================================================
  // AUTHENTICATION
  // =========================================================

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  }

  async function loginAdmin(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function logoutAdmin() {
    await supabase.auth.signOut();
  }

  function showAdmin() {
    $("#loginScreen").classList.add("hidden");
    $("#adminShell").classList.remove("hidden");
    renderAll();
  }

  function showLogin() {
    $("#adminShell").classList.add("hidden");
    $("#loginScreen").classList.remove("hidden");
  }

  // =========================================================
  // DATABASE HELPERS
  // =========================================================

  async function getProducts() {
    const { data, error } = await supabase.from('products').select('*');
    if (error) throw error;
    return data || [];
  }

  async function getCategories() {
    const { data, error } = await supabase.from('categories').select('name');
    if (error) throw error;
    return (data || []).map(c => c.name);
  }

  async function getOrders() {
    const { data, error } = await supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function getMessages() {
    const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function getRatings() {
    const { data, error } = await supabase.from('ratings').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }
  
  async function getRatingByOrderNumber(orderNumber) {
    const { data, error } = await supabase.from('ratings').select('*').eq('order_number', orderNumber).maybeSingle();
    if (error && error.code !== 'PGRST116') throw error; 
    return data;
  }

  async function getContent() {
    const { data, error } = await supabase.from('content').select('*').eq('id', 1).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || {};
  }

  async function saveProductToDB(product) {
    if (product.id) {
      const { error } = await supabase.from('products').update(product).eq('id', product.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('products').insert([product]);
      if (error) throw error;
    }
  }

  async function deleteProductFromDB(id) {
    const { data, error } = await supabase.from('products').delete().eq('id', id).select('id');
    if (error) {
      if (error.code === '23503') {
        throw new Error("This product cannot be deleted because it is referenced in existing orders.");
      } else if (error.code === '42501') {
        throw new Error("Permission denied. Please check Supabase RLS policies for the 'products' table.");
      }
      throw error;
    }
    if (!data || data.length === 0) {
      throw new Error("Record not found. It may have already been deleted.");
    }
  }

  async function updateOrderStatusInDB(id, status) {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (error) throw error;
  }

  async function deleteOrderFromDB(id) {
    const { data, error } = await supabase.from('orders').delete().eq('id', id).select('id');
    if (error) {
      if (error.code === '23503') {
        throw new Error("This order cannot be deleted because it has associated items.");
      } else if (error.code === '42501') {
        throw new Error("Permission denied. Please check Supabase RLS policies for the 'orders' table.");
      }
      throw error;
    }
    if (!data || data.length === 0) {
      throw new Error("Record not found. It may have already been deleted.");
    }
  }

  async function addCategoryToDB(name) {
    const { error } = await supabase.from('categories').insert([{ name }]);
    if (error && error.code === '23505') throw new Error("Category already exists.");
    if (error) throw error;
  }

  async function updateCategoryInDB(oldName, newName) {
    const { error: catError } = await supabase.from('categories').update({ name: newName }).eq('name', oldName);
    if (catError && catError.code === '23505') throw new Error("Category already exists.");
    if (catError) throw catError;
    const { error: prodError } = await supabase.from('products').update({ category: newName }).eq('category', oldName);
    if (prodError) throw prodError;
  }

  async function deleteCategoryFromDB(name) {
    const { data, error } = await supabase.from('categories').delete().eq('name', name).select('name');
    if (error && error.code === '23503') throw new Error("Reassign products before deleting this category.");
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error("Category not found. It may have already been deleted.");
    }
  }

  async function deleteMessageFromDB(id) {
    const { data, error } = await supabase.from('messages').delete().eq('id', id).select('id');
    if (error) {
      if (error.code === '23503') {
        throw new Error("This message cannot be deleted because it is referenced by other records.");
      } else if (error.code === '42501') {
        throw new Error("Permission denied. Please check Supabase RLS policies for the 'messages' table.");
      }
      throw error;
    }
    if (!data || data.length === 0) {
      throw new Error("Record not found. It may have already been deleted.");
    }
  }

  async function markMessageAsRead(id) {
    const { error } = await supabase.from('messages').update({ is_read: true }).eq('id', id);
    if (error) throw error;
  }

  async function saveContentToDB(content) {
    const { error } = await supabase.from('content').upsert({ id: 1, ...content });
    if (error) throw error;
  }

  // =========================================================
  // IMAGE UPLOAD HELPER
  // =========================================================
  async function uploadProductImage(file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2)}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, file);
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);
    return publicUrl;
  }

  // =========================================================
  // UI FUNCTIONS
  // =========================================================

  function createAdminRipple(event) {
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

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2300);
  }

  function openModal(id) {
    const modal = document.getElementById(id);
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    if (!document.querySelector(".modal.open")) document.body.classList.remove("no-scroll");
  }

  function goToPage(page) {
    $$(".admin-nav button").forEach(button => button.classList.toggle("active", button.dataset.page === page));
    $$(".admin-page").forEach(section => section.classList.toggle("active", section.id === `page-${page}`));
    if (page === "dashboard") renderDashboard();
    if (page === "products") renderProducts();
    if (page === "orders") renderOrders();
    if (page === "categories") renderCategories();
    if (page === "messages") renderMessages();
    if (page === "reviews") renderReviews();
    if (page === "content") loadContentForm();
  }

  async function renderDashboard() {
    const products = await getProducts();
    const orders = await getOrders();
    const totalSales = orders.filter(o => o.status === "completed").reduce((sum, o) => sum + Number(o.total || 0), 0);
    const counts = status => orders.filter(o => o.status === status).length;
    const lowStock = products.filter(p => p.stock <= 5);
    const ratings = await getRatings();
    const averageRating = ratings.length ? ratings.reduce((sum, entry) => sum + entry.rating, 0) / ratings.length : 0;

    const kpis = [
      ["Total Products", products.length],
      ["Total Orders", orders.length],
      ["Pending Orders", counts("pending")],
      ["Completed Orders", counts("completed")],
      ["Cancelled Orders", counts("cancelled")],
      ["Total Sales", money(totalSales)],
      ["Low-stock Products", lowStock.length],
      ["Customer Messages", (await getMessages()).length],
      ["Website Ratings", ratings.length],
      ["Average Rating", ratings.length ? `${averageRating.toFixed(1)} / 5` : "No ratings"]
    ];
    $("#kpiGrid").innerHTML = kpis.map(([label, value]) => `<article class="kpi-card"><small>${label}</small><strong>${value}</strong><span class="muted">Live database data</span></article>`).join("");

    const recent = orders.slice(0, 6);
    $("#recentOrders").innerHTML = recent.length ? `
      <table><thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Total</th></tr></thead>
      <tbody>${recent.map(o => `<tr><td>${escapeHtml(o.order_number)}</td><td>${escapeHtml(o.customer_name)}</td><td><span class="status ${slug(o.status)}">${escapeHtml(o.status)}</span></td><td>${money(o.total)}</td></tr>`).join("")}</tbody></table>`
      : `<div class="empty-state"><span>🧾</span><strong>No orders yet.</strong></div>`;

    $("#lowStockList").innerHTML = lowStock.length ? lowStock.map(p => `<div class="list-card"><div><strong>${escapeHtml(p.name)}</strong><small class="muted" style="display:block">${escapeHtml(p.category)}</small></div><span class="stock-low">${p.stock} left</span></div>`).join("")
      : `<div class="empty-state"><span>✓</span><strong>Stock levels look healthy.</strong></div>`;
  }

  async function renderProducts() {
    const products = await getProducts();
    const categories = await getCategories();
    $("#adminProductCategory").innerHTML = `<option value="">All categories</option>${categories.map(c => `<option ${c === productCategoryFilter ? "selected" : ""}>${escapeHtml(c)}</option>`).join("")}`;
    const filtered = products.filter(p => {
      const searchMatch = `${p.name} ${p.category} ${p.description}`.toLowerCase().includes(productSearch.toLowerCase());
      const categoryMatch = !productCategoryFilter || p.category === productCategoryFilter;
      return searchMatch && categoryMatch;
    });
    $("#productTable").innerHTML = filtered.length ? `
      <table>
        <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Availability</th><th>Actions</th></tr></thead>
        <tbody>${filtered.map(p => `
          <tr>
            <td><strong>${escapeHtml(p.name)}</strong><small class="muted" style="display:block">${escapeHtml(p.badge || "")}</small></td>
            <td>${escapeHtml(p.category)}</td><td>${money(p.price)}</td>
            <td class="${p.stock <= 5 ? "stock-low" : ""}">${p.stock}</td>
            <td><span class="status ${p.available ? "completed" : "cancelled"}">${p.available ? "available" : "unavailable"}</span></td>
            <td><div class="action-row"><button class="btn btn-outline btn-sm" data-edit-product="${p.id}">Edit</button><button class="btn btn-danger btn-sm" data-delete-product="${p.id}">Delete</button></div></td>
          </tr>`).join("")}</tbody>
      </table>` : `<div class="empty-state"><span>🥐</span><strong>No products found.</strong></div>`;
  }

  function renderAdminStars(rating) {
    const full = "★".repeat(rating);
    const empty = "☆".repeat(5 - rating);
    return `<span style="color:#e8a800; letter-spacing:2px; font-size:1.1rem;">${full}${empty}</span>`;
  }

  async function renderReviews() {
    const ratings = await getRatings();
    $("#reviewsTable").innerHTML = ratings.length ? `
      <table>
        <thead><tr><th>Order</th><th>Rating</th><th>Comment</th><th>Date</th></tr></thead>
        <tbody>${ratings.map(r => `
          <tr>
            <td><strong>${escapeHtml(r.order_number)}</strong></td>
            <td>${renderAdminStars(r.rating)} <strong>${r.rating} / 5</strong></td>
            <td>${escapeHtml(r.comment) || `<span class="muted" style="font-style:italic;">No comment provided</span>`}</td>
            <td>${dateText(r.created_at)}</td>
          </tr>`).join("")}</tbody>
      </table>` : `<div class="empty-state"><span>⭐</span><strong>No reviews yet.</strong></div>`;
  }

  async function fillProductCategories(selected = "") {
    const categories = await getCategories();
    $("#productCategory").innerHTML = categories.map(c => `<option ${c === selected ? "selected" : ""}>${escapeHtml(c)}</option>`).join("");
  }

  function resetProductForm() {
    $("#productForm").reset();
    $("#productId").value = "";
    uploadedImageUrl = "";
    $("#uploadPreview").textContent = "Image preview";
    $("#productFormTitle").textContent = "Add Product";
    fillProductCategories();
  }

  async function editProduct(id) {
    const products = await getProducts();
    const product = products.find(p => p.id === id);
    if (!product) return;
    $("#productFormTitle").textContent = "Edit Product";
    $("#productId").value = product.id;
    $("#productName").value = product.name;
    await fillProductCategories(product.category);
    $("#productPrice").value = product.price;
    $("#productStock").value = product.stock;
    $("#productBadge").value = product.badge || "";
    $("#productEmoji").value = product.emoji || "";
    $("#productDescription").value = product.description;
    $("#productAvailability").value = String(product.available);
    $("#productFeatured").value = String(product.featured);
    uploadedImageUrl = product.image_url || "";
    $("#uploadPreview").innerHTML = uploadedImageUrl ? `<img src="${uploadedImageUrl}" alt="Product preview">` : "Image preview";
    openModal("productFormModal");
  }

  async function saveProduct(event) {
    event.preventDefault();
    try {
      const rawId = $("#productId").value;
      const id = rawId && rawId.trim() !== "" ? rawId.trim() : null;

      const productPayload = {
        name: $("#productName").value.trim(),
        category: $("#productCategory").value,
        price: Number($("#productPrice").value),
        stock: Number($("#productStock").value),
        badge: $("#productBadge").value.trim(),
        emoji: $("#productEmoji").value.trim() || "🥐",
        description: $("#productDescription").value.trim(),
        available: $("#productAvailability").value === "true",
        featured: $("#productFeatured").value === "true",
        image_url: uploadedImageUrl || null
      };

      if (id) {
        productPayload.id = id;
      }

      await saveProductToDB(productPayload);
      
      closeModal("productFormModal");
      await renderAll();
      showToast(id ? "Product updated." : "Product added.");
    } catch (error) {
      showToast("Error saving product: " + error.message);
    }
  }

  async function deleteProduct(id) {
    if (!id || id === "undefined" || id === "null") {
      showToast("Invalid product ID. Please refresh and try again.");
      return;
    }
    if (!confirm("Delete this product?")) return;
    try {
      await deleteProductFromDB(id);
      await renderAll();
      showToast("Product deleted.");
    } catch (error) {
      console.error("Delete Product Error:", error);
      showToast("Error deleting product: " + error.message);
    }
  }

  // =========================================================
  // ORDERS SECTION (UPDATED WITH SECTION & BUILDING COLUMNS)
  // =========================================================

  async function renderOrders() {
    const orders = await getOrders();
    const filtered = orders.filter(o => {
      const searchMatch = `${o.order_number} ${o.customer_name}`.toLowerCase().includes(orderSearch.toLowerCase());
      const statusMatch = !orderStatusFilter || o.status === orderStatusFilter;
      return searchMatch && statusMatch;
    });
    $("#orderTable").innerHTML = filtered.length ? `
      <table>
        <thead><tr><th>Order</th><th>Customer</th><th>Section</th><th>Building</th><th>Pickup</th><th>Items</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${filtered.map(o => `
          <tr>
            <td><strong>${escapeHtml(o.order_number)}</strong><small class="muted" style="display:block">${dateText(o.created_at)}</small></td>
            <td>${escapeHtml(o.customer_name)}<small class="muted" style="display:block">${escapeHtml(o.contact_number)}</small></td>
            <td>${escapeHtml(o.section || '—')}</td>
            <td>${escapeHtml(o.building_name || '—')}</td>
            <td>${escapeHtml(o.pickup_date)}<small class="muted" style="display:block">${escapeHtml(o.pickup_time)}</small></td>
            <td>
              ${(o.order_items || []).map(item => `
                <div style="font-size:0.82rem; display:flex; justify-content:space-between; gap:8px; border-bottom:1px dashed #edf1ee; padding:3px 0;">
                  <span>${escapeHtml(item.name_at_order)}</span>
                  <span style="font-weight:800; color:var(--green-800);">× ${item.quantity}</span>
                </div>
              `).join('') || `<span class="muted" style="font-style:italic;">No items</span>`}
            </td>
            <td>${money(o.total)}</td>
            <td><select data-order-status="${o.id}" style="min-width:150px">${STATUS_OPTIONS.map(status => `<option value="${status}" ${status === o.status ? "selected" : ""}>${status}</option>`).join("")}</select></td>
            <td>
              <div class="action-row">
                <button class="btn btn-outline btn-sm" data-view-order="${o.id}">View</button>
                <button class="btn btn-danger btn-sm" data-delete-order="${o.id}">Delete</button>
              </div>
            </td>
          </tr>`).join("")}</tbody>
      </table>` : `<div class="empty-state"><span>🧾</span><strong>No orders found.</strong></div>`;
  }

  async function updateOrderStatus(id, status) {
    try {
      await updateOrderStatusInDB(id, status);
      await renderAll();
      showToast("Order status updated.");
    } catch (error) {
      showToast("Error updating status: " + error.message);
    }
  }

  async function deleteOrder(id) {
    if (!id || id === "undefined" || id === "null") {
      showToast("Invalid order ID. Please refresh and try again.");
      return;
    }
    if (!confirm("Are you sure you want to permanently delete this order? This cannot be undone.")) return;
    try {
      await deleteOrderFromDB(id);
      closeModal('orderModal');
      await renderAll();
      showToast("Order deleted.");
    } catch (error) {
      console.error("Delete Order Error:", error);
      showToast("Error deleting order: " + error.message);
    }
  }

  async function viewOrder(id) {
    const orders = await getOrders();
    const order = orders.find(o => o.id === id);
    if (!order) return;

    const rating = await getRatingByOrderNumber(order.order_number);

    let ratingHtml = `<p><strong>Status:</strong> <span class="status ${slug(order.status)}">${escapeHtml(order.status)}</span></p>`;
    
    if (rating) {
      const starString = "★".repeat(rating.rating) + "☆".repeat(5 - rating.rating);
      ratingHtml += `
        <div style="margin-top: 20px; padding: 15px; border: 1px solid rgba(31, 122, 77, 0.15); border-radius: 12px; background: #f9fcfb;">
          <p class="eyebrow" style="margin-bottom: 5px; color: var(--green-700);">Customer Review</p>
          <div style="display: flex; align-items: center; gap: 10px;">
            <strong style="font-size: 1.2rem; color: #e8a800;">${rating.rating} / 5</strong>
            <span style="font-size: 1.2rem; color: #e8a800; letter-spacing: 2px;">${starString}</span>
          </div>
          ${rating.comment ? `<p style="margin-top: 8px; font-style: italic; color: var(--muted);">"${escapeHtml(rating.comment)}"</p>` : `<p style="margin-top: 8px; color: var(--muted); font-size: 0.9rem;">(No written feedback provided)</p>`}
        </div>
      `;
    }

    $("#orderDetail").innerHTML = `
      <div id="printableOrder">
        <p class="eyebrow">Order ${escapeHtml(order.order_number)}</p>
        <h2>${escapeHtml(order.customer_name)}</h2>
        <div class="form-modal-grid">
          <p><strong>Contact:</strong><br>${escapeHtml(order.contact_number)}</p>
          <p><strong>Section:</strong><br>${escapeHtml(order.section || 'Not provided')}</p>
          <p><strong>Building:</strong><br>${escapeHtml(order.building_name || 'Not provided')}</p>
          <p><strong>Pickup:</strong><br>${escapeHtml(order.pickup_date)} at ${escapeHtml(order.pickup_time)}</p>
          <p><strong>Payment:</strong><br>${escapeHtml(order.payment_method)}</p>
        </div>
        <div class="order-review">${(order.order_items || []).map(item => `<div class="summary-line"><span>${escapeHtml(item.name_at_order)} × ${item.quantity}</span><strong>${money(item.price_at_order * item.quantity)}</strong></div>`).join("")}<div class="summary-line summary-total"><span>Total</span><strong>${money(order.total)}</strong></div></div>
        <p style="margin-top:16px"><strong>Notes:</strong><br>${escapeHtml(order.notes || "None")}</p>
        ${ratingHtml}
      </div>
      <div class="action-row" style="margin-top:18px">
        <button class="btn" data-print-order="${order.id}">Print Summary</button>
        <button class="btn btn-danger" data-delete-order="${order.id}">Delete Order</button>
      </div>`;
    openModal("orderModal");
  }

  function printOrder(id) {
    (async () => {
      const orders = await getOrders();
      const order = orders.find(o => o.id === id);
      if (!order) return;
      const itemRows = (order.order_items || []).map(item => `<tr><td>${escapeHtml(item.name_at_order)}</td><td>${item.quantity}</td><td>${money(item.price_at_order)}</td><td>${money(item.price_at_order * item.quantity)}</td></tr>`).join("");
      const win = window.open("", "_blank", "width=800,height=700");
      win.document.write(`<!doctype html><html><head><title>${escapeHtml(order.order_number)}</title><style>body{font-family:Arial;padding:32px;color:#1f2c25}h1{color:#1f7a4d}table{width:100%;border-collapse:collapse}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}.total{font-size:1.2rem;font-weight:bold;text-align:right}</style></head><body><h1>Daily Bread Blessings</h1><h2>Order ${escapeHtml(order.order_number)}</h2><p><strong>Customer:</strong> ${escapeHtml(order.customer_name)}<br><strong>Contact:</strong> ${escapeHtml(order.contact_number)}<br><strong>Section:</strong> ${escapeHtml(order.section || '—')}<br><strong>Building:</strong> ${escapeHtml(order.building_name || '—')}<br><strong>Pickup:</strong> ${escapeHtml(order.pickup_date)} at ${escapeHtml(order.pickup_time)}<br><strong>Status:</strong> ${escapeHtml(order.status)}</p><table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr></thead><tbody>${itemRows}</tbody></table><p class="total">Total: ${money(order.total)}</p><p><strong>Notes:</strong> ${escapeHtml(order.notes || "None")}</p></body></html>`);
      win.document.close();
      win.focus();
      win.print();
    })();
  }

  // =========================================================
  // CATEGORIES, MESSAGES & CONTENT
  // =========================================================

  async function renderCategories() {
    const categories = await getCategories();
    $("#categoryList").innerHTML = categories.length ? categories.map(c => `
      <div class="list-card"><strong>${escapeHtml(c)}</strong><div class="action-row"><button class="btn btn-outline btn-sm" data-edit-category="${escapeHtml(c)}">Edit</button><button class="btn btn-danger btn-sm" data-delete-category="${escapeHtml(c)}">Delete</button></div></div>
    `).join("") : `<div class="empty-state"><span>▤</span><strong>No categories.</strong></div>`;
  }

  async function addCategory(event) {
    event.preventDefault();
    const input = $("#newCategory");
    const name = input.value.trim();
    if (!name) return showToast("Category name is required.");
    try {
      await addCategoryToDB(name);
      input.value = "";
      await renderAll();
      showToast("Category added.");
    } catch (error) {
      showToast(error.message);
    }
  }

  async function editCategory(oldName) {
    const newName = prompt("Enter the new category name:", oldName)?.trim();
    if (!newName || newName === oldName) return;
    try {
      await updateCategoryInDB(oldName, newName);
      await renderAll();
      showToast("Category updated.");
    } catch (error) {
      showToast(error.message);
    }
  }

  async function deleteCategory(name) {
    if (!name || name.trim() === "") {
      showToast("Invalid category name.");
      return;
    }
    try {
      await deleteCategoryFromDB(name);
      await renderAll();
      showToast("Category deleted.");
    } catch (error) {
      showToast(error.message);
    }
  }

  async function renderMessages() {
    const messages = await getMessages();
    $("#messageTable").innerHTML = messages.length ? `
      <table><thead><tr><th>Sender</th><th>Subject</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>${messages.map(m => `<tr><td><strong>${escapeHtml(m.name)}</strong><small class="muted" style="display:block">${escapeHtml(m.email)}</small></td><td>${escapeHtml(m.subject)}</td><td>${dateText(m.created_at)}</td><td><span class="status ${m.is_read ? "completed" : "pending"}">${m.is_read ? "read" : "unread"}</span></td><td><div class="action-row"><button class="btn btn-outline btn-sm" data-view-message="${m.id}">View</button><button class="btn btn-danger btn-sm" data-delete-message="${m.id}">Delete</button></div></td></tr>`).join("")}</tbody></table>`
      : `<div class="empty-state"><span>✉</span><strong>No messages yet.</strong></div>`;
  }

  async function viewMessage(id) {
    try {
      await markMessageAsRead(id);
      const messages = await getMessages();
      const message = messages.find(m => m.id === id);
      if (!message) return;
      $("#messageDetail").innerHTML = `<p class="eyebrow">${dateText(message.created_at)}</p><h2>${escapeHtml(message.subject)}</h2><p><strong>From:</strong> ${escapeHtml(message.name)} · ${escapeHtml(message.email)}</p><div class="order-review" style="white-space:pre-wrap">${escapeHtml(message.message)}</div>`;
      openModal("messageModal");
      await renderMessages();
      await renderDashboard();
    } catch (error) {
      showToast("Error viewing message: " + error.message);
    }
  }

  async function deleteMessage(id) {
    if (!id || id === "undefined" || id === "null") {
      showToast("Invalid message ID. Please refresh and try again.");
      return;
    }
    if (!confirm("Delete this message?")) return;
    try {
      await deleteMessageFromDB(id);
      await renderAll();
      showToast("Message deleted.");
    } catch (error) {
      console.error("Delete Message Error:", error);
      showToast("Error deleting message: " + error.message);
    }
  }

  async function loadContentForm() {
    const content = await getContent();
    $("#contentAnnouncement").value = content.announcement || "";
    $("#contentHero").value = content.hero_description || "";
    $("#contentBusiness").value = content.business_description || "";
    $("#contentLocation").value = content.location || "";
    $("#contentSchedule").value = content.schedule || "";
    $("#contentPhone").value = content.phone || "";
    $("#contentEmail").value = content.email || "";
    $("#contentFacebook").value = content.facebook === "#" ? "" : (content.facebook || "");
    $("#contentInstagram").value = content.instagram === "#" ? "" : (content.instagram || "");
    $("#contentTikTok").value = content.tiktok === "#" ? "" : (content.tiktok || "");
  }

  async function saveContent(event) {
    event.preventDefault();
    const contentData = {
      announcement: $("#contentAnnouncement").value.trim(),
      hero_description: $("#contentHero").value.trim(),
      business_description: $("#contentBusiness").value.trim(),
      location: $("#contentLocation").value.trim(),
      schedule: $("#contentSchedule").value.trim(),
      phone: $("#contentPhone").value.trim(),
      email: $("#contentEmail").value.trim(),
      facebook: $("#contentFacebook").value.trim() || "#",
      instagram: $("#contentInstagram").value.trim() || "#",
      tiktok: $("#contentTikTok").value.trim() || "#"
    };
    try {
      await saveContentToDB(contentData);
      showToast("Website content saved.");
    } catch (error) {
      showToast("Error saving content: " + error.message);
    }
  }

  async function renderAll() {
    await renderDashboard();
    await renderProducts();
    await renderOrders();
    await renderCategories();
    await renderMessages();
    await renderReviews();
    await loadContentForm();
  }

  function slug(value) {
    return String(value).trim().toLowerCase().replace(/\s+/g, "-");
  }

  // =========================================================
  // EVENT LISTENERS
  // =========================================================

  $("#loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = $("#adminEmail").value.trim().toLowerCase();
    const password = $("#adminPassword").value;
    try {
      await loginAdmin(email, password);
      showAdmin();
      showToast("Login successful.");
    } catch (error) {
      showToast("Incorrect email or password.");
    }
  });

  $("#logoutButton").addEventListener("click", async () => { await logoutAdmin(); showLogin(); $("#loginForm").reset(); });
  $$(".admin-nav button").forEach(button => button.addEventListener("click", () => goToPage(button.dataset.page)));
  $$("[data-page-jump]").forEach(button => button.addEventListener("click", () => goToPage(button.dataset.pageJump)));
  $("#addProductButton").addEventListener("click", () => { resetProductForm(); openModal("productFormModal"); });
  $("#productForm").addEventListener("submit", saveProduct);
  $("#categoryForm").addEventListener("submit", addCategory);
  $("#contentForm").addEventListener("submit", saveContent);
  $("#adminProductSearch").addEventListener("input", event => { productSearch = event.target.value; renderProducts(); });
  $("#adminProductCategory").addEventListener("change", event => { productCategoryFilter = event.target.value; renderProducts(); });
  $("#orderSearch").addEventListener("input", event => { orderSearch = event.target.value; renderOrders(); });
  $("#orderStatusFilter").addEventListener("change", event => { orderStatusFilter = event.target.value; renderOrders(); });
  
  document.getElementById('productImage').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2_000_000) return showToast("Use an image smaller than 2 MB.");
    const previewArea = document.getElementById('uploadPreview');
    previewArea.textContent = "Uploading...";
    try {
      const url = await uploadProductImage(file);
      uploadedImageUrl = url;
      previewArea.innerHTML = `<img src="${url}" alt="Product preview">`;
    } catch (error) {
      showToast("Upload failed: " + error.message);
      previewArea.textContent = "Image preview";
    }
  });

  document.addEventListener("click", event => {
    createAdminRipple(event);
    const close = event.target.closest("[data-close-modal]");
    const editProductButton = event.target.closest("[data-edit-product]");
    const deleteProductButton = event.target.closest("[data-delete-product]");
    const viewOrderButton = event.target.closest("[data-view-order]");
    const deleteOrderButton = event.target.closest("[data-delete-order]");
    const printOrderButton = event.target.closest("[data-print-order]");
    const editCategoryButton = event.target.closest("[data-edit-category]");
    const deleteCategoryButton = event.target.closest("[data-delete-category]");
    const viewMessageButton = event.target.closest("[data-view-message]");
    const deleteMessageButton = event.target.closest("[data-delete-message]");

    if (close) closeModal(close.dataset.closeModal);
    if (editProductButton) editProduct(editProductButton.dataset.editProduct);
    if (deleteProductButton) deleteProduct(deleteProductButton.dataset.deleteProduct);
    if (viewOrderButton) viewOrder(viewOrderButton.dataset.viewOrder);
    if (deleteOrderButton) deleteOrder(deleteOrderButton.dataset.deleteOrder);
    if (printOrderButton) printOrder(printOrderButton.dataset.printOrder);
    if (editCategoryButton) editCategory(editCategoryButton.dataset.editCategory);
    if (deleteCategoryButton) deleteCategory(deleteCategoryButton.dataset.deleteCategory);
    if (viewMessageButton) viewMessage(viewMessageButton.dataset.viewMessage);
    if (deleteMessageButton) deleteMessage(deleteMessageButton.dataset.deleteMessage);
  });

  document.addEventListener("change", event => {
    if (event.target.matches("[data-order-status]")) updateOrderStatus(event.target.dataset.orderStatus, event.target.value);
  });

  // =========================================================
  // AUTH STATE LISTENER & INIT
  // =========================================================

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') { showAdmin(); renderAll(); }
    if (event === 'SIGNED_OUT') { showLogin(); }
  });

  (async () => {
    if (await checkAuth()) {
      showAdmin();
      await renderAll();
    } else {
      showLogin();
    }
  })();

})();