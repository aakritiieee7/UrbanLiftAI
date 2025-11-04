# Delhi Route Optimization Scripts

This directory contains Python scripts for a complete route optimization pipeline focused on Delhi, India. The system demonstrates data acquisition, traffic simulation, route optimization, and shipment pooling.

## 🚀 Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Run all sprints at once
python run_all_sprints.py

# Or run individual sprints
python sprint1_data_acquisition.py
python sprint2_traffic_simulation.py
python sprint3_route_optimization.py
python sprint4_pooling_integration.py
```

## 📋 Sprint Overview

### Sprint 1: Data Acquisition & Preparation
**File:** `sprint1_data_acquisition.py`

- Downloads Delhi road network using OSMnx
- Filters for primary, secondary, and tertiary roads
- Exports filtered network as GeoJSON
- **Output:** `data/delhi_road_network_filtered.geojson`

### Sprint 2: Traffic Simulation
**File:** `sprint2_traffic_simulation.py`

- Loads filtered road network
- Generates realistic traffic patterns with:
  - Rush hour effects (8-10 AM, 5-7 PM)
  - Weekend variations
  - Random noise for realism
- **Output:** `data/delhi_simulated_traffic_data.csv`

### Sprint 3: Route Optimization
**File:** `sprint3_route_optimization.py`

- Merges traffic data with road network
- Calculates travel times for each road segment
- Finds optimal route using Dijkstra's algorithm
- Creates route visualization
- **Outputs:** 
  - `data/delhi_optimal_route.png` (visualization)
  - `data/delhi_optimal_route.csv` (coordinates)

### Sprint 4: Pooling & Integration
**File:** `sprint4_pooling_integration.py`

- Generates hypothetical shipments
- Uses K-Means clustering for shipment pooling
- Implements DRLAgent class for route planning
- Calculates multi-stop routes for each pool
- **Output:** `data/delhi_pooled_routes.json`

## 🛠 Technical Architecture

### Core Components

1. **DRLAgent Class**: Placeholder for Deep Reinforcement Learning
   - Uses OSMnx shortest path as baseline
   - Calculates route statistics
   - Designed for future ML integration

2. **Traffic Simulation Engine**:
   - Time-based speed variations
   - Road type considerations
   - Rush hour modeling

3. **Pooling Algorithm**:
   - K-Means clustering on pickup locations
   - Multi-stop route optimization
   - Efficiency scoring

### Data Flow

```
Raw OSM Data → Filtered Network → Traffic Simulation → Route Optimization → Pooling
```

## 📊 Output Files

| File | Description | Size (approx) |
|------|-------------|---------------|
| `delhi_road_network_filtered.geojson` | Filtered Delhi roads | ~50MB |
| `delhi_simulated_traffic_data.csv` | Traffic speed time series | ~20MB |
| `delhi_optimal_route.png` | Route visualization | ~2MB |
| `delhi_optimal_route.csv` | Route coordinates | ~50KB |
| `delhi_pooled_routes.json` | Pooled shipment routes | ~100KB |

## 🔧 Configuration

### Key Parameters

```python
# Sprint 1
PLACE_NAME = "Delhi, India"
NETWORK_TYPE = "drive"
ROAD_TYPES = ['primary', 'secondary', 'tertiary']

# Sprint 2
SIMULATION_DAYS = 7
TIME_INTERVAL = 1  # hour
RUSH_HOURS = [(8, 10), (17, 19)]

# Sprint 3
START_COORDS = (77.2090, 28.6139)  # Connaught Place
END_COORDS = (77.3910, 28.5355)    # Noida Sector 18

# Sprint 4
NUM_SHIPMENTS = 20
CLUSTERING_METHOD = "KMeans"
```

## 📈 Performance Metrics

The system tracks various metrics:

- **Route Efficiency**: Distance and time optimization
- **Pooling Effectiveness**: Shipments per pool
- **Traffic Awareness**: Speed-based routing
- **Scalability**: Processing time per shipment

## 🎯 Use Cases

1. **Logistics Optimization**: Multi-stop delivery routes
2. **Traffic Analysis**: Understanding Delhi traffic patterns
3. **Research**: Baseline for advanced routing algorithms
4. **Education**: Learning route optimization concepts

## 🔮 Future Enhancements

1. **Real-time Traffic**: Integration with live traffic APIs
2. **Machine Learning**: Replace heuristics with ML models
3. **Vehicle Constraints**: Capacity and time windows
4. **Dynamic Pricing**: Cost-based optimization
5. **Multi-city Support**: Expand beyond Delhi

## 📝 Dependencies

- **osmnx**: Road network data
- **geopandas**: Geospatial operations
- **sklearn**: Clustering algorithms
- **networkx**: Graph algorithms
- **matplotlib**: Visualization

## 🐛 Troubleshooting

### Common Issues

1. **Memory Error**: Reduce simulation time period
2. **Network Timeout**: Check internet connection
3. **Missing Data**: Ensure previous sprints completed
4. **Visualization Error**: Install matplotlib backend

### Debug Mode

Add `DEBUG=True` to any script for verbose logging.

## 📄 License

This code is provided for educational and research purposes.

---

*Generated for UrbanLift.AI logistics optimization platform*