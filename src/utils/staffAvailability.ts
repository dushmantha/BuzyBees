// Staff Availability Utility Functions

export interface StaffWorkSchedule {
  monday: { isWorking: boolean; startTime: string; endTime: string };
  tuesday: { isWorking: boolean; startTime: string; endTime: string };
  wednesday: { isWorking: boolean; startTime: string; endTime: string };
  thursday: { isWorking: boolean; startTime: string; endTime: string };
  friday: { isWorking: boolean; startTime: string; endTime: string };
  saturday: { isWorking: boolean; startTime: string; endTime: string };
  sunday: { isWorking: boolean; startTime: string; endTime: string };
}

export interface StaffLeaveDate {
  title: string;
  startDate: string;
  endDate: string;
  type: string;
}

export interface StaffMember {
  id: string;
  name: string;
  work_schedule: StaffWorkSchedule;
  leave_dates: StaffLeaveDate[];
}

const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// Convert time string to minutes for easier comparison
export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Format minutes back to time string
export const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// Check if a specific date is within staff's leave period
export const isOnLeave = (date: string, leaveDates: StaffLeaveDate[]): boolean => {
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  return leaveDates.some(leave => {
    const startDate = new Date(leave.startDate);
    const endDate = new Date(leave.endDate);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    return checkDate >= startDate && checkDate <= endDate;
  });
};

// Get staff availability for a specific date
export const getStaffAvailabilityForDate = (
  date: string,
  staff: StaffMember
): { isAvailable: boolean; workingHours?: { start: string; end: string }; reason?: string } => {
  // Safety check: If staff doesn't have work_schedule data yet (database migration not applied)
  if (!staff.work_schedule || typeof staff.work_schedule !== 'object') {
    console.warn(`⚠️ Staff ${staff.name} missing work_schedule data - database migration needed`);
    return { 
      isAvailable: true, 
      reason: 'No schedule data available (using default availability)' 
    };
  }

  const dateObj = new Date(date);
  const dayOfWeek = DAYS_OF_WEEK[dateObj.getDay()];
  
  // Check if staff is on leave (with safety check)
  if (staff.leave_dates && Array.isArray(staff.leave_dates) && isOnLeave(date, staff.leave_dates)) {
    return { 
      isAvailable: false, 
      reason: 'Staff member is on leave' 
    };
  }
  
  // Check regular work schedule
  const daySchedule = staff.work_schedule[dayOfWeek as keyof StaffWorkSchedule];
  
  // Safety check: If daySchedule is undefined
  if (!daySchedule || typeof daySchedule !== 'object') {
    console.warn(`⚠️ Staff ${staff.name} missing schedule for ${dayOfWeek}`);
    return { 
      isAvailable: true, 
      reason: `No ${dayOfWeek} schedule data available` 
    };
  }
  
  if (!daySchedule.isWorking) {
    return { 
      isAvailable: false, 
      reason: `Staff member doesn't work on ${dayOfWeek}s` 
    };
  }
  
  return {
    isAvailable: true,
    workingHours: {
      start: daySchedule.startTime,
      end: daySchedule.endTime
    }
  };
};

// Generate available time slots for a specific date and staff member
export const generateStaffTimeSlots = (
  date: string,
  staff: StaffMember,
  serviceDuration: number,
  bookedSlots: { start: string; end: string }[] = []
): Array<{
  id: string;
  startTime: string;
  endTime: string;
  available: boolean;
  staffAvailable: boolean;
  reason?: string;
}> => {
  const availability = getStaffAvailabilityForDate(date, staff);
  const slots: any[] = [];
  
  if (!availability.isAvailable || !availability.workingHours) {
    // Return empty array if staff is not available
    return [];
  }
  
  const workStart = timeToMinutes(availability.workingHours.start);
  const workEnd = timeToMinutes(availability.workingHours.end);
  
  // Generate slots within working hours
  for (let time = workStart; time <= workEnd - serviceDuration; time += 30) { // 30-minute intervals
    const slotEnd = time + serviceDuration;
    const startTimeStr = minutesToTime(time);
    const endTimeStr = minutesToTime(slotEnd);
    
    // Check if slot conflicts with existing bookings
    const isBooked = bookedSlots.some(booked => {
      const bookedStart = timeToMinutes(booked.start);
      const bookedEnd = timeToMinutes(booked.end);
      return (time < bookedEnd && slotEnd > bookedStart);
    });
    
    slots.push({
      id: startTimeStr,
      startTime: startTimeStr,
      endTime: endTimeStr,
      available: !isBooked,
      staffAvailable: true
    });
  }
  
  return slots;
};

// Get staff availability status for calendar marking
export const getStaffDateStatus = (
  date: string,
  staff: StaffMember
): 'available' | 'unavailable' | 'leave' => {
  const dateObj = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Check if date is in the past
  if (dateObj < today) {
    return 'unavailable';
  }
  
  // Check if staff is on leave
  if (isOnLeave(date, staff.leave_dates)) {
    return 'leave';
  }
  
  // Check regular work schedule
  const dayOfWeek = DAYS_OF_WEEK[dateObj.getDay()];
  const daySchedule = staff.work_schedule[dayOfWeek as keyof StaffWorkSchedule];
  
  return daySchedule.isWorking ? 'available' : 'unavailable';
};

// Generate calendar marked dates for a staff member
export const generateStaffCalendarMarks = (
  staff: StaffMember,
  startDate: Date = new Date(),
  daysAhead: number = 60
): Record<string, any> => {
  const marks: Record<string, any> = {};
  
  for (let i = 0; i < daysAhead; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    const status = getStaffDateStatus(dateStr, staff);
    
    switch (status) {
      case 'unavailable':
        marks[dateStr] = {
          disabled: true,
          disableTouchEvent: true,
          customStyles: {
            container: { backgroundColor: '#E5E7EB' },
            text: { color: '#9CA3AF', fontWeight: '500' }
          },
          marked: true,
          dotColor: '#9CA3AF'
        };
        break;
        
      case 'leave':
        marks[dateStr] = {
          disabled: true,
          disableTouchEvent: true,
          customStyles: {
            container: { backgroundColor: '#FEE2E2' },
            text: { color: '#DC2626', fontWeight: '600' }
          },
          marked: true,
          dotColor: '#EF4444'
        };
        break;
        
      case 'available':
        marks[dateStr] = {
          marked: true,
          dotColor: '#10B981',
          customStyles: {
            container: { backgroundColor: 'transparent' },
            text: { color: '#1F2937' }
          }
        };
        break;
    }
  }
  
  return marks;
};