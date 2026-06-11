import { calculateMatchScore, calculateCarrierPrice, getTop3Carriers } from './recommender';

// Basic assertion helpers
const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(`❌ Test Failed: ${message}`);
  }
  console.log(`✅ ${message}`);
};

const runTests = () => {
  console.log('🚀 Running AI Dispatch Assistant scoring engine tests...');

  // Test Case 1: Proximity and Capacity Fit calculation
  const shipment = {
    origin_lat: 28.6304, // Connaught Place
    origin_lng: 77.2177,
    capacity_kg: 500
  };

  const closeCarrier = {
    user_id: 'c-1',
    business_name: 'Close Carrier',
    last_known_lat: 28.6304, // 0 km away
    last_known_lng: 77.2177,
    vehicle_capacity_kg: 500, // exact capacity match
    years_experience: 5, // maximum exp multiplier
    average_rating: 5.0, // perfect rating
    reliability_score: 100 // perfect reliability score
  };

  const farCarrier = {
    user_id: 'c-2',
    business_name: 'Far Carrier',
    last_known_lat: 28.4950, // Cyber City (~20km away)
    last_known_lng: 77.0890,
    vehicle_capacity_kg: 1000, // oversized capacity
    years_experience: 1,
    average_rating: 4.0
  };

  const tinyCarrier = {
    user_id: 'c-3',
    business_name: 'Tiny Carrier',
    last_known_lat: 28.6304, // 0 km
    last_known_lng: 77.2177,
    vehicle_capacity_kg: 300, // too small for 500kg shipment
    years_experience: 5,
    average_rating: 5.0
  };

  // 1. Assert Match Scores
  const scoreClose = calculateMatchScore(shipment, closeCarrier);
  const scoreFar = calculateMatchScore(shipment, farCarrier);
  const scoreTiny = calculateMatchScore(shipment, tinyCarrier);

  assert(scoreClose.score === 1.0, 'Perfect driver receives a 1.0 (100%) match score');
  assert(scoreTiny.score === 0, 'Carrier with insufficient capacity is filtered out (score is 0)');
  assert(scoreFar.score < scoreClose.score, 'Closer carrier receives a higher score than a distant, lower rated one');
  assert(scoreClose.distance === 0, 'Distance calculation between identical coordinates is 0km');
  assert(scoreFar.distance > 15, 'Distance between Connaught Place and Gurgaon is calculated correctly (>15km)');

  // 2. Assert Pricing multipliers
  const priceStandard = calculateCarrierPrice(10, 100, {
    user_id: 'c-std',
    years_experience: 1,
    average_rating: 4.5,
    vehicle_type: 'Commercial Van'
  });

  const priceEco = calculateCarrierPrice(10, 100, {
    user_id: 'c-eco',
    years_experience: 1,
    average_rating: 4.5,
    vehicle_type: 'Electric 3-Wheeler'
  });

  const priceHeavy = calculateCarrierPrice(10, 100, {
    user_id: 'c-heavy',
    years_experience: 5,
    average_rating: 5.0,
    vehicle_type: 'Tata 407 Truck'
  });

  assert(priceEco.cost < priceStandard.cost, 'Eco-friendly vehicles receive discounted rates');
  assert(priceHeavy.cost > priceStandard.cost, 'Heavy duty veteran vehicles charge a premium rate');

  // 3. Assert sorting in getTop3Carriers
  const topCarriers = getTop3Carriers(shipment, [farCarrier, closeCarrier, tinyCarrier]);
  
  assert(topCarriers.length === 2, 'Oversized and perfect carriers matched; tiny carrier filtered out');
  assert(topCarriers[0].user_id === 'c-1', 'Highest scoring carrier is placed at index 0');
  assert(topCarriers[0].isRecommended === true, 'Top scoring carrier is flagged as recommended');
  assert(topCarriers[1].isRecommended === false, 'Runner-up is not flagged as recommended');
  assert(topCarriers[0].calculatedCost !== undefined, 'Recommended carriers have calculated pricing costs');

  console.log('\n🌟 All AI Dispatch Assistant unit tests passed successfully!');
};

// Execute if run directly
try {
  runTests();
} catch (error: any) {
  console.error(error.message);
  process.exit(1);
}
