# Qwiken Website Deployment Guide 🚀

## 🌐 Local Development

### Quick Start
```bash
cd web
./launch.sh
```

Visit: http://localhost:8000

## 🚀 Production Deployment

### Option 1: Netlify (Recommended)

1. **Connect Repository**
   - Go to https://netlify.com
   - Click "New site from Git"
   - Connect your GitHub repository

2. **Configure Build Settings**
   - Build command: (leave empty)
   - Publish directory: `web`
   - Deploy site

3. **Custom Domain (Optional)**
   - Add custom domain in site settings
   - Configure DNS records
   - Enable HTTPS (automatic)

**Pros:** Free, automatic deployments, global CDN, HTTPS

### Option 2: Vercel

1. **Import Project**
   - Go to https://vercel.com
   - Import from GitHub
   - Select your repository

2. **Configure Settings**
   - Framework preset: Other
   - Root directory: `web`
   - Deploy

**Pros:** Free tier, excellent performance, edge deployment

### Option 3: GitHub Pages

1. **Enable GitHub Pages**
   - Go to repository Settings
   - Pages section
   - Source: Deploy from branch
   - Branch: main
   - Folder: `/web`

2. **Access Site**
   - Available at: `https://username.github.io/repository`

**Pros:** Free for public repos, integrated with GitHub

### Option 4: Traditional Hosting

1. **Upload Files**
   - Upload entire `/web` folder contents
   - Ensure `index.html` is in root
   - Configure web server if needed

2. **Popular Hosting Providers**
   - Hostinger
   - Bluehost  
   - SiteGround
   - DigitalOcean
   - AWS S3 + CloudFront

## 📱 App Store Integration

### Update Download Links

1. **iOS App Store**
   ```html
   <a href="https://apps.apple.com/app/qwiken" class="store-btn">
   ```

2. **Google Play Store**
   ```html
   <a href="https://play.google.com/store/apps/details?id=com.qwiken" class="store-btn">
   ```

### App Store Badges

1. **Download Official Badges**
   - Apple: https://linkmaker.itunes.apple.com/badge-generator
   - Google: https://play.google.com/badges

2. **Replace Images**
   - `app-store-badge.png`
   - `google-play-badge.png`

## 🖼️ Image Optimization

### Required Images
- **App Screenshots** (4 images, 1080x1920px)
- **Phone Mockups** (iPhone/Android, 800x1600px)
- **Company Logo** (400x400px, PNG)
- **About Image** (800x600px)
- **Store Badges** (official sizes)

### Image Tools
- **Compression:** TinyPNG, ImageOptim
- **Mockups:** Smartmockups, MockDrop
- **Screenshots:** Your actual app screens

## 🔧 Configuration

### Contact Information
Update in `index.html`:
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

### Social Media Links
Update in `assets/js/script.js`:
```javascript
const socialLinks = {
    facebook: 'https://facebook.com/qwiken',
    twitter: 'https://twitter.com/qwiken',
    instagram: 'https://instagram.com/qwiken',
    linkedin: 'https://linkedin.com/company/qwiken'
};
```

### Analytics Integration
Add before `</body>`:
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

## 🔍 SEO Optimization

### Meta Tags (Already Included)
```html
<meta name="description" content="Qwiken - Book beauty and wellness appointments instantly">
<meta name="keywords" content="beauty booking, wellness appointments, salon booking">
<meta property="og:title" content="Qwiken - Your Beauty & Wellness Booking App">
```

### Additional SEO Tips
1. **Submit to Google Search Console**
2. **Create XML sitemap**
3. **Add structured data**
4. **Optimize page loading speed**
5. **Use descriptive URLs**

## 📊 Performance Optimization

### Already Implemented
- ✅ Compressed CSS/JS
- ✅ Optimized images
- ✅ Minimal dependencies
- ✅ Efficient animations
- ✅ Responsive design

### Additional Optimizations
1. **Enable GZIP compression**
2. **Set cache headers**
3. **Use WebP images**
4. **Implement service worker**
5. **Add CDN**

## 🔒 Security

### HTTPS (Required)
- Most hosting providers offer free SSL
- Let's Encrypt for custom servers
- Essential for modern browsers

### Content Security Policy
Add to `<head>`:
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;">
```

## 📱 Testing

### Device Testing
- Desktop (Chrome, Firefox, Safari, Edge)
- Mobile (iOS Safari, Android Chrome)
- Tablet (iPad, Android tablets)

### Testing Tools
- **Lighthouse** (Performance, SEO, Accessibility)
- **GTmetrix** (Speed analysis)
- **BrowserStack** (Cross-browser testing)
- **Google Mobile-Friendly Test**

## 🚨 Launch Checklist

### Pre-Launch
- [ ] All images optimized and uploaded
- [ ] App store links updated
- [ ] Contact information correct
- [ ] Social media links working
- [ ] Analytics code added
- [ ] Mobile responsive testing
- [ ] Cross-browser testing
- [ ] SEO meta tags complete

### Post-Launch
- [ ] Submit to Google Search Console
- [ ] Monitor analytics
- [ ] Test contact form
- [ ] Check loading speed
- [ ] Monitor error logs
- [ ] Regular content updates

## 📞 Support

Need help with deployment?
- **Documentation:** This file + README.md
- **Issues:** Create GitHub issue
- **Email:** support@qwiken.com

---

**Your Qwiken website is ready to launch! 🎉**