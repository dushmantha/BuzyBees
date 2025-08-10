# Comprehensive Booking System Guide

This document explains the new comprehensive booking system schema and how to use it.

## Overview

The new booking system consists of 4 main tables:
1. **shop_services** - Service definitions with pricing and options
2. **service_options** - Add-ons, upgrades, and variants for services  
3. **shop_bookings** - Complete booking records with full audit trail
4. **booking_service_options** - Links bookings to selected service options

## Database Schema

### 1. Shop Services Table
Stores service definitions for each shop.

**Key Features:**
- Base pricing and duration
- Service type (appointment/walk-in/both)
- Location type (in-house/on-location/both)
- Staff assignment via UUID array
- Booking advance requirements and buffers
- Cancellation policies

```sql
-- Example service
INSERT INTO shop_services (
    shop_id, provider_id, name, description, category,
    base_price, duration_minutes, location_type
) VALUES (
    'shop-uuid', 'provider-uuid', 'Premium Haircut',
    'Professional haircut with wash and styling',
    'Hair Services', 45.00, 60, 'in_house'
);
```

### 2. Service Options Table
Stores add-ons, upgrades, and variants for services.

**Option Types:**
- **addon** - Optional extra service (e.g., beard trim)
- **upgrade** - Enhanced version (e.g., premium products)
- **variant** - Different version (e.g., short/long hair)
- **required** - Must be selected (e.g., hair length choice)

```sql
-- Example option
INSERT INTO service_options (
    service_id, name, description, option_type,
    price_adjustment, duration_adjustment
) VALUES (
    'service-uuid', 'Beard Trim Add-on',
    'Professional beard trimming', 'addon',
    15.00, 20
);
```

### 3. Shop Bookings Table
Complete booking records with full lifecycle tracking.

**Key Features:**
- Auto-generated booking reference (BB-YYYYMMDD-XXXX)
- Complete customer information
- Service details snapshot (name, duration, pricing)
- Payment tracking
- Communication flags (sent notifications, reminders)
- Full audit trail with timestamps
- Cancellation tracking

### 4. Booking Service Options Table
Junction table linking bookings to selected service options.

Stores snapshot of option details at booking time for historical accuracy.

## Booking Workflow

### 1. Create a Service
```typescript
const service = await normalizedShopService.createService({
  shop_id: 'shop-uuid',
  name: 'Premium Haircut',
  description: 'Professional haircut with wash and styling',
  base_price: 45.00,
  duration_minutes: 60,
  category: 'Hair Services',
  location_type: 'in_house'
});
```

### 2. Add Service Options
```typescript
const option = await normalizedShopService.createServiceOption({
  service_id: service.id,
  name: 'Beard Trim Add-on',
  description: 'Professional beard trimming',
  option_type: 'addon',
  price_adjustment: 15.00,
  duration_adjustment: 20
});
```

### 3. Create a Booking
```typescript
const booking = await normalizedShopService.createBooking({
  shop_id: 'shop-uuid',
  service_id: 'service-uuid',
  customer_name: 'John Doe',
  customer_phone: '+1234567890',
  customer_email: 'john@example.com',
  booking_date: '2024-08-15',
  start_time: '14:00',
  end_time: '15:00',
  service_name: 'Premium Haircut',
  duration_minutes: 60,
  service_price: 45.00,
  total_amount: 45.00,
  selected_options: [
    { option_id: 'option-uuid', quantity: 1 }
  ]
});
```

### 4. Handle Service Options
When a booking includes service options, they are automatically:
- Stored in `booking_service_options` table
- Prices calculated and added to booking total
- Duration adjustments applied to booking end time

## Key Features

### Automatic Booking References
Every booking gets a unique reference like `BB-20240815-1234` that customers can use.

### Service Options Pricing
- **Fixed pricing**: Add/subtract exact amount
- **Percentage pricing**: Add/subtract percentage of base price
- **Duration adjustments**: Extend or reduce appointment time

### Payment Tracking
- Payment status separate from booking status
- Support for partial payments and refunds
- Payment method and reference tracking

### Communication Tracking
Track which notifications have been sent:
- Booking confirmations
- Appointment reminders
- Status updates

### Full Audit Trail
Every booking tracks:
- When it was created (`booked_at`)
- When it was confirmed (`confirmed_at`) 
- When service started (`started_at`)
- When service completed (`completed_at`)
- If cancelled (`cancelled_at`)

### Staff Scheduling
- Services can be assigned to specific staff
- Bookings can be assigned to specific staff or "any available"
- Staff availability checking built-in

## Migration from Old Schema

The new schema replaces the old `shop_bookings` table structure. Key improvements:

1. **Better normalization** - Service options separated into own table
2. **Complete audit trail** - Track entire booking lifecycle
3. **Pricing flexibility** - Support for complex pricing with options
4. **Payment integration** - Built-in payment status tracking
5. **Communication tracking** - Know what notifications were sent
6. **Booking references** - User-friendly booking identifiers

## Running the Migration

1. **Backup existing data** (if any)
2. **Run the schema**: Execute `comprehensive_booking_system.sql`
3. **Update application code** to use new interfaces from `booking.ts`
4. **Test thoroughly** with the provided sample data

## Sample Data

The schema includes sample data for testing:
- One sample service (Premium Haircut)
- Three sample service options (Beard Trim, Hot Towel, Premium Products)
- One sample booking

This allows immediate testing of the booking system.

## API Integration

The `normalized.ts` service has been updated to work with the new schema:
- `createBooking()` - Creates bookings compatible with new schema
- Service option handling built-in
- Better error handling for missing columns
- Graceful fallbacks for development

## Next Steps

1. Deploy the new schema to your database
2. Update UI components to use service options
3. Implement payment integration
4. Add notification system
5. Build reporting features using the rich audit data