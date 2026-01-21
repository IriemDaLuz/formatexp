// /script.js

// Claves de almacenamiento
const STORAGE_WAITLIST_KEY = "formatexp_waitlist";
const STORAGE_AUTH_KEY = "formatexp_auth";
const STORAGE_MATERIALS_KEY = "formatexp_materials";

// URL base de la API (local vs producción)
const isLocal =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "0.0.0.0";

const API_BASE_URL = isLocal
  ? "http://localhost:4000/api"
  : "https://formatexp.onrender.com/api";


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
  } catch (_) {}
}

// ===================
// AUTH HELPERS (NUEVO / REFORZADO)
// ===================
function getAuth() {
  const auth = getStoredJson(STORAGE_AUTH_KEY);
  if (!auth || !auth.token || !auth.user) return null;
  return auth;
}

function setAuth(authData) {
  if (!authData || !authData.token || !authData.user) return;
  setStoredJson(STORAGE_AUTH_KEY, { token: authData.token, user: authData.user });
}

function clearAuth() {
  try {
    localStorage.removeItem(STORAGE_AUTH_KEY);
  } catch (_) {}
}

function redirectToLogin() {
  window.location.href = "./login.html";
}

function requireAuthOrRedirect() {
  const auth = getAuth();
  if (!auth) {
    redirectToLogin();
    return null;
  }
  return auth;
}

// Fetch helper con timeout + parseo seguro
async function fetchJson(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg =
        (data && (data.error || data.message)) || `Error HTTP ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error("La petición tardó demasiado. Inténtalo de nuevo.");
    }
    if (String(err?.message || "").includes("Failed to fetch")) {
      throw new Error(
        "No se pudo conectar con la API. Revisa tu conexión o vuelve a intentarlo en unos segundos."
      );
    }
    throw err;
  } finally {
    clearTimeout(id);
  }
}

// Helper para endpoints protegidos (NUEVO)
async function authFetchJson(path, options = {}, timeoutMs = 15000) {
  const auth = getAuth();
  if (!auth || !auth.token) {
    clearAuth();
    redirectToLogin();
    throw new Error("Sesión no válida. Inicia sesión de nuevo.");
  }

  try {
    return await fetchJson(
      `${API_BASE_URL}${path}`,
      {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${auth.token}`
        }
      },
      timeoutMs
    );
  } catch (err) {
    // Si es 401, sesión caducada/invalidada → logout forzado
    if (err && (err.status === 401 || err.status === 403)) {
      clearAuth();
      redirectToLogin();
      throw new Error("Tu sesión ha caducado. Inicia sesión de nuevo.");
    }
    throw err;
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
  const existingAuth = getAuth();
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
      const emailValueRaw = emailInput ? emailInput.value.trim() : "";
      const emailValue = emailValueRaw.toLowerCase();
      const roleValue = roleSelect ? roleSelect.value : "";
      const centerValue = centerInput ? centerInput.value.trim() : "";
      const planValue = getSelectedPlan();
      const consentGiven = consentCheckbox ? consentCheckbox.checked : false;
      const honeypotValue = honeypotInput ? honeypotInput.value.trim() : "";

      if (honeypotValue !== "") return;

      if (!nameValue) {
        formError.textContent = "Por favor, indica tu nombre y apellidos.";
        nameInput?.focus();
        return;
      }

      if (!emailValue) {
        formError.textContent = "Por favor, introduce tu correo electrónico.";
        emailInput?.focus();
        return;
      }

      if (!isValidEmail(emailValue)) {
        formError.textContent = "El formato del correo no parece válido.";
        emailInput?.focus();
        return;
      }

      if (!roleValue) {
        formError.textContent = "Por favor, selecciona tu perfil docente.";
        roleSelect?.focus();
        return;
      }

      if (!consentGiven) {
        formError.textContent =
          "Necesitamos tu consentimiento para poder contactarte sobre FormatExp.";
        consentCheckbox?.focus();
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

      // 1) Guardar en localStorage
      setStoredJson(STORAGE_WAITLIST_KEY, payload);

      // 2) Enviar a tu API real (no rompemos UX si falla)
      try {
        if (typeof API_BASE_URL === "string" && API_BASE_URL) {
          await fetchJson(`${API_BASE_URL}/waitlist`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, source: "landing" })
          }).catch(() => {});
        }
      } catch (err) {
        console.error("Error enviando a API /waitlist:", err);
      }

      // 3) Enviar a Formspree (copia/notificación)
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

          if (!response.ok) throw new Error("Formspree error");
        } catch (error) {
          console.error(error);
          if (formError.textContent === "") {
            formError.textContent =
              "Te hemos registrado, pero hubo un problema al notificar por correo. Seguimos igualmente.";
          }
        }
      }

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
      if (answer) answer.hidden = expanded;
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

  const existingAuth = getAuth();
  if (existingAuth && existingAuth.token && existingAuth.user?.email) {
    window.location.href = "./app.html";
  }

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
    return fetchJson(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
  }

  async function registerViaApi(email, password, planSelected) {
    const waitlist = getStoredJson(STORAGE_WAITLIST_KEY) || {};

    const body = {
      name: waitlist.name || email.split("@")[0] || "Profesor FormatExp",
      email,
      password,
      role: waitlist.role || "otros",
      center: waitlist.center || "",
      plan: planSelected || waitlist.plan || "personal"
    };

    return fetchJson(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (loginError) loginError.textContent = "";

      const emailRaw = loginEmailInput ? loginEmailInput.value.trim() : "";
      const emailValue = emailRaw.toLowerCase();
      const passwordValue = loginPasswordInput ? loginPasswordInput.value : "";
      const planSelected = loginPlanSelect ? loginPlanSelect.value : "";

      if (!emailValue) {
        showLoginError("Introduce tu correo electrónico.");
        loginEmailInput?.focus();
        return;
      }

      if (!isValidEmail(emailValue)) {
        showLoginError("El formato del correo no parece válido.");
        loginEmailInput?.focus();
        return;
      }

      if (!passwordValue || passwordValue.length < 6) {
        showLoginError("Introduce una contraseña de al menos 6 caracteres.");
        loginPasswordInput?.focus();
        return;
      }

      try {
        let data;

        try {
          data = await loginViaApi(emailValue, passwordValue);
        } catch (err) {
          // MVP: si no existe usuario o credenciales no válidas, intentamos registro
          if (err.status === 401 || err.status === 404) {
            data = await registerViaApi(emailValue, passwordValue, planSelected);
          } else {
            throw err;
          }
        }

        // Guardar sesión consistente: { token, user }
        setAuth({ token: data.token, user: data.user });

        if (waitlistData) {
          waitlistData.plan = planSelected || waitlistData.plan || "personal";
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
  // Guard + sesión
  let auth = requireAuthOrRedirect();
  if (!auth) {
    // requireAuthOrRedirect ya redirige
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
    const materialDifficultySelect = document.getElementById(
      "material-difficulty"
    );
    const materialSourceTextarea = document.getElementById("material-source");
    const materialQuestionsInput = document.getElementById("material-questions");
    const creditsEstimateSpan = document.getElementById("credits-estimate");
    const materialError = document.getElementById("material-error");
    const materialSuccess = document.getElementById("material-success");

    const historyEmpty = document.getElementById("history-empty");
    const historyList = document.getElementById("history-list");
    const historyBody = document.getElementById("history-body");

    const generatedOutput = document.getElementById("generated-output");
    const generatedMeta = document.getElementById("generated-meta");
    const generateBtn = document.getElementById("generate-btn");
    const copyOutputBtn = document.getElementById("copy-output-btn");
    const clearOutputBtn = document.getElementById("clear-output-btn");
    const copySuccess = document.getElementById("copy-success");

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
            tdStatus.textContent = item.status || "Generado";

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
      try {
        const data = await authFetchJson(
          "/materials",
          { method: "GET" },
          15000
        );

        const remote = Array.isArray(data)
          ? data
          : Array.isArray(data.materials)
          ? data.materials
          : [];

        if (remote.length) {
          materials = remote.map((m) => ({
            id: m.id || m._id || Date.now(),
            title: m.title,
            type: m.type,
            sourceLength: m.sourceLength || 0,
            questions: m.questions || 0,
            createdAt: m.createdAt || new Date().toISOString(),
            credits: m.estimatedCredits || m.credits || 0,
            status: m.status || "Generado",
            outputText: m.outputText || ""
          }));
          saveMaterialsToStorage();
          renderHistory();
          updateCreditsUI();
        }
      } catch (err) {
        console.warn("No se pudieron cargar materiales desde API:", err?.message);
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

    function mapTypeForGenerate(uiType) {
      if (uiType === "presentacion") return "guia";
      return uiType;
    }

    // IMPORTANTE: ahora /generate también va con Authorization (protegido opcionalmente)
    async function callGenerateApi({ type, inputText, questions, difficulty }) {
      return authFetchJson(
        "/generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, inputText, questions, difficulty })
        },
        30000
      );
    }

    function setLoading(isLoading) {
      if (generateBtn) {
        generateBtn.disabled = isLoading;
        generateBtn.textContent = isLoading ? "Generando…" : "Generar con IA";
      }
      if (materialForm) {
        materialForm
          .querySelectorAll("input,select,textarea,button")
          .forEach((el) => {
            if (el.id === "logout-btn") return;
            if (el === generateBtn) return;
            el.disabled = isLoading;
          });
      }
    }

    // Acciones del resultado
    if (copyOutputBtn) {
      copyOutputBtn.addEventListener("click", async () => {
        if (!generatedOutput) return;
        const text = (generatedOutput.value || "").trim();
        if (!text) return;
        try {
          await navigator.clipboard.writeText(text);
          if (copySuccess) copySuccess.textContent = "Copiado al portapapeles.";
        } catch (_) {
          if (copySuccess)
            copySuccess.textContent =
              "No se pudo copiar. Copia manualmente el texto.";
        }
      });
    }

    if (clearOutputBtn) {
      clearOutputBtn.addEventListener("click", () => {
        if (generatedOutput) generatedOutput.value = "";
        if (generatedMeta) generatedMeta.textContent = "";
        if (copySuccess) copySuccess.textContent = "";
      });
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
      if (copySuccess) copySuccess.textContent = "";
    }

    if (materialForm) {
      materialForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearMaterialMessages();

        // refrescar auth por si cambió (p.ej. expiración, etc.)
        auth = requireAuthOrRedirect();
        if (!auth) return;

        const title = materialTitleInput ? materialTitleInput.value.trim() : "";
        const uiType = materialTypeSelect ? materialTypeSelect.value : "test";
        const type = mapTypeForGenerate(uiType);
        const source = materialSourceTextarea
          ? materialSourceTextarea.value.trim()
          : "";
        const difficulty = materialDifficultySelect
          ? materialDifficultySelect.value
          : "medio";
        const questionsRaw = materialQuestionsInput
          ? Number(materialQuestionsInput.value || "0")
          : 0;
        const questions = Number.isFinite(questionsRaw) ? questionsRaw : 0;

        if (!title) {
          if (materialError)
            materialError.textContent = "Pon un título al material.";
          materialTitleInput?.focus();
          return;
        }

        if (!source || source.length < 50) {
          if (materialError)
            materialError.textContent =
              "Pega un texto un poco más largo (mínimo ~50 caracteres).";
          materialSourceTextarea?.focus();
          return;
        }

        const estimate = estimateCredits(uiType);
        const total = getTotalCreditsForPlan(currentUser.plan);
        const used = getUsedCredits();
        const remaining = Math.max(total - used, 0);

        if (estimate > remaining) {
          if (materialError)
            materialError.textContent =
              "No tienes suficientes créditos para esta generación.";
          return;
        }

        try {
          setLoading(true);

          const data = await callGenerateApi({
            type,
            inputText: source,
            questions: uiType === "test" ? questions || 10 : undefined,
            difficulty
          });

          const outputText = data?.outputText || data?.result || "(sin salida)";

          if (generatedOutput) generatedOutput.value = outputText;

          if (generatedMeta) {
            const now = new Date();
            generatedMeta.textContent = `Generado: ${now.toLocaleString()} · Tipo: ${uiType} · Dificultad: ${difficulty}`;
          }

          const newItem = {
            id: Date.now(),
            title,
            type: uiType,
            sourceLength: source.length,
            questions: uiType === "test" ? questions || 10 : 0,
            createdAt: new Date().toISOString(),
            credits: estimate,
            status: "Generado",
            outputText
          };

          materials.push(newItem);
          saveMaterialsToStorage();
          renderHistory();
          updateCreditsUI();

          // Guardado remoto protegido
          try {
            await authFetchJson("/materials", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title,
                type: uiType,
                source,
                difficulty,
                questions: uiType === "test" ? questions || 10 : undefined,
                estimatedCredits: estimate,
                outputText
              })
            }).catch(() => {});
          } catch (_) {}

          if (materialSuccess) {
            materialSuccess.textContent =
              uiType === "presentacion"
                ? "Generado (usando guía como base)."
                : "Generado correctamente. Revisa el resultado.";
          }
        } catch (err) {
          console.error(err);
          if (materialError)
            materialError.textContent = err.message || "No se pudo generar.";
        } finally {
          setLoading(false);
        }
      });
    }

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

    const goCreateLinks = document.querySelectorAll('[data-go="create"]');
    goCreateLinks.forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        showSection("create");
      });
    });

    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        clearAuth();
        window.location.href = "./login.html";
      });
    }

    function initPanel() {
      loadMaterialsFromStorage();
      renderHistory();
      updateCreditsUI();
      initSectionFromHash();
      syncMaterialsFromApi();
    }

    initPanel();
  }
}
