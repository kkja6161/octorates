import { ConsumptionEntry, ConsumptionEntryWithRate } from '@/types/energy';

export interface SmartFilledEntry extends ConsumptionEntryWithRate {
  isEstimated: boolean;
  estimationSource?: 'seven_day_average';
}

export interface SmartFillResult {
  entries: SmartFilledEntry[];
  filledCount: number;
  totalSlots: number;
  missingSlots: number;
}

function getTimeSlotKey(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function detectMissingSlots(
  entries: ConsumptionEntry[],
  startDate: Date,
  endDate: Date
): { missingSlots: Date[]; existingSlots: Map<string, ConsumptionEntry> } {
  const existingSlots = new Map<string, ConsumptionEntry>();
  
  entries.forEach(entry => {
    const key = new Date(entry.interval_start).toISOString();
    existingSlots.set(key, entry);
  });

  const missingSlots: Date[] = [];
  const current = new Date(startDate);
  current.setMinutes(0, 0, 0);
  
  if (current.getMinutes() !== 0 && current.getMinutes() !== 30) {
    current.setMinutes(current.getMinutes() < 30 ? 0 : 30);
  }

  while (current < endDate) {
    const key = current.toISOString();
    const entry = existingSlots.get(key);
    
    if (!entry || entry.consumption === null || entry.consumption === undefined) {
      missingSlots.push(new Date(current));
    }
    
    current.setMinutes(current.getMinutes() + 30);
  }

  return { missingSlots, existingSlots };
}

export function calculateSevenDayAverage(
  entries: ConsumptionEntry[],
  targetSlot: Date
): number | null {
  const targetTimeKey = getTimeSlotKey(targetSlot);
  const targetDateKey = getDateKey(targetSlot);
  
  const matchingEntries: number[] = [];
  
  for (let daysBack = 1; daysBack <= 7; daysBack++) {
    const checkDate = new Date(targetSlot);
    checkDate.setDate(checkDate.getDate() - daysBack);
    const checkDateKey = getDateKey(checkDate);
    
    const matchingEntry = entries.find(entry => {
      const entryDate = new Date(entry.interval_start);
      const entryDateKey = getDateKey(entryDate);
      const entryTimeKey = getTimeSlotKey(entryDate);
      
      return entryDateKey === checkDateKey && 
             entryTimeKey === targetTimeKey &&
             entry.consumption !== null &&
             entry.consumption !== undefined &&
             entry.consumption >= 0;
    });
    
    if (matchingEntry) {
      matchingEntries.push(matchingEntry.consumption);
    }
  }

  if (matchingEntries.length === 0) {
    console.log(`[SmartFill] No historical data for slot ${targetTimeKey} on ${targetDateKey}`);
    return null;
  }

  const average = matchingEntries.reduce((sum, val) => sum + val, 0) / matchingEntries.length;
  console.log(`[SmartFill] Calculated average for ${targetTimeKey}: ${average.toFixed(3)} kWh from ${matchingEntries.length} days`);
  
  return average;
}

export function smartFillConsumption(
  entries: ConsumptionEntry[],
  allHistoricalEntries: ConsumptionEntry[],
  startDate: Date,
  endDate: Date
): SmartFillResult {
  console.log('[SmartFill] ========== SMART FILL PROCESSING ==========');
  console.log(`[SmartFill] Input entries: ${entries.length}`);
  console.log(`[SmartFill] Historical entries available: ${allHistoricalEntries.length}`);
  console.log(`[SmartFill] Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

  const { missingSlots, existingSlots } = detectMissingSlots(entries, startDate, endDate);
  
  console.log(`[SmartFill] Missing slots detected: ${missingSlots.length}`);

  const filledEntries: SmartFilledEntry[] = [];
  let filledCount = 0;

  entries.forEach(entry => {
    const isNullOrMissing = entry.consumption === null || entry.consumption === undefined;
    
    if (isNullOrMissing) {
      const slotDate = new Date(entry.interval_start);
      const estimatedValue = calculateSevenDayAverage(allHistoricalEntries, slotDate);
      
      if (estimatedValue !== null) {
        filledEntries.push({
          ...entry,
          consumption: estimatedValue,
          rate: null,
          cost: 0,
          isEstimated: true,
          estimationSource: 'seven_day_average',
        });
        filledCount++;
      } else {
        filledEntries.push({
          ...entry,
          consumption: 0,
          rate: null,
          cost: 0,
          isEstimated: true,
          estimationSource: 'seven_day_average',
        });
      }
    } else {
      filledEntries.push({
        ...entry,
        rate: null,
        cost: 0,
        isEstimated: false,
      });
    }
  });

  missingSlots.forEach(slotDate => {
    const slotKey = slotDate.toISOString();
    if (!existingSlots.has(slotKey)) {
      const estimatedValue = calculateSevenDayAverage(allHistoricalEntries, slotDate);
      
      if (estimatedValue !== null) {
        const intervalEnd = new Date(slotDate);
        intervalEnd.setMinutes(intervalEnd.getMinutes() + 30);
        
        filledEntries.push({
          consumption: estimatedValue,
          interval_start: slotDate.toISOString(),
          interval_end: intervalEnd.toISOString(),
          rate: null,
          cost: 0,
          isEstimated: true,
          estimationSource: 'seven_day_average',
        });
        filledCount++;
      }
    }
  });

  filledEntries.sort((a, b) => 
    new Date(a.interval_start).getTime() - new Date(b.interval_start).getTime()
  );

  const totalSlots = Math.ceil((endDate.getTime() - startDate.getTime()) / (30 * 60 * 1000));

  console.log(`[SmartFill] ========== SMART FILL COMPLETE ==========`);
  console.log(`[SmartFill] Total slots expected: ${totalSlots}`);
  console.log(`[SmartFill] Entries filled: ${filledCount}`);
  console.log(`[SmartFill] Final entry count: ${filledEntries.length}`);

  return {
    entries: filledEntries,
    filledCount,
    totalSlots,
    missingSlots: missingSlots.length,
  };
}

export function hasEstimatedData(entries: SmartFilledEntry[]): boolean {
  return entries.some(entry => entry.isEstimated);
}

export function getEstimatedPercentage(entries: SmartFilledEntry[]): number {
  if (entries.length === 0) return 0;
  const estimatedCount = entries.filter(entry => entry.isEstimated).length;
  return Math.round((estimatedCount / entries.length) * 100);
}
