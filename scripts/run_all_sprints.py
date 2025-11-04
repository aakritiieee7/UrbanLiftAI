"""
Master script to run all sprints in sequence
"""

import sys
import os
import subprocess
from datetime import datetime

def run_sprint(script_name, sprint_number, description):
    """Run a sprint script and handle errors"""
    print(f"\n{'='*60}")
    print(f"RUNNING SPRINT {sprint_number}: {description}")
    print(f"Script: {script_name}")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}")
    
    try:
        # Import and run the sprint module
        if script_name == 'sprint1_data_acquisition.py':
            from sprint1_data_acquisition import download_and_prepare_road_network
            download_and_prepare_road_network()
        elif script_name == 'sprint2_traffic_simulation.py':
            from sprint2_traffic_simulation import generate_traffic_simulation
            generate_traffic_simulation()
        elif script_name == 'sprint3_route_optimization.py':
            from sprint3_route_optimization import optimize_single_route
            optimize_single_route()
        elif script_name == 'sprint4_pooling_integration.py':
            from sprint4_pooling_integration import pooling_and_integration
            pooling_and_integration()
        
        print(f"\n✓ SPRINT {sprint_number} COMPLETED SUCCESSFULLY!")
        return True
        
    except Exception as e:
        print(f"\n✗ SPRINT {sprint_number} FAILED: {e}")
        return False

def main():
    """Run all sprints in sequence"""
    print("Delhi Route Optimization - Complete Pipeline")
    print("=" * 60)
    print("This script will run all 4 sprints in sequence:")
    print("1. Data Acquisition & Preparation")
    print("2. Traffic Simulation")
    print("3. Route Optimization")
    print("4. Pooling & Integration")
    print("=" * 60)
    
    # Create data directory
    os.makedirs('data', exist_ok=True)
    
    sprints = [
        ('sprint1_data_acquisition.py', 1, 'Data Acquisition & Preparation'),
        ('sprint2_traffic_simulation.py', 2, 'Traffic Simulation'),
        ('sprint3_route_optimization.py', 3, 'Route Optimization'),
        ('sprint4_pooling_integration.py', 4, 'Pooling & Integration')
    ]
    
    results = []
    start_time = datetime.now()
    
    for script_name, sprint_number, description in sprints:
        success = run_sprint(script_name, sprint_number, description)
        results.append((sprint_number, description, success))
        
        if not success:
            print(f"\n⚠ Sprint {sprint_number} failed. Stopping pipeline.")
            break
    
    # Final summary
    end_time = datetime.now()
    duration = end_time - start_time
    
    print(f"\n{'='*60}")
    print("PIPELINE SUMMARY")
    print(f"{'='*60}")
    print(f"Started: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Finished: {end_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Duration: {duration}")
    print(f"\nResults:")
    
    for sprint_number, description, success in results:
        status = "✓ SUCCESS" if success else "✗ FAILED"
        print(f"  Sprint {sprint_number}: {description} - {status}")
    
    successful_sprints = sum(1 for _, _, success in results if success)
    print(f"\nOverall: {successful_sprints}/{len(sprints)} sprints completed successfully")
    
    if successful_sprints == len(sprints):
        print("\n🎉 All sprints completed successfully!")
        print("Check the 'data/' directory for outputs:")
        print("  - delhi_road_network_filtered.geojson")
        print("  - delhi_simulated_traffic_data.csv")
        print("  - delhi_optimal_route.png")
        print("  - delhi_optimal_route.csv")
        print("  - delhi_pooled_routes.json")
    else:
        print(f"\n⚠ Pipeline incomplete. {len(sprints) - successful_sprints} sprints failed.")

if __name__ == "__main__":
    main()