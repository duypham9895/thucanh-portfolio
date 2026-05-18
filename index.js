const sections = [...document.querySelectorAll("section[id]")];
const navLinks = [...document.querySelectorAll('a[href^="#"]')];

function throttle(fn, delay) {
  let lastRun = 0;
  let timeoutId;

  return (...args) => {
    const now = Date.now();
    const elapsed = now - lastRun;

    if (elapsed >= delay) {
      lastRun = now;
      fn(...args);
      return;
    }

    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      lastRun = Date.now();
      fn(...args);
    }, delay - elapsed);
  };
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getNestedProperty(obj, path) {
  return path.split(".").reduce((current, key) => current?.[key], obj);
}

function setFullName(fullName) {
  const nameElement = document.querySelector("[data-config-name='fullName']");
  if (!nameElement || !fullName) return;

  const displayName = String(fullName);
  const emphasis = "Thục Anh";
  if (displayName.includes(emphasis)) {
    nameElement.innerHTML = `${escapeHtml(displayName.replace(emphasis, "").trim())}<span>${escapeHtml(emphasis)}</span>`;
  } else {
    nameElement.textContent = displayName;
  }
}

function applyBasicConfig(config) {
  document.querySelectorAll("[data-config]").forEach((element) => {
    const key = element.getAttribute("data-config");
    const value = getNestedProperty(config, key);

    if (value) {
      element.textContent = value;
    }
  });

  document.querySelectorAll("[data-config-src]").forEach((element) => {
    const value = getNestedProperty(config, element.getAttribute("data-config-src"));

    if (value) {
      element.src = value;
    }
  });

  document.querySelectorAll("[data-config-alt]").forEach((element) => {
    const value = getNestedProperty(config, element.getAttribute("data-config-alt"));

    if (value) {
      element.alt = value;
    }
  });

  document.querySelectorAll("[data-config-href]").forEach((element) => {
    const value = getNestedProperty(config, element.getAttribute("data-config-href"));

    if (value) {
      element.href = value;
    }
  });

  document.querySelectorAll("[data-config-download]").forEach((element) => {
    const value = getNestedProperty(config, element.getAttribute("data-config-download"));

    if (value) {
      element.setAttribute("download", value);
    }
  });

  setFullName(config.fullName);
}

function renderExperience(experience) {
  const container = document.getElementById("experience-grid");
  if (!container || !experience?.workHistory) return;

  container.innerHTML = experience.workHistory
    .map((item) => {
      const label =
        item.folderLabel ||
        item.companyName
          .replace(" Vietnam", "")
          .replace(" Companies", "")
          .split(/[,\s]/)[0];

      return `
        <article class="experience-file" data-label="${escapeHtml(label)}">
          <span class="date">${escapeHtml(item.employmentPeriod)}</span>
          <h3>${escapeHtml(item.companyName)}</h3>
          <h4>${escapeHtml(item.jobTitle)}</h4>
          <ul>
            ${item.responsibilities
              .map((task) => `<li>${escapeHtml(task)}</li>`)
              .join("")}
          </ul>
        </article>
      `;
    })
    .join("");
}

function renderPortfolio(portfolio) {
  const container = document.getElementById("portfolio-grid");
  if (!container || !portfolio?.projects) return;

  container.innerHTML = portfolio.projects
    .map((project) => {
      const label = project.projectLabel || project.projectCategory || "Case";
      const metric = project.projectMetric || "View";
      const href = project.projectLink || "#";

      return `
        <article class="case-file" data-label="${escapeHtml(label)}">
          <strong class="metric">${escapeHtml(metric)}</strong>
          <h3>${escapeHtml(project.projectName)}</h3>
          <p>${escapeHtml(project.projectDescription)}</p>
          <a class="case-link" href="${escapeHtml(href)}" target="_blank" rel="noopener">Open case file</a>
        </article>
      `;
    })
    .join("");
}

function renderSkills(skills) {
  const container = document.getElementById("skills-list");
  if (!container || !skills?.skillList) return;

  container.innerHTML = skills.skillList
    .map(
      (skill) =>
        `<li><strong>${escapeHtml(skill.skillName)}:</strong> ${escapeHtml(skill.skillDescription)}</li>`
    )
    .join("");
}

function renderActivities(activities, achievements) {
  const container = document.getElementById("activities-list");
  if (!container) return;

  const activityItems =
    activities?.activityList?.flatMap((activity) => [
      `${activity.activityName} — ${activity.activityRole}`,
      ...(activity.activityAccomplishments || []),
    ]) || [];

  const meritItems =
    achievements?.achievementList
      ?.flatMap((group) => group.accomplishments || [])
      .filter((item) => /Student of 5 Merits|Z-Marketer|Hackathon/i.test(item)) || [];

  container.innerHTML = [...activityItems, ...meritItems]
    .slice(0, 6)
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
}

function renderEducation(education, achievements) {
  const container = document.getElementById("education-grid");
  if (!container) return;

  const educationItems =
    education?.educationHistory?.flatMap((item) => [
      `${item.institutionName}, ${item.duration}`,
      `${item.degreeName}`,
      ...(item.accomplishments || []),
    ]) || [];

  const scholarshipItems =
    achievements?.achievementList
      ?.flatMap((group) => group.accomplishments || [])
      .filter((item) => /graduate|Scholarship|Contribution|Student of 5 Merits/i.test(item)) || [];

  const competitionItems =
    achievements?.achievementList
      ?.flatMap((group) => group.accomplishments || [])
      .filter((item) => /Top 20|Project Design|Innovation/i.test(item)) || [];

  const panels = [
    ["Education", educationItems],
    ["Scholarships", scholarshipItems],
    ["Competitions", competitionItems],
  ];

  container.innerHTML = panels
    .map(
      ([title, items]) => `
        <article class="paper-panel">
          <h3>${escapeHtml(title)}</h3>
          <ul>
            ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </article>
      `
    )
    .join("");
}

function setupContactLinks(contact) {
  if (!contact) return;

  const email = document.getElementById("email-contact");
  const phone = document.getElementById("phone-contact");
  const linkedin = document.getElementById("linkedin-contact");
  const facebook = document.getElementById("facebook-contact");
  const portfolio = document.getElementById("portfolio-contact");
  const cvLinks = document.querySelectorAll(".cv-download, #cv-contact");

  if (email && contact.emailAddress) {
    email.href = `mailto:${contact.emailAddress}`;
  }

  if (phone && contact.phoneNumber) {
    phone.href = `tel:${contact.phoneNumber.replace(/[^\d+]/g, "")}`;
  }

  if (linkedin && contact.linkedin?.profileUrl) {
    linkedin.href = contact.linkedin.profileUrl;
  }

  if (facebook && contact.facebook?.profileUrl) {
    facebook.href = contact.facebook.profileUrl;
  }

  if (portfolio && contact.portfolioDriveUrl) {
    portfolio.href = contact.portfolioDriveUrl;
  }

  if (contact.cvDownload?.path) {
    cvLinks.forEach((link) => {
      link.href = contact.cvDownload.path;
      link.setAttribute("download", contact.cvDownload.fileName || "");
    });
  }
}

function getCurrentSection() {
  const scrollPosition = window.scrollY;
  const activationPoint = scrollPosition + Math.min(window.innerHeight * 0.35, 240);
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

  if (scrollPosition >= maxScroll - 2) {
    return sections.at(-1)?.id;
  }

  for (let index = sections.length - 1; index >= 0; index -= 1) {
    if (activationPoint >= sections[index].offsetTop) {
      return sections[index].id;
    }
  }

  return null;
}

function updateActiveNavigation() {
  const currentSection = getCurrentSection();

  navLinks.forEach((link) => {
    const href = link.getAttribute("href");

    if (!href || !href.startsWith("#") || href === "#top") return;
    link.classList.toggle("active", href.slice(1) === currentSection);
  });
}

function initNavigation() {
  navLinks.forEach((link) => {
    const href = link.getAttribute("href");
    if (!href || !href.startsWith("#")) return;

    link.addEventListener("click", (event) => {
      const target = document.querySelector(href);
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  window.addEventListener("scroll", throttle(updateActiveNavigation, 100), {
    passive: true,
  });
  updateActiveNavigation();
}

function initFolderBoard() {
  const board = document.querySelector(".folder-board");
  const folders = [...document.querySelectorAll(".folder")];
  if (!board || !folders.length) return;

  const hoverQuery = window.matchMedia("(hover: hover)");
  const keyFor = (folder) =>
    [...folder.classList].find((name) => name !== "folder") || "about";

  const openFolder = (folder) => {
    const activeKey = keyFor(folder);
    board.dataset.activeFolder = activeKey;
    folders.forEach((item) => item.classList.toggle("is-open", item === folder));
  };

  const resetFolder = () => {
    const about = board.querySelector(".folder.about");
    if (about) openFolder(about);
  };

  folders.forEach((folder) => {
    folder.addEventListener("pointerenter", (event) => {
      if (hoverQuery.matches && event.pointerType !== "touch") {
        openFolder(folder);
      }
    });

    folder.addEventListener("focus", () => openFolder(folder));
  });

  board.addEventListener("pointerleave", (event) => {
    if (hoverQuery.matches && event.pointerType !== "touch") {
      resetFolder();
    }
  });

  board.addEventListener("focusout", () => {
    window.setTimeout(() => {
      if (!board.contains(document.activeElement)) {
        resetFolder();
      }
    }, 0);
  });

  resetFolder();
}

async function loadConfig() {
  try {
    const response = await fetch("config.json");
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const config = await response.json();
    applyBasicConfig(config);
    renderExperience(config.experience);
    renderPortfolio(config.portfolio);
    renderSkills(config.skills);
    renderActivities(config.activities, config.achievements);
    renderEducation(config.education, config.achievements);
    setupContactLinks(config.contact);
    updateActiveNavigation();
  } catch (error) {
    console.error("Could not load portfolio configuration:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initFolderBoard();
  initNavigation();
  loadConfig();
});
