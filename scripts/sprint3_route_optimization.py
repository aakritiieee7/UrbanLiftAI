"""
Sprint 3: Core Route Optimization
Implements single route optimization using real traffic data and travel times.
"""

import pandas as pd
import geopandas as gpd
import osmnx as ox
import networkx as nx
import matplotlib.pyplot as plt
import numpy as np
import os
from datetime import datetime

def optimize_single_route():
    """Optimize a single route using traffic-aware travel times"""
    
    print("Starting Sprint 3: Core Route Optimization")
    print("=" * 45)
    
    print("1. Loading road network and traffic data...")
    try:
        # Load road network
        roads_file = 'data/delhi_road_network_filtered.geojson'
        if not os.path.exists(roads_file):
            print(f"✗ Road network file not found: {roads_file}")
            return
            
        roads_gdf = gpd.read_file(roads_file)
        print(f"✓ Loaded {len(roads_gdf)} road segments")
        
        # Load traffic data
        traffic_file = 'data/delhi_simulated_traffic_data.csv'
        if not os.path.exists(traffic_file):
            print(f"✗ Traffic data file not found: {traffic_file}")
            return
            
        traffic_df = pd.read_csv(traffic_file)
        traffic_df['timestamp'] = pd.to_datetime(traffic_df['timestamp'])
        print(f"✓ Loaded {len(traffic_df)} traffic records")
        
    except Exception as e:
        print(f"✗ Error loading data: {e}")
        return
    
    print("\n2. Calculating average traffic speeds...")
    try:
        # Calculate average speed for each road segment
        avg_speeds = traffic_df.groupby('osmid')['simulated_speed_kph'].mean().reset_index()
        avg_speeds.columns = ['osmid', 'avg_speed_kph']
        
        print(f"✓ Calculated average speeds for {len(avg_speeds)} road segments")
        print(f"  - Overall average speed: {avg_speeds['avg_speed_kph'].mean():.2f} km/h")
        
    except Exception as e:
        print(f"✗ Error calculating average speeds: {e}")
        return
    
    print("\n3. Merging traffic data with road network...")
    try:
        # Merge average speeds with road network
        roads_with_traffic = roads_gdf.merge(avg_speeds, on='osmid', how='left')
        
        # Fill missing speeds with default values based on road type
        default_speeds = {
            'primary': 45, 'secondary': 35, 'tertiary': 25,
            'primary_link': 40, 'secondary_link': 30, 'tertiary_link': 20
        }
        
        def get_default_speed(highway):
            highway_str = str(highway).lower()
            for road_type, speed in default_speeds.items():
                if road_type in highway_str:
                    return speed
            return 30  # default fallback
        
        mask = roads_with_traffic['avg_speed_kph'].isna()
        roads_with_traffic.loc[mask, 'avg_speed_kph'] = roads_with_traffic.loc[mask, 'highway'].apply(get_default_speed)
        
        print(f"✓ Merged traffic data with road network")
        print(f"  - Roads with traffic data: {len(roads_with_traffic) - mask.sum()}")
        print(f"  - Roads with default speeds: {mask.sum()}")
        
    except Exception as e:
        print(f"✗ Error merging data: {e}")
        return
    
    print("\n4. Rebuilding graph with travel times...")
    try:
        # Create a new graph from the merged data
        G = ox.graph_from_gdfs(
            gdf_nodes=None,  # Will be created automatically
            gdf_edges=roads_with_traffic,
            graph_attrs={'crs': roads_with_traffic.crs}
        )
        
        print(f"✓ Rebuilt graph with {len(G.nodes())} nodes and {len(G.edges())} edges")
        
        # Calculate travel time for each edge
        for u, v, key, data in G.edges(keys=True, data=True):
            length_km = data.get('length', 1000) / 1000  # Convert to km
            speed_kph = data.get('avg_speed_kph', 30)
            travel_time_hours = length_km / speed_kph
            travel_time_minutes = travel_time_hours * 60
            
            # Add travel time as edge attribute
            G[u][v][key]['travel_time'] = travel_time_minutes
        
        print(f"✓ Added travel time attributes to all edges")
        
    except Exception as e:
        print(f"✗ Error rebuilding graph: {e}")
        return
    
    print("\n5. Finding optimal route...")
    try:
        # Define start and end coordinates (Delhi landmarks)
        start_coords = (77.2090, 28.6139)  # Connaught Place
        end_coords = (77.3910, 28.5355)    # Noida Sector 18
        
        print(f"  Start: {start_coords} (Connaught Place)")
        print(f"  End: {end_coords} (Noida Sector 18)")
        
        # Find nearest graph nodes
        start_node = ox.nearest_nodes(G, start_coords[0], start_coords[1])
        end_node = ox.nearest_nodes(G, end_coords[0], end_coords[1])
        
        print(f"  Nearest start node: {start_node}")
        print(f"  Nearest end node: {end_node}")
        
        # Find shortest path using travel time as weight
        try:
            shortest_path = ox.shortest_path(G, start_node, end_node, weight='travel_time')
            print(f"✓ Found optimal route with {len(shortest_path)} nodes")
            
            # Calculate route statistics
            total_travel_time = 0
            total_distance = 0
            
            for i in range(len(shortest_path) - 1):
                u, v = shortest_path[i], shortest_path[i + 1]
                # Handle multiple edges between nodes
                edge_data = G[u][v]
                if isinstance(edge_data, dict):
                    if len(edge_data) == 1:
                        key = list(edge_data.keys())[0]
                        edge_info = edge_data[key]
                    else:
                        # Choose edge with minimum travel time
                        key = min(edge_data.keys(), key=lambda k: edge_data[k].get('travel_time', float('inf')))
                        edge_info = edge_data[key]
                else:
                    edge_info = edge_data
                
                total_travel_time += edge_info.get('travel_time', 0)
                total_distance += edge_info.get('length', 0)
            
            total_distance_km = total_distance / 1000
            avg_speed = total_distance_km / (total_travel_time / 60) if total_travel_time > 0 else 0
            
            print(f"  Total distance: {total_distance_km:.2f} km")
            print(f"  Total travel time: {total_travel_time:.1f} minutes")
            print(f"  Average speed: {avg_speed:.2f} km/h")
            
        except nx.NetworkXNoPath:
            print("✗ No path found between start and end points")
            return
            
    except Exception as e:
        print(f"✗ Error finding route: {e}")
        return
    
    print("\n6. Visualizing the route...")
    try:
        # Create visualization
        fig, ax = plt.subplots(1, 1, figsize=(15, 15))
        
        # Plot the graph
        ox.plot_graph(G, ax=ax, node_size=0, edge_color='lightgray', edge_linewidth=0.5, show=False, close=False)
        
        # Plot the route
        ox.plot_graph_route(G, shortest_path, ax=ax, route_color='red', route_linewidth=3, 
                           orig_dest_size=100, show=False, close=False)
        
        # Add title and labels
        ax.set_title(f'Optimal Route: Connaught Place to Noida Sector 18\n'
                    f'Distance: {total_distance_km:.2f} km, Time: {total_travel_time:.1f} min, '
                    f'Avg Speed: {avg_speed:.2f} km/h', 
                    fontsize=14, fontweight='bold')
        
        # Save the visualization
        output_image = 'data/delhi_optimal_route.png'
        plt.savefig(output_image, dpi=300, bbox_inches='tight')
        print(f"✓ Route visualization saved to {output_image}")
        
        plt.close()
        
    except Exception as e:
        print(f"✗ Error creating visualization: {e}")
        return
    
    print("\n7. Saving route data...")
    try:
        # Create route dataframe
        route_data = []
        for i, node in enumerate(shortest_path):
            node_data = G.nodes[node]
            route_data.append({
                'sequence': i,
                'node_id': node,
                'latitude': node_data['y'],
                'longitude': node_data['x']
            })
        
        route_df = pd.DataFrame(route_data)
        output_csv = 'data/delhi_optimal_route.csv'
        route_df.to_csv(output_csv, index=False)
        
        print(f"✓ Route coordinates saved to {output_csv}")
        print(f"  Route contains {len(route_df)} waypoints")
        
        # Display sample
        print(f"\nSample route coordinates:")
        print(route_df.head(3).to_string(index=False))
        
    except Exception as e:
        print(f"✗ Error saving route data: {e}")
        return
    
    print(f"\n{'='*45}")
    print("Sprint 3 completed successfully! ✓")
    print(f"Outputs:")
    print(f"  - Route visualization: data/delhi_optimal_route.png")
    print(f"  - Route coordinates: data/delhi_optimal_route.csv")

if __name__ == "__main__":
    optimize_single_route()