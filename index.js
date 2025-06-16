// Portfolio JavaScript - Consolidated functionality

// Mobile detection for cursor
function isMobileDevice() {
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) ||
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0
  );
}

// Add mobile class to body if on mobile
if (isMobileDevice()) {
  document.body.classList.add("mobile");
} else {
  document.body.classList.add("desktop");
}

// Custom cursor functionality (desktop only)
const cursor = document.querySelector(".cursor");
const follower = document.querySelector(".cursor-follower");

if (!isMobileDevice() && cursor && follower) {
  document.addEventListener("mousemove", (e) => {
    cursor.style.left = e.clientX + "px";
    cursor.style.top = e.clientY + "px";
    cursor.style.transform = "translate(-50%, -50%)";

    setTimeout(() => {
      follower.style.left = e.clientX + "px";
      follower.style.top = e.clientY + "px";
      follower.style.transform = "translate(-50%, -50%)";
    }, 100);
  });

  // Enhanced cursor interactions for desktop
  const interactiveElements = document.querySelectorAll(
    "a, button, .portfolio-link, .cta-button, .submit-btn"
  );

  const themeToggleElement = document.querySelector(".theme-toggle");

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

  // Special cursor behavior for theme toggle button for better contrast
  if (themeToggleElement) {
    themeToggleElement.addEventListener("mouseenter", () => {
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

    themeToggleElement.addEventListener("mouseleave", () => {
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

// Typing effect
const text = document.querySelector(".typing-text");
if (text) {
  const strText = text.textContent;
  text.textContent = "";

  let charIndex = 0;
  function typeText() {
    if (charIndex < strText.length) {
      text.textContent += strText.charAt(charIndex);
      charIndex++;
      setTimeout(typeText, 100);
    }
  }

  setTimeout(typeText, 1000);
}

// Theme toggle functionality
const themeToggle = document.getElementById("theme-toggle");

function toggleTheme() {
  const currentTheme =
    document.documentElement.getAttribute("data-theme") || "light";
  const newTheme = currentTheme === "light" ? "dark" : "light";

  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);

  // Update icon
  const themeIcon = themeToggle?.querySelector("i");
  if (themeIcon) {
    themeIcon.className = newTheme === "light" ? "fas fa-moon" : "fas fa-sun";
  }
}

// Add event listener with error handling
if (themeToggle) {
  themeToggle.addEventListener("click", toggleTheme);

  // Set initial icon based on current theme
  const themeIcon = themeToggle.querySelector("i");
  if (themeIcon) {
    const currentTheme =
      document.documentElement.getAttribute("data-theme") || "light";
    themeIcon.className =
      currentTheme === "light" ? "fas fa-moon" : "fas fa-sun";
  }
}

// Initialize AOS (Animate on Scroll) with error handling
document.addEventListener("DOMContentLoaded", function () {
  // Initialize AOS if available
  if (typeof AOS !== "undefined") {
    AOS.init({
      duration: 1000,
      once: true,
      offset: 50,
      delay: 100,
      easing: "ease-out-cubic",
    });

    // Refresh AOS on window resize
    window.addEventListener("resize", function () {
      AOS.refresh();
    });
  }

  // Fallback: Ensure all elements are visible if AOS fails
  setTimeout(function () {
    const aosElements = document.querySelectorAll("[data-aos]");
    aosElements.forEach(function (element) {
      // Force visibility if element seems hidden
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
});

// Contact form email functionality
function sendEmail(e) {
  e.preventDefault();

  const name = document.getElementById("name").value;
  const subject = document.getElementById("subject").value;
  const message = document.getElementById("message").value;

  // Format the email body with sender's name
  const emailBody = `Message from: ${name}\n\n${message}`;

  // Create mailto URL with all parameters
  const mailtoLink = `mailto:thucanh.ttn@gmail.com?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(emailBody)}`;

  // Open the default mail client
  window.location.href = mailtoLink;

  // Reset the form
  document.getElementById("contact-form").reset();

  return false;
}

// Add animated shadow and border to navbar on scroll
window.addEventListener("scroll", function () {
  const nav = document.querySelector(".nav");
  if (nav) {
    if (window.scrollY > 10) {
      nav.classList.add("scrolled");
    } else {
      nav.classList.remove("scrolled");
    }
  }
});

// Section scroll detection and nav highlighting
const sections = document.querySelectorAll("section");
const navLinks = document.querySelectorAll(".nav-menu a");

// Initialize mobile navigation links - will be populated after DOM loads
let mobileNavLinks = [];

// Add smooth scroll behavior to desktop nav links
navLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const targetId = link.getAttribute("href");
    const targetSection = document.querySelector(targetId);
    if (targetSection) {
      targetSection.scrollIntoView({ behavior: "smooth" });
    }
  });
});

// Function to get the current section
function getCurrentSection() {
  const scrollPosition = window.scrollY;

  for (const section of sections) {
    const sectionTop = section.offsetTop - 100; // Offset for better detection
    const sectionBottom = sectionTop + section.offsetHeight;

    if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
      return section.id;
    }
  }
  return null;
}

// Function to update active nav item (both desktop and mobile)
function updateActiveNavItem() {
  const currentSection = getCurrentSection();

  // Update desktop nav links
  navLinks.forEach((link) => {
    const href = link.getAttribute("href").substring(1); // Remove # from href
    if (href === currentSection) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });

  // Update mobile nav links if they exist
  if (mobileNavLinks.length > 0) {
    mobileNavLinks.forEach((link) => {
      const href = link.getAttribute("href").substring(1); // Remove # from href
      if (href === currentSection) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });
  }
}

// Add scroll event listener with throttling for better performance
let isScrolling = false;
window.addEventListener("scroll", () => {
  if (!isScrolling) {
    window.requestAnimationFrame(() => {
      updateActiveNavItem();
      isScrolling = false;
    });
    isScrolling = true;
  }
});

// Initial check for active section
updateActiveNavItem();

// Update active section when page loads
window.addEventListener("load", updateActiveNavItem);

// Mobile navbar scroll detection
const nav = document.querySelector(".nav");

// Only apply to desktop nav, check if navMenu exists
const navMenu = document.querySelector(".nav-menu");
if (navMenu && nav) {
  navMenu.addEventListener("scroll", () => {
    nav.classList.add("scrolled");
  });

  // Also hide hint after a delay
  setTimeout(() => {
    nav.classList.add("scrolled");
  }, 5000);
}

// Skill bar animations
function animateSkillBars() {
  const skillBars = document.querySelectorAll(".skill-progress");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const skillItem = entry.target.closest(".skill-item");
          const level = skillItem?.getAttribute("data-level");
          if (level) {
            entry.target.style.width = level + "%";
          }
        }
      });
    },
    { threshold: 0.5 }
  );

  skillBars.forEach((bar) => {
    bar.style.width = "0%";
    observer.observe(bar);
  });
}

// Initialize skill bar animations when DOM is loaded
document.addEventListener("DOMContentLoaded", animateSkillBars);

// Mobile Navigation Hamburger Menu
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM loaded, initializing mobile nav...");

  const hamburgerBtn = document.getElementById("hamburger-btn");
  const closeSidebarBtn = document.getElementById("close-btn");
  const mobileSidebar = document.getElementById("mobile-sidebar");
  const sidebarOverlay = document.querySelector(".mobile-sidebar-overlay");
  const mobileMenuLinks = document.querySelectorAll(".mobile-menu-link");
  const mobileNav = document.querySelector(".mobile-nav");
  const body = document.body;

  // Initialize global mobile nav links for other functions
  mobileNavLinks = Array.from(mobileMenuLinks);

  // Debug logging
  console.log("Mobile nav elements found:", {
    hamburgerBtn: !!hamburgerBtn,
    closeSidebarBtn: !!closeSidebarBtn,
    mobileSidebar: !!mobileSidebar,
    sidebarOverlay: !!sidebarOverlay,
    mobileMenuLinks: mobileMenuLinks.length,
    mobileNav: !!mobileNav,
  });

  // Check if we're on mobile
  const isMobile = window.innerWidth <= 768;
  console.log("Is mobile viewport:", isMobile);

  // Ensure mobile sidebar is properly hidden on load
  if (mobileSidebar) {
    mobileSidebar.classList.remove("active");
    console.log("Mobile sidebar initialized as hidden");
  }

  // Ensure hamburger button is not stuck in active state
  if (hamburgerBtn) {
    hamburgerBtn.classList.remove("active");
    console.log("Hamburger button initialized as inactive");
  }

  // Function to open sidebar - Performance Optimized
  function openSidebar() {
    console.log("Opening sidebar...");

    // Use requestAnimationFrame for smooth animation
    requestAnimationFrame(() => {
      if (mobileSidebar) {
        mobileSidebar.classList.add("active");
        console.log("Added 'active' class to sidebar");
      }
      if (hamburgerBtn) {
        hamburgerBtn.classList.add("active");
        console.log("Added 'active' class to hamburger");
      }
      body.classList.add("sidebar-open");
      console.log("Sidebar opened successfully");
    });
  }

  // Function to close sidebar - Performance Optimized
  function closeSidebar() {
    console.log("Closing sidebar...");

    // Use requestAnimationFrame for smooth animation
    requestAnimationFrame(() => {
      if (mobileSidebar) {
        mobileSidebar.classList.remove("active");
        console.log("Removed 'active' class from sidebar");
      }
      if (hamburgerBtn) {
        hamburgerBtn.classList.remove("active");
        console.log("Removed 'active' class from hamburger");
      }
      body.classList.remove("sidebar-open");
      console.log("Sidebar closed successfully");
    });
  }

  // Toggle sidebar when hamburger button is clicked - Performance Optimized
  if (hamburgerBtn) {
    // Use passive event listener for better performance
    hamburgerBtn.addEventListener(
      "click",
      function (e) {
        e.preventDefault();
        e.stopPropagation();

        const isActive = mobileSidebar?.classList.contains("active");
        console.log(
          "Hamburger clicked, current sidebar state:",
          isActive ? "open" : "closed"
        );

        // Debounce rapid clicks to prevent animation conflicts
        if (hamburgerBtn.dataset.animating === "true") {
          return;
        }

        hamburgerBtn.dataset.animating = "true";

        if (isActive) {
          closeSidebar();
        } else {
          openSidebar();
        }

        // Reset animation flag after animation completes
        setTimeout(() => {
          hamburgerBtn.dataset.animating = "false";
        }, 300);
      },
      { passive: false }
    );
    console.log("Hamburger button event listener attached");
  } else {
    console.error(
      "Hamburger button not found! Check element ID 'hamburger-btn'"
    );
  }

  // Close sidebar when close button is clicked - Performance Optimized
  if (closeSidebarBtn) {
    closeSidebarBtn.addEventListener(
      "click",
      function (e) {
        e.preventDefault();
        e.stopPropagation();

        // Prevent multiple rapid clicks
        if (closeSidebarBtn.dataset.animating === "true") {
          return;
        }

        closeSidebarBtn.dataset.animating = "true";
        closeSidebar();

        setTimeout(() => {
          closeSidebarBtn.dataset.animating = "false";
        }, 300);
      },
      { passive: false }
    );
    console.log("Close button event listener attached");
  } else {
    console.warn("Close button not found! Check element ID 'close-btn'");
  }

  // Close sidebar when overlay is clicked - Performance Optimized
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener(
      "click",
      function (e) {
        // Only close if clicking directly on overlay, not on content
        if (e.target === sidebarOverlay) {
          console.log("Overlay clicked, closing sidebar");
          closeSidebar();
        }
      },
      { passive: true }
    );
    console.log("Overlay event listener attached");
  } else {
    console.warn(
      "Sidebar overlay not found! Check class 'mobile-sidebar-overlay'"
    );
  }

  // Add smooth scroll behavior to mobile nav links - Performance Optimized
  mobileMenuLinks.forEach((link, index) => {
    link.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        const targetId = link.getAttribute("href");
        const targetSection = document.querySelector(targetId);
        console.log(
          `Mobile menu link ${index + 1} clicked, target: ${targetId}`
        );

        if (targetSection) {
          // Close sidebar first for immediate visual feedback
          closeSidebar();

          // Small delay to allow sidebar to start closing before scroll
          setTimeout(() => {
            targetSection.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }, 100);
        } else {
          console.warn(`Target section not found: ${targetId}`);
        }
      },
      { passive: false }
    );
  });

  // Close sidebar when pressing Escape key
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && mobileSidebar?.classList.contains("active")) {
      console.log("Escape key pressed, closing sidebar");
      closeSidebar();
    }
  });

  // Handle window resize
  window.addEventListener("resize", function () {
    if (
      window.innerWidth > 768 &&
      mobileSidebar?.classList.contains("active")
    ) {
      console.log("Window resized to desktop, closing sidebar");
      closeSidebar();
    }
  });

  // Prevent sidebar from closing when clicking inside sidebar content
  const sidebarContent = document.querySelector(".mobile-sidebar-content");
  if (sidebarContent) {
    sidebarContent.addEventListener("click", function (e) {
      e.stopPropagation();
    });
    console.log("Sidebar content click prevention attached");
  }

  console.log("Mobile navigation initialization complete");
});

// Contact form submission function (also defined inline in HTML for compatibility)
window.sendEmail = sendEmail;

// Global functions for theme toggle (also accessible from inline scripts)
window.toggleTheme = toggleTheme;

// Initialize everything when DOM is ready
document.addEventListener("DOMContentLoaded", function () {
  console.log("Portfolio initialized successfully");
});
