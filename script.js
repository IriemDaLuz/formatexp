
const WAITLIST_ENDPOINT = "https://formspree.io/f/mnnwazvr";

const body = document.body;
const page = body ? body.getAttribute("data-page") : "";

// Utilidades comunes
const yearSpan = document.getElementById("year");
if (yearSpan) {
  yearSpan.textContent = new Date().getFullYear();
}

// Menú móvil común
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

// -------------------------
// LANDING: lista de espera
// -------------------------
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
        // Probable bot, no hacemos nada
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

      // Guardar en localStorage (para login y app simulados)
      try {
        localStorage.setItem("formatexp_waitlist", JSON.stringify(payload));
      } catch (_) {
        // ignorar errores de almacenamiento
      }

      // Sin backend real: modo simulado
      if (!WAITLIST_ENDPOINT) {
        formSuccess.textContent =
          "¡Gracias! Te hemos añadido a la lista de espera de FormatExp. Podrás acceder al panel desde este navegador.";
        form.reset();
        return;
      }

      // Con backend real
      // Con backend real (ejemplo Formspree)
    try {
    const response = await fetch(WAITLIST_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
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
        throw new Error("Error al enviar el formulario");
    }

    formSuccess.textContent =
        "¡Gracias! Te hemos añadido a la lista de espera de FormatExp.";
    form.reset();
    } catch (error) {
    console.error(error);
    formError.textContent =
        "Ha ocurrido un problema al enviar tus datos. Inténtalo de nuevo en unos minutos.";
    }


    // Autocompletar desde localStorage si ya se registró antes
    try {
      const stored = localStorage.getItem("formatexp_waitlist");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.name && nameInput) nameInput.value = parsed.name;
        if (parsed.email && emailInput) emailInput.value = parsed.email;
        if (parsed.role && roleSelect) roleSelect.value = parsed.role;
        if (parsed.center && centerInput) centerInput.value = parsed.center;
        if (parsed.plan) {
          const radioToCheck = document.querySelector(
            `input[name="plan"][value="${parsed.plan}"]`
          );
          if (radioToCheck) radioToCheck.checked = true;
        }
      }
    } catch (_) {
      // ignorar
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
    });
  });
}

// -------------------------
// LOGIN
// -------------------------
if (page === "login") {
  const loginForm = document.getElementById("login-form");
  const loginEmailInput = document.getElementById("login-email");
  const loginPlanSelect = document.getElementById("login-plan");
  const loginError = document.getElementById("login-error");

  function showLoginError(message) {
    if (loginError) {
      loginError.textContent = message;
    }
  }

  if (loginForm) {
    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (loginError) loginError.textContent = "";

      const emailValue = loginEmailInput ? loginEmailInput.value.trim() : "";
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

      let stored = null;
      try {
        const raw = localStorage.getItem("formatexp_waitlist");
        if (raw) stored = JSON.parse(raw);
      } catch (_) {
        // ignorar
      }

      if (!stored || !stored.email) {
        showLoginError(
          "No encontramos tu registro en este navegador. Apúntate primero en la lista de espera."
        );
        return;
      }

      if (stored.email.toLowerCase() !== emailValue.toLowerCase()) {
        showLoginError(
          "El correo no coincide con el que usaste al registrarte en esta beta desde este navegador."
        );
        return;
      }

      // Actualizar plan si ha elegido uno diferente
      if (planSelected) {
        stored.plan = planSelected;
        try {
          localStorage.setItem("formatexp_waitlist", JSON.stringify(stored));
        } catch (_) {}
      }

      const authData = {
        email: stored.email,
        name: stored.name || "",
        role: stored.role || "",
        center: stored.center || "",
        plan: stored.plan || "personal",
        loggedIn: true,
        date: new Date().toISOString()
      };

      try {
        localStorage.setItem("formatexp_auth", JSON.stringify(authData));
      } catch (_) {
        // ignorar
      }

      window.location.href = "./app.html";
    });
  }
}

// -------------------------
// APP / PANEL
// -------------------------
if (page === "app") {
  let auth = null;
  try {
    const raw = localStorage.getItem("formatexp_auth");
    if (raw) auth = JSON.parse(raw);
  } catch (_) {
    auth = null;
  }

  if (!auth || !auth.loggedIn || !auth.email) {
    window.location.href = "./login.html";
  } else {
    // Referencias comunes
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
    if (appUserEmail) appUserEmail.textContent = auth.email || "";
    const planMap = {
      personal: "Plan Personal",
      pro: "Plan Pro",
      academia: "Plan Academia"
    };
    const planLabel = planMap[auth.plan] || "Plan Personal";
    if (appUserPlan) appUserPlan.textContent = planLabel;

    if (accountName) accountName.textContent = auth.name || "—";
    if (accountEmail) accountEmail.textContent = auth.email || "—";
    if (accountRole) accountRole.textContent = auth.role || "—";
    if (accountCenter) accountCenter.textContent = auth.center || "—";
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

    // Materiales desde localStorage
    function getMaterials() {
      try {
        const raw = localStorage.getItem("formatexp_materials");
        if (!raw) return [];
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
      } catch (_) {
        return [];
      }
    }

    function saveMaterials(list) {
      try {
        localStorage.setItem("formatexp_materials", JSON.stringify(list));
      } catch (_) {
        // ignorar
      }
    }

    function getUsedCredits(materials) {
      return materials.reduce((acc, item) => acc + (item.credits || 0), 0);
    }

    function updateCreditsUI() {
      const materials = getMaterials();
      const total = getTotalCreditsForPlan(auth.plan);
      const used = getUsedCredits(materials);
      const remaining = Math.max(total - used, 0);

      if (creditsTotalSpan) creditsTotalSpan.textContent = String(total);
      if (creditsRemainingSpan) creditsRemainingSpan.textContent = String(remaining);
    }

    // Render historial
    function renderHistory() {
      const materials = getMaterials();
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

    // Estimación de créditos según tipo
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

    // Manejo de creación de material
    function clearMaterialMessages() {
      if (materialError) materialError.textContent = "";
      if (materialSuccess) materialSuccess.textContent = "";
    }

    if (materialForm) {
      materialForm.addEventListener("submit", (event) => {
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
        const materials = getMaterials();
        const total = getTotalCreditsForPlan(auth.plan);
        const used = getUsedCredits(materials);
        const remaining = Math.max(total - used, 0);

        if (estimate > remaining) {
          if (materialError)
            materialError.textContent =
              "No tienes suficientes créditos estimados para esta generación. Imagina aquí un CTA a comprar más créditos.";
          return;
        }

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

        materials.push(newItem);
        saveMaterials(materials);
        renderHistory();
        updateCreditsUI();

        if (materialSuccess) {
          materialSuccess.textContent =
            "Material generado (simulado) y añadido a tu historial.";
        }
        materialForm.reset();

        if (materialTypeSelect && creditsEstimateSpan) {
          const defaultEstimate = estimateCredits(materialTypeSelect.value || "test");
          creditsEstimateSpan.textContent = String(defaultEstimate);
        }
      });
    }

    // Navegación dentro del panel
    function showSection(key) {
      Object.keys(sections).forEach((k) => {
        const section = sections[k];
        if (!section) return;
        if (k === key) {
          section.classList.add("is-visible");
        } else {
          section.classList.remove("is-visible");
        }
      });

      navLinks.forEach((link) => {
        const sectionKey = link.getAttribute("data-section");
        if (sectionKey === key) {
          link.classList.add("is-active");
        } else {
          link.classList.remove("is-active");
        }
      });
    }

    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        const sectionKey = link.getAttribute("data-section");
        if (!sectionKey) return;
        showSection(sectionKey);
      });
    });

    // Enlace desde "Historial vacío" para ir a crear
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
          localStorage.removeItem("formatexp_auth");
        } catch (_) {}
        window.location.href = "./login.html";
      });
    }

    // Inicializar
    renderHistory();
    updateCreditsUI();
    showSection("create");
  }
}
