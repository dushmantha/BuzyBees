# 🎭 Development Mock Data System

This app now includes a comprehensive mock data system for testing and development purposes.

## Quick Start

### Toggle Mock Data ON/OFF

Open `/src/config/devConfig.ts` and change:

```typescript
export const DEV_CONFIG = {
  USE_MOCK_DATA: true,  // ← Change this to false for real data
  // ... other settings
};
```

### What You Get With Mock Data

When `USE_MOCK_DATA: true`:

- **🏠 Home Screen**: Beautiful mock shops, services, and categories
- **📅 Bookings**: Sample appointments with realistic data
- **🔍 Search**: Rich search results with variety
- **⭐ Reviews**: Sample reviews and ratings
- **🔔 Notifications**: Example notifications
- **👤 User Profile**: Mock user data

### Visual Indicators

When mock data is active, you'll see:
- **Red banner** at top: "🎭 [Screen Name] - Using Mock Data"
- **Small indicators** next to sections: "Mock Data" badges
- **Console logs**: All mock data usage is logged

## Configuration Options

### Fine-Grained Control

You can enable/disable specific types of mock data in `devConfig.ts`:

```typescript
MOCK_FLAGS: {
  MOCK_AUTH: true,           // User authentication
  MOCK_SHOPS: true,          // Shop/business data
  MOCK_SERVICES: true,       // Services and offerings
  MOCK_BOOKINGS: true,       // Appointments/bookings
  MOCK_REVIEWS: true,        // Reviews and ratings
  MOCK_NOTIFICATIONS: true,  // Push notifications
  // ... and more
}
```

### Visual Settings

```typescript
SHOW_DEV_INDICATORS: true,  // Show mock data badges
LOG_MOCK_USAGE: true,       // Console logging
MOCK_DELAY_MS: 500,         // Simulate network delay
```

## Mock Data Features

### 🏪 Shops & Services
- **3 Featured Shops**: Luxe Beauty Studio, FitCore Gym, Serenity Spa
- **High-quality images**: Professional stock photos
- **Realistic pricing**: $45-$120 range
- **Rich descriptions**: Detailed service information
- **Multiple categories**: Beauty, Fitness, Spa, Wellness

### 👥 Staff Members
- **Professional profiles**: Photos, bios, specialties
- **Work schedules**: Realistic availability
- **Ratings & experience**: 4.7-4.9 stars, 5-10 years experience
- **Contact info**: Phone, email, social media

### 📅 Sample Bookings
- **Upcoming appointments**: Hair cuts, massages, training
- **Different statuses**: Confirmed, pending, completed
- **Realistic timing**: Today through next week
- **Price range**: $45-$120

### ⭐ Reviews & Ratings
- **Verified reviews**: From actual customers
- **Photos included**: Some reviews have images
- **Rating distribution**: 4-5 stars
- **Helpful votes**: Community engagement

## Development Workflow

### 1. Design with Mock Data
```typescript
// Turn on mock data for UI development
USE_MOCK_DATA: true
```

### 2. Test Real API Integration
```typescript
// Turn off mock data to test real backends
USE_MOCK_DATA: false
```

### 3. Demo Mode
```typescript
// Perfect for demos and screenshots
USE_MOCK_DATA: true
SHOW_DEV_INDICATORS: false  // Hide mock indicators
```

## File Structure

```
src/
├── config/
│   └── devConfig.ts          # 🎛️ Main configuration
├── data/
│   └── mockData.ts           # 🎭 All mock data
├── services/
│   └── dataService.ts        # 🔄 Smart data switching
└── components/dev/
    └── MockDataIndicator.tsx # 🏷️ Visual indicators
```

## Benefits

### For Developers
- **Fast iteration**: No backend dependencies
- **Rich testing**: Realistic data scenarios
- **Consistent demos**: Same data every time
- **Offline development**: Works without internet

### For Designers
- **Real content**: See how UI handles actual text lengths
- **Multiple states**: Various booking statuses, ratings, etc.
- **Photo-ready**: Professional images for screenshots
- **User scenarios**: Different user types and preferences

## Production Ready

When you're ready for production:

1. Set `USE_MOCK_DATA: false`
2. Ensure all real API endpoints are working
3. Test with real user data
4. Remove or hide dev indicators

## Tips & Tricks

### Quick Testing
- Use different mock users for testing various scenarios
- Modify mock data in `mockData.ts` for specific test cases
- Toggle individual flags for hybrid testing

### Performance
- Mock data loads faster than real APIs
- Network delay simulation makes testing realistic
- Console logs help debug data flow

### Visual Polish
- All mock images are high-quality stock photos
- Consistent branding and styling
- Professional names and descriptions

---

**Happy coding!** 🚀 The mock data system makes development faster and more enjoyable.