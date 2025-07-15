// src/services/api/mock/data.ts

export const mockCategories = [
  {
    id: "1",
    name: "Last Minute",
    image: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=200&h=200&fit=crop&crop=center",
    service_count: 15,
    color: "#F9D71C",
    description: "Last minute bookings with great discounts",
    icon: "time-outline",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "2",
    name: "Hair Salon",
    image: "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=200&h=200&fit=crop&crop=center",
    service_count: 234,
    color: "#E8B89A",
    description: "Professional hair styling and cutting services",
    icon: "cut-outline",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "3",
    name: "Massage",
    image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=200&h=200&fit=crop&crop=center",
    service_count: 156,
    color: "#A8C090",
    description: "Relaxing massage and wellness treatments",
    icon: "hand-left-outline",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "4",
    name: "Nails",
    image: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=200&h=200&fit=crop&crop=center",
    service_count: 89,
    color: "#B19CD9",
    description: "Nail care and manicure services",
    icon: "hand-right-outline",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "5",
    name: "Lashes & Brows",
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop&crop=center",
    service_count: 67,
    color: "#4A90A4",
    description: "Eyebrow and eyelash treatments",
    icon: "eye-outline",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "6",
    name: "Foot Care",
    image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=200&h=200&fit=crop&crop=center",
    service_count: 45,
    color: "#D4A574",
    description: "Foot care and pedicure services",
    icon: "footsteps-outline",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "7",
    name: "Skin Care",
    image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=200&h=200&fit=crop&crop=center",
    service_count: 123,
    color: "#6B8A6B",
    description: "Skincare and facial treatments",
    icon: "heart-outline",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "8",
    name: "Fillers",
    image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=200&h=200&fit=crop&crop=center",
    service_count: 34,
    color: "#E8A5C0",
    description: "Cosmetic fillers and aesthetic treatments",
    icon: "medical-outline",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "9",
    name: "Chiropractic",
    image: "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=200&h=200&fit=crop&crop=center",
    service_count: 56,
    color: "#B5A48B",
    description: "Chiropractic treatments and adjustments",
    icon: "body-outline",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "10",
    name: "Naprapathy",
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop&crop=center",
    service_count: 78,
    color: "#A5B5C9",
    description: "Naprapathy and manual therapy",
    icon: "fitness-outline",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "11",
    name: "Physiotherapy",
    image: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=200&h=200&fit=crop&crop=center",
    service_count: 92,
    color: "#C9A5B5",
    description: "Physiotherapy and rehabilitation",
    icon: "accessibility-outline",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "12",
    name: "Training",
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop&crop=center",
    service_count: 134,
    color: "#A5C9B5",
    description: "Personal training and fitness services",
    icon: "barbell-outline",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  }
];


// NEW: Service Availability Data
export const mockServiceAvailability = {
  "1": {
    business_hours: { 
      start: "09:00", 
      end: "20:00" 
    },
    available_dates: [
      "2025-07-15", "2025-07-16", "2025-07-17", "2025-07-18", 
      "2025-07-21", "2025-07-22", "2025-07-23", "2025-07-24", 
      "2025-07-25", "2025-07-28", "2025-07-29", "2025-07-30",
      "2025-07-31", "2025-08-01", "2025-08-04", "2025-08-05"
    ],
    booked_slots: {
      "2025-07-15": [
        { start: "10:00", end: "11:00" },
        { start: "14:30", end: "16:00" }
      ],
      "2025-07-16": [
        { start: "09:30", end: "11:00" },
        { start: "13:00", end: "14:00" }
      ],
      "2025-07-17": [
        { start: "11:00", end: "12:30" },
        { start: "15:00", end: "16:30" }
      ],
      "2025-07-18": [
        { start: "10:30", end: "12:00" },
        { start: "14:00", end: "15:30" }
      ],
      "2025-07-21": [
        { start: "09:00", end: "10:30" },
        { start: "12:00", end: "13:30" }
      ],
      "2025-07-22": [
        { start: "11:00", end: "12:00" },
        { start: "16:00", end: "17:30" }
      ],
      "2025-07-23": [
        { start: "09:30", end: "11:00" },
        { start: "14:00", end: "15:30" }
      ],
      "2025-07-24": [
        { start: "10:00", end: "11:30" },
        { start: "13:00", end: "14:30" }
      ],
      "2025-07-25": [
        { start: "12:00", end: "13:00" },
        { start: "17:00", end: "18:30" }
      ],
      "2025-07-28": [
        { start: "09:00", end: "10:00" },
        { start: "15:00", end: "16:30" }
      ],
      "2025-07-29": [
        { start: "10:30", end: "11:30" },
        { start: "14:00", end: "15:00" }
      ],
      "2025-07-30": [
        { start: "13:00", end: "14:30" },
        { start: "16:30", end: "18:00" }
      ],
      "2025-07-31": [
        { start: "11:00", end: "12:00" },
        { start: "15:30", end: "17:00" }
      ],
      "2025-08-01": [
        { start: "10:00", end: "11:30" },
        { start: "14:30", end: "16:00" }
      ],
      "2025-08-04": [
        { start: "09:30", end: "11:00" },
        { start: "13:30", end: "15:00" }
      ],
      "2025-08-05": [
        { start: "12:30", end: "14:00" },
        { start: "17:30", end: "19:00" }
      ]
    }
  },
  "2": {
    business_hours: { 
      start: "10:00", 
      end: "19:00" 
    },
    available_dates: [
      "2025-07-15", "2025-07-16", "2025-07-17", "2025-07-18", 
      "2025-07-21", "2025-07-22", "2025-07-23", "2025-07-24", 
      "2025-07-25", "2025-07-28", "2025-07-29", "2025-07-30",
      "2025-07-31", "2025-08-01", "2025-08-04", "2025-08-05"
    ],
    booked_slots: {
      "2025-07-15": [
        { start: "11:00", end: "12:30" },
        { start: "15:00", end: "17:00" }
      ],
      "2025-07-16": [
        { start: "10:00", end: "12:00" },
        { start: "14:00", end: "15:30" }
      ],
      "2025-07-17": [
        { start: "13:00", end: "15:00" }
      ],
      "2025-07-18": [
        { start: "11:30", end: "13:00" },
        { start: "16:00", end: "18:00" }
      ],
      "2025-07-21": [
        { start: "10:30", end: "12:00" }
      ],
      "2025-07-22": [
        { start: "12:00", end: "14:00" }
      ],
      "2025-07-23": [
        { start: "11:00", end: "12:30" }
      ],
      "2025-07-24": [
        { start: "14:00", end: "16:00" }
      ],
      "2025-07-25": [
        { start: "10:00", end: "11:30" }
      ],
      "2025-07-28": [
        { start: "13:00", end: "15:00" }
      ],
      "2025-07-29": [
        { start: "11:00", end: "13:00" }
      ],
      "2025-07-30": [
        { start: "10:30", end: "12:00" }
      ],
      "2025-07-31": [
        { start: "12:30", end: "14:30" }
      ],
      "2025-08-01": [
        { start: "10:00", end: "12:00" }
      ],
      "2025-08-04": [
        { start: "11:30", end: "13:30" }
      ],
      "2025-08-05": [
        { start: "10:30", end: "12:30" }
      ]
    }
  },
  "3": {
    business_hours: { 
      start: "08:00", 
      end: "21:00" 
    },
    available_dates: [
      "2025-07-15", "2025-07-16", "2025-07-17", "2025-07-18", 
      "2025-07-21", "2025-07-22", "2025-07-23", "2025-07-24", 
      "2025-07-25", "2025-07-28", "2025-07-29", "2025-07-30",
      "2025-07-31", "2025-08-01", "2025-08-04", "2025-08-05"
    ],
    booked_slots: {
      "2025-07-15": [
        { start: "09:00", end: "10:00" },
        { start: "14:00", end: "15:00" }
      ],
      "2025-07-16": [
        { start: "10:00", end: "11:00" }
      ],
      "2025-07-17": [
        { start: "13:00", end: "14:00" }
      ],
      "2025-07-18": [
        { start: "11:00", end: "12:00" }
      ],
      "2025-07-21": [
        { start: "09:30", end: "10:30" }
      ],
      "2025-07-22": [
        { start: "12:00", end: "13:00" }
      ],
      "2025-07-23": [
        { start: "15:00", end: "16:00" }
      ],
      "2025-07-24": [
        { start: "10:30", end: "11:30" }
      ],
      "2025-07-25": [
        { start: "13:30", end: "14:30" }
      ],
      "2025-07-28": [
        { start: "11:30", end: "12:30" }
      ],
      "2025-07-29": [
        { start: "09:00", end: "10:00" }
      ],
      "2025-07-30": [
        { start: "12:30", end: "13:30" }
      ],
      "2025-07-31": [
        { start: "08:30", end: "09:30" }
      ],
      "2025-08-01": [
        { start: "11:00", end: "12:00" }
      ],
      "2025-08-04": [
        { start: "10:00", end: "11:00" }
      ],
      "2025-08-05": [
        { start: "13:00", end: "14:00" }
      ]
    }
  },
  "4": {
    business_hours: { 
      start: "09:30", 
      end: "18:00" 
    },
    available_dates: [
      "2025-07-15", "2025-07-16", "2025-07-17", "2025-07-18", 
      "2025-07-21", "2025-07-22", "2025-07-23", "2025-07-24", 
      "2025-07-25", "2025-07-28", "2025-07-29", "2025-07-30",
      "2025-07-31", "2025-08-01", "2025-08-04", "2025-08-05"
    ],
    booked_slots: {
      "2025-07-15": [
        { start: "10:00", end: "12:00" }
      ],
      "2025-07-16": [
        { start: "13:00", end: "15:00" }
      ],
      "2025-07-17": [
        { start: "11:00", end: "13:00" }
      ],
      "2025-07-18": [
        { start: "14:30", end: "16:30" }
      ],
      "2025-07-21": [
        { start: "12:00", end: "14:00" }
      ],
      "2025-07-22": [
        { start: "09:30", end: "11:30" }
      ],
      "2025-07-23": [
        { start: "15:00", end: "17:00" }
      ],
      "2025-07-24": [
        { start: "10:00", end: "12:00" }
      ],
      "2025-07-25": [
        { start: "12:30", end: "14:30" }
      ],
      "2025-07-28": [
        { start: "15:00", end: "17:00" }
      ],
      "2025-07-29": [
        { start: "11:00", end: "13:00" }
      ],
      "2025-07-30": [
        { start: "13:00", end: "15:00" }
      ],
      "2025-07-31": [
        { start: "16:00", end: "18:00" }
      ],
      "2025-08-01": [
        { start: "14:30", end: "16:30" }
      ],
      "2025-08-04": [
        { start: "15:30", end: "17:30" }
      ],
      "2025-08-05": [
        { start: "13:30", end: "15:30" }
      ]
    }
  },
  "5": {
    business_hours: { 
      start: "09:00", 
      end: "19:00" 
    },
    available_dates: [
      "2025-07-15", "2025-07-16", "2025-07-17", "2025-07-18", 
      "2025-07-21", "2025-07-22", "2025-07-23", "2025-07-24", 
      "2025-07-25", "2025-07-28", "2025-07-29", "2025-07-30",
      "2025-07-31", "2025-08-01", "2025-08-04", "2025-08-05"
    ],
    booked_slots: {
      "2025-07-15": [
        { start: "11:00", end: "12:15" }
      ],
      "2025-07-16": [
        { start: "14:00", end: "15:15" }
      ],
      "2025-07-17": [
        { start: "12:30", end: "13:45" }
      ],
      "2025-07-18": [
        { start: "13:15", end: "14:30" }
      ],
      "2025-07-21": [
        { start: "15:30", end: "16:45" }
      ],
      "2025-07-22": [
        { start: "10:15", end: "11:30" }
      ],
      "2025-07-23": [
        { start: "17:00", end: "18:15" }
      ],
      "2025-07-24": [
        { start: "13:45", end: "15:00" }
      ],
      "2025-07-25": [
        { start: "16:00", end: "17:15" }
      ],
      "2025-07-28": [
        { start: "14:45", end: "16:00" }
      ],
      "2025-07-29": [
        { start: "17:15", end: "18:30" }
      ],
      "2025-07-30": [
        { start: "13:30", end: "14:45" }
      ],
      "2025-07-31": [
        { start: "15:45", end: "17:00" }
      ],
      "2025-08-01": [
        { start: "14:30", end: "15:45" }
      ],
      "2025-08-04": [
        { start: "16:30", end: "17:45" }
      ],
      "2025-08-05": [
        { start: "13:00", end: "14:15" }
      ]
    }
  }
};

export const mockServiceOptions = [
  // Options for Beauty and Me (service id: "1")
  {
    id: "opt_1_1",
    service_id: "1",
    name: "Classic Manicure",
    description: "Basic nail care with polish application",
    duration: 45,
    price: 450,
    is_default: true,
    created_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "opt_1_2",
    service_id: "1",
    name: "Gel Manicure",
    description: "Long-lasting gel polish application",
    duration: 60,
    price: 550,
    is_default: false,
    created_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "opt_1_3",
    service_id: "1",
    name: "French Manicure",
    description: "Classic French style manicure",
    duration: 50,
    price: 500,
    is_default: false,
    created_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "opt_1_4",
    service_id: "1",
    name: "Nail Art Design",
    description: "Custom nail art with detailed designs",
    duration: 75,
    price: 650,
    is_default: false,
    created_at: "2024-01-01T00:00:00Z"
  },

  // Options for Elite Hair Studio (service id: "2")
  {
    id: "opt_2_1",
    service_id: "2",
    name: "Haircut & Style",
    description: "Professional haircut with styling",
    duration: 60,
    price: 500,
    is_default: true,
    created_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "opt_2_2",
    service_id: "2",
    name: "Cut, Color & Style",
    description: "Complete hair transformation with color",
    duration: 120,
    price: 850,
    is_default: false,
    created_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "opt_2_3",
    service_id: "2",
    name: "Highlights Package",
    description: "Professional highlights with cut and style",
    duration: 150,
    price: 1200,
    is_default: false,
    created_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "opt_2_4",
    service_id: "2",
    name: "Keratin Treatment",
    description: "Smoothing keratin treatment with style",
    duration: 180,
    price: 1500,
    is_default: false,
    created_at: "2024-01-01T00:00:00Z"
  },

  // Options for Wellness Spa Center (service id: "3")
  {
    id: "opt_3_1",
    service_id: "3",
    name: "Swedish Massage",
    description: "Classic relaxing Swedish massage",
    duration: 60,
    price: 750,
    is_default: true,
    created_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "opt_3_2",
    service_id: "3",
    name: "Deep Tissue Massage",
    description: "Therapeutic deep tissue massage",
    duration: 60,
    price: 850,
    is_default: false,
    created_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "opt_3_3",
    service_id: "3",
    name: "Hot Stone Massage",
    description: "Relaxing massage with heated stones",
    duration: 75,
    price: 950,
    is_default: false,
    created_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "opt_3_4",
    service_id: "3",
    name: "Couples Massage",
    description: "Relaxing massage for two people",
    duration: 60,
    price: 1400,
    is_default: false,
    created_at: "2024-01-01T00:00:00Z"
  },

  // Options for Perfect Lashes (service id: "4")
  {
    id: "opt_4_2",
    service_id: "4",
    name: "Volume Lash Extensions",
    description: "Dramatic volume lash extensions",
    duration: 150,
    price: 750,
    is_default: false,
    created_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "opt_4_3",
    service_id: "4",
    name: "Lash Lift & Tint",
    description: "Natural lash enhancement with lift and tint",
    duration: 60,
    price: 350,
    is_default: false,
    created_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "opt_4_4",
    service_id: "4",
    name: "Eyebrow Shaping & Tint",
    description: "Professional eyebrow shaping with tinting",
    duration: 45,
    price: 250,
    is_default: false,
    created_at: "2024-01-01T00:00:00Z"
  },

  // Options for Radiant Skin Clinic (service id: "5")
  {
    id: "opt_5_1",
    service_id: "5",
    name: "Classic Facial",
    description: "Deep cleansing and moisturizing facial",
    duration: 60,
    price: 600,
    is_default: true,
    created_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "opt_5_2",
    service_id: "5",
    name: "Anti-Aging Facial",
    description: "Advanced anti-aging treatment with serums",
    duration: 75,
    price: 850,
    is_default: false,
    created_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "opt_5_3",
    service_id: "5",
    name: "Acne Treatment Facial",
    description: "Specialized treatment for acne-prone skin",
    duration: 60,
    price: 700,
    is_default: false,
    created_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "opt_5_4",
    service_id: "5",
    name: "Hydrating Facial",
    description: "Intensive hydration treatment for dry skin",
    duration: 75,
    price: 750,
    is_default: false,
    created_at: "2024-01-01T00:00:00Z"
  }
];

export const mockServices = [
  {
    id: "1",
    name: "Beauty and Me",
    description: "Professional nail care and beauty treatments with certified specialists",
    price: 450,
    duration: 45,
    category_id: "4",
    image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=300&h=200&fit=crop",
    rating: 4.4,
    reviews_count: 214,
    professional_name: "Anna Andersson",
    salon_name: "Beauty and Me",
    location: "Lützengatan 1, Stockholm",
    distance: "2.3 km",
    available_times: ["09:00", "10:30", "14:00", "15:30"],
    certificate_images: [
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1554224154-22dec7ec8818?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1554224154-26032fced26d?w=400&h=300&fit=crop"
    ],
    before_after_images: [
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=200&fit=crop",
      "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=300&h=200&fit=crop"
    ],
    available_time_text: "Time from 14:00, today (1 other times)",
    welcome_message: "Welcome to Beauty and Me!",
    special_note: "NOTE! EVERY SATURDAY AND SUNDAY WE HAVE EXTENDED HOURS AND SPECIAL OFFERS",
    payment_methods: ["Gift Card", "Klarna", "Industry Organization"],
    is_favorite: false,
    created_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "2",
    name: "Elite Hair Studio",
    description: "Premium hair styling and cutting services with award-winning stylists",
    price: 650,
    duration: 90,
    category_id: "2",
    image: "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=300&h=200&fit=crop",
    rating: 4.8,
    reviews_count: 156,
    professional_name: "Erik Johansson",
    salon_name: "Elite Hair Studio",
    location: "Götgatan 15, Stockholm",
    distance: "1.5 km",
    available_times: ["11:00", "13:00", "16:00", "18:00"],
    certificate_images: [
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&h=300&fit=crop"
    ],
    before_after_images: [
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=300&h=200&fit=crop",
      "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=300&h=200&fit=crop"
    ],
    available_time_text: "Time from 16:00, today (3 other times)",
    welcome_message: "Welcome to Elite Hair Studio!",
    special_note: "Walk-in customers welcome during weekdays",
    payment_methods: ["Gift Card", "Klarna"],
    is_favorite: true,
    created_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "3",
    name: "Wellness Spa Center",
    description: "Relaxing massage therapy and wellness treatments in a peaceful environment",
    price: 850,
    duration: 60,
    category_id: "3",
    image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=300&h=200&fit=crop",
    rating: 4.9,
    reviews_count: 89,
    professional_name: "Maria Larsson",
    salon_name: "Wellness Spa Center",
    location: "Södermalm, Stockholm",
    distance: "2.1 km",
    available_times: ["10:00", "12:00", "15:00", "17:00"],
    certificate_images: [
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1554224154-22dec7ec8818?w=400&h=300&fit=crop"
    ],
    before_after_images: [
      "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=300&h=200&fit=crop",
      "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=300&h=200&fit=crop"
    ],
    available_time_text: "Time from 15:00, today (2 other times)",
    welcome_message: "Welcome to our peaceful wellness center!",
    special_note: "First time customers get 15% discount on all treatments",
    payment_methods: ["Gift Card", "Klarna", "Industry Organization"],
    is_favorite: false,
    created_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "4",
    name: "Perfect Lashes",
    description: "Expert eyelash extensions and eyebrow treatments",
    price: 550,
    duration: 120,
    category_id: "5",
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=200&fit=crop",
    rating: 4.7,
    reviews_count: 203,
    professional_name: "Sofia Nilsson",
    salon_name: "Perfect Lashes",
    location: "Vasastan, Stockholm",
    distance: "3.1 km",
    available_times: ["09:30", "12:30", "15:30"],
    certificate_images: [
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&h=300&fit=crop"
    ],
    before_after_images: [
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=200&fit=crop",
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=200&fit=crop"
    ],
    available_time_text: "Time from 12:30, today (2 other times)",
    welcome_message: "Welcome to Perfect Lashes!",
    special_note: "Book online for 10% discount on first visit",
    payment_methods: ["Gift Card", "Klarna"],
    is_favorite: true,
    created_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "5",
    name: "Radiant Skin Clinic",
    description: "Professional skincare treatments and facial therapies",
    price: 750,
    duration: 75,
    category_id: "7",
    image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=300&h=200&fit=crop",
    rating: 4.6,
    reviews_count: 142,
    professional_name: "Linda Bergström",
    salon_name: "Radiant Skin Clinic",
    location: "Östermalm, Stockholm",
    distance: "1.8 km",
    available_times: ["10:00", "13:00", "16:00"],
    certificate_images: [
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1554224154-22dec7ec8818?w=400&h=300&fit=crop"
    ],
    before_after_images: [
      "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=300&h=200&fit=crop",
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=300&h=200&fit=crop"
    ],
    available_time_text: "Time from 13:00, today (2 other times)",
    welcome_message: "Welcome to Radiant Skin Clinic!",
    special_note: "Free skin consultation with every treatment",
    payment_methods: ["Gift Card", "Klarna", "Industry Organization"],
    is_favorite: false,
    created_at: "2024-01-01T00:00:00Z"
  }
];

export const mockUsers = [
  {
    id: '1',
    email: 'user@example.com',
    full_name: 'John Doe',
    avatar_url: 'https://randomuser.me/api/portraits/men/1.jpg',
    phone: '+46701234567',
    created_at: new Date().toISOString(),
  },
];

export const mockBookings = [
  {
    id: '1',
    user_id: '1',
    service_id: '1',
    service_name: 'Beauty and Me',
    professional_name: 'Anna Andersson',
    salon_name: 'Beauty and Me',
    date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    time: '14:00',
    price: 450,
    status: 'confirmed',
    notes: 'Regular nail treatment',
    created_at: new Date().toISOString(),
  },
];

export const mockFavorites = [
  {
    id: '1',
    user_id: '1',
    service_id: '2',
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    user_id: '1',
    service_id: '4',
    created_at: new Date().toISOString(),
  },
];

export const mockReviews = [
  {
    id: '1',
    user_id: '1',
    service_id: '1',
    rating: 5,
    comment: 'Amazing nail treatment! Highly professional service.',
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    user_id: '1',
    service_id: '2',
    rating: 5,
    comment: 'Best hair salon in Stockholm! Will definitely come back.',
    created_at: new Date().toISOString(),
  },
];

export const mockPromotions = [
  {
    id: '1',
    title: 'First Time Discount',
    description: '20% discount on your first booking',
    discount_percentage: 20,
    code: 'FIRST20',
    expires_at: '2024-12-31T23:59:59Z',
    image: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=400&h=200&fit=crop',
    created_at: new Date().toISOString()
  },
  {
    id: '2', 
    title: 'Last Minute Offer',
    description: 'Up to 50% discount on available slots today',
    discount_percentage: 50,
    code: 'LASTMIN50',
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=200&fit=crop',
    created_at: new Date().toISOString()
  }
];