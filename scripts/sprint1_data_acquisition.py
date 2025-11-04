"""
Sprint 1: Data Acquisition & Preparation
Downloads Delhi road network using osmnx and filters for primary/secondary/tertiary roads.
"""

import osmnx as ox
import geopandas as gpd
import pandas as pd
import os

def download_and_prepare_road_network():
    """Download and prepare Delhi road network data"""
    
    print("Starting Sprint 1: Data Acquisition & Preparation")
    print("=" * 50)
    
    # Create output directory if it doesn't exist
    os.makedirs('data', exist_ok=True)
    
    print("1. Downloading road network for Delhi, India...")
    # Download the road network for Delhi
    place_name = "Delhi, India"
    network_type = "drive"
    
    try:
        # Download the graph
        G = ox.graph_from_place(place_name, network_type=network_type)
        print(f"✓ Successfully downloaded road network for {place_name}")
        print(f"  - Nodes: {len(G.nodes())}")
        print(f"  - Edges: {len(G.edges())}")
        
    except Exception as e:
        print(f"✗ Error downloading road network: {e}")
        return
    
    print("\n2. Converting graph to GeoDataFrames...")
    try:
        # Convert to GeoDataFrames
        nodes_gdf, edges_gdf = ox.graph_to_gdfs(G)
        print(f"✓ Successfully converted to GeoDataFrames")
        print(f"  - Nodes GDF shape: {nodes_gdf.shape}")
        print(f"  - Edges GDF shape: {edges_gdf.shape}")
        
    except Exception as e:
        print(f"✗ Error converting to GeoDataFrames: {e}")
        return
    
    print("\n3. Filtering edges for primary, secondary, and tertiary roads...")
    try:
        # Filter edges for specific road types
        road_types = ['primary', 'secondary', 'tertiary', 'primary_link', 'secondary_link', 'tertiary_link']
        
        # Handle different highway column formats
        if 'highway' in edges_gdf.columns:
            # Create a mask for filtering
            mask = edges_gdf['highway'].apply(
                lambda x: any(road_type in str(x).lower() if isinstance(x, str) else 
                             any(road_type in str(item).lower() for item in x) if isinstance(x, list) else False
                             for road_type in road_types)
            )
            
            filtered_edges = edges_gdf[mask].copy()
        else:
            print("⚠ Highway column not found, keeping all edges")
            filtered_edges = edges_gdf.copy()
        
        print(f"✓ Filtered edges from {len(edges_gdf)} to {len(filtered_edges)} segments")
        
        # Ensure essential columns are present
        essential_columns = ['u', 'v', 'osmid', 'length', 'highway', 'geometry']
        available_columns = [col for col in essential_columns if col in filtered_edges.columns]
        
        print(f"  - Available essential columns: {available_columns}")
        
        # Keep only essential columns plus any other useful ones
        useful_columns = available_columns + [col for col in filtered_edges.columns 
                                            if col not in essential_columns and 
                                            col in ['name', 'maxspeed', 'lanes', 'oneway', 'surface']]
        
        filtered_edges = filtered_edges[useful_columns]
        
    except Exception as e:
        print(f"✗ Error filtering edges: {e}")
        return
    
    print("\n4. Saving filtered data...")
    try:
        output_file = 'data/delhi_road_network_filtered.geojson'
        filtered_edges.to_file(output_file, driver='GeoJSON')
        print(f"✓ Successfully saved filtered road network to {output_file}")
        print(f"  - Final dataset: {len(filtered_edges)} road segments")
        print(f"  - File size: {os.path.getsize(output_file) / (1024*1024):.2f} MB")
        
        # Display sample of the data
        print(f"\n5. Sample of filtered data:")
        print(filtered_edges.head(3)[['osmid', 'length', 'highway']].to_string())
        
    except Exception as e:
        print(f"✗ Error saving data: {e}")
        return
    
    print(f"\n{'='*50}")
    print("Sprint 1 completed successfully! ✓")
    print(f"Output: {output_file}")

if __name__ == "__main__":
    download_and_prepare_road_network()