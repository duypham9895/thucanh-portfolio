# Thục Anh's Portfolio

A modern, responsive personal portfolio website showcasing professional experience, education, and achievements. Built with vanilla HTML, CSS, and JavaScript for optimal performance and compatibility.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Customization](#customization)
- [Browser Compatibility](#browser-compatibility)
- [Performance](#performance)
- [Contact Information](#contact-information)

## 🌟 Overview

This portfolio website presents Trần Tôn Nữ Thục Anh's professional journey, highlighting her experience in team leadership, digital marketing, and business development. The site features a clean, modern design with smooth animations and responsive layouts that work seamlessly across all devices.

## ✨ Features

### 🎨 Design & User Experience

- **Modern UI/UX**: Clean, professional design with smooth animations
- **Dark/Light Theme**: Toggle between themes with persistent preference storage
- **Custom Cursor**: Interactive cursor effects for desktop users
- **Smooth Scrolling**: Seamless navigation between sections
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices

### 📱 Navigation

- **Desktop Navigation**: Fixed sidebar with icon-based menu
- **Mobile Navigation**: Hamburger menu with slide-out sidebar
- **Active Section Highlighting**: Visual indication of current section
- **Smooth Scroll to Section**: Click navigation links to smoothly scroll to sections

### 🎭 Animations

- **AOS (Animate On Scroll)**: Elegant entrance animations
- **Typing Effect**: Animated hero section subtitle
- **Glitch Effect**: Stylized name animation
- **Hover Effects**: Interactive feedback on buttons and cards

### 📧 Contact Features

- **Contact Form**: Direct email integration using `mailto` functionality
- **Social Media Links**: Direct links to LinkedIn and Facebook profiles
- **Contact Information**: Phone, email, and location details

### 🏆 Content Sections

- **About Me**: Professional overview and introduction
- **Education**: Academic achievements and qualifications
- **Portfolio**: Showcase of key projects and initiatives
- **Experience Timeline**: Detailed work history with role descriptions
- **Skills**: Professional competencies and strengths
- **Activities**: Extracurricular involvement and leadership roles
- **Achievements**: Awards, certifications, and recognitions
- **Contact**: Multiple ways to get in touch

## 🛠 Technologies Used

- **HTML5**: Semantic markup and structure
- **CSS3**: Modern styling with CSS Grid, Flexbox, and CSS Variables
- **JavaScript (ES6+)**: Interactive functionality and DOM manipulation
- **Font Awesome 5**: Icon library for consistent iconography
- **AOS Library**: Animate On Scroll animations
- **CSS Variables**: Theme system for easy customization

## 📁 Project Structure

```
├── index.html          # Main HTML structure
├── index.css           # Complete stylesheet with themes
├── index.js            # JavaScript functionality
├── manifest.json       # PWA manifest file
├── README.md           # Project documentation
└── icons/              # Favicon and icon assets
    ├── apple-touch-icon.png
    ├── favicon.ico
    ├── icon-192-maskable.png
    ├── icon-192.png
    ├── icon-512-maskable.png
    └── icon-512.png
```

### File Descriptions

- **[`index.html`](index.html)**: Complete HTML structure with semantic markup, including all sections, navigation, and contact forms
- **[`index.css`](index.css)**: Comprehensive stylesheet featuring CSS Grid layouts, theme variables, animations, and responsive design
- **[`index.js`](index.js)**: JavaScript functionality for interactivity, theme switching, navigation, and form handling
- **[`manifest.json`](manifest.json)**: Progressive Web App manifest file for mobile installation
- **[`icons/`](icons/)**: Directory containing favicon and icon assets for various devices and platforms

## 🚀 Getting Started

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- No server setup required - runs entirely in the browser

### Installation

1. **Clone or Download** the project files
2. **Open** [`index.html`](index.html) in your web browser
3. **Enjoy** the portfolio experience!

### Quick Start

```bash
# If you have a local server (optional)
npx http-server .
# or
python -m http.server 8000
# or simply open index.html in your browser
```

## 🎨 Customization

### Theme Colors

The portfolio uses CSS variables for easy theme customization. Edit the `:root` section in [`index.css`](index.css):

```css
:root {
  --primary-color: #133e87; /* Main brand color */
  --secondary-color: #608bc1; /* Secondary brand color */
  --accent-color: #4a6fa5; /* Accent elements */
  --background: transparent; /* Page background */
  --text-color: #133e87; /* Main text color */
  /* ... more variables */
}
```

### Content Updates

1. **Personal Information**: Update name, title, and contact details in [`index.html`](index.html)
2. **Experience**: Modify the timeline section with your work history
3. **Skills**: Update the skills grid with your competencies
4. **Education**: Add your academic background
5. **Achievements**: List your awards and certifications

### Adding New Sections

1. Add HTML structure in [`index.html`](index.html)
2. Add navigation links (both desktop and mobile)
3. Style the new section in [`index.css`](index.css)
4. Update JavaScript navigation logic in [`index.js`](index.js)

## 🌐 Browser Compatibility

- **Chrome**: ✅ Fully supported
- **Firefox**: ✅ Fully supported
- **Safari**: ✅ Fully supported
- **Edge**: ✅ Fully supported
- **Mobile Browsers**: ✅ Optimized for mobile

### Responsive Breakpoints

- **Desktop**: > 768px (sidebar navigation)
- **Tablet/Mobile**: ≤ 768px (hamburger menu)
- **Small Mobile**: ≤ 480px (compact layout)

## ⚡ Performance

### Optimization Features

- **Vanilla JavaScript**: No framework dependencies for faster loading
- **Optimized Animations**: Hardware-accelerated CSS transforms
- **Lazy Loading**: AOS animations only trigger when visible
- **Efficient Event Handling**: Throttled scroll events and debounced interactions
- **Mobile Optimizations**: Touch-friendly interactions and optimized layouts

### Loading Performance

- **Minimal Dependencies**: Only Font Awesome and AOS library
- **CSS Variables**: Efficient theme switching
- **Semantic HTML**: SEO-friendly structure

## 📞 Contact Information

**Trần Tôn Nữ Thục Anh**

- 📧 Email: thucanh.ttn@gmail.com
- 📱 Phone: (+84) 797038080
- 🔗 LinkedIn: [thuc-anh-tran-ton-nu](https://www.linkedin.com/in/thuc-anh-tran-ton-nu-8b0419222/)
- 📘 Facebook: [thucanhtrantonnu](https://www.facebook.com/thucanhtrantonnu/)
- 📍 Location: Ho Chi Minh City, Vietnam

---

## 🛡 License

This project is created for personal portfolio use. Feel free to use this code as inspiration for your own portfolio, but please update the personal information and content to reflect your own background and achievements.

## 🔄 Version History

- **v4.0**: Current version with mobile-responsive design, theme switching, and comprehensive feature set
- Built with modern web standards and best practices
- Optimized for performance and user experience

---

_Last updated: June 2025_
