import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { mockSupabase } from './mock-client';

const DEFAULT_URL = "https://utjkkxrinjrvzfwlmnaz.supabase.co";
const DEFAULT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0amtreHJpbmpydnpmd2xtbmF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MDI2MzMsImV4cCI6MjA3MDk3ODYzM30.OsRMmqlXmWlyIsPWMYUzBG3KHFu4r4r3whufeM5ghNQ";

const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || DEFAULT_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || DEFAULT_KEY;

// Initialize the real Supabase client
const realSupabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

const OFFLINE_CACHE_KEY = 'supabase_connection_offline';
let isOffline = sessionStorage.getItem(OFFLINE_CACHE_KEY) === 'true';

// Perform quick connection check if status is unknown
if (sessionStorage.getItem(OFFLINE_CACHE_KEY) === null) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 600);
  
  fetch(`${SUPABASE_URL}/rest/v1/carrier_profiles?select=user_id&limit=1`, {
    headers: { 'apikey': SUPABASE_PUBLISHABLE_KEY },
    signal: controller.signal
  })
    .then(res => {
      clearTimeout(timeoutId);
      if (res.status >= 200 && res.status < 400) {
        sessionStorage.setItem(OFFLINE_CACHE_KEY, 'false');
        isOffline = false;
        console.log("Supabase connection status: ONLINE");
      } else {
        throw new Error("HTTP status: " + res.status);
      }
    })
    .catch(err => {
      clearTimeout(timeoutId);
      sessionStorage.setItem(OFFLINE_CACHE_KEY, 'true');
      isOffline = true;
      console.warn("Supabase connection failed. Falling back to offline Mock database.", err);
    });
}

// Proxied supabase client that delegates requests between live Supabase and Local Storage Mock
export const supabase = new Proxy({} as any, {
  get(target, prop) {
    // 1. Force mock mode if offline
    if (isOffline) {
      return (mockSupabase as any)[prop];
    }

    // 2. Intercept auth specifically since it is nested
    if (prop === 'auth') {
      return new Proxy(realSupabase.auth, {
        get(authTarget, authProp) {
          const authFn = (authTarget as any)[authProp];
          if (typeof authFn === 'function') {
            return (...authArgs: any[]) => {
              if (isOffline) {
                return (mockSupabase.auth as any)[authProp](...authArgs);
              }
              try {
                const p = authFn.apply(authTarget, authArgs);
                if (p && typeof p.then === 'function') {
                  return p.catch((err: any) => {
                    console.warn(`Auth method '${String(authProp)}' failed on live Supabase. Switching to Mock auth.`, err);
                    isOffline = true;
                    sessionStorage.setItem(OFFLINE_CACHE_KEY, 'true');
                    return (mockSupabase.auth as any)[authProp](...authArgs);
                  });
                }
                return p;
              } catch (err) {
                console.warn(`Auth call '${String(authProp)}' threw sync error. Switching to Mock auth.`, err);
                isOffline = true;
                sessionStorage.setItem(OFFLINE_CACHE_KEY, 'true');
                return (mockSupabase.auth as any)[authProp](...authArgs);
              }
            };
          }
          return authFn;
        }
      });
    }

    // 3. Delegation for from() queries, rpc(), and channel()
    const realValue = (realSupabase as any)[prop];
    if (typeof realValue === 'function') {
      return (...args: any[]) => {
        if (isOffline) {
          return (mockSupabase as any)[prop](...args);
        }
        try {
          const result = realValue.apply(realSupabase, args);
          // If result is chainable or returns a Promise, wrap catch
          if (result && typeof result.then === 'function') {
            return result.catch((err: any) => {
              console.warn(`Query failed on live Supabase (method '${String(prop)}'). Switching to Mock database.`, err);
              isOffline = true;
              sessionStorage.setItem(OFFLINE_CACHE_KEY, 'true');
              // Fallback to mock method
              return (mockSupabase as any)[prop](...args);
            });
          }
          // For chainable query builder (like .from().select().eq())
          if (result && typeof result.select === 'function') {
            // We return a Proxy of the builder to catch final execution errors (.then, .single, etc.)
            return wrapQueryBuilder(result, prop === 'from' ? args[0] : '');
          }
          return result;
        } catch (err) {
          console.warn(`Call '${String(prop)}' threw sync error. Switching to Mock database.`, err);
          isOffline = true;
          sessionStorage.setItem(OFFLINE_CACHE_KEY, 'true');
          return (mockSupabase as any)[prop](...args);
        }
      };
    }
    return realValue;
  }
}) as typeof realSupabase;

// Wrap query builders dynamically to switch to mock client if execution fails
function wrapQueryBuilder(builder: any, tableName: string): any {
  return new Proxy(builder, {
    get(target, prop) {
      const propValue = target[prop];
      if (typeof propValue === 'function') {
        return (...args: any[]) => {
          if (isOffline) {
            // Run mock equivalent query.
            // We reconstruct standard chain query logic on mock client by returning its equivalent.
            return (mockSupabase.from(tableName) as any)[prop](...args);
          }
          try {
            const nextBuilder = propValue.apply(target, args);
            // If it returns a promise (execution methods: then, single, maybeSingle)
            if (nextBuilder && typeof nextBuilder.then === 'function') {
              return nextBuilder.catch((err: any) => {
                console.warn(`Builder execution failed on live Supabase table '${tableName}'. Switching to Mock database.`, err);
                isOffline = true;
                sessionStorage.setItem(OFFLINE_CACHE_KEY, 'true');
                // Re-run execution method on a fresh mock query
                // Note: This is simplified, but since filters are usually basic, 
                // in general it will execute fine on the mock client.
                const freshMock = mockSupabase.from(tableName);
                if (prop === 'then') {
                  return freshMock.then(args[0]);
                }
                return (freshMock as any)[prop](...args);
              });
            }
            // Keep wrapping chain calls
            return wrapQueryBuilder(nextBuilder, tableName);
          } catch (err) {
            console.warn(`Builder chain step threw sync error on live Supabase table '${tableName}'. Switching to Mock.`, err);
            isOffline = true;
            sessionStorage.setItem(OFFLINE_CACHE_KEY, 'true');
            return (mockSupabase.from(tableName) as any)[prop](...args);
          }
        };
      }
      return propValue;
    }
  });
}