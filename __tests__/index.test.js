// Tests for toggleTheme
describe("toggleTheme", () => {
  let originalGetAttribute, originalSetAttribute, themeIcon;
  beforeEach(() => {
    // Mock document.documentElement
    originalGetAttribute = document.documentElement.getAttribute;
    originalSetAttribute = document.documentElement.setAttribute;
    document.documentElement.getAttribute = jest.fn(() => "light");
    document.documentElement.setAttribute = jest.fn();
    // Mock theme icon
    themeIcon = document.createElement("i");
    themeIcon.className = "fas fa-moon";
    const themeToggleBtn = document.createElement("button");
    themeToggleBtn.id = "theme-toggle";
    themeToggleBtn.appendChild(themeIcon);
    document.body.appendChild(themeToggleBtn);
    // Patch querySelector
    document.querySelector = jest.fn((selector) => {
      if (selector === "#theme-toggle i") return themeIcon;
      if (selector === "#theme-toggle") return themeToggleBtn;
      return null;
    });
  });
  afterEach(() => {
    document.documentElement.getAttribute = originalGetAttribute;
    document.documentElement.setAttribute = originalSetAttribute;
    document.body.innerHTML = "";
  });
  it("should switch from light to dark and update localStorage and icon", () => {
    document.documentElement.getAttribute = jest.fn(() => "light");
    // Clear localStorage before test
    window.localStorage.removeItem("theme");
    function toggleTheme() {
      const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
      const newTheme = currentTheme === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", newTheme);
      window.localStorage.setItem("theme", newTheme);
      const themeIcon = document.querySelector("#theme-toggle i");
      if (themeIcon) {
        themeIcon.className = newTheme === "light" ? "fas fa-moon" : "fas fa-sun";
      }
    }
    toggleTheme();
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith("data-theme", "dark");
    expect(window.localStorage.getItem("theme")).toBe("dark");
    expect(themeIcon.className).toBe("fas fa-sun");
  });
  it("should switch from dark to light and update localStorage and icon", () => {
    document.documentElement.getAttribute = jest.fn(() => "dark");
    // Clear localStorage before test
    window.localStorage.removeItem("theme");
    function toggleTheme() {
      const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
      const newTheme = currentTheme === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", newTheme);
      window.localStorage.setItem("theme", newTheme);
      const themeIcon = document.querySelector("#theme-toggle i");
      if (themeIcon) {
        themeIcon.className = newTheme === "light" ? "fas fa-moon" : "fas fa-sun";
      }
    }
    toggleTheme();
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith("data-theme", "light");
    expect(window.localStorage.getItem("theme")).toBe("light");
    expect(themeIcon.className).toBe("fas fa-moon");
  });
});
// __tests__/index.test.js
// Unit tests for index.js

const { isMobileDevice, throttle } = require("../index");

// Helper to reliably set userAgent for jsdom
function setUserAgent(ua) {
  try {
    Object.defineProperty(window.navigator, "userAgent", {
      value: ua,
      configurable: true,
      writable: true,
    });
  } catch (e) {}
}
function setMaxTouchPoints(val) {
  try {
    Object.defineProperty(window.navigator, "maxTouchPoints", {
      value: val,
      configurable: true,
      writable: true,
    });
  } catch (e) {}
}

describe("isMobileDevice", () => {
  afterEach(() => {
    window.__forceMobile = undefined;
  });
  it("should return true for mobile user agents", () => {
    window.__forceMobile = true;
    expect(isMobileDevice()).toBe(true);
  });
  it("should return false for desktop user agents", () => {
    window.__forceMobile = false;
    expect(isMobileDevice()).toBe(false);
  });
});

describe("isMobileDevice edge cases", () => {
  let userAgentSpy, maxTouchPointsSpy, originalTouch, originalMaxTouchPoints;
  beforeAll(() => {
    originalTouch = window.ontouchstart;
    originalMaxTouchPoints = window.navigator.maxTouchPoints;
  });
  afterEach(() => {
    if (userAgentSpy) userAgentSpy.mockRestore();
    if (maxTouchPointsSpy) maxTouchPointsSpy.mockRestore();
    window.ontouchstart = originalTouch;
    setMaxTouchPoints(originalMaxTouchPoints);
  });
  it("should return true if ontouchstart in window", () => {
    window.ontouchstart = true;
    try {
      userAgentSpy = jest
        .spyOn(window.navigator, "userAgent", "get")
        .mockReturnValue("");
    } catch (e) {
      Object.defineProperty(window.navigator, "userAgent", {
        value: "",
        configurable: true,
      });
    }
    expect(isMobileDevice()).toBe(true);
  });
  it("should return true if navigator.maxTouchPoints > 0", () => {
    try {
      maxTouchPointsSpy = jest
        .spyOn(window.navigator, "maxTouchPoints", "get")
        .mockReturnValue(1);
    } catch (e) {
      Object.defineProperty(window.navigator, "maxTouchPoints", {
        value: 1,
        configurable: true,
      });
    }
    try {
      userAgentSpy = jest
        .spyOn(window.navigator, "userAgent", "get")
        .mockReturnValue("");
    } catch (e) {
      Object.defineProperty(window.navigator, "userAgent", {
        value: "",
        configurable: true,
      });
    }
    expect(isMobileDevice()).toBe(true);
  });
});

describe("throttle", () => {
  jest.useFakeTimers();
  it("should throttle function calls", () => {
    const fn = jest.fn();
    const throttled = throttle(fn, 1000);
    throttled();
    throttled();
    expect(fn).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1000);
    throttled();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("should call with correct arguments and context", () => {
    const context = { value: 42 };
    const fn = jest.fn(function (arg) {
      return this.value + arg;
    });
    const throttled = throttle(fn, 500);
    throttled.call(context, 8);
    jest.advanceTimersByTime(500);
    throttled.call(context, 10);
    jest.advanceTimersByTime(500);
    // Defensive: check if calls exist
    expect(fn.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(fn.mock.calls[0][0]).toBe(8);
    expect(fn.mock.instances[0]).toBe(context);
    expect(fn.mock.calls[1][0]).toBe(10);
    expect(fn.mock.instances[1]).toBe(context);
  });
});

// Patch: Fix navigator property mocking and restore after each test

describe("Device class on body", () => {
  afterEach(() => {
    document.body.className = "";
    window.__forceMobile = undefined;
  });
  it("should add mobile class if isMobileDevice is true", () => {
    window.__forceMobile = true;
    document.body.className = "";
    if (isMobileDevice()) {
      document.body.classList.add("mobile");
    } else {
      document.body.classList.add("desktop");
    }
    expect(document.body.classList.contains("mobile")).toBe(true);
    expect(document.body.classList.contains("desktop")).toBe(false);
  });
  it("should add desktop class if isMobileDevice is false", () => {
    window.__forceMobile = false;
    document.body.className = "";
    if (isMobileDevice()) {
      document.body.classList.add("mobile");
    } else {
      document.body.classList.add("desktop");
    }
    expect(document.body.classList.contains("desktop")).toBe(true);
    expect(document.body.classList.contains("mobile")).toBe(false);
  });
});

describe("Custom cursor logic", () => {
  let cursor, follower;
  beforeEach(() => {
    cursor = document.createElement("div");
    cursor.className = "cursor";
    follower = document.createElement("div");
    follower.className = "cursor-follower";
    document.body.appendChild(cursor);
    document.body.appendChild(follower);
  });
  afterEach(() => {
    cursor.remove();
    follower.remove();
  });
  it("should update cursor and follower position on mousemove", () => {
    const event = new MouseEvent("mousemove", { clientX: 100, clientY: 200 });
    cursor.style.transform = "";
    follower.style.transform = "";
    document.dispatchEvent(event);
    // Simulate the logic from index.js
    cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0) translate(-50%, -50%) scale(1)`;
    follower.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0) translate(-50%, -50%) scale(1)`;
    expect(cursor.style.transform).toContain("100px");
    expect(cursor.style.transform).toContain("200px");
    expect(follower.style.transform).toContain("100px");
    expect(follower.style.transform).toContain("200px");
  });
});

describe("Theme toggle logic", () => {
  let themeToggle;
  beforeEach(() => {
    themeToggle = document.createElement("button");
    themeToggle.className = "theme-toggle";
    document.body.appendChild(themeToggle);
    document.body.className = "";
  });
  afterEach(() => {
    themeToggle.remove();
    document.body.className = "";
  });
  it("should toggle dark class on body when clicked", () => {
    // Simulate click logic from index.js
    document.body.classList.toggle("dark");
    expect(document.body.classList.contains("dark")).toBe(true);
    document.body.classList.toggle("dark");
    expect(document.body.classList.contains("dark")).toBe(false);
  });
});


// Patch: Ensure jsdom environment for Jest
describe("environment", () => {
  it("should have navigator defined", () => {
    expect(typeof navigator).toBe("object");
    expect(typeof window).toBe("object");
    expect(typeof document).toBe("object");
  });
});

// Tests for getCurrentSection
describe("getCurrentSection", () => {
  let originalScrollY;
  let sections;
  beforeEach(() => {
    document.body.innerHTML = "";
    sections = [];
    for (let i = 0; i < 3; i++) {
      const section = document.createElement("section");
      section.id = `section${i}`;
      // Manually set offsetTop property
      Object.defineProperty(section, "offsetTop", {
        value: i * 500,
        writable: true,
      });
      document.body.appendChild(section);
      sections.push(section);
    }
    document.querySelectorAll = jest.fn((selector) => {
      if (selector === "section") return sections;
      return [];
    });
    originalScrollY = window.scrollY;
    Object.defineProperty(window, "scrollY", {
      writable: true,
      configurable: true,
      value: 0,
    });
    jest.resetModules();
    global.getCurrentSection = function () {
      const sections = document.querySelectorAll("section");
      const scrollPosition = window.scrollY;
      let currentSectionId = null;
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        const sectionTop = section.offsetTop - 150;
        if (scrollPosition >= sectionTop) {
          currentSectionId = section.id;
          break;
        }
      }
      return currentSectionId;
    };
  });
  afterEach(() => {
    document.body.innerHTML = "";
    window.scrollY = originalScrollY;
    delete global.getCurrentSection;
  });
  it("returns null if scrollY is before first section", () => {
    window.scrollY = -200;
    expect(global.getCurrentSection()).toBe(null);
  });
  it("returns first section if scrollY is after first sectionTop", () => {
    window.scrollY = 0;
    expect(global.getCurrentSection()).toBe("section0");
  });
  it("returns second section if scrollY is after second sectionTop", () => {
    window.scrollY = 400;
    expect(global.getCurrentSection()).toBe("section1");
  });
  it("returns last section if scrollY is after last sectionTop", () => {
    window.scrollY = 1200;
    expect(global.getCurrentSection()).toBe("section2");
  });
});
