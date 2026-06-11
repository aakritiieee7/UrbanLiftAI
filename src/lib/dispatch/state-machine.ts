export type ShipmentStatus = 'pending' | 'assigned' | 'in_transit' | 'delivered';

export const VALID_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  pending: ['pending', 'assigned'],
  assigned: ['pending', 'in_transit'],
  in_transit: ['delivered'],
  delivered: [] // Final state
};

export const isValidTransition = (fromStatus: string, toStatus: string): boolean => {
  const normalizedFrom = fromStatus.toLowerCase().trim() as ShipmentStatus;
  const normalizedTo = toStatus.toLowerCase().trim() as ShipmentStatus;

  // If status is not in the states map, reject it
  if (!VALID_TRANSITIONS[normalizedFrom]) {
    return false;
  }

  return VALID_TRANSITIONS[normalizedFrom].includes(normalizedTo);
};

export const getTransitionError = (fromStatus: string, toStatus: string): string => {
  return `Invalid shipment status transition from '${fromStatus}' to '${toStatus}'. Must transition sequentially: pending ➔ assigned ➔ in_transit ➔ delivered.`;
};

export const validateTransition = (fromStatus: string, toStatus: string): void => {
  if (!isValidTransition(fromStatus, toStatus)) {
    throw new Error(getTransitionError(fromStatus, toStatus));
  }
};
