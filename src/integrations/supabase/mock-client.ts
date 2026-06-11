import type { Database } from './types';

// Helper to seed localStorage mock database
const seedMockDatabase = () => {
  const checkAndSeed = (key: string, defaultData: any) => {
    if (!localStorage.getItem(`mock_db_${key}`)) {
      localStorage.setItem(`mock_db_${key}`, JSON.stringify(defaultData));
    }
  };

  // Seed shipper profiles
  checkAndSeed('shipper_profiles', [
    {
      user_id: 'shipper-123',
      auth_email: 'shipper@urbanlift.ai',
      username: 'shipper',
      business_name: 'Delhi Fabrics MSME',
      company_name: 'Delhi Fabrics',
      city: 'Delhi',
      role: 'shipper',
      phone: '9876543210',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ]);

  // Seed carrier profiles (Delhi/NCR with lat/lng and reliability scores)
  checkAndSeed('carrier_profiles', [
    {
      user_id: 'carrier-123',
      auth_email: 'carrier@urbanlift.ai',
      username: 'carrier',
      business_name: 'Sharma Cargo Services',
      company_name: 'Sharma Cargo',
      city: 'Delhi',
      role: 'carrier',
      phone: '+91-98765-43210',
      vehicle_type: 'Tata Ace',
      vehicle_capacity_kg: 850,
      years_experience: 5,
      last_known_lat: 28.6304,
      last_known_lng: 77.2177,
      average_rating: 4.90,
      reliability_score: 98,
      acceptance_rate: 96,
      completion_rate: 99,
      on_time_performance: 97,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      user_id: 'carrier-234',
      auth_email: 'carrier2@urbanlift.ai',
      username: 'carrier2',
      business_name: 'Gupta Logistics',
      company_name: 'Gupta Logistics',
      city: 'Noida',
      role: 'carrier',
      phone: '+91-98111-22233',
      vehicle_type: 'Mahindra Bolero',
      vehicle_capacity_kg: 1200,
      years_experience: 2,
      last_known_lat: 28.5708,
      last_known_lng: 77.3261,
      average_rating: 4.70,
      reliability_score: 92,
      acceptance_rate: 89,
      completion_rate: 95,
      on_time_performance: 93,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      user_id: 'carrier-345',
      auth_email: 'carrier3@urbanlift.ai',
      username: 'carrier3',
      business_name: 'Delhi Last-Mile E-Trans',
      company_name: 'Delhi Last-Mile',
      city: 'Delhi',
      role: 'carrier',
      phone: '+91-99999-88888',
      vehicle_type: 'Electric 3-Wheeler',
      vehicle_capacity_kg: 500,
      years_experience: 1,
      last_known_lat: 28.6453,
      last_known_lng: 77.1907,
      average_rating: 4.50,
      reliability_score: 94,
      acceptance_rate: 93,
      completion_rate: 96,
      on_time_performance: 95,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      user_id: 'carrier-456',
      auth_email: 'carrier4@urbanlift.ai',
      username: 'carrier4',
      business_name: 'Hari Om Transport',
      company_name: 'Hari Om Transport',
      city: 'Gurgaon',
      role: 'carrier',
      phone: '+91-98123-45678',
      vehicle_type: 'Tata 407',
      vehicle_capacity_kg: 2500,
      years_experience: 8,
      last_known_lat: 28.4950,
      last_known_lng: 77.0890,
      average_rating: 4.80,
      reliability_score: 95,
      acceptance_rate: 94,
      completion_rate: 97,
      on_time_performance: 96,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      user_id: 'carrier-567',
      auth_email: 'carrier5@urbanlift.ai',
      username: 'carrier5',
      business_name: 'Dwarka Logistics',
      company_name: 'Dwarka Logistics',
      city: 'Delhi',
      role: 'carrier',
      phone: '+91-97777-66666',
      vehicle_type: 'Maruti Eeco Cargo',
      vehicle_capacity_kg: 600,
      years_experience: 3,
      last_known_lat: 28.5830,
      last_known_lng: 77.0500,
      average_rating: 4.30,
      reliability_score: 88,
      acceptance_rate: 85,
      completion_rate: 91,
      on_time_performance: 89,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ]);

  // Seed default shipments
  checkAndSeed('shipments', [
    {
      id: 'shipment-101',
      shipper_id: 'shipper-123',
      carrier_id: 'carrier-123',
      origin: 'Okhla Industrial Area, Delhi',
      destination: 'Connaught Place, Delhi',
      origin_lat: 28.5355,
      origin_lng: 77.2639,
      destination_lat: 28.6304,
      destination_lng: 77.2177,
      capacity_kg: 200,
      status: 'delivered',
      distance_km: 14.2,
      pickup_time: new Date(Date.now() - 86400000 * 2).toISOString(),
      dropoff_time: new Date(Date.now() - 86400000 * 2 + 7200000).toISOString(),
      created_at: new Date(Date.now() - 86400000 * 2 - 3600000).toISOString(),
      updated_at: new Date().toISOString(),
      pooled: false,
    },
    {
      id: 'shipment-102',
      shipper_id: 'shipper-123',
      carrier_id: 'carrier-234',
      origin: 'Noida Sector 62, Noida',
      destination: 'Gurgaon Phase 3, Gurgaon',
      origin_lat: 28.6219,
      origin_lng: 77.3792,
      destination_lat: 28.4950,
      destination_lng: 77.0890,
      capacity_kg: 800,
      status: 'in_transit',
      distance_km: 41.5,
      pickup_time: new Date(Date.now() - 14400000).toISOString(),
      created_at: new Date(Date.now() - 18000000).toISOString(),
      updated_at: new Date().toISOString(),
      pooled: false,
    },
    {
      id: 'shipment-103',
      shipper_id: 'shipper-123',
      carrier_id: null,
      origin: 'Karol Bagh, Delhi',
      destination: 'Dwarka Sector 10, Delhi',
      origin_lat: 28.6453,
      origin_lng: 77.1907,
      destination_lat: 28.5830,
      destination_lng: 77.0500,
      capacity_kg: 450,
      status: 'pending',
      distance_km: 17.8,
      created_at: new Date(Date.now() - 1800000).toISOString(),
      updated_at: new Date().toISOString(),
      pooled: false,
    }
  ]);

  // Seed chatrooms
  checkAndSeed('chatrooms', [
    {
      id: '1',
      name: 'Delhi Shipper Lounge',
      description: 'General discussions for shippers in Delhi/NCR',
      type: 'general',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'NCR Carrier Network',
      description: 'Coordinations and route help for carrier teams',
      type: 'carrier',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '3',
      name: 'Delhi Public Transit Info',
      description: 'Updates about road blockages, rain congestion and timings',
      type: 'general',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ]);

  // Seed chat messages
  checkAndSeed('chat_messages', [
    {
      id: 'msg-1',
      chatroom_id: '1',
      user_id: 'shipper-123',
      message: 'Hello everyone! Looking for recommendations for a reliable light container driver near Okhla.',
      created_at: new Date(Date.now() - 7200000).toISOString(),
      updated_at: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 'msg-2',
      chatroom_id: '1',
      user_id: 'carrier-123',
      message: 'Hi! Sharma Cargo Services is regularly active around Okhla. You can assign us in the dashboard.',
      created_at: new Date(Date.now() - 5400000).toISOString(),
      updated_at: new Date(Date.now() - 5400000).toISOString(),
    }
  ]);

  // Seed forum posts
  checkAndSeed('forum_posts', [
    {
      id: 'post-1',
      title: 'Delhi Traffic Advisory: Waterlogging near Noida Link Road',
      content: 'Heavy waterlogging reported near the Noida Link Road underpass due to morning showers. Suggest taking Akshardham bypass to avoid 40-minute delay.',
      forum_type: 'announcements',
      user_id: 'shipper-123',
      image_url: null,
      created_at: new Date(Date.now() - 10800000).toISOString(),
      updated_at: new Date(Date.now() - 10800000).toISOString(),
    },
    {
      id: 'post-2',
      title: 'How is the EV 3-Wheeler performance on NCR flyovers?',
      content: 'We are planning to transition our secondary fleet to electric 3-wheelers (500kg capacity) for central Delhi deliveries. Does anyone have experience with battery range drops during Delhi heat and flyover climbs?',
      forum_type: 'general',
      user_id: 'carrier-234',
      image_url: null,
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date(Date.now() - 86400000).toISOString(),
    }
  ]);

  // Seed forum replies
  checkAndSeed('forum_replies', [
    {
      id: 'reply-1',
      post_id: 'post-2',
      content: 'We have been using 3 Mahindra E-Alfas for Karol Bagh last-mile deliveries. Flyover climbs are fine, but range drops by about 12% in peak summer if fully loaded. Still highly cost-efficient!',
      user_id: 'carrier-123',
      image_url: null,
      created_at: new Date(Date.now() - 7200000).toISOString(),
      updated_at: new Date(Date.now() - 7200000).toISOString(),
    }
  ]);

  // Seed points balance
  checkAndSeed('points_balances', [
    {
      user_id: 'shipper-123',
      total_points: 25,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      user_id: 'carrier-123',
      total_points: 120,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ]);

  // Seed default shipment events for timeline logging
  checkAndSeed('shipment_events', [
    // Events for shipment-101 (delivered)
    {
      id: 'event-101-1',
      shipment_id: 'shipment-101',
      event_type: 'created',
      event_title: 'Shipment Created',
      event_description: 'Shipper Delhi Fabrics created shipment order of 200kg.',
      created_at: new Date(Date.now() - 86400000 * 2 - 3600000).toISOString(),
      metadata: { origin: 'Okhla Industrial Area, Delhi', destination: 'Connaught Place, Delhi', weight_kg: 200 }
    },
    {
      id: 'event-101-2',
      shipment_id: 'shipment-101',
      event_type: 'recommended',
      event_title: 'AI Match Recommendations Calculated',
      event_description: 'AI Dispatch Assistant evaluated 5 carriers and suggested Sharma Cargo Services.',
      created_at: new Date(Date.now() - 86400000 * 2 - 3500000).toISOString(),
      metadata: {
        recommendations: [
          { carrier_name: 'Sharma Cargo Services', score: 0.98, reason: 'Exceptionally close: 0.0km away' },
          { carrier_name: 'Gupta Logistics', score: 0.81, reason: 'Sufficient space, 7.2km away' }
        ]
      }
    },
    {
      id: 'event-101-3',
      shipment_id: 'shipment-101',
      event_type: 'assigned',
      event_title: 'Carrier Assigned',
      event_description: 'Sharma Cargo Services was selected and assigned.',
      created_at: new Date(Date.now() - 86400000 * 2 - 3000000).toISOString(),
      metadata: { carrier_id: 'carrier-123', carrier_name: 'Sharma Cargo Services', final_cost: 850 }
    },
    {
      id: 'event-101-4',
      shipment_id: 'shipment-101',
      event_type: 'in_transit',
      event_title: 'Shipment In Transit',
      event_description: 'Sharma Cargo Services picked up the cargo and started transit.',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      metadata: { lat: 28.5355, lng: 77.2639 }
    },
    {
      id: 'event-101-5',
      shipment_id: 'shipment-101',
      event_type: 'delivered',
      event_title: 'Shipment Delivered',
      event_description: 'Cargo successfully delivered to Connaught Place, Delhi.',
      created_at: new Date(Date.now() - 86400000 * 2 + 7200000).toISOString(),
      metadata: { lat: 28.6304, lng: 77.2177 }
    },
    // Events for shipment-102 (in_transit)
    {
      id: 'event-102-1',
      shipment_id: 'shipment-102',
      event_type: 'created',
      event_title: 'Shipment Created',
      event_description: 'Shipper Delhi Fabrics created shipment order of 800kg.',
      created_at: new Date(Date.now() - 18000000).toISOString(),
      metadata: { origin: 'Noida Sector 62, Noida', destination: 'Gurgaon Phase 3, Gurgaon', weight_kg: 800 }
    },
    {
      id: 'event-102-2',
      shipment_id: 'shipment-102',
      event_type: 'recommended',
      event_title: 'AI Match Recommendations Calculated',
      event_description: 'AI Dispatch Assistant evaluated available carriers and suggested Gupta Logistics.',
      created_at: new Date(Date.now() - 17900000).toISOString(),
      metadata: {
        recommendations: [
          { carrier_name: 'Gupta Logistics', score: 0.92, reason: 'Optimal vehicle capacity fit' },
          { carrier_name: 'Hari Om Transport', score: 0.79, reason: 'Veteran driver (8y exp), 21km away' }
        ]
      }
    },
    {
      id: 'event-102-3',
      shipment_id: 'shipment-102',
      event_type: 'assigned',
      event_title: 'Carrier Assigned',
      event_description: 'Gupta Logistics was selected and assigned.',
      created_at: new Date(Date.now() - 17500000).toISOString(),
      metadata: { carrier_id: 'carrier-234', carrier_name: 'Gupta Logistics', final_cost: 1600 }
    },
    {
      id: 'event-102-4',
      shipment_id: 'shipment-102',
      event_type: 'in_transit',
      event_title: 'Shipment In Transit',
      event_description: 'Gupta Logistics picked up the cargo and started route transit.',
      created_at: new Date(Date.now() - 14400000).toISOString(),
      metadata: { lat: 28.6219, lng: 77.3792 }
    },
    // Events for shipment-103 (pending)
    {
      id: 'event-103-1',
      shipment_id: 'shipment-103',
      event_type: 'created',
      event_title: 'Shipment Created',
      event_description: 'Shipper Delhi Fabrics created shipment order of 450kg.',
      created_at: new Date(Date.now() - 1800000).toISOString(),
      metadata: { origin: 'Karol Bagh, Delhi', destination: 'Dwarka Sector 10, Delhi', weight_kg: 450 }
    },
    {
      id: 'event-103-2',
      shipment_id: 'shipment-103',
      event_type: 'recommended',
      event_title: 'AI Match Recommendations Calculated',
      event_description: 'AI Dispatch Assistant evaluated carriers and suggested Delhi Last-Mile E-Trans.',
      created_at: new Date(Date.now() - 1700000).toISOString(),
      metadata: {
        recommendations: [
          { carrier_name: 'Delhi Last-Mile E-Trans', score: 0.95, reason: 'Optimal vehicle capacity, close proximity' },
          { carrier_name: 'Dwarka Logistics', score: 0.88, reason: 'Experienced driver (3y exp), 12km away' }
        ]
      }
    }
  ]);

  // Seed default notifications for bell center testing
  checkAndSeed('notifications', [
    {
      id: 'notification-1',
      user_id: 'shipper-123',
      shipment_id: 'shipment-101',
      title: 'Shipment Delivered 🎉',
      message: 'Your Okhla Industrial Area to Connaught Place cargo has been delivered by Sharma Cargo Services.',
      type: 'delivered',
      read: false,
      created_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'notification-2',
      user_id: 'shipper-123',
      shipment_id: 'shipment-102',
      title: 'Shipment In Transit 🚛',
      message: 'Gupta Logistics has picked up your shipment and is in transit to Gurgaon Phase 3.',
      type: 'transit_started',
      read: false,
      created_at: new Date(Date.now() - 7200000).toISOString()
    },
    {
      id: 'notification-3',
      user_id: 'carrier-123',
      shipment_id: 'shipment-101',
      title: 'New Job Assigned 📦',
      message: 'You have been selected by shipper Delhi Fabrics MSME for a 200kg shipment.',
      type: 'assigned',
      read: true,
      created_at: new Date(Date.now() - 10800000).toISOString()
    }
  ]);

  // Seed authenticatable users metadata
  if (!localStorage.getItem('mock_auth_users')) {
    localStorage.setItem('mock_auth_users', JSON.stringify([
      {
        id: 'shipper-123',
        email: 'shipper@urbanlift.ai',
        password: 'password123',
        user_metadata: { role: 'shipper' }
      },
      {
        id: 'carrier-123',
        email: 'carrier@urbanlift.ai',
        password: 'password123',
        user_metadata: { role: 'carrier' }
      }
    ]));
  }
};

// Seed database on script import
seedMockDatabase();

// Chainable mock builder class
class MockBuilder {
  private table: string;
  private data: any[];
  private filters: ((item: any) => boolean)[] = [];
  private orderByField: string | null = null;
  private orderByAscending = true;
  private limitCount: number | null = null;

  constructor(table: string) {
    this.table = table;
    this.data = JSON.parse(localStorage.getItem(`mock_db_${table}`) || '[]');
  }

  select(fields: string = '*') {
    // Basic parser for demonstration, doesn't filter fields but supports nested properties
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push(item => item[column] === value);
    return this;
  }

  in(column: string, values: any[]) {
    this.filters.push(item => values.includes(item[column]));
    return this;
  }

  ilike(column: string, pattern: string) {
    const cleanPattern = pattern.replace(/%/g, '').toLowerCase();
    this.filters.push(item => {
      const val = item[column];
      return typeof val === 'string' && val.toLowerCase().includes(cleanPattern);
    });
    return this;
  }

  order(column: string, { ascending = true } = {}) {
    this.orderByField = column;
    this.orderByAscending = ascending;
    return this;
  }

  limit(n: number) {
    this.limitCount = n;
    return this;
  }

  // Promise resolution support so we can do: await supabase.from('...').select('*')
  async then(resolve: (value: any) => void) {
    try {
      let result = [...this.data];
      
      // Filter data
      for (const filter of this.filters) {
        result = result.filter(filter);
      }

      // Order data
      if (this.orderByField) {
        result.sort((a, b) => {
          const valA = a[this.orderByField!];
          const valB = b[this.orderByField!];
          if (valA === valB) return 0;
          if (valA === undefined || valA === null) return 1;
          if (valB === undefined || valB === null) return -1;
          const comparison = valA < valB ? -1 : 1;
          return this.orderByAscending ? comparison : -comparison;
        });
      }

      // Limit data
      if (this.limitCount !== null) {
        result = result.slice(0, this.limitCount);
      }

      resolve({ data: result, error: null });
    } catch (err: any) {
      resolve({ data: null, error: err });
    }
  }

  // Fetch single row
  async maybeSingle() {
    let result = [...this.data];
    for (const filter of this.filters) {
      result = result.filter(filter);
    }
    return { data: result.length > 0 ? result[0] : null, error: null };
  }

  async single() {
    let result = [...this.data];
    for (const filter of this.filters) {
      result = result.filter(filter);
    }
    if (result.length === 0) {
      return { data: null, error: { message: "No rows found", code: "PGRST116" } };
    }
    return { data: result[0], error: null };
  }

  // Mutations
  async insert(newData: any) {
    const items = Array.isArray(newData) ? newData : [newData];
    const updatedData = [...this.data];
    
    const processedItems = items.map(item => {
      const processed = { ...item };
      if (!processed.id) {
        processed.id = typeof crypto.randomUUID === 'function' 
          ? crypto.randomUUID() 
          : Math.random().toString(36).substring(2) + Date.now().toString(36);
      }
      if (!processed.created_at) processed.created_at = new Date().toISOString();
      if (!processed.updated_at) processed.updated_at = new Date().toISOString();
      updatedData.push(processed);
      return processed;
    });

    localStorage.setItem(`mock_db_${this.table}`, JSON.stringify(updatedData));
    this.data = updatedData;
    
    return { data: Array.isArray(newData) ? processedItems : processedItems[0], error: null };
  }

  async update(updateData: any) {
    let updatedCount = 0;
    const updatedData = this.data.map(item => {
      let match = true;
      for (const filter of this.filters) {
        if (!filter(item)) {
          match = false;
          break;
        }
      }
      if (match) {
        updatedCount++;
        return { ...item, ...updateData, updated_at: new Date().toISOString() };
      }
      return item;
    });

    localStorage.setItem(`mock_db_${this.table}`, JSON.stringify(updatedData));
    this.data = updatedData;

    return { data: updatedData, error: null, count: updatedCount };
  }

  async delete() {
    const remainingData = this.data.filter(item => {
      let match = true;
      for (const filter of this.filters) {
        if (!filter(item)) {
          match = false;
          break;
        }
      }
      return !match; // Keep items that DO NOT match
    });

    localStorage.setItem(`mock_db_${this.table}`, JSON.stringify(remainingData));
    this.data = remainingData;

    return { data: null, error: null };
  }
}

// Authentication implementation
const authCallbacks: ((event: string, session: any) => void)[] = [];

const getCurrentUser = () => {
  const sessionUser = sessionStorage.getItem('mock_supabase_session');
  if (sessionUser) {
    return JSON.parse(sessionUser);
  }
  return null;
};

const triggerAuthChange = (event: string, user: any) => {
  const session = user ? { user, access_token: 'mock-session-token' } : null;
  authCallbacks.forEach(cb => cb(event, session));
};

const mockAuth = {
  async getUser() {
    const user = getCurrentUser();
    return { data: { user }, error: null };
  },

  async signUp({ email, password, options }: any) {
    const authUsers = JSON.parse(localStorage.getItem('mock_auth_users') || '[]');
    if (authUsers.some((u: any) => u.email === email)) {
      return { data: { user: null }, error: { message: "User already exists!" } };
    }

    const newUser = {
      id: Math.random().toString(36).substring(2) + Date.now().toString(36),
      email,
      password, // In-memory/local mock password
      user_metadata: options?.data || {}
    };

    authUsers.push(newUser);
    localStorage.setItem('mock_auth_users', JSON.stringify(authUsers));

    // Auto-login after registration
    const userObject = { id: newUser.id, email: newUser.email, user_metadata: newUser.user_metadata };
    sessionStorage.setItem('mock_supabase_session', JSON.stringify(userObject));
    triggerAuthChange('SIGNED_IN', userObject);

    return { data: { user: userObject }, error: null };
  },

  async signInWithPassword({ email, password }: any) {
    const authUsers = JSON.parse(localStorage.getItem('mock_auth_users') || '[]');
    const user = authUsers.find((u: any) => u.email === email && u.password === password);
    
    if (!user) {
      return { data: null, error: { message: "Invalid email or password" } };
    }

    const userObject = { id: user.id, email: user.email, user_metadata: user.user_metadata };
    sessionStorage.setItem('mock_supabase_session', JSON.stringify(userObject));
    triggerAuthChange('SIGNED_IN', userObject);

    return { data: { user: userObject, session: { access_token: 'mock-session-token', user: userObject } }, error: null };
  },

  async signOut() {
    sessionStorage.removeItem('mock_supabase_session');
    triggerAuthChange('SIGNED_OUT', null);
    return { error: null };
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    authCallbacks.push(callback);
    // Trigger initial callback
    const user = getCurrentUser();
    const session = user ? { user, access_token: 'mock-session-token' } : null;
    callback(user ? 'INITIAL_SESSION' : 'SIGNED_OUT', session);

    return {
      data: {
        subscription: {
          unsubscribe() {
            const index = authCallbacks.indexOf(callback);
            if (index !== -1) {
              authCallbacks.splice(index, 1);
            }
          }
        }
      }
    };
  }
};

// RPC implementations
const mockRpc = async (fnName: string, args: any) => {
  console.log(`Mocking RPC call: ${fnName} with args`, args);
  
  if (fnName === 'award_points') {
    const userId = args._user_id;
    const points = args._points || 0;
    
    const dbKey = 'points_balances';
    const pointsData = JSON.parse(localStorage.getItem(`mock_db_${dbKey}`) || '[]');
    
    let userPoints = pointsData.find((p: any) => p.user_id === userId);
    if (!userPoints) {
      userPoints = { user_id: userId, total_points: 0, created_at: new Date().toISOString() };
      pointsData.push(userPoints);
    }
    
    userPoints.total_points += points;
    userPoints.updated_at = new Date().toISOString();
    
    localStorage.setItem(`mock_db_${dbKey}`, JSON.stringify(pointsData));
    return { data: userPoints.total_points, error: null };
  }

  if (fnName === 'mark_pooled_and_delivered') {
    const carrierId = args._carrier_id;
    const shipmentIds = args._shipment_ids || [];
    
    const shipments = JSON.parse(localStorage.getItem('mock_db_shipments') || '[]');
    const updatedShipments = shipments.map((s: any) => {
      if (shipmentIds.includes(s.id)) {
        return {
          ...s,
          carrier_id: carrierId,
          status: 'delivered',
          dropoff_time: new Date().toISOString(),
          pooled: true,
          updated_at: new Date().toISOString()
        };
      }
      return s;
    });
    
    localStorage.setItem('mock_db_shipments', JSON.stringify(updatedShipments));
    return { data: null, error: null };
  }

  return { data: null, error: null };
};

// Edge Functions mock implementation
const mockFunctions = {
  async invoke(fnName: string, options: any = {}) {
    console.log(`Mocking Edge Function call: ${fnName}`, options);
    const body = options.body || {};
    
    if (fnName === 'create-payment') {
      const { shipmentData, distanceKm } = body;
      const weightCost = (shipmentData.capacity_kg || 0) * 10;
      const distanceCost = distanceKm * 5;
      const amount = Math.round(weightCost + distanceCost);
      return {
        data: {
          success: true,
          amount,
          order: { id: 'order_' + Math.random().toString(36).substring(7), status: 'created' },
          transactionId: 'tx_' + Math.random().toString(36).substring(7)
        },
        error: null
      };
    }
    
    if (fnName === 'verify-payment') {
      const { paymentStatus, shipmentData, transactionId, paymentIdBody } = body;
      const paymentId = paymentIdBody || body.paymentId || 'pay_' + Math.random().toString(36).substring(7);
      if (paymentStatus === 'success') {
        const shipmentsDb = JSON.parse(localStorage.getItem('mock_db_shipments') || '[]');
        const newShipment = {
          id: 'shipment-' + Date.now(),
          shipper_id: shipmentData.shipper_id,
          carrier_id: shipmentData.carrier_id,
          origin: shipmentData.origin,
          destination: shipmentData.destination,
          origin_lat: shipmentData.origin_lat,
          origin_lng: shipmentData.origin_lng,
          origin_address: shipmentData.origin_address,
          destination_lat: shipmentData.destination_lat,
          destination_lng: shipmentData.destination_lng,
          destination_address: shipmentData.destination_address,
          capacity_kg: shipmentData.capacity_kg,
          pickup_time: shipmentData.pickup_time,
          dropoff_time: shipmentData.dropoff_time,
          status: shipmentData.carrier_id ? 'assigned' : 'pending',
          payment_amount: body.distanceKm ? Math.round(shipmentData.capacity_kg * 10 + body.distanceKm * 5) : 1000,
          payment_id: paymentId,
          payment_status: 'paid',
          pooled: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        shipmentsDb.push(newShipment);
        localStorage.setItem('mock_db_shipments', JSON.stringify(shipmentsDb));
        
        return {
          data: {
            success: true,
            shipment: newShipment
          },
          error: null
        };
      } else {
        return {
          data: {
            success: false,
            message: 'Payment verification failed simulation'
          },
          error: null
        };
      }
    }
    
    if (fnName === 'ai-shipment-pooling') {
      return {
        data: {
          success: true,
          pools: [],
          matches: [],
          analytics: { efficiency: 90 }
        },
        error: null
      };
    }

    if (fnName === 'ai-route-optimization' || fnName === 'route-optimization' || fnName === 'enhanced-route-optimization') {
      return {
        data: {
          success: true,
          route: {
            estimatedTime: 35,
            distance: body.start && body.end ? 15 : 10,
            path: body.start && body.end ? [body.start, body.end] : []
          }
        },
        error: null
      };
    }
    
    return { data: { success: true }, error: null };
  }
};

// Main Mock Supabase client
export const mockSupabase = {
  auth: mockAuth,
  functions: mockFunctions,
  
  from(table: string) {
    return new MockBuilder(table);
  },

  rpc(fnName: string, args: any) {
    return mockRpc(fnName, args);
  },

  // Mock channels for subscriptions
  channel(name: string) {
    return {
      on(event: string, filter: any, callback: any) {
        return this;
      },
      subscribe() {
        return this;
      }
    };
  },

  removeChannel(channel: any) {
    // noop
  }
};
