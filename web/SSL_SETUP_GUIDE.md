# SSL/TLS Setup Guide for qwiken.org

## Steps to Enable SSL in cPanel

### 1. Access SSL/TLS Manager
You're already in the SSL/TLS manager page. Now follow these steps:

### 2. Click "Manage SSL sites"
Look for the link that says **"Manage SSL sites"** or **"Install and Manage SSL for your site (HTTPS)"**
- This is usually under the "CERTIFICATES (CRT)" section
- Click on this link to proceed

### 3. In the Manage SSL Hosts page:

#### Option A: AutoSSL (Recommended - Free SSL)
1. Look for **"Run AutoSSL"** button at the top of the page
2. Click "Run AutoSSL" 
3. Wait for the process to complete (usually takes 5-15 minutes)
4. AutoSSL will automatically install a free SSL certificate for qwiken.org

#### Option B: Manual Installation
If AutoSSL is not available or you want to install manually:

1. **Domain field**: Select or type `qwiken.org` from the dropdown
2. **Autofill by Domain**: Click this button to auto-populate fields
3. If you don't have a certificate yet:
   - Look for **"Generate a free SSL certificate"** option
   - Or use **"Let's Encrypt SSL"** option if available
4. Click **"Install Certificate"** button at the bottom

### 4. Enable SSL Redirect (Force HTTPS)
After SSL is installed:

1. Go back to cPanel main menu
2. Find **"Domains"** section
3. Click on **"Domains"**
4. Find `qwiken.org` in the list
5. Toggle **"Force HTTPS Redirect"** to ON

### 5. Alternative: Using .htaccess for HTTPS redirect
If the above doesn't work, add this to your .htaccess file:

```apache
# Force HTTPS
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}/$1 [L,R=301]
```

## Verification Steps

1. After installation, wait 5-10 minutes for SSL to propagate
2. Visit https://qwiken.org in your browser
3. Look for the padlock icon in the address bar
4. Click the padlock to verify certificate details

## Troubleshooting

### If SSL doesn't work immediately:
- **Clear browser cache** and cookies
- Try in an incognito/private window
- Wait up to 30 minutes for full propagation
- Check DNS settings are correct

### Common Issues:
1. **"Certificate not trusted"**: Wait for propagation or clear cache
2. **Mixed content warnings**: Update all http:// links to https:// in your HTML
3. **SSL not showing**: Ensure Force HTTPS is enabled

## SSL Certificate Types in cPanel

- **AutoSSL**: Free, automatic renewal (recommended)
- **Let's Encrypt**: Free, 90-day certificates, auto-renewal
- **Self-signed**: Not recommended for production
- **Purchased SSL**: For EV or OV certificates

## Next Steps After SSL Installation

1. Update any hardcoded http:// URLs to https://
2. Update Google Search Console with https:// version
3. Update social media links to use https://
4. Test all pages to ensure they load over HTTPS

## Checking SSL Status

You can verify your SSL installation at:
- https://www.sslshopper.com/ssl-checker.html
- https://www.ssllabs.com/ssltest/

Just enter `qwiken.org` and it will show your SSL status.

---

**Note**: Most hosting providers now offer free SSL through AutoSSL or Let's Encrypt. If you don't see these options, contact Namecheap support for assistance.