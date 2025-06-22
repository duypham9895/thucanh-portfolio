/**
 * PORTFOLIO JAVASCRIPT - OPTIMIZED & ORGANIZED
 * Clean, maintainable, and well-documented code
 */

/* ===================================
   1. UTILITY FUNCTIONS
   =================================== */

/**
 * Check if device is mobile
 */
function isMobileDevice() {
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) ||
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0
  );
}

/**
 * Throttle function for performance optimization
 */
function throttle(func, delay) {
  let timeoutId;
  let lastExecTime = 0;
  return function (...args) {
    const currentTime = Date.now();
    if (currentTime - lastExecTime > delay) {
      func.apply(this, args);
      lastExecTime = currentTime;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
}

let contactEmail = "";

/* ===================================
   2. DEVICE DETECTION & SETUP
   =================================== */

// Add device class to body
if (isMobileDevice()) {
  document.body.classList.add("mobile");
} else {
  document.body.classList.add("desktop");
}

/* ===================================
   3. CUSTOM CURSOR (DESKTOP ONLY)
   =================================== */

const cursor = document.querySelector(".cursor");
const follower = document.querySelector(".cursor-follower");

if (!isMobileDevice() && cursor && follower) {
  let mouseX = 0;
  let mouseY = 0;
  let cursorScale = 1;
  let followerScale = 1;

  document.addEventListener("mousemove", (e) => {
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%) scale(${cursorScale})`;
    follower.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%) scale(${followerScale})`;
  });

  // Interactive elements cursor effects
  const interactiveElements = document.querySelectorAll(
    "a, button, .portfolio-link, .cta-button, .submit-btn"
  );

  interactiveElements.forEach((element) => {
    element.addEventListener("mouseenter", () => {
      cursorScale = 1.5;
      cursor.style.backgroundColor = "var(--primary-color)";
      cursor.style.mixBlendMode = "difference";
      followerScale = 0.8;
      follower.style.opacity = "0.3";
    });

    element.addEventListener("mouseleave", () => {
      cursorScale = 1;
      cursor.style.backgroundColor = "var(--secondary-color)";
      cursor.style.mixBlendMode = "normal";
      followerScale = 1;
      follower.style.opacity = "0.7";
    });
  });

  // Special theme toggle cursor effect
  const themeToggle = document.querySelector(".theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("mouseenter", () => {
      cursorScale = 2;
      cursor.style.backgroundColor = "#ffffff";
      cursor.style.mixBlendMode = "difference";
      cursor.style.border = "2px solid var(--primary-color)";
      cursor.style.borderRadius = "50%";
      followerScale = 0.5;
      follower.style.opacity = "0.8";
      follower.style.borderColor = "#ffffff";
      follower.style.borderWidth = "3px";
    });

    themeToggle.addEventListener("mouseleave", () => {
      cursorScale = 1;
      cursor.style.backgroundColor = "var(--secondary-color)";
      cursor.style.mixBlendMode = "normal";
      cursor.style.border = "none";
      cursor.style.borderRadius = "50%";
      followerScale = 1;
      follower.style.opacity = "0.7";
      follower.style.borderColor = "var(--secondary-color)";
      follower.style.borderWidth = "2px";
    });
  }
} else {
  // Hide cursors on mobile
  if (cursor) cursor.style.display = "none";
  if (follower) follower.style.display = "none";
}

/* ===================================
   4. TYPING ANIMATION
   =================================== */

function initTypingEffect() {
  const text = document.querySelector(".typing-text");
  if (!text) return;

  const originalText = text.textContent;
  text.textContent = "";

  let charIndex = 0;
  function typeCharacter() {
    if (charIndex < originalText.length) {
      text.textContent += originalText.charAt(charIndex);
      charIndex++;
      setTimeout(typeCharacter, 100);
    }
  }

  // Start typing after a delay
  setTimeout(typeCharacter, 1000);
}

/* ===================================
   5. THEME TOGGLE
   =================================== */

function toggleTheme() {
  const currentTheme =
    document.documentElement.getAttribute("data-theme") || "light";
  const newTheme = currentTheme === "light" ? "dark" : "light";

  // Apply new theme
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);

  // Update toggle icon
  const themeIcon = document.querySelector("#theme-toggle i");
  if (themeIcon) {
    themeIcon.className = newTheme === "light" ? "fas fa-moon" : "fas fa-sun";
  }
}

function initThemeToggle() {
  const themeToggleBtn = document.getElementById("theme-toggle");
  if (!themeToggleBtn) return;

  // Add click event listener
  themeToggleBtn.addEventListener("click", toggleTheme);

  // Set initial icon based on current theme
  const themeIcon = themeToggleBtn.querySelector("i");
  if (themeIcon) {
    const currentTheme =
      document.documentElement.getAttribute("data-theme") || "light";
    themeIcon.className =
      currentTheme === "light" ? "fas fa-moon" : "fas fa-sun";
  }
}

/* ===================================
   6. NAVIGATION & SCROLL HANDLING
   =================================== */

const navElement = document.querySelector(".nav");
const allNavLinks = document.querySelectorAll(".nav-menu a, .mobile-menu-link");
const sections = document.querySelectorAll("section");

// Get current active section based on scroll position
function getCurrentSection() {
  const scrollPosition = window.scrollY;
  let currentSectionId = null;

  // Iterate backwards through sections
  for (let i = sections.length - 1; i >= 0; i--) {
    const section = sections[i];
    // Adjust the offset to be a bit more than the navbar height
    const sectionTop = section.offsetTop - 150;

    if (scrollPosition >= sectionTop) {
      currentSectionId = section.id;
      break; // Exit loop once the current section is found
    }
  }
  return currentSectionId;
}

// Update active navigation items
function updateActiveNavigation() {
  // Handle navbar scroll styling
  if (navElement) {
    if (window.scrollY > 10) {
      navElement.classList.add("scrolled");
    } else {
      navElement.classList.remove("scrolled");
    }
  }

  const currentSection = getCurrentSection();

  allNavLinks.forEach((link) => {
    const href = link.getAttribute("href").substring(1); // Remove #
    if (href === currentSection) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

// Initialize navigation
function initNavigation() {
  // Add smooth scroll to all navigation links
  allNavLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = link.getAttribute("href");
      const targetSection = document.querySelector(targetId);

      if (targetSection) {
        // Close mobile sidebar if open
        const mobileSidebar = document.getElementById("mobile-sidebar");
        if (mobileSidebar && mobileSidebar.classList.contains("active")) {
          closeMobileSidebar();
        }

        // Scroll to the section
        targetSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  // Add scroll event listener with throttling
  const throttledScrollHandler = throttle(updateActiveNavigation, 100);
  window.addEventListener("scroll", throttledScrollHandler);

  // Initial active section check
  updateActiveNavigation();
}

/* ===================================
   7. MOBILE NAVIGATION
   =================================== */

const mobileSidebar = document.getElementById("mobile-sidebar");
const hamburgerBtn = document.getElementById("hamburger-btn");
const closeSidebarBtn = document.getElementById("close-btn");
const sidebarOverlay = document.querySelector(".mobile-sidebar-overlay");
const sidebarContent = document.querySelector(".mobile-sidebar-content");
let scrollPosition = 0;

function openMobileSidebar() {
  if (!mobileSidebar || !hamburgerBtn) return;
  mobileSidebar.classList.add("active");
  hamburgerBtn.classList.add("active");
  bodyScrollLock.disableBodyScroll(mobileSidebar);
}

function closeMobileSidebar() {
  if (!mobileSidebar || !hamburgerBtn) return;
  mobileSidebar.classList.remove("active");
  hamburgerBtn.classList.remove("active");
  bodyScrollLock.enableBodyScroll(mobileSidebar);
}

function initMobileNavigation() {
  if (!hamburgerBtn || !mobileSidebar) return;

  // Hamburger button click handler
  hamburgerBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    const isActive = mobileSidebar.classList.contains("active");
    if (isActive) {
      closeMobileSidebar();
    } else {
      openMobileSidebar();
    }
  });

  // Close button handler
  if (closeSidebarBtn) {
    closeSidebarBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeMobileSidebar();
    });
  }

  // Overlay click handler
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", (e) => {
      if (e.target === sidebarOverlay) {
        closeMobileSidebar();
      }
    });
  }

  // Prevent sidebar content clicks from closing sidebar
  if (sidebarContent) {
    sidebarContent.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

  // Close sidebar on escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && mobileSidebar.classList.contains("active")) {
      closeMobileSidebar();
    }
  });

  // Close sidebar on window resize to desktop
  window.addEventListener("resize", () => {
    if (window.innerWidth > 768 && mobileSidebar.classList.contains("active")) {
      closeMobileSidebar();
    }
  });
}

/* ===================================
   8. CONTACT FORM
   =================================== */

function sendEmail(e) {
  e.preventDefault();

  const name = document.getElementById("name").value;
  const subject = document.getElementById("subject").value;
  const message = document.getElementById("message").value;

  // Create email body with sender info
  const emailBody = `Message from: ${name}\n\n${message}`;

  // Create mailto link
  if (!contactEmail) {
    console.error("Contact email is not configured.");
    alert("The contact form is currently unavailable. Please try again later.");
    return false;
  }
  const mailtoLink = `mailto:${contactEmail}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(emailBody)}`;

  // Open default mail client
  window.location.href = mailtoLink;

  // Reset form
  document.getElementById("contact-form").reset();

  return false;
}

/* ===================================
   9. ANIMATIONS & EFFECTS
   =================================== */

function initAOS() {
  if (typeof AOS !== "undefined") {
    AOS.init({
      duration: 1000,
      once: true,
      offset: 50,
      delay: 100,
      easing: "ease-out-cubic",
    });

    // Refresh AOS on window resize
    window.addEventListener("resize", () => {
      AOS.refresh();
    });
  }

  // Fallback: Ensure all elements are visible if AOS fails
  setTimeout(() => {
    const aosElements = document.querySelectorAll("[data-aos]");
    aosElements.forEach((element) => {
      const style = window.getComputedStyle(element);
      if (
        style.opacity === "0" ||
        style.visibility === "hidden" ||
        element.style.opacity === "0"
      ) {
        element.style.opacity = "1";
        element.style.visibility = "visible";
        element.style.transform = "none";
        element.style.transition = "all 0.3s ease";
      }
    });
  }, 500);
}

/* ===================================
   10. INITIALIZATION
   =================================== */

// Initialize all functionality when DOM is ready
/* ===================================
   11. DYNAMIC CONTENT LOADING
   =================================== */

async function loadConfig() {
  try {
    const response = await fetch("config.json");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const config = await response.json();
    applyConfig(config);
  } catch (error) {
    console.error("Could not load configuration:", error);
  }
}

function applyConfig(config) {
  if (!config) return;

  // Apply simple text and attribute configs
  document.querySelectorAll("[data-config]").forEach((el) => {
    const key = el.getAttribute("data-config");
    const value = getNestedProperty(config, key);
    if (value) {
      el.textContent = value;
    }
  });

  document.querySelectorAll("[data-config-src]").forEach((el) => {
    const key = el.getAttribute("data-config-src");
    const value = getNestedProperty(config, key);
    if (value) {
      el.src = value;
    }
  });

  document.querySelectorAll("[data-config-alt]").forEach((el) => {
    const key = el.getAttribute("data-config-alt");
    const value = getNestedProperty(config, key);
    if (value) {
      el.alt = value;
    }
  });

  // Set glitch effect text
  const glitchElement = document.querySelector(".glitch");
  if (glitchElement && config.hero && config.hero.glitchText) {
    glitchElement.setAttribute("data-text", config.hero.glitchText);
  }

  // Render dynamic sections
  if (config.education) renderEducation(config.education);
  if (config.portfolio) renderPortfolio(config.portfolio);
  if (config.experience) renderExperience(config.experience);
  if (config.skills) renderSkills(config.skills);
  if (config.activities) renderActivities(config.activities);
  if (config.achievements) renderAchievements(config.achievements);
  if (config.contact) {
    setupContactLinks(config.contact);
    if (config.contact.emailAddress) {
      contactEmail = config.contact.emailAddress;
    }
  }

  // Re-initialize components that depend on dynamic content
  initTypingEffect();
  initAOS();
}

function getNestedProperty(obj, path) {
  return path.split(".").reduce((o, p) => (o ? o[p] : null), obj);
}

function renderEducation(education) {
  const container = document.getElementById("education-container");
  if (!container) return;
  container.innerHTML = education.educationHistory
    .map(
      (card) => `
    <div class="education-card">
      <div class="education-header">
        <i class="fas fa-graduation-cap"></i>
        <div class="education-title">
          <h3>${card.institutionName}</h3>
          <span class="education-year">${card.duration}</span>
        </div>
      </div>
      <div class="education-content">
        <h4>${card.degreeName}</h4>
        <ul class="education-achievements">
          ${card.accomplishments
            .map(
              (ach) => `<li><i class="fas fa-star"></i><span>${ach}</span></li>`
            )
            .join("")}
        </ul>
      </div>
    </div>
  `
    )
    .join("");
}

function renderPortfolio(portfolio) {
  const container = document.getElementById("campaigns-container");
  if (!container) return;
  container.innerHTML = portfolio.projects
    .map(
      (project, index) => `
    <div class="campaign-card" data-aos="flip-left" data-aos-delay="${
      index * 100
    }">
      <div class="campaign-image">
        <div class="overlay">
          <div class="campaign-details">
            <h4>${project.projectName}</h4>
            <p>${project.projectDescription}</p>
            <a href="${
              project.projectLink
            }" class="view-details">View Details</a>
          </div>
        </div>
      </div>
      <div class="campaign-info">
        <span class="category">${project.projectCategory}</span>
        <h3>${project.projectName}</h3>
      </div>
    </div>
  `
    )
    .join("");
}

function renderExperience(experience) {
  const container = document.getElementById("timeline-container");
  if (!container) return;
  container.innerHTML = experience.workHistory
    .map(
      (item, index) => `
    <div class="timeline-item${index === 0 ? " current" : ""}" data-aos="fade-${
        index % 2 === 0 ? "right" : "left"
      }">
      <div class="timeline-content">
        <span class="date">${item.employmentPeriod}</span>
        <h3>${item.companyName}</h3>
        <h4>${item.jobTitle}</h4>
        <ul>
          ${item.responsibilities.map((task) => `<li>${task}</li>`).join("")}
        </ul>
      </div>
    </div>
  `
    )
    .join("");
}

function renderSkills(skills) {
  const container = document.getElementById("skills-container");
  if (!container) return;
  container.innerHTML = skills.skillList
    .map(
      (skill) => `
    <div class="skill-card">
      <i class="${skill.skillIcon}"></i>
      <h4>${skill.skillName}</h4>
      <p>${skill.skillDescription}</p>
    </div>
  `
    )
    .join("");
}

function renderActivities(activities) {
  const container = document.getElementById("activities-container");
  if (!container) return;
  container.innerHTML = activities.activityList
    .map(
      (activity) => `
    <div class="activity-card">
      <div class="activity-header">
        <i class="fas fa-globe"></i>
        <div class="activity-title">
          <h3>${activity.activityName}</h3>
          <span class="activity-role">${activity.activityRole}</span>
        </div>
      </div>
      <div class="activity-content">
        <ul class="activity-achievements">
          ${activity.activityAccomplishments
            .map(
              (ach) => `
            <li>
              <i class="fas fa-check-circle"></i>
              <p>${ach}</p>
            </li>
          `
            )
            .join("")}
        </ul>
      </div>
    </div>
  `
    )
    .join("");
}

function renderAchievements(achievements) {
  const container = document.getElementById("achievements-container");
  if (!container) return;
  container.innerHTML = achievements.achievementList
    .map(
      (card) => `
    <div class="achievement-card">
      <div class="achievement-header">
        <i class="${card.achievementIcon}"></i>
        <h3>${card.achievementCategory}</h3>
      </div>
      <div class="achievement-content">
        <ul>
          ${card.accomplishments
            .map(
              (ach) =>
                `<li><i class="fas fa-trophy"></i><span>${ach}</span></li>`
            )
            .join("")}
        </ul>
      </div>
    </div>
  `
    )
    .join("");
}

function setupContactLinks(contact) {
  const linkedin = document.getElementById("linkedin-contact");
  const facebook = document.getElementById("facebook-contact");

  if (linkedin && contact.linkedin && contact.linkedin.profileUrl) {
    linkedin.onclick = () => window.open(contact.linkedin.profileUrl, "_blank");
  }
  if (facebook && contact.facebook && contact.facebook.profileUrl) {
    facebook.onclick = () => window.open(contact.facebook.profileUrl, "_blank");
  }
}

document.addEventListener("DOMContentLoaded", function () {
  loadConfig();
  initThemeToggle();
  initNavigation();
  initMobileNavigation();
});

// Export functions for global access
window.sendEmail = sendEmail;
