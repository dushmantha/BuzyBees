# Database Optimization Guide - Service Relations

## Overview

This guide explains the optimization strategy implemented for fetching services with their related staff and options data. The optimization uses relational columns in the `shop_services` table to avoid multiple database queries.

## Problem Before Optimization

### Old Approach (Inefficient):
1. Fetch all services from `shop_services` table
2. For each service, query `service_options` table by service_name
3. For staff, query either `shop_staff` table or parse JSONB from `provider_businesses`
4. **Result**: N+1 query problem, slow performance

### Example:
```sql
-- 1 query for services
SELECT * FROM shop_services WHERE shop_id = ?

-- N queries for options (one per service)
SELECT * FROM service_options WHERE service_name = ? AND shop_id = ?

-- M queries for staff
SELECT * FROM shop_staff WHERE id IN (...)
```

## Optimized Approach

### New Database Schema:
```sql
ALTER TABLE shop_services 
ADD COLUMN service_options_ids JSONB DEFAULT '[]'::jsonb;

-- Example data:
{
  "id": "service-uuid",
  "name": "Hair Cut",
  "assigned_staff": ["staff-uuid-1", "staff-uuid-2"],
  "service_options_ids": ["option-uuid-1", "option-uuid-2"]
}
```

### New Approach (Efficient):
1. **Single query** to fetch all services with relational IDs
2. **Batch query** to fetch all related staff using `IN` clause
3. **Batch query** to fetch all related options using `IN` clause
4. **In-memory join** to combine the data

### Example:
```sql
-- 1 query for services
SELECT * FROM shop_services WHERE shop_id = ?

-- 1 query for all staff (batch)
SELECT * FROM shop_staff WHERE id IN ('staff-uuid-1', 'staff-uuid-2', ...)

-- 1 query for all options (batch)
SELECT * FROM service_options WHERE id IN ('option-uuid-1', 'option-uuid-2', ...)
```

## Implementation Details

### 1. Database Changes

#### Added Column:
```sql
-- Add the new column
ALTER TABLE shop_services 
ADD COLUMN service_options_ids JSONB DEFAULT '[]'::jsonb;

-- Create index for performance
CREATE INDEX idx_shop_services_options_ids 
ON shop_services USING gin (service_options_ids);
```

#### Auto-update Trigger:
```sql
-- Automatically updates service_options_ids when options change
CREATE TRIGGER trigger_update_service_options_ids
  AFTER INSERT OR UPDATE OR DELETE ON service_options
  FOR EACH ROW
  EXECUTE FUNCTION update_service_options_ids();
```

### 2. Code Changes

#### Updated Interface:
```typescript
export interface ShopService {
  // ... existing fields
  assigned_staff?: string[];      // Staff UUIDs
  service_options_ids?: string[]; // Option UUIDs
}
```

#### New Optimized Method:
```typescript
async getServicesWithRelations(shopId: string): Promise<ServiceResponse<any[]>> {
  // 1. Fetch all services
  const services = await this.client
    .from('shop_services')
    .select('*')
    .eq('shop_id', shopId);

  // 2. Extract all unique IDs
  const allStaffIds = new Set<string>();
  const allOptionIds = new Set<string>();
  
  services.forEach(service => {
    service.assigned_staff?.forEach(id => allStaffIds.add(id));
    service.service_options_ids?.forEach(id => allOptionIds.add(id));
  });

  // 3. Batch fetch related data
  const [staff, options] = await Promise.all([
    this.client.from('shop_staff').select('*').in('id', Array.from(allStaffIds)),
    this.client.from('service_options').select('*').in('id', Array.from(allOptionIds))
  ]);

  // 4. Join in memory
  return services.map(service => ({
    ...service,
    staff: service.assigned_staff?.map(id => staffMap.get(id)) || [],
    options: optionsMap.get(service.name) || []
  }));
}
```

## Performance Benefits

### Query Reduction:
- **Before**: 1 + N + M queries (where N = services, M = staff queries)
- **After**: 3 queries total (services + staff + options)

### Example Impact:
- **10 services with 20 options**: 31 queries → 3 queries (90% reduction)
- **Response time**: ~500ms → ~50ms (estimated)

### Memory Usage:
- Minimal increase due to in-memory joins
- Better caching efficiency with batch queries

## Maintenance

### Automatic Updates:
- **Service options**: Automatically updated via database triggers
- **Staff assignments**: Updated when services are created/modified

### Manual Refresh (if needed):
```sql
-- Refresh all service_options_ids
SELECT refresh_all_service_options_ids();
```

## Usage in Frontend

### ServiceDetailScreen:
```typescript
// Old way (multiple queries)
const services = await getServices(shopId);
for (const service of services) {
  service.options = await getServiceOptions(service.name);
}

// New way (single optimized call)
const servicesWithRelations = await normalizedShopService
  .getServicesWithRelations(shopId);
```

### Benefits for UI:
1. **Faster loading**: Reduced network round-trips
2. **Better UX**: Less loading states, smoother transitions  
3. **Accurate data**: Staff filtering works immediately
4. **Scalability**: Performance stays good as data grows

## Migration Steps

1. **Run database migration**:
   ```bash
   psql -f add_service_options_column.sql
   psql -f update_service_relations_trigger.sql
   ```

2. **Update existing data**:
   ```sql
   SELECT refresh_all_service_options_ids();
   ```

3. **Update application code** to use new methods

4. **Test thoroughly** with existing data

5. **Monitor performance** improvements

## Best Practices

1. **Always use batch queries** for related data
2. **Maintain relational integrity** through triggers
3. **Index JSONB columns** that are frequently queried
4. **Monitor query performance** with database logs
5. **Keep triggers lightweight** to avoid update bottlenecks

This optimization significantly improves the performance of service-related queries while maintaining data consistency through automated triggers.