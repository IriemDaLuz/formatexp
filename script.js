// /script.js

// Claves de almacenamiento
const STORAGE_WAITLIST_KEY = "formatexp_waitlist";
const STORAGE_AUTH_KEY = "formatexp_auth";
const STORAGE_MATERIALS_KEY = "formatexp_materials";

// URL base de la API (local vs producción)
const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:4000/api"
    : "https://formatexp.onrender.com/api";

// Endpoint opcional para lista de espera (Formspree)
const WAITLIST_ENDPOINT = "https://formspree.io/f/mnnwazvr";

const body = document.body;
const page = body ? body.getAttribute("data-page") : "";

// Utilidades comunes
const yearSpan = document.getElementById("year");
if (yearSpan) yearSpan.textContent = new Date().getFullYear();

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
    if (target && target.tagName === "A" && nav.classList.contains("open")) {
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
  const pricingButtons = document.querySelectorAll(".pricing-card button[data-plan]");

  function clearMessages() {
    if (formError) formError.textContent = "";
    if (formSuccess) formSuccess.textContent = "";
  }

  function getSelectedPlan() {
    const checked = document.querySelector('input[name="plan"]:checked');
    return checked ? checked.value : "personal";
  }

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

      // 1) local
      setStoredJson(STORAGE_WAITLIST_KEY, payload);

      // 2) API (no rompe UX si falla)
      try {
        await fetch(`${API_BASE_URL}/waitlist`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, source: "landing" })
        });
      } catch (err) {
        console.error("Error enviando a API /waitlist:", err);
      }

      // 3) Formspree
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

          if (!response.ok) throw new Error("Error al enviar el formulario (Formspree)");
        } catch (error) {
          console.error(error);
          if (!formError.textContent) {
            formError.textContent =
              "Hemos registrado tu interés, pero hubo un problema al notificar por correo. Revisaremos este error.";
          }
        }
      }

      formSuccess.textContent = "¡Gracias! Te hemos añadido a la lista de espera de FormatExp.";
      form.reset();
    });

    const stored = getStoredJson(STORAGE_WAITLIST_KEY);
    if (stored) {
      if (stored.name && nameInput) nameInput.value = stored.name;
      if (stored.email && emailInput) emailInput.value = stored.email;
      if (stored.role && roleSelect) roleSelect.value = stored.role;
      if (stored.center && centerInput) centerInput.value = stored.center;
      if (stored.plan) {
        const radioToCheck = document.querySelector(`input[name="plan"][value="${stored.plan}"]`);
        if (radioToCheck) radioToCheck.checked = true;
      }
    }
  }

  faqButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const expanded = button.getAttribute("aria-expanded") === "true";
      const answer = button.nextElementSibling;
      button.setAttribute("aria-expanded", String(!expanded));
      if (answer) answer.hidden = expanded;
    });
  });

  pricingButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const plan = button.getAttribute("data-plan");
      let message = "Te hemos marcado para la beta de este plan.";

      switch (plan) {
        case "personal":
          message = "Has mostrado interés en el Plan Personal. Lo tendremos en cuenta al priorizar invitaciones.";
          break;
        case "pro":
          message = "Has mostrado interés en el Plan Pro. Priorizaremos tu acceso cuando el generador de presentaciones esté listo.";
          break;
        case "academia":
          message = "Has mostrado interés en el Plan Academia. Te contactaremos para coordinar una demo personalizada.";
          break;
      }

      if (document.getElementById("form-success")) {
        const formSuccess = document.getElementById("form-success");
        formSuccess.textContent = message;
        formSuccess.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      const radioToCheck = document.querySelector(`input[name="plan"][value="${plan}"]`);
      if (radioToCheck) radioToCheck.checked = true;
    });
  });
}

// ===================
// LOGIN
// ===================
if (page === "login") {
  const loginForm = document.getElementById("login-form");
  const loginEmailInput = document.getElementById("login-email");
  const loginPasswordInput = document.getElementById("login-password");
  const loginPlanSelect = document.getElementById("login-plan");
  const loginError = document.getElementById("login-error");

  const existingAuth = getStoredJson(STORAGE_AUTH_KEY);
  if (existingAuth && existingAuth.token && existingAuth.user?.email) {
    window.location.href = "./app.html";
  }

  const waitlistData = getStoredJson(STORAGE_WAITLIST_KEY);
  if (waitlistData?.email && loginEmailInput) loginEmailInput.value = waitlistData.email;
  if (waitlistData?.plan && loginPlanSelect) loginPlanSelect.value = waitlistData.plan;

  function showLoginError(message) {
    if (loginError) loginError.textContent = message;
  }

  async function loginViaApi(email, password) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    const wait
    = getStoredJson(STORAGE_WAITLIST_KEY) || {};
    const body = {
      name: (R.name || email.split("@")[0] || "Profesor FormatExp"),
      email,
      password,
      role: R.role || "otros",
      center: R.center || "",
      plan: planSelected || R.plan || "personal"
    };

    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
          if (err.status === 401 || err.status === 404) {
            data = await registerViaApi(emailValue, passwordValue, planSelected);
          } else {
            throw err;
          }
        }

        setStoredJson(STORAGE_AUTH_KEY, { token: data.token, user: data.user });

        const wl = getStoredJson(STORAGE_WAITLIST_KEY);
        if (wl) {
          wl.plan = planSelected || wl.plan || "personal";
          setStoredJson(STORAGE_WAITLIST_KEY, wl);
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
// APP / PANEL (IA REAL)
// ===================
if (page === "app") {
  const auth = getStoredJson(STORAGE_AUTH_KEY);

  // Si no tienes auth real aún, puedes comentar esto temporalmente:
  if (!auth || !auth.user || !auth.user.email) {
    window.location.href = "./login.html";
  } else {
    const currentUser = auth.user;

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
    const materialDifficultySelect = document.getElementById("material-difficulty");
    const materialSourceTextarea = document.getElementById("material-source");
    const materialQuestionsInput = document.getElementById("material-questions");
    const creditsEstimateSpan = document.getElementById("credits-estimate");
    const materialError = document.getElementById("material-error");
    const materialSuccess = document.getElementById("material-success");

    const generateBtn = document.getElementById("generate-btn");
    const generatedOutput = document.getElementById("generated-output");
    const generatedMeta = document.getElementById("generated-meta");
    const copyBtn = document.getElementById("copy-output-btn");
    const clearBtn = document.getElementById("clear-output-btn");
    const copySuccess = document.getElementById("copy-success");

    const historyEmpty = document.getElementById("history-empty");
    const historyList = document.getElementById("history-list");
    const historyBody = document.getElementById("history-body");

    // UI user
    if (appUserEmail) appUserEmail.textContent = currentUser.email || "";
    const planMap = { personal: "Plan Personal", pro: "Plan Pro", academia: "Plan Academia" };
    const planLabel = planMap[currentUser.plan] || "Plan Personal";
    if (appUserPlan) appUserPlan.textContent = planLabel;

    if (accountName) accountName.textContent = currentUser.name || "—";
    if (accountEmail) accountEmail.textContent = currentUser.email || "—";
    if (accountRole) accountRole.textContent = currentUser.role || "—";
    if (accountCenter) accountCenter.textContent = currentUser.center || "—";
    if (accountPlan) accountPlan.textContent = planLabel;

    // Credits
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

    let materials = [];

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
      if (creditsRemainingSpan) creditsRemainingSpan.textContent = String(remaining);
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
            const typeMap = { test: "Test", resumen: "Resumen", guia: "Guía", presentacion: "Presentación" };
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
      if (copySuccess) copySuccess.textContent = "";
    }

    function setLoading(isLoading) {
      if (!generateBtn) return;
      generateBtn.disabled = isLoading;
      generateBtn.textContent = isLoading ? "Generando..." : "Generar con IA";
    }

    function mapTypeForGenerate(type) {
      // Nuestro backend admite: test | resumen | guia
      // Presentación en demo -> guía (estructura + guion)
      if (type === "presentacion") return "guia";
      return type;
    }

    async function callGenerateApi({ type, inputText, questions, difficulty }) {
      const res = await fetch(`${API_BASE_URL}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, inputText, questions, difficulty })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data.error || "Error generando contenido.";
        throw new Error(msg);
      }

      return res.json();
    }

    if (copyBtn && generatedOutput) {
      copyBtn.addEventListener("click", async () => {
        clearMaterialMessages();
        const text = generatedOutput.value || "";
        if (!text.trim()) return;

        try {
          await navigator.clipboard.writeText(text);
          if (copySuccess) copySuccess.textContent = "Copiado al portapapeles ✅";
        } catch {
          if (copySuccess) copySuccess.textContent = "No se pudo copiar. Selecciona el texto y copia manualmente.";
        }
      });
    }

    if (clearBtn && generatedOutput) {
      clearBtn.addEventListener("click", () => {
        clearMaterialMessages();
        generatedOutput.value = "";
        if (generatedMeta) generatedMeta.textContent = "";
      });
    }

    if (materialForm) {
      materialForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearMaterialMessages();

        const title = materialTitleInput ? materialTitleInput.value.trim() : "";
        const uiType = materialTypeSelect ? materialTypeSelect.value : "test";
        const type = mapTypeForGenerate(uiType);
        const source = materialSourceTextarea ? materialSourceTextarea.value.trim() : "";
        const difficulty = materialDifficultySelect ? materialDifficultySelect.value : "medio";
        const questionsRaw = materialQuestionsInput ? Number(materialQuestionsInput.value || "0") : 0;
        const questions = Number.isFinite(questionsRaw) ? questionsRaw : 0;

        if (!title) {
          if (materialError) materialError.textContent = "Pon un título al material.";
          materialTitleInput?.focus();
          return;
        }

        if (!source || source.length < 50) {
          if (materialError) materialError.textContent = "Pega un texto un poco más largo (mínimo ~50 caracteres).";
          materialSourceTextarea?.focus();
          return;
        }

        const estimate = estimateCredits(uiType);
        const total = getTotalCreditsForPlan(currentUser.plan);
        const used = getUsedCredits();
        const remaining = Math.max(total - used, 0);

        if (estimate > remaining) {
          if (materialError) materialError.textContent = "No tienes suficientes créditos para esta generación.";
          return;
        }

        try {
          setLoading(true);

          // Llamada REAL a IA
          const data = await callGenerateApi({
            type,
            inputText: source,
            questions: uiType === "test" ? Math.max(3, Math.min(25, questions || 10)) : undefined,
            difficulty
          });

          const outputText = data.outputText || "";

          // Mostrar resultado
          if (generatedOutput) generatedOutput.value = outputText;
          if (generatedMeta) {
            const now = new Date();
            generatedMeta.textContent = `Generado: ${now.toLocaleString()} · Tipo: ${uiType} · Dificultad: ${difficulty}`;
          }

          // Guardar en historial local
          const newItem = {
            id: Date.now(),
            title,
            type: uiType,
            sourceLength: source.length,
            questions: uiType === "test" ? (questions || 10) : 0,
            createdAt: new Date().toISOString(),
            credits: estimate,
            status: "Generado",
            outputText
          };

          materials.push(newItem);
          saveMaterialsToStorage();
          renderHistory();
          updateCreditsUI();

          if (materialSuccess) materialSuccess.textContent = "¡Listo! Material generado y guardado en el historial ✅";

          // No reseteamos todo: suele ser útil mantener el texto pegado.
          // Si prefieres reset total, dímelo.
        } catch (err) {
          console.error(err);
          if (materialError) materialError.textContent = err.message || "Error generando contenido.";
        } finally {
          setLoading(false);
        }
      });
    }

    // Navegación hash
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
      showSection(getKeyFromHash());
    }

    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        const sectionKey = link.getAttribute("data-section");
        if (!sectionKey) return;
        showSection(sectionKey);
      });
    });

    window.addEventListener("hashchange", initSectionFromHash);

    document.querySelectorAll('[data-go="create"]').forEach((link) => {
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

    // Init
    loadMaterialsFromStorage();
    renderHistory();
    updateCreditsUI();
    initSectionFromHash();
  }
}
