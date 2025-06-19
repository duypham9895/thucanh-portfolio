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
  // Mouse movement handler
  document.addEventListener("mousemove", (e) => {
    cursor.style.left = e.clientX + "px";
    cursor.style.top = e.clientY + "px";

    // Delayed follower with smooth animation
    setTimeout(() => {
      follower.style.left = e.clientX + "px";
      follower.style.top = e.clientY + "px";
    }, 100);
  });

  // Interactive elements cursor effects
  const interactiveElements = document.querySelectorAll(
    "a, button, .portfolio-link, .cta-button, .submit-btn"
  );

  interactiveElements.forEach((element) => {
    element.addEventListener("mouseenter", () => {
      cursor.style.transform = "translate(-50%, -50%) scale(1.5)";
      cursor.style.backgroundColor = "var(--primary-color)";
      cursor.style.mixBlendMode = "difference";
      follower.style.transform = "translate(-50%, -50%) scale(0.8)";
      follower.style.opacity = "0.3";
    });

    element.addEventListener("mouseleave", () => {
      cursor.style.transform = "translate(-50%, -50%) scale(1)";
      cursor.style.backgroundColor = "var(--secondary-color)";
      cursor.style.mixBlendMode = "normal";
      follower.style.transform = "translate(-50%, -50%) scale(1)";
      follower.style.opacity = "0.7";
    });
  });

  // Special theme toggle cursor effect
  const themeToggle = document.querySelector(".theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("mouseenter", () => {
      cursor.style.transform = "translate(-50%, -50%) scale(2)";
      cursor.style.backgroundColor = "#ffffff";
      cursor.style.mixBlendMode = "difference";
      cursor.style.border = "2px solid var(--primary-color)";
      cursor.style.borderRadius = "50%";
      follower.style.transform = "translate(-50%, -50%) scale(0.5)";
      follower.style.opacity = "0.8";
      follower.style.borderColor = "#ffffff";
      follower.style.borderWidth = "3px";
    });

    themeToggle.addEventListener("mouseleave", () => {
      cursor.style.transform = "translate(-50%, -50%) scale(1)";
      cursor.style.backgroundColor = "var(--secondary-color)";
      cursor.style.mixBlendMode = "normal";
      cursor.style.border = "none";
      cursor.style.borderRadius = "50%";
      follower.style.transform = "translate(-50%, -50%) scale(1)";
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

// Get current active section based on scroll position
function getCurrentSection() {
  const sections = document.querySelectorAll("section");
  const scrollPosition = window.scrollY;
  const windowHeight = window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight;

  // Check if at bottom of page
  const isAtBottom =
    Math.ceil(scrollPosition + windowHeight) >= documentHeight - 10;
  if (isAtBottom && sections.length > 0) {
    return sections[sections.length - 1].id;
  }

  // Find current section
  for (const section of sections) {
    const sectionTop = section.offsetTop - 100;
    const sectionBottom = sectionTop + section.offsetHeight;

    if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
      return section.id;
    }
  }
  return null;
}

// Update active navigation items
function updateActiveNavigation() {
  const currentSection = getCurrentSection();
  const allNavLinks = document.querySelectorAll(
    ".nav-menu a, .mobile-menu-link"
  );

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
  const navLinks = document.querySelectorAll(".nav-menu a, .mobile-menu-link");

  // Add smooth scroll to all navigation links
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = link.getAttribute("href");
      const targetSection = document.querySelector(targetId);

      if (targetSection) {
        targetSection.scrollIntoView({ behavior: "smooth" });

        // Close mobile sidebar if open
        const mobileSidebar = document.getElementById("mobile-sidebar");
        if (mobileSidebar && mobileSidebar.classList.contains("active")) {
          closeMobileSidebar();
        }
      }
    });
  });

  // Add scroll event listener with throttling
  const throttledScrollHandler = throttle(updateActiveNavigation, 100);
  window.addEventListener("scroll", throttledScrollHandler);

  // Navbar scroll styling
  const nav = document.querySelector(".nav");
  if (nav) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 10) {
        nav.classList.add("scrolled");
      } else {
        nav.classList.remove("scrolled");
      }
    });
  }

  // Initial active section check
  updateActiveNavigation();
}

/* ===================================
   7. MOBILE NAVIGATION
   =================================== */

let scrollPosition = 0;

function openMobileSidebar() {
  const mobileSidebar = document.getElementById("mobile-sidebar");
  const hamburgerBtn = document.getElementById("hamburger-btn");
  const body = document.body;

  if (!mobileSidebar || !hamburgerBtn) return;

  // Store current scroll position
  scrollPosition = window.pageYOffset || document.documentElement.scrollTop;

  // Open sidebar with animation
  requestAnimationFrame(() => {
    mobileSidebar.classList.add("active");
    hamburgerBtn.classList.add("active");

    // Prevent body scroll
    body.style.top = `-${scrollPosition}px`;
    body.classList.add("sidebar-open");
  });
}

function closeMobileSidebar() {
  const mobileSidebar = document.getElementById("mobile-sidebar");
  const hamburgerBtn = document.getElementById("hamburger-btn");
  const body = document.body;

  if (!mobileSidebar || !hamburgerBtn) return;

  mobileSidebar.classList.remove("active");
  hamburgerBtn.classList.remove("active");

  // Restore body scroll and position
  body.classList.remove("sidebar-open");
  body.style.top = "";
  window.scrollTo({
    top: scrollPosition,
    left: 0,
    behavior: "instant",
  });
}

function initMobileNavigation() {
  const hamburgerBtn = document.getElementById("hamburger-btn");
  const closeSidebarBtn = document.getElementById("close-btn");
  const sidebarOverlay = document.querySelector(".mobile-sidebar-overlay");
  const mobileSidebar = document.getElementById("mobile-sidebar");

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
  const sidebarContent = document.querySelector(".mobile-sidebar-content");
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
  const mailtoLink = `mailto:thucanh.ttn@gmail.com?subject=${encodeURIComponent(
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
document.addEventListener("DOMContentLoaded", function () {
  initTypingEffect();
  initThemeToggle();
  initNavigation();
  initMobileNavigation();
  initAOS();
});

// Initialize on window load as well for safety
window.addEventListener("load", function () {
  updateActiveNavigation();
});

// Export functions for global access
window.sendEmail = sendEmail;
window.toggleTheme = toggleTheme;
