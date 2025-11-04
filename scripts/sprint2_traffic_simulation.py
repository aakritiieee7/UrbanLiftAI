"""
Sprint 2: Simulated Traffic Data Generation
Generates realistic traffic speed data with time patterns for Delhi road network.
"""

import pandas as pd
import geopandas as gpd
import numpy as np
from datetime import datetime, timedelta
import os

def generate_traffic_simulation():
    """Generate simulated traffic data with realistic patterns"""
    
    print("Starting Sprint 2: Simulated Traffic Data Generation")
    print("=" * 55)
    
    print("1. Loading filtered road network data...")
    try:
        input_file = 'data/delhi_road_network_filtered.geojson'
        if not os.path.exists(input_file):
            print(f"✗ Input file not found: {input_file}")
            print("Please run Sprint 1 first to generate the road network data.")
            return
            
        roads_gdf = gpd.read_file(input_file)
        print(f"✓ Loaded {len(roads_gdf)} road segments")
        
    except Exception as e:
        print(f"✗ Error loading data: {e}")
        return
    
    print("\n2. Setting up traffic simulation parameters...")
    
    # Simulation parameters
    start_date = datetime(2024, 1, 1)
    end_date = datetime(2024, 1, 7)  # One week of data
    time_interval = timedelta(hours=1)  # Hourly data
    
    # Base speeds by road type (km/h)
    base_speeds = {
        'primary': 45,
        'secondary': 35,
        'tertiary': 25,
        'primary_link': 40,
        'secondary_link': 30,
        'tertiary_link': 20,
        'default': 30
    }
    
    print(f"✓ Simulation period: {start_date.date()} to {end_date.date()}")
    print(f"✓ Time interval: {time_interval}")
    print(f"✓ Base speeds configured for {len(base_speeds)} road types")
    
    print("\n3. Generating time series data...")
    
    traffic_data = []
    current_time = start_date
    time_points = []
    
    # Generate time points
    while current_time < end_date:
        time_points.append(current_time)
        current_time += time_interval
    
    print(f"✓ Generated {len(time_points)} time points")
    
    print("\n4. Simulating traffic speeds with realistic patterns...")
    
    total_records = len(roads_gdf) * len(time_points)
    processed = 0
    
    for _, road in roads_gdf.iterrows():
        osmid = road['osmid']
        
        # Determine base speed for this road type
        highway_type = str(road.get('highway', 'default')).lower()
        base_speed = base_speeds.get(highway_type, base_speeds['default'])
        
        # Handle list of highway types (take first one)
        if '[' in highway_type:
            highway_type = highway_type.replace('[', '').replace(']', '').replace("'", "").split(',')[0].strip()
            base_speed = base_speeds.get(highway_type, base_speeds['default'])
        
        for timestamp in time_points:
            # Apply time-based patterns
            hour = timestamp.hour
            day_of_week = timestamp.weekday()  # 0=Monday, 6=Sunday
            
            # Start with base speed
            simulated_speed = base_speed
            
            # Apply rush hour effects (8-10 AM and 5-7 PM on weekdays)
            if day_of_week < 5:  # Weekdays
                if (8 <= hour <= 10) or (17 <= hour <= 19):
                    # Rush hour: reduce speed by 30-50%
                    reduction_factor = np.random.uniform(0.5, 0.7)
                    simulated_speed *= reduction_factor
                elif (6 <= hour <= 8) or (19 <= hour <= 21):
                    # Pre/post rush hour: reduce speed by 15-25%
                    reduction_factor = np.random.uniform(0.75, 0.85)
                    simulated_speed *= reduction_factor
                elif 22 <= hour or hour <= 5:
                    # Night time: increase speed by 10-20%
                    increase_factor = np.random.uniform(1.1, 1.2)
                    simulated_speed *= increase_factor
            else:  # Weekends
                if 10 <= hour <= 14:
                    # Weekend afternoon: slight reduction
                    reduction_factor = np.random.uniform(0.85, 0.95)
                    simulated_speed *= reduction_factor
                elif 22 <= hour or hour <= 6:
                    # Weekend night: increase speed
                    increase_factor = np.random.uniform(1.15, 1.25)
                    simulated_speed *= increase_factor
            
            # Add random noise (±5-10%)
            noise_factor = np.random.uniform(0.9, 1.1)
            simulated_speed *= noise_factor
            
            # Ensure speed is realistic (minimum 5 km/h, maximum 80 km/h)
            simulated_speed = max(5, min(80, simulated_speed))
            
            traffic_data.append({
                'osmid': osmid,
                'timestamp': timestamp,
                'simulated_speed_kph': round(simulated_speed, 2),
                'highway_type': highway_type,
                'base_speed': base_speed
            })
            
            processed += 1
            
        # Progress indicator
        if processed % 10000 == 0:
            progress = (processed / total_records) * 100
            print(f"  Progress: {progress:.1f}% ({processed:,} / {total_records:,} records)")
    
    print(f"✓ Generated {len(traffic_data)} traffic records")
    
    print("\n5. Creating traffic DataFrame and adding analysis...")
    
    traffic_df = pd.DataFrame(traffic_data)
    
    # Add additional time-based features
    traffic_df['hour'] = traffic_df['timestamp'].dt.hour
    traffic_df['day_of_week'] = traffic_df['timestamp'].dt.dayofweek
    traffic_df['is_weekend'] = traffic_df['day_of_week'].isin([5, 6])
    traffic_df['is_rush_hour'] = traffic_df.apply(
        lambda row: (row['hour'] >= 8 and row['hour'] <= 10) or 
                   (row['hour'] >= 17 and row['hour'] <= 19) and 
                   not row['is_weekend'], axis=1
    )
    
    print(f"✓ Traffic DataFrame created with shape: {traffic_df.shape}")
    
    # Display statistics
    print(f"\n6. Traffic simulation statistics:")
    print(f"  - Average speed: {traffic_df['simulated_speed_kph'].mean():.2f} km/h")
    print(f"  - Speed std deviation: {traffic_df['simulated_speed_kph'].std():.2f} km/h")
    print(f"  - Rush hour avg speed: {traffic_df[traffic_df['is_rush_hour']]['simulated_speed_kph'].mean():.2f} km/h")
    print(f"  - Non-rush hour avg speed: {traffic_df[~traffic_df['is_rush_hour']]['simulated_speed_kph'].mean():.2f} km/h")
    print(f"  - Weekend avg speed: {traffic_df[traffic_df['is_weekend']]['simulated_speed_kph'].mean():.2f} km/h")
    
    print(f"\n7. Saving simulated traffic data...")
    try:
        output_file = 'data/delhi_simulated_traffic_data.csv'
        # Save only the required columns
        output_columns = ['osmid', 'timestamp', 'simulated_speed_kph']
        traffic_df[output_columns].to_csv(output_file, index=False)
        
        print(f"✓ Successfully saved traffic data to {output_file}")
        print(f"  - File size: {os.path.getsize(output_file) / (1024*1024):.2f} MB")
        
        # Display sample
        print(f"\n8. Sample of generated traffic data:")
        print(traffic_df[output_columns].head(5).to_string(index=False))
        
    except Exception as e:
        print(f"✗ Error saving data: {e}")
        return
    
    print(f"\n{'='*55}")
    print("Sprint 2 completed successfully! ✓")
    print(f"Output: {output_file}")

if __name__ == "__main__":
    generate_traffic_simulation()