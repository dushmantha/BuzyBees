-- Create the missing shop_complete view
DROP VIEW IF EXISTS public.shop_complete;

CREATE VIEW public.shop_complete AS
SELECT 
    pb.*,
    CASE 
        WHEN pb.images IS NOT NULL AND jsonb_array_length(pb.images) > 0 THEN
            pb.images->0->>0
        ELSE pb.image_url
    END as primary_image_url,
    
    CASE 
        WHEN pb.is_active = true THEN 'active'
        ELSE 'inactive'
    END as status,
    
    CONCAT_WS(', ', pb.address, pb.city, pb.country) as full_address,
    
    CASE 
        WHEN pb.services IS NOT NULL THEN jsonb_array_length(pb.services)
        ELSE 0
    END as service_count,
    
    CASE 
        WHEN pb.staff IS NOT NULL THEN jsonb_array_length(pb.staff)
        ELSE 0
    END as staff_count

FROM provider_businesses pb
WHERE pb.is_active = true;

GRANT SELECT ON public.shop_complete TO PUBLIC;
GRANT SELECT ON public.shop_complete TO anon;
GRANT SELECT ON public.shop_complete TO authenticated;