export type SlotMode = 'individual' | 'continuous';

export interface EVProfile {
  id: string;
  name: string;
  type: 'ev' | 'battery';
  capacity: number; // kWh
  maxChargingRate: number; // kW
  createdAt: string;
  updatedAt: string;
}

export interface ChargingCalculation {
  profileId: string;
  currentCharge: number; // percentage
  targetCharge: number; // percentage
  energyNeeded: number; // kWh
  estimatedDuration: number; // minutes
  desiredFinishTime?: Date; // optional desired completion time
  bestStartTime: Date;
  bestEndTime: Date;
  estimatedCost: number; // pence
  averageRate: number; // p/kWh
  cheapestSlots: ChargingSlot[];
}

export interface ChargingSlot {
  startTime: Date;
  endTime: Date;
  rate: number; // p/kWh
  energyCharged: number; // kWh
  cost: number; // pence
}

export interface ChargingLogEntry {
  id: string;
  profileId: string;
  profileName: string;
  createdAt: string;
  updatedAt: string;
  note?: string;
  
  // Initial estimates
  initialCurrentCharge: number; // percentage
  initialTargetCharge: number; // percentage
  estimatedEnergyNeeded: number; // kWh
  estimatedCost: number; // pence
  estimatedAvgRate: number; // p/kWh
  recommendedStartTime: string;
  recommendedEndTime: string;
  
  // Actual values (updated by user)
  actualStartTime?: string;
  actualEndTime?: string;
  actualEnergyDelivered?: number; // kWh
  
  // Calculated from actuals
  actualCost?: number; // pence
  actualAvgRate?: number; // p/kWh
  actualChargingRate?: number; // kW
  
  status: 'planned' | 'in_progress' | 'completed';
}

export interface ChargingFormData {
  profileId: string;
  currentCharge: number;
  targetCharge: number;
}
