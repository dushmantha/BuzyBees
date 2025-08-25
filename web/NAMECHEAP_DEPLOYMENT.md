# Qwiken Website Deployment to Namecheap

## 📋 Pre-Deployment Checklist

✅ Website files are ready for deployment
✅ All images and assets are properly referenced
✅ CSS and JavaScript files are linked correctly
✅ Website works locally (tested on localhost:8080)

## 📁 Files to Upload

Upload these files and folders to your Namecheap hosting:

```
/public_html/
├── index.html              (Main website file)
├── icon.svg                (Logo file)
├── assets/
│   ├── css/
│   │   └── style.css       (Main stylesheet)
│   ├── images/
│   │   ├── app-store-badge.svg
│   │   ├── google-play-badge.svg
│   │   └── web-images/     (All app screenshots)
│   └── js/
│       └── script.js       (Main JavaScript)
```

## 🚀 Deployment Steps

### 1. Access Namecheap cPanel
- Log into your Namecheap account
- Go to "Hosting List"
- Click "Manage" next to your domain
- Open "cPanel"

### 2. Upload Files
- In cPanel, open "File Manager"
- Navigate to `public_html` folder
- Delete default files (like `index.html` if it exists)
- Upload all website files:
  - `index.html`
  - `icon.svg`
  - `assets/` folder (with all subfolders)

### 3. Set File Permissions
- Right-click uploaded files
- Set permissions to 644 for files
- Set permissions to 755 for folders

### 4. Test Your Website
- Visit your domain (e.g., yourdomainname.com)
- Check that all images load correctly
- Test navigation and responsive design
- Verify all sections display properly

## 🔧 Namecheap-Specific Optimizations

### 1. .htaccess File (Optional)
Create `.htaccess` in public_html for better performance:

```apache
# Enable Gzip compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# Browser caching
<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
</IfModule>
```

### 2. Error Pages
Create custom 404 error page if needed.

## 📱 Domain & SSL Setup

### 1. Domain Configuration
- Ensure your domain points to Namecheap nameservers
- Wait for DNS propagation (up to 24 hours)

### 2. SSL Certificate
- In cPanel, go to "SSL/TLS"
- Enable "AutoSSL" for free SSL certificate
- Force HTTPS redirect if desired

## 🧪 Testing Checklist

After deployment, test:
- [ ] Website loads at your domain
- [ ] All images display correctly
- [ ] Navigation menu works
- [ ] Mobile responsive design
- [ ] Page loading speed
- [ ] Contact form (if functional)
- [ ] Social media links
- [ ] Download buttons

## 🔍 Troubleshooting

### Common Issues:
1. **Images not loading**: Check file paths and case sensitivity
2. **CSS not applying**: Verify CSS file path in index.html
3. **Slow loading**: Enable Gzip compression in .htaccess
4. **404 errors**: Ensure all files are uploaded to public_html

### Namecheap Support:
- Live chat available 24/7
- Knowledge base: support.namecheap.com
- Email support for hosting issues

## 📞 Next Steps

1. Upload files to Namecheap hosting
2. Test website functionality
3. Set up Google Analytics (optional)
4. Submit to search engines
5. Monitor website performance

## 🎯 Website Features

Your Qwiken website includes:
- Responsive design for all devices
- Modern CSS animations and effects
- Optimized images and assets
- Professional business showcase
- Clean, user-friendly interface

---

**Need help?** Contact Namecheap support or refer to their hosting documentation.