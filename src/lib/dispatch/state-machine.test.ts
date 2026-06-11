import { isValidTransition, getTransitionError, validateTransition, ShipmentStatus } from './state-machine';

// Basic assertion helpers
const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(`❌ Test Failed: ${message}`);
  }
  console.log(`✅ ${message}`);
};

const runTests = () => {
  console.log('🚀 Running Dispatch State Machine finite state transition tests...');

  // Test Case 1: Valid Sequential Transitions
  assert(isValidTransition('pending', 'assigned') === true, 'Allows transition: pending ➔ assigned');
  assert(isValidTransition('assigned', 'in_transit') === true, 'Allows transition: assigned ➔ in_transit');
  assert(isValidTransition('in_transit', 'delivered') === true, 'Allows transition: in_transit ➔ delivered');

  // Test Case 2: Valid Self Transitions
  assert(isValidTransition('pending', 'pending') === true, 'Allows self-loop: pending ➔ pending');

  // Test Case 3: Invalid Non-Sequential Transitions
  assert(isValidTransition('pending', 'in_transit') === false, 'Blocks skip transition: pending ➔ in_transit');
  assert(isValidTransition('pending', 'delivered') === false, 'Blocks skip transition: pending ➔ delivered');
  assert(isValidTransition('assigned', 'delivered') === false, 'Blocks skip transition: assigned ➔ delivered');

  // Test Case 4: Invalid Reverse/Backward Transitions
  assert(isValidTransition('assigned', 'pending') === true, 'Allows reassignment fallback: assigned ➔ pending');
  assert(isValidTransition('in_transit', 'assigned') === false, 'Blocks reverse transition: in_transit ➔ assigned');
  assert(isValidTransition('in_transit', 'pending') === false, 'Blocks reverse transition: in_transit ➔ pending');
  assert(isValidTransition('delivered', 'in_transit') === false, 'Blocks final state escape: delivered ➔ in_transit');
  assert(isValidTransition('delivered', 'pending') === false, 'Blocks final state escape: delivered ➔ pending');

  // Test Case 5: Case Insensitivity & Whitespace tolerance
  assert(isValidTransition('  PENDING  ', ' Assigned ') === true, 'Ignores casing and leading/trailing spaces');

  // Test Case 6: validateTransition raises errors on invalid moves
  let threwError = false;
  try {
    validateTransition('pending', 'delivered');
  } catch (err: any) {
    threwError = true;
    assert(err.message.includes("Invalid shipment status transition"), 'validateTransition throws descriptive error message');
  }
  assert(threwError === true, 'validateTransition throws error for invalid transitions');

  let didNotThrow = true;
  try {
    validateTransition('pending', 'assigned');
  } catch (err) {
    didNotThrow = false;
  }
  assert(didNotThrow === true, 'validateTransition does not throw for valid transitions');

  console.log('\n🌟 All Dispatch State Machine unit tests passed successfully!');
};

// Execute if run directly
try {
  runTests();
} catch (error: any) {
  console.error(error.message);
  process.exit(1);
}
