# Qwiken Website 🚀

A professional website showcasing the Qwiken beauty and wellness booking app.

## 🌟 Features

- **Responsive Design** - Works perfectly on all devices
- **Modern UI/UX** - Beautiful, professional design
- **App Showcase** - Complete app details and features
- **Download Links** - Direct links to App Store and Google Play
- **Contact Form** - Easy way for users to get in touch
- **Smooth Animations** - Engaging user experience
- **SEO Optimized** - Search engine friendly

## 🚀 Quick Start

### Option 1: Simple Launch (Recommended)
```bash
# Navigate to web folder
cd web

# Run launch script
./launch.sh
```

### Option 2: Python Server
```bash
# Navigate to web folder
cd web

# Python 3
python3 -m http.server 8000

# Or Python 2
python -m SimpleHTTPServer 8000
```

### Option 3: Node.js Server
```bash
# Navigate to web folder
cd web

# Using npx (no installation needed)
npx http-server -p 8000 -o

# Or install globally first
npm install -g http-server
http-server -p 8000 -o
```

### Option 4: Direct Browser
Simply open `index.html` in your web browser.

## 🌐 Access the Website

After starting the server, visit:
- **Local:** http://localhost:8000
- **Network:** http://YOUR_IP:8000 (for mobile testing)

## 📱 Website Sections

### 🏠 Home (Hero Section)
- **App introduction** with compelling headline
- **Download buttons** for iOS and Android
- **Key statistics** and social proof
- **Beautiful hero image** with phone mockup

### ✨ Features Section
- **Six key features** with icons and descriptions:
  - Instant Booking
  - Find Nearby Services  
  - Verified Reviews
  - Smart Reminders
  - Secure Payments
  - Favorites & History

### 📸 Screenshots Gallery
- **App screenshots** in an attractive carousel
- **Interactive hover effects**
- **Detailed captions** for each screen

### ℹ️ About Section
- **Company story** and mission
- **Statistics** about users and businesses
- **Benefits** for customers and providers

### 📲 Download Section
- **App Store badges** (iOS and Android)
- **System requirements** and features
- **Phone mockups** showing the app

### 📞 Contact Section
- **Contact form** with validation
- **Company information** (email, phone, address)
- **Social media links**

## 🛠️ Customization

### Update App Store Links
Edit the download buttons in `index.html`:
```html
<!-- iOS App Store -->
<a href="https://apps.apple.com/app/qwiken" class="store-btn">

<!-- Google Play Store -->
<a href="https://play.google.com/store/apps/details?id=com.qwiken" class="store-btn">
```

### Add Your Images
Replace placeholder images in `/assets/images/`:
- `app-screenshot-1.png` - Main app screenshot
- `app-screenshot-2.png` - Service details
- `app-screenshot-3.png` - Booking screen
- `app-screenshot-4.png` - User profile
- `about-qwiken.jpg` - About section image
- `iphone-mockup.png` - iOS phone mockup
- `android-mockup.png` - Android phone mockup

### Update Contact Information
Edit contact details in `index.html`:
```html
<div class="contact-item">
    <i class="fas fa-envelope"></i>
    <div>
        <h4>Email</h4>
        <p>hello@qwiken.com</p>
        <p>support@qwiken.com</p>
    </div>
</div>
```

### Customize Colors
Update CSS variables in `/assets/css/style.css`:
```css
:root {
    --primary-color: #9B79D9;
    --primary-dark: #7B59B9;
    --secondary-color: #F59E0B;
    --accent-color: #10B981;
    /* ... */
}
```

## 📊 Analytics Integration

Add your analytics code before the closing `</body>` tag:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_TRACKING_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_TRACKING_ID');
</script>
```

## 🔧 SEO Optimization

The website includes:
- **Meta tags** for description and keywords
- **Open Graph tags** for social media sharing
- **Structured data** for search engines
- **Semantic HTML** structure
- **Fast loading** optimized assets

## 📱 Mobile Responsive

The website is fully responsive and works on:
- **Desktop** (1200px+)
- **Tablet** (768px - 1199px)
- **Mobile** (320px - 767px)

## 🚀 Deployment Options

### GitHub Pages
1. Push to GitHub repository
2. Enable GitHub Pages in repository settings
3. Your site will be available at `https://username.github.io/repository`

### Netlify
1. Connect your GitHub repository
2. Set build command: (none needed)
3. Set publish directory: `/web`
4. Deploy automatically on git push

### Vercel
1. Import from GitHub
2. Set framework preset: Other
3. Set output directory: `web`
4. Deploy with zero configuration

### Traditional Hosting
Upload the entire `/web` folder contents to your web server.

## 🔗 App Store Links

Update these with your actual app store URLs:

### iOS App Store
```
https://apps.apple.com/app/qwiken
```

### Google Play Store
```
https://play.google.com/store/apps/details?id=com.qwiken
```

## 🎨 Design Credits

- **Fonts:** Inter from Google Fonts
- **Icons:** Font Awesome 6
- **Colors:** Custom Qwiken brand palette
- **Animations:** Custom CSS animations

## 📞 Support

For website customization or support:
- **Email:** support@qwiken.com
- **Documentation:** This README file
- **Issues:** Create GitHub issues for bugs

## 🔄 Updates

To update the website:
1. Edit HTML content in `index.html`
2. Modify styles in `/assets/css/style.css`  
3. Update JavaScript in `/assets/js/script.js`
4. Replace images in `/assets/images/`
5. Test locally before deploying

---

**Made with ❤️ for Qwiken** - Your Beauty & Wellness Booking App