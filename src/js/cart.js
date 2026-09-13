(function () {
  var STORAGE_KEY = "nilasaar_cart";
  var ADDRESS_STORAGE_KEY = "nilasaar_saved_address";

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    renderCart();
  }

  function addToCart(slug, title, price) {
    var cart = getCart();
    var existing = cart.find(function (item) { return item.slug === slug; });
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ slug: slug, title: title, price: price, qty: 1 });
    }
    saveCart(cart);
    openCart();
  }

  function setQty(slug, qty) {
    var cart = getCart();
    if (qty < 1) {
      cart = cart.filter(function (item) { return item.slug !== slug; });
    } else {
      var item = cart.find(function (i) { return i.slug === slug; });
      if (item) item.qty = qty;
    }
    saveCart(cart);
  }

  function cartTotal(cart) {
    return cart.reduce(function (sum, item) { return sum + item.price * item.qty; }, 0);
  }

  var cartCountEl = document.getElementById("cart-count");
  var cartItemsEl = document.getElementById("cart-items");
  var cartEmptyEl = document.getElementById("cart-empty");
  var cartTotalEl = document.getElementById("cart-total");
  var checkoutTotalEl = document.getElementById("checkout-total");
  var overlay = document.getElementById("cart-overlay");
  var drawer = document.getElementById("cart-drawer");

  function renderCart() {
    var cart = getCart();
    var count = cart.reduce(function (sum, item) { return sum + item.qty; }, 0);

    cartCountEl.textContent = count;
    cartCountEl.hidden = count === 0;

    cartItemsEl.innerHTML = "";
    cartEmptyEl.hidden = cart.length > 0;

    cart.forEach(function (item) {
      var row = document.createElement("div");
      row.className = "cart-item";
      row.innerHTML =
        '<div class="cart-item-info">' +
          '<p class="cart-item-title">' + escapeHtml(item.title) + '</p>' +
          '<p class="cart-item-price">₹' + item.price + '</p>' +
        '</div>' +
        '<div class="cart-item-qty">' +
          '<button type="button" class="qty-btn" data-action="dec">−</button>' +
          '<span>' + item.qty + '</span>' +
          '<button type="button" class="qty-btn" data-action="inc">+</button>' +
        '</div>';

      row.querySelector('[data-action="dec"]').addEventListener("click", function () {
        setQty(item.slug, item.qty - 1);
      });
      row.querySelector('[data-action="inc"]').addEventListener("click", function () {
        setQty(item.slug, item.qty + 1);
      });

      cartItemsEl.appendChild(row);
    });

    var total = cartTotal(cart);
    cartTotalEl.textContent = "₹" + total;
    checkoutTotalEl.textContent = "₹" + total;
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function showView(name) {
    ["items", "checkout", "success"].forEach(function (view) {
      document.getElementById("cart-view-" + view).hidden = view !== name;
    });
  }

  function openCart() {
    overlay.hidden = false;
    drawer.hidden = false;
    drawer.setAttribute("aria-hidden", "false");
    showView("items");
  }

  function closeCart() {
    overlay.hidden = true;
    drawer.hidden = true;
    drawer.setAttribute("aria-hidden", "true");
  }

  document.getElementById("cart-toggle").addEventListener("click", openCart);
  document.getElementById("cart-close").addEventListener("click", closeCart);
  overlay.addEventListener("click", closeCart);

  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".btn-add-to-cart");
    if (!btn) return;
    addToCart(btn.dataset.slug, btn.dataset.title, Number(btn.dataset.price));
  });

  document.getElementById("cart-checkout-btn").addEventListener("click", function () {
    if (getCart().length === 0) return;
    showView("checkout");
  });

  document.getElementById("checkout-back-btn").addEventListener("click", function () {
    showView("items");
  });

  document.getElementById("cart-success-close-btn").addEventListener("click", function () {
    closeCart();
  });

  var checkoutForm = document.getElementById("checkout-form");
  var checkoutError = document.getElementById("checkout-error");
  var payBtn = document.getElementById("checkout-pay-btn");
  var pincodeInput = checkoutForm.elements.pincode;
  var cityInput = checkoutForm.elements.city;
  var stateInput = checkoutForm.elements.state;
  var pincodeStatus = document.getElementById("pincode-status");

  function loadSavedAddress() {
    try {
      return JSON.parse(localStorage.getItem(ADDRESS_STORAGE_KEY));
    } catch (e) {
      return null;
    }
  }

  function prefillFromSavedAddress() {
    var saved = loadSavedAddress();
    if (!saved) return;
    ["name", "phone", "email", "line1", "pincode", "city", "state"].forEach(function (field) {
      if (saved[field] && checkoutForm.elements[field]) {
        checkoutForm.elements[field].value = saved[field];
      }
    });
    checkoutForm.elements.saveAddress.checked = true;
  }

  prefillFromSavedAddress();

  pincodeInput.addEventListener("input", function () {
    var pincode = pincodeInput.value.trim();
    pincodeStatus.hidden = true;
    if (!/^[0-9]{6}$/.test(pincode)) return;

    pincodeStatus.hidden = false;
    pincodeStatus.classList.remove("pincode-error");
    pincodeStatus.textContent = "Looking up city/state…";

    fetch("https://api.postalpincode.in/pincode/" + pincode)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var result = data && data[0];
        var postOffice = result && result.Status === "Success" && result.PostOffice && result.PostOffice[0];
        if (postOffice) {
          cityInput.value = postOffice.District;
          stateInput.value = postOffice.State;
          pincodeStatus.hidden = true;
        } else {
          pincodeStatus.textContent = "Couldn't find that pincode — please fill city/state manually.";
          pincodeStatus.classList.add("pincode-error");
        }
      })
      .catch(function () {
        pincodeStatus.textContent = "Couldn't look up that pincode — please fill city/state manually.";
        pincodeStatus.classList.add("pincode-error");
      });
  });

  checkoutForm.addEventListener("submit", function (e) {
    e.preventDefault();
    checkoutError.hidden = true;

    var formData = new FormData(checkoutForm);
    var addressFields = {
      name: formData.get("name"),
      phone: formData.get("phone"),
      email: formData.get("email"),
      line1: formData.get("line1"),
      pincode: formData.get("pincode"),
      city: formData.get("city"),
      state: formData.get("state"),
    };
    var customer = {
      name: addressFields.name,
      phone: addressFields.phone,
      email: addressFields.email,
      address: addressFields.line1 + ", " + addressFields.city + ", " + addressFields.state + " - " + addressFields.pincode,
    };

    if (formData.get("saveAddress")) {
      localStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(addressFields));
    }

    var cart = getCart();
    var items = cart.map(function (item) { return { slug: item.slug, qty: item.qty }; });

    payBtn.disabled = true;

    fetch("/api/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: items, customer: customer }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("order-failed");
        return res.json();
      })
      .then(function (order) {
        var rzp = new Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          order_id: order.orderId,
          name: "Nilasaar",
          description: "Wild Honey & Coffee",
          prefill: {
            name: customer.name,
            email: customer.email || undefined,
            contact: customer.phone,
          },
          theme: { color: "#1e3a2f" },
          handler: function (response) {
            fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            })
              .then(function (res) { return res.json(); })
              .then(function (result) {
                payBtn.disabled = false;
                if (result.verified) {
                  saveCart([]);
                  showView("success");
                } else {
                  showCheckoutError("We couldn't verify that payment. Please contact us before retrying.");
                }
              })
              .catch(function () {
                payBtn.disabled = false;
                showCheckoutError("We couldn't confirm your payment. Please contact us.");
              });
          },
          modal: {
            ondismiss: function () {
              payBtn.disabled = false;
            },
          },
        });
        rzp.open();
      })
      .catch(function () {
        payBtn.disabled = false;
        showCheckoutError("Something went wrong starting checkout. Please try again.");
      });
  });

  function showCheckoutError(message) {
    checkoutError.textContent = message;
    checkoutError.hidden = false;
  }

  renderCart();
})();
