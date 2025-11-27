// Claves de almacenamiento
const STORAGE_WAITLIST_KEY = "formatexp_waitlist";
const STORAGE_AUTH_KEY = "formatexp_auth";
const STORAGE_MATERIALS_KEY = "formatexp_materials";

// URL base de la API (local vs producción)
const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:4000/api"
    : "https://formatexp.onrender.com"; 
// Endpoint opcional para lista de espera (Formspree)
const WAITLIST_ENDPOINT = "https://formspree.io/f/mnnwazvr";

const body = document.body;
const page = body ? body.getAttribute("data-page") : "";

// Utilidades comunes
const yearSpan = document.getElementById("year");
if (yearSpan) {
  yearSpan.textContent = new Date().getFullYear();
}

// Menú móvil
const navToggle = document.querySelector(".nav-toggle");
const nav = document.getElementById("primary-nav");

if (navToggle && nav) {
  navToggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.addEventListener("click", (event) => {
    const target = event.target;
    if (target.tagName === "A" && nav.classList.contains("open")) {
      nav.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getStoredJson(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function setStoredJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {
    // ignorar
  }
}

// ===================
// LANDING
// ===================
if (page === "landing") {
  const form = document.getElementById("waitlist-form");
  const nameInput = document.getElementById("name");
  const emailInput = document.getElementById("email");
  const roleSelect = document.getElementById("role");
  const centerInput = document.getElementById("center");
  const consentCheckbox = document.getElementById("consent");
  const honeypotInput = document.getElementById("website");
  const formError = document.getElementById("form-error");
  const formSuccess = document.getElementById("form-success");
  const faqButtons = document.querySelectorAll(".faq-question");
  const pricingButtons = document.querySelectorAll(
    ".pricing-card button[data-plan]"
  );

  function clearMessages() {
    if (formError) formError.textContent = "";
    if (formSuccess) formSuccess.textContent = "";
  }

  function getSelectedPlan() {
    const checked = document.querySelector('input[name="plan"]:checked');
    return checked ? checked.value : "personal";
  }

  // Si ya está logueado, cambiar CTA "Entrar"
  const existingAuth = getStoredJson(STORAGE_AUTH_KEY);
  if (existingAuth && existingAuth.token && existingAuth.user?.email) {
    const loginLink = document.querySelector('a[href="./login.html"]');
    if (loginLink) {
      loginLink.textContent = "Ir al panel";
      loginLink.setAttribute("href", "./app.html");
    }
  }

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearMessages();

      const nameValue = nameInput ? nameInput.value.trim() : "";
      const emailValue = emailInput ? emailInput.value.trim() : "";
      const roleValue = roleSelect ? roleSelect.value : "";
      const centerValue = centerInput ? centerInput.value.trim() : "";
      const planValue = getSelectedPlan();
      const consentGiven = consentCheckbox ? consentCheckbox.checked : false;
      const honeypotValue = honeypotInput ? honeypotInput.value.trim() : "";

      if (honeypotValue !== "") {
        // Probable bot
        return;
      }

      if (!nameValue) {
        formError.textContent = "Por favor, indica tu nombre y apellidos.";
        if (nameInput) nameInput.focus();
        return;
      }

      if (!emailValue) {
        formError.textContent = "Por favor, introduce tu correo electrónico.";
        if (emailInput) emailInput.focus();
        return;
      }

      if (!isValidEmail(emailValue)) {
        formError.textContent = "El formato del correo no parece válido.";
        if (emailInput) emailInput.focus();
        return;
      }

      if (!roleValue) {
        formError.textContent = "Por favor, selecciona tu perfil docente.";
        if (roleSelect) roleSelect.focus();
        return;
      }

      if (!consentGiven) {
        formError.textContent =
          "Necesitamos tu consentimiento para poder contactarte sobre FormatExp.";
        if (consentCheckbox) consentCheckbox.focus();
        return;
      }

      const payload = {
        name: nameValue,
        email: emailValue,
        role: roleValue,
        center: centerValue,
        plan: planValue,
        consent: true,
        date: new Date().toISOString()
      };

      // 1) Guardar en localStorage (para login y app simulados)
      setStoredJson(STORAGE_WAITLIST_KEY, payload);

      // 2) Enviar a tu API real (MongoDB Atlas)
      try {
        if (typeof API_BASE_URL === "string" && API_BASE_URL) {
          await fetch(`${API_BASE_URL}/waitlist`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              ...payload,
              source: "landing"
            })
          });
        }
      } catch (err) {
        console.error("Error enviando a API /waitlist:", err);
        // No rompemos la UX si la API falla
      }

      // 3) Enviar a Formspree (para notificación/copia)
      if (WAITLIST_ENDPOINT) {
        try {
          const response = await fetch(WAITLIST_ENDPOINT, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json"
            },
            body: JSON.stringify({
              email: payload.email,
              name: payload.name,
              role: payload.role,
              center: payload.center,
              plan: payload.plan,
              consent: payload.consent,
              source: "formatexp-landing"
            })
          });

          if (!response.ok) {
            throw new Error("Error al enviar el formulario (Formspree)");
          }
        } catch (error) {
          console.error(error);
          if (formError.textContent === "") {
            formError.textContent =
              "Hemos registrado tu interés, pero hubo un problema al notificar por correo. Revisaremos este error.";
          }
        }
      }

      // 4) Mensaje de éxito al usuario
      formSuccess.textContent =
        "¡Gracias! Te hemos añadido a la lista de espera de FormatExp.";
      form.reset();
    });

    // Autocompletar desde localStorage si ya se registró antes
    const stored = getStoredJson(STORAGE_WAITLIST_KEY);
    if (stored) {
      if (stored.name && nameInput) nameInput.value = stored.name;
      if (stored.email && emailInput) emailInput.value = stored.email;
      if (stored.role && roleSelect) roleSelect.value = stored.role;
      if (stored.center && centerInput) centerInput.value = stored.center;
      if (stored.plan) {
        const radioToCheck = document.querySelector(
          `input[name="plan"][value="${stored.plan}"]`
        );
        if (radioToCheck) radioToCheck.checked = true;
      }
    }
  }

  // FAQ acordeones
  faqButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const expanded = button.getAttribute("aria-expanded") === "true";
      const answer = button.nextElementSibling;
      button.setAttribute("aria-expanded", String(!expanded));
      if (answer) {
        answer.hidden = expanded;
      }
    });
  });

  // CTA desde pricing -> mensaje en el form
  pricingButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const plan = button.getAttribute("data-plan");
      let message = "Te hemos marcado para la beta de este plan.";

      switch (plan) {
        case "personal":
          message =
            "Has mostrado interés en el Plan Personal. Lo tendremos en cuenta al priorizar invitaciones.";
          break;
        case "pro":
          message =
            "Has mostrado interés en el Plan Pro. Priorizaremos tu acceso cuando el generador de presentaciones esté listo.";
          break;
        case "academia":
          message =
            "Has mostrado interés en el Plan Academia. Te contactaremos para coordinar una demo personalizada.";
          break;
        default:
          break;
      }

      if (formSuccess) {
        formSuccess.textContent = message;
        formSuccess.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      // Seleccionar automáticamente el plan en el formulario
      const radioToCheck = document.querySelector(
        `input[name="plan"][value="${plan}"]`
      );
      if (radioToCheck) radioToCheck.checked = true;
    });
  });
}

// ===================
// LOGIN (real contra API)
// ===================
if (page === "login") {
  const loginForm = document.getElementById("login-form");
  const loginEmailInput = document.getElementById("login-email");
  const loginPasswordInput = document.getElementById("login-password");
  const loginPlanSelect = document.getElementById("login-plan");
  const loginError = document.getElementById("login-error");

  // Si ya hay sesión, mandar directo al panel
  const existingAuth = getStoredJson(STORAGE_AUTH_KEY);
  if (existingAuth && existingAuth.token && existingAuth.user?.email) {
    window.location.href = "./app.html";
  }

  // Pre-rellenar email y plan con el de la landing si existe
  const waitlistData = getStoredJson(STORAGE_WAITLIST_KEY);
  if (waitlistData && waitlistData.email && loginEmailInput) {
    loginEmailInput.value = waitlistData.email;
  }
  if (waitlistData && waitlistData.plan && loginPlanSelect) {
    loginPlanSelect.value = waitlistData.plan;
  }

  function showLoginError(message) {
    if (loginError) loginError.textContent = message;
  }

  async function loginViaApi(email, password) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = data.error || "No se ha podido iniciar sesión.";
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }

    return res.json();
  }

  async function registerViaApi(email, password, planSelected) {
    const waitlist = getStoredJson(STORAGE_WAITLIST_KEY) || {};

    const body = {
      name:
        waitlist.name ||
        email.split("@")[0] ||
        "Profesor FormatExp",
      email,
      password,
      role: waitlist.role || "otros",
      center: waitlist.center || "",
      plan: planSelected || waitlist.plan || "personal"
    };

    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = data.error || "No se ha podido crear tu cuenta.";
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }

    return res.json();
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (loginError) loginError.textContent = "";

      const emailValue = loginEmailInput ? loginEmailInput.value.trim() : "";
      const passwordValue = loginPasswordInput
        ? loginPasswordInput.value
        : "";
      const planSelected = loginPlanSelect ? loginPlanSelect.value : "";

      if (!emailValue) {
        showLoginError("Introduce tu correo electrónico.");
        if (loginEmailInput) loginEmailInput.focus();
        return;
      }

      if (!isValidEmail(emailValue)) {
        showLoginError("El formato del correo no parece válido.");
        if (loginEmailInput) loginEmailInput.focus();
        return;
      }

      if (!passwordValue || passwordValue.length < 6) {
        showLoginError(
          "Introduce una contraseña de al menos 6 caracteres."
        );
        if (loginPasswordInput) loginPasswordInput.focus();
        return;
      }

      try {
        let data;

        // 1) Intentar login primero
        try {
          data = await loginViaApi(emailValue, passwordValue);
        } catch (err) {
          // Si es 401/404, intentamos registro automático (primer acceso)
          if (err.status === 401 || err.status === 404) {
            data = await registerViaApi(
              emailValue,
              passwordValue,
              planSelected
            );
          } else {
            throw err;
          }
        }

        // data: { token, user }
        const authData = {
          token: data.token,
          user: data.user
        };

        setStoredJson(STORAGE_AUTH_KEY, authData);

        // también actualizamos waitlist local con plan, por coherencia
        if (waitlistData) {
          waitlistData.plan =
            planSelected || waitlistData.plan || "personal";
          setStoredJson(STORAGE_WAITLIST_KEY, waitlistData);
        }

        window.location.href = "./app.html";
      } catch (err) {
        console.error(err);
        showLoginError(err.message || "No se ha podido autenticar tu cuenta.");
      }
    });
  }
}

// ===================
// APP / PANEL
// ===================
if (page === "app") {
  let auth = getStoredJson(STORAGE_AUTH_KEY);

  if (!auth || !auth.token || !auth.user || !auth.user.email) {
    window.location.href = "./login.html";
  } else {
    const currentUser = auth.user;
    let materials = []; // cache local en memoria

    const logoutBtn = document.getElementById("logout-btn");
    const appUserEmail = document.getElementById("app-user-email");
    const appUserPlan = document.getElementById("app-user-plan");
    const accountName = document.getElementById("account-name");
    const accountEmail = document.getElementById("account-email");
    const accountRole = document.getElementById("account-role");
    const accountCenter = document.getElementById("account-center");
    const accountPlan = document.getElementById("account-plan");
    const navLinks = document.querySelectorAll(".app-nav-link");
    const sections = {
      create: document.getElementById("section-create"),
      history: document.getElementById("section-history"),
      credits: document.getElementById("section-credits"),
      account: document.getElementById("section-account")
    };

    const creditsRemainingSpan = document.getElementById("credits-remaining");
    const creditsTotalSpan = document.getElementById("credits-total");

    const materialForm = document.getElementById("material-form");
    const materialTitleInput = document.getElementById("material-title");
    const materialTypeSelect = document.getElementById("material-type");
    const materialSourceTextarea = document.getElementById("material-source");
    const materialQuestionsInput = document.getElementById("material-questions");
    const creditsEstimateSpan = document.getElementById("credits-estimate");
    const materialError = document.getElementById("material-error");
    const materialSuccess = document.getElementById("material-success");

    const historyEmpty = document.getElementById("history-empty");
    const historyList = document.getElementById("history-list");
    const historyBody = document.getElementById("history-body");

    // Rellenar info de usuario/cuenta
    if (appUserEmail) appUserEmail.textContent = currentUser.email || "";
    const planMap = {
      personal: "Plan Personal",
      pro: "Plan Pro",
      academia: "Plan Academia"
    };
    const planLabel = planMap[currentUser.plan] || "Plan Personal";
    if (appUserPlan) appUserPlan.textContent = planLabel;

    if (accountName) accountName.textContent = currentUser.name || "—";
    if (accountEmail) accountEmail.textContent = currentUser.email || "—";
    if (accountRole) accountRole.textContent = currentUser.role || "—";
    if (accountCenter) accountCenter.textContent = currentUser.center || "—";
    if (accountPlan) accountPlan.textContent = planLabel;

    // Créditos por plan
    function getTotalCreditsForPlan(plan) {
      switch (plan) {
        case "pro":
          return 500;
        case "academia":
          return 1000;
        case "personal":
        default:
          return 100;
      }
    }

    // ---- Gestión de materiales (cache + API + localStorage) ----
    function loadMaterialsFromStorage() {
      const arr = getStoredJson(STORAGE_MATERIALS_KEY);
      materials = Array.isArray(arr) ? arr : [];
    }

    function saveMaterialsToStorage() {
      setStoredJson(STORAGE_MATERIALS_KEY, materials);
    }

    function getUsedCredits() {
      return materials.reduce((acc, item) => acc + (item.credits || 0), 0);
    }

    function updateCreditsUI() {
      const total = getTotalCreditsForPlan(currentUser.plan);
      const used = getUsedCredits();
      const remaining = Math.max(total - used, 0);

      if (creditsTotalSpan) creditsTotalSpan.textContent = String(total);
      if (creditsRemainingSpan)
        creditsRemainingSpan.textContent = String(remaining);
    }

    function renderHistory() {
      if (!materials.length) {
        if (historyEmpty) historyEmpty.hidden = false;
        if (historyList) historyList.hidden = true;
        return;
      }

      if (historyEmpty) historyEmpty.hidden = true;
      if (historyList) historyList.hidden = false;

      if (historyBody) {
        historyBody.innerHTML = "";
        materials
          .slice()
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .forEach((item) => {
            const tr = document.createElement("tr");

            const tdTitle = document.createElement("td");
            tdTitle.textContent = item.title || "—";

            const tdType = document.createElement("td");
            const typeMap = {
              test: "Test",
              resumen: "Resumen",
              guia: "Guía",
              presentacion: "Presentación"
            };
            tdType.textContent = typeMap[item.type] || item.type || "—";

            const tdDate = document.createElement("td");
            const date = item.createdAt ? new Date(item.createdAt) : null;
            tdDate.textContent = date ? date.toLocaleString() : "—";

            const tdCredits = document.createElement("td");
            tdCredits.textContent = item.credits ? `${item.credits}` : "—";

            const tdStatus = document.createElement("td");
            tdStatus.textContent = item.status || "Generado (simulado)";

            tr.appendChild(tdTitle);
            tr.appendChild(tdType);
            tr.appendChild(tdDate);
            tr.appendChild(tdCredits);
            tr.appendChild(tdStatus);

            historyBody.appendChild(tr);
          });
      }
    }

    async function syncMaterialsFromApi() {
      if (!API_BASE_URL || !auth.token) return;

      try {
        const res = await fetch(`${API_BASE_URL}/materials`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${auth.token}`
          }
        });

        if (!res.ok) {
          console.warn("No se pudieron cargar materiales desde API.");
          return;
        }

        const data = await res.json().catch(() => []);
        // asumimos formato { materials: [...] } o directamente [...]
        const remote = Array.isArray(data)
          ? data
          : Array.isArray(data.materials)
          ? data.materials
          : [];

        if (remote.length) {
          // opcional: podríamos mergear, por ahora sobreescribimos
          materials = remote.map((m) => ({
            id: m.id || m._id || Date.now(),
            title: m.title,
            type: m.type,
            sourceLength: m.sourceLength || 0,
            questions: m.questions || 0,
            createdAt: m.createdAt || new Date().toISOString(),
            credits: m.estimatedCredits || m.credits || 0,
            status: m.status || "Generado"
          }));
          saveMaterialsToStorage();
          renderHistory();
          updateCreditsUI();
        }
      } catch (err) {
        console.error("Error sincronizando materiales desde API:", err);
      }
    }

    function estimateCredits(type) {
      switch (type) {
        case "test":
          return 5;
        case "resumen":
          return 3;
        case "guia":
          return 4;
        case "presentacion":
          return 8;
        default:
          return 5;
      }
    }

    if (materialTypeSelect && creditsEstimateSpan) {
      const updateEstimate = () => {
        const type = materialTypeSelect.value || "test";
        creditsEstimateSpan.textContent = String(estimateCredits(type));
      };
      materialTypeSelect.addEventListener("change", updateEstimate);
      updateEstimate();
    }

    function clearMaterialMessages() {
      if (materialError) materialError.textContent = "";
      if (materialSuccess) materialSuccess.textContent = "";
    }

    if (materialForm) {
      materialForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearMaterialMessages();

        const title = materialTitleInput ? materialTitleInput.value.trim() : "";
        const type = materialTypeSelect ? materialTypeSelect.value : "test";
        const source = materialSourceTextarea
          ? materialSourceTextarea.value.trim()
          : "";
        const questions = materialQuestionsInput
          ? Number(materialQuestionsInput.value || "0")
          : 0;

        if (!title) {
          if (materialError)
            materialError.textContent =
              "Pon un título al material para poder guardarlo.";
          if (materialTitleInput) materialTitleInput.focus();
          return;
        }

        const estimate = estimateCredits(type);
        const total = getTotalCreditsForPlan(currentUser.plan);
        const used = getUsedCredits();
        const remaining = Math.max(total - used, 0);

        if (estimate > remaining) {
          if (materialError)
            materialError.textContent =
              "No tienes suficientes créditos estimados para esta generación. Imagina aquí un CTA a comprar más créditos.";
          return;
        }

        // Item local
        const newItem = {
          id: Date.now(),
          title,
          type,
          sourceLength: source.length,
          questions: isNaN(questions) ? 0 : questions,
          createdAt: new Date().toISOString(),
          credits: estimate,
          status: "Generado (simulado)"
        };

        // Intentar guardar también en la API
        try {
          if (API_BASE_URL && auth.token) {
            const res = await fetch(`${API_BASE_URL}/materials`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${auth.token}`
              },
              body: JSON.stringify({
                title,
                type,
                source,
                questions: isNaN(questions) ? 0 : questions,
                estimatedCredits: estimate
              })
            });

            if (res.ok) {
              const data = await res.json().catch(() => ({}));
              const m = data.material || data;
              if (m) {
                newItem.id = m.id || m._id || newItem.id;
                newItem.status = m.status || "Generado";
              }
            } else {
              console.warn("No se pudo guardar el material en la API.");
            }
          }
        } catch (err) {
          console.error("Error guardando material en API:", err);
        }

        materials.push(newItem);
        saveMaterialsToStorage();
        renderHistory();
        updateCreditsUI();

        if (materialSuccess) {
          materialSuccess.textContent =
            "Material generado (simulado) y añadido a tu historial.";
        }
        materialForm.reset();

        if (materialTypeSelect && creditsEstimateSpan) {
          const defaultEstimate = estimateCredits(
            materialTypeSelect.value || "test"
          );
          creditsEstimateSpan.textContent = String(defaultEstimate);
        }
      });
    }

    // Navegación con hash (#/create, #/history, etc.)
    function showSection(key) {
      Object.keys(sections).forEach((k) => {
        const section = sections[k];
        if (!section) return;
        if (k === key) section.classList.add("is-visible");
        else section.classList.remove("is-visible");
      });

      navLinks.forEach((link) => {
        const sectionKey = link.getAttribute("data-section");
        if (sectionKey === key) link.classList.add("is-active");
        else link.classList.remove("is-active");
      });

      // Actualizar hash
      window.location.hash = `#/${key}`;
    }

    function getKeyFromHash() {
      const hash = window.location.hash || "";
      if (hash.startsWith("#/")) {
        const key = hash.slice(2);
        if (sections[key]) return key;
      }
      return "create";
    }

    function initSectionFromHash() {
      const key = getKeyFromHash();
      showSection(key);
    }

    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        const sectionKey = link.getAttribute("data-section");
        if (!sectionKey) return;
        showSection(sectionKey);
      });
    });

    window.addEventListener("hashchange", initSectionFromHash);

    // Enlace "crear" desde historial vacío
    const goCreateLinks = document.querySelectorAll('[data-go="create"]');
    goCreateLinks.forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        showSection("create");
      });
    });

    // Logout
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        try {
          localStorage.removeItem(STORAGE_AUTH_KEY);
        } catch (_) {}
        window.location.href = "./login.html";
      });
    }

    // Inicializar panel
    function initPanel() {
      // 1) Cargar lo que haya en localStorage para no mostrar vacío
      loadMaterialsFromStorage();
      renderHistory();
      updateCreditsUI();
      initSectionFromHash();

      // 2) Intentar sincronizar con API (sobreescribe si hay datos)
      syncMaterialsFromApi();
    }

    initPanel();
  }
}
