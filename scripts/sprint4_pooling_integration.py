"""
Sprint 4: Pooling and Multi-Shipment Routing
Implements shipment pooling using clustering and multi-stop route optimization.
"""

import pandas as pd
import geopandas as gpd
import osmnx as ox
import networkx as nx
import numpy as np
import json
import os
from datetime import datetime
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

class DRLAgent:
    """Simple routing agent using osmnx shortest path as placeholder for DRL"""
    
    def __init__(self, graph):
        self.graph = graph
    
    def find_optimal_path(self, start_node, end_node, weight='travel_time'):
        """Find optimal path between two nodes"""
        try:
            path = ox.shortest_path(self.graph, start_node, end_node, weight=weight)
            return path
        except nx.NetworkXNoPath:
            return None
    
    def calculate_path_stats(self, path):
        """Calculate statistics for a given path"""
        if not path or len(path) < 2:
            return {'distance': 0, 'travel_time': 0, 'avg_speed': 0}
        
        total_distance = 0
        total_travel_time = 0
        
        for i in range(len(path) - 1):
            u, v = path[i], path[i + 1]
            edge_data = self.graph[u][v]
            
            # Handle multiple edges between nodes
            if isinstance(edge_data, dict) and len(edge_data) > 1:
                key = min(edge_data.keys(), key=lambda k: edge_data[k].get('travel_time', float('inf')))
                edge_info = edge_data[key]
            else:
                edge_info = list(edge_data.values())[0] if isinstance(edge_data, dict) else edge_data
            
            total_distance += edge_info.get('length', 0)
            total_travel_time += edge_info.get('travel_time', 0)
        
        total_distance_km = total_distance / 1000
        avg_speed = total_distance_km / (total_travel_time / 60) if total_travel_time > 0 else 0
        
        return {
            'distance': total_distance_km,
            'travel_time': total_travel_time,
            'avg_speed': avg_speed
        }

def pooling_and_integration():
    """Implement shipment pooling and multi-stop routing"""
    
    print("Starting Sprint 4: Pooling and Multi-Shipment Routing")
    print("=" * 52)
    
    print("1. Rebuilding graph with travel time attributes...")
    try:
        # Load data from previous sprints
        roads_file = 'data/delhi_road_network_filtered.geojson'
        traffic_file = 'data/delhi_simulated_traffic_data.csv'
        
        roads_gdf = gpd.read_file(roads_file)
        traffic_df = pd.read_csv(traffic_file)
        
        # Calculate average speeds and merge
        avg_speeds = traffic_df.groupby('osmid')['simulated_speed_kph'].mean().reset_index()
        roads_with_traffic = roads_gdf.merge(avg_speeds, on='osmid', how='left')
        
        # Fill missing speeds
        default_speeds = {'primary': 45, 'secondary': 35, 'tertiary': 25}
        mask = roads_with_traffic['avg_speed_kph'].isna()
        roads_with_traffic.loc[mask, 'avg_speed_kph'] = 30
        
        # Rebuild graph
        G = ox.graph_from_gdfs(gdf_nodes=None, gdf_edges=roads_with_traffic)
        
        # Add travel time attributes
        for u, v, key, data in G.edges(keys=True, data=True):
            length_km = data.get('length', 1000) / 1000
            speed_kph = data.get('avg_speed_kph', 30)
            travel_time_minutes = (length_km / speed_kph) * 60
            G[u][v][key]['travel_time'] = travel_time_minutes
        
        print(f"✓ Graph rebuilt with {len(G.nodes())} nodes and {len(G.edges())} edges")
        
    except Exception as e:
        print(f"✗ Error rebuilding graph: {e}")
        return
    
    print("\n2. Initializing DRL Agent...")
    agent = DRLAgent(G)
    print("✓ DRL Agent initialized")
    
    print("\n3. Generating hypothetical shipments...")
    try:
        # Generate realistic shipments within Delhi bounds
        delhi_bounds = {
            'min_lat': 28.4041, 'max_lat': 28.8836,
            'min_lng': 76.8388, 'max_lng': 77.3462
        }
        
        np.random.seed(42)  # For reproducibility
        num_shipments = 20
        
        shipments = []
        for i in range(num_shipments):
            # Generate random start and end coordinates within Delhi
            start_lat = np.random.uniform(delhi_bounds['min_lat'], delhi_bounds['max_lat'])
            start_lng = np.random.uniform(delhi_bounds['min_lng'], delhi_bounds['max_lng'])
            end_lat = np.random.uniform(delhi_bounds['min_lat'], delhi_bounds['max_lat'])
            end_lng = np.random.uniform(delhi_bounds['min_lng'], delhi_bounds['max_lng'])
            
            shipments.append({
                'shipment_id': f'SHIP_{i+1:03d}',
                'start_lat': round(start_lat, 6),
                'start_lng': round(start_lng, 6),
                'end_lat': round(end_lat, 6),
                'end_lng': round(end_lng, 6),
                'weight': np.random.uniform(10, 500),  # kg
                'priority': np.random.choice(['high', 'medium', 'low'])
            })
        
        print(f"✓ Generated {len(shipments)} hypothetical shipments")
        
        # Display sample
        print(f"\nSample shipments:")
        for i, ship in enumerate(shipments[:3]):
            print(f"  {ship['shipment_id']}: ({ship['start_lat']}, {ship['start_lng']}) → "
                  f"({ship['end_lat']}, {ship['end_lng']}) | Weight: {ship['weight']:.1f}kg")
        
    except Exception as e:
        print(f"✗ Error generating shipments: {e}")
        return
    
    print("\n4. Pooling shipments using K-Means clustering...")
    try:
        # Prepare data for clustering (start and end coordinates)
        coordinates = []
        for ship in shipments:
            coordinates.extend([
                [ship['start_lat'], ship['start_lng']],
                [ship['end_lat'], ship['end_lng']]
            ])
        
        coordinates = np.array(coordinates)
        
        # Standardize coordinates for clustering
        scaler = StandardScaler()
        coordinates_scaled = scaler.fit_transform(coordinates)
        
        # Determine optimal number of clusters (aim for 3-5 shipments per pool)
        optimal_clusters = max(2, min(8, len(shipments) // 4))
        
        # Perform K-Means clustering on shipment start points only
        start_coords = np.array([[ship['start_lat'], ship['start_lng']] for ship in shipments])
        start_coords_scaled = scaler.transform(start_coords)
        
        kmeans = KMeans(n_clusters=optimal_clusters, random_state=42)
        cluster_labels = kmeans.fit_predict(start_coords_scaled)
        
        # Group shipments by cluster
        pools = {}
        for i, label in enumerate(cluster_labels):
            if label not in pools:
                pools[label] = []
            shipments[i]['cluster'] = label
            pools[label].append(shipments[i])
        
        print(f"✓ Created {len(pools)} shipment pools using K-Means clustering")
        for pool_id, pool_shipments in pools.items():
            print(f"  Pool {pool_id}: {len(pool_shipments)} shipments")
        
    except Exception as e:
        print(f"✗ Error in shipment pooling: {e}")
        return
    
    print("\n5. Calculating pooled routes for each group...")
    try:
        pooled_results = []
        
        for pool_id, pool_shipments in pools.items():
            print(f"\n  Processing Pool {pool_id} with {len(pool_shipments)} shipments...")
            
            # Collect all pickup and delivery points
            stops = []
            for ship in pool_shipments:
                stops.append({
                    'type': 'pickup',
                    'shipment_id': ship['shipment_id'],
                    'lat': ship['start_lat'],
                    'lng': ship['start_lng'],
                    'weight': ship['weight']
                })
                stops.append({
                    'type': 'delivery',
                    'shipment_id': ship['shipment_id'],
                    'lat': ship['end_lat'],
                    'lng': ship['end_lng'],
                    'weight': ship['weight']
                })
            
            # Simple heuristic: visit all pickups first, then all deliveries
            # (In practice, you'd use more sophisticated algorithms)
            pickups = [stop for stop in stops if stop['type'] == 'pickup']
            deliveries = [stop for stop in stops if stop['type'] == 'delivery']
            
            # Order stops by proximity (simple nearest neighbor for demonstration)
            ordered_stops = []
            
            # Start with centroid of pickups
            pickup_center_lat = np.mean([p['lat'] for p in pickups])
            pickup_center_lng = np.mean([p['lng'] for p in pickups])
            
            # Order pickups by distance from center
            for pickup in pickups:
                pickup['distance_from_center'] = np.sqrt(
                    (pickup['lat'] - pickup_center_lat)**2 + 
                    (pickup['lng'] - pickup_center_lng)**2
                )
            pickups.sort(key=lambda x: x['distance_from_center'])
            
            # Order deliveries by distance from last pickup
            if pickups:
                last_pickup = pickups[-1]
                for delivery in deliveries:
                    delivery['distance_from_last_pickup'] = np.sqrt(
                        (delivery['lat'] - last_pickup['lat'])**2 + 
                        (delivery['lng'] - last_pickup['lng'])**2
                    )
                deliveries.sort(key=lambda x: x['distance_from_last_pickup'])
            
            ordered_stops = pickups + deliveries
            
            # Calculate route using DRL Agent
            route_coordinates = []
            total_travel_time = 0
            total_distance = 0
            
            for i, stop in enumerate(ordered_stops):
                # Find nearest graph node for this stop
                try:
                    node = ox.nearest_nodes(G, stop['lng'], stop['lat'])
                    node_data = G.nodes[node]
                    route_coordinates.append({
                        'sequence': i,
                        'stop_type': stop['type'],
                        'shipment_id': stop['shipment_id'],
                        'latitude': node_data['y'],
                        'longitude': node_data['x']
                    })
                    
                    # Calculate path to next stop
                    if i < len(ordered_stops) - 1:
                        next_stop = ordered_stops[i + 1]
                        next_node = ox.nearest_nodes(G, next_stop['lng'], next_stop['lat'])
                        
                        path = agent.find_optimal_path(node, next_node)
                        if path:
                            stats = agent.calculate_path_stats(path)
                            total_travel_time += stats['travel_time']
                            total_distance += stats['distance']
                
                except Exception as e:
                    print(f"    Warning: Could not process stop {i}: {e}")
                    continue
            
            # Create pool result
            pool_result = {
                'group_id': f'POOL_{pool_id:03d}',
                'shipments': [ship['shipment_id'] for ship in pool_shipments],
                'num_shipments': len(pool_shipments),
                'total_weight': sum(ship['weight'] for ship in pool_shipments),
                'route_coordinates': route_coordinates,
                'total_distance_km': round(total_distance, 2),
                'total_travel_time_minutes': round(total_travel_time, 2),
                'num_stops': len(ordered_stops),
                'efficiency_score': round(len(pool_shipments) / max(1, total_travel_time / 60), 2)  # shipments per hour
            }
            
            pooled_results.append(pool_result)
            print(f"    ✓ Pool {pool_id}: {pool_result['num_stops']} stops, "
                  f"{pool_result['total_distance_km']} km, "
                  f"{pool_result['total_travel_time_minutes']:.1f} min")
        
    except Exception as e:
        print(f"✗ Error calculating pooled routes: {e}")
        return
    
    print(f"\n6. Generating final JSON output...")
    try:
        # Create comprehensive output
        final_output = {
            'metadata': {
                'generated_at': datetime.now().isoformat(),
                'total_shipments': len(shipments),
                'total_pools': len(pooled_results),
                'clustering_method': 'K-Means',
                'routing_method': 'Dijkstra (via DRL Agent)',
                'city': 'Delhi, India'
            },
            'summary_statistics': {
                'total_distance_km': sum(pool['total_distance_km'] for pool in pooled_results),
                'total_travel_time_hours': sum(pool['total_travel_time_minutes'] for pool in pooled_results) / 60,
                'average_shipments_per_pool': np.mean([pool['num_shipments'] for pool in pooled_results]),
                'average_efficiency_score': np.mean([pool['efficiency_score'] for pool in pooled_results])
            },
            'pooled_routes': pooled_results,
            'individual_shipments': shipments
        }
        
        # Save to JSON file
        output_file = 'data/delhi_pooled_routes.json'
        with open(output_file, 'w') as f:
            json.dump(final_output, f, indent=2)
        
        print(f"✓ Final output saved to {output_file}")
        print(f"  File size: {os.path.getsize(output_file) / 1024:.1f} KB")
        
        # Print summary
        print(f"\n7. Final Summary:")
        print(f"  Total shipments: {final_output['metadata']['total_shipments']}")
        print(f"  Total pools: {final_output['metadata']['total_pools']}")
        print(f"  Total distance: {final_output['summary_statistics']['total_distance_km']:.2f} km")
        print(f"  Total travel time: {final_output['summary_statistics']['total_travel_time_hours']:.2f} hours")
        print(f"  Average shipments per pool: {final_output['summary_statistics']['average_shipments_per_pool']:.1f}")
        print(f"  Average efficiency score: {final_output['summary_statistics']['average_efficiency_score']:.2f}")
        
        # Print sample of JSON output
        print(f"\nSample JSON output structure:")
        sample_pool = pooled_results[0] if pooled_results else {}
        sample_output = {
            'group_id': sample_pool.get('group_id', ''),
            'shipments': sample_pool.get('shipments', [])[:2],  # First 2 shipments
            'total_distance_km': sample_pool.get('total_distance_km', 0),
            'total_travel_time_minutes': sample_pool.get('total_travel_time_minutes', 0),
            'route_coordinates': sample_pool.get('route_coordinates', [])[:2]  # First 2 coordinates
        }
        print(json.dumps(sample_output, indent=2))
        
    except Exception as e:
        print(f"✗ Error generating final output: {e}")
        return
    
    print(f"\n{'='*52}")
    print("Sprint 4 completed successfully! ✓")
    print(f"Output: {output_file}")

if __name__ == "__main__":
    pooling_and_integration()