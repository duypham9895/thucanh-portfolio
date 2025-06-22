# Thục Anh's Portfolio

A modern, responsive portfolio website showcasing the professional experience and achievements of Trần Tôn Nữ Thục Anh, a marketing professional and Business Administration student.

## 🚀 Features

- **Responsive Design**: Fully optimized for desktop, tablet, and mobile devices
- **Dark/Light Theme**: Toggle between light and dark modes with preference persistence
- **Smooth Animations**: AOS (Animate On Scroll) library integration with fallbacks
- **Interactive Navigation**: Fixed sidebar navigation with active section highlighting
- **Custom Cursor**: Desktop-only custom cursor with interactive effects
- **Mobile-First**: Progressive enhancement with mobile navigation menu
- **PWA Ready**: Progressive Web App manifest for installable experience
- **Performance Optimized**: Throttled scroll events and optimized animations
- **Accessibility**: ARIA labels, keyboard navigation, and screen reader friendly

## 📁 Project Structure

```
portfolio/
├── index.html          # Main HTML file (optimized)
├── index.css           # Styles (organized into sections)
├── index.js            # JavaScript functionality (modular)
├── manifest.json       # PWA manifest
├── config.json         # Portfolio content and settings
├── CNAME               # GitHub Pages domain
├── .gitignore          # Git ignore rules
├── README.md           # Project documentation
├── icons/              # PWA and favicon icons
│   ├── favicon.ico
│   ├── apple-touch-icon.png
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-192-maskable.png
│   └── icon-512-maskable.png
└── images/
    └── avatar.jpg     # Profile picture
```

## 🛠 Technologies Used

- **HTML5**: Semantic markup with accessibility features
- **CSS3**: Custom properties (CSS variables), Grid, Flexbox, animations
- **JavaScript (ES6+)**: Modern JavaScript with modules and best practices
- **AOS Library**: Animate On Scroll for smooth reveal animations
- **Font Awesome**: Icon library for consistent iconography
- **PWA**: Progressive Web App capabilities

## 🎨 Code Organization

### HTML Structure

- Clean, semantic HTML5 markup
- Proper heading hierarchy (h1-h4)
- ARIA labels for accessibility
- Optimized meta tags and favicon setup
- Minimal inline scripts (moved to external files)

### CSS Architecture

The CSS is organized into logical sections:

1. **CSS Variables & Theme Setup**: Color schemes and theme variables
2. **Base Styles & Reset**: Normalize styles and base typography
3. **Layout & Structure**: Main layout containers and section styling
4. **Header & Hero Section**: Landing page styles and animations
5. **Navigation**: Desktop and mobile navigation systems
6. **Theme Toggle**: Dark/light mode toggle functionality
7. **Custom Cursor**: Desktop-only interactive cursor
8. **Section Components**: Individual section styles (About, Portfolio, etc.)
9. **Responsive Design**: Mobile-first responsive breakpoints
10. **Dark Theme Adjustments**: Dark mode specific overrides
11. **Performance Optimizations**: Hardware acceleration and smooth animations

### JavaScript Modules

The JavaScript is organized into functional modules:

1. **Utility Functions**: Helper functions and device detection
2. **Device Detection & Setup**: Mobile/desktop class assignment
3. **Custom Cursor**: Desktop cursor interactions
4. **Typing Animation**: Hero section typing effect
5. **Theme Toggle**: Dark/light mode switching
6. **Navigation & Scroll Handling**: Active section detection and smooth scrolling
7. **Mobile Navigation**: Hamburger menu and sidebar functionality
8. **Contact Form**: Email form handling
9. **Animations & Effects**: AOS initialization and fallbacks
10. **Initialization**: DOM ready event handlers

## 🎯 Key Optimizations Made

### Performance Improvements

- **Reduced file sizes**: HTML from 716 to 360 lines, CSS from 1734 to 1220 lines, JS from 704 to 309 lines
- **Throttled scroll events**: Improved scroll performance with throttling
- **Optimized animations**: Hardware acceleration and efficient transforms
- **Lazy loading**: AOS animations with visibility fallbacks
- **Modular code**: Clear separation of concerns

### Code Quality Enhancements

- **Consistent formatting**: Proper indentation and spacing
- **Clear comments**: Section headers and function documentation
- **Semantic HTML**: Improved accessibility and SEO
- **Modern JavaScript**: ES6+ features and best practices
- **CSS organization**: Logical grouping and consistent naming
- **Error handling**: Graceful fallbacks for all features

### Maintainability Improvements

- **Clear file structure**: Organized sections and modules
- **Consistent naming**: Clear variable and function names
- **Documentation**: Comprehensive comments and README
- **Modular design**: Easy to modify and extend
- **Version control ready**: Proper .gitignore and file organization

## 📱 Responsive Breakpoints

- **Desktop**: 769px and above (full features)
- **Tablet**: 768px and below (mobile navigation)
- **Mobile**: 480px and below (optimized spacing)

## 🌙 Theme System

The portfolio supports both light and dark themes:

- **Light Theme**: Blue (#133e87) primary color with light backgrounds
- **Dark Theme**: Softer blues with dark backgrounds
- **Persistence**: Theme preference saved in localStorage
- **Smooth Transitions**: Animated theme switching

## 🚀 Getting Started

1. **Clone the repository**

   ```bash
   git clone [repository-url]
   cd thucanh-portfolio
   ```

2. **Open in browser**

   - Simply open `index.html` in your web browser
   - Or serve through a local web server for best experience

3. **Development**
   - Modify content in `index.html`
   - Update styles in `index.css`
   - Add functionality in `index.js`

## 📋 Browser Support

- **Modern Browsers**: Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- **Mobile Browsers**: iOS Safari 12+, Chrome Mobile 60+
- **Features**: CSS Grid, Flexbox, CSS Custom Properties, ES6+ JavaScript

## 🔧 Customization

### Colors

Update CSS custom properties in the `:root` and `[data-theme="dark"]` selectors:

```css
:root {
  --primary-color: #133e87;
  --secondary-color: #608bc1;
  --accent-color: #4a6fa5;
  /* ... other variables */
}
```

### Content

Update the content sections in `index.html`:

- About section
- Education details
- Portfolio projects
- Experience timeline
- Skills and achievements

### Content Configuration

All text content, project details, and social media links are managed in `config.json`. Modify this file to update the portfolio's content without changing the HTML structure.

### Animations

Modify AOS settings in `index.js`:

```javascript
AOS.init({
  duration: 1000,
  once: true,
  offset: 50,
  delay: 100,
  easing: "ease-out-cubic",
});
```

## 📄 License

This project is open source and available under the MIT License.

## 👤 Contact

**Trần Tôn Nữ Thục Anh**

- Email: thucanh.ttn@gmail.com
- LinkedIn: [thuc-anh-tran-ton-nu](https://www.linkedin.com/in/thuc-anh-tran-ton-nu-8b0419222/)
- Facebook: [thucanhtrantonnu](https://www.facebook.com/thucanhtrantonnu/)

---

_This portfolio showcases modern web development practices with clean, maintainable, and accessible code._
