# MapUp Geofencing API

A Go backend for geofence management, vehicle tracking, entry/exit detection, violation history, and real-time WebSocket alerts.

## Tech Stack

- **Go** with **Gin** HTTP framework
- **GORM** ORM with **SQLite** database
- **Gorilla WebSocket** for real-time alert broadcasting

## Quick Start

### Local development

```bash
cd backend
go run main.go
```

The server starts on `http://localhost:8080`.

### Docker

```bash
cd backend
docker compose up --build
```

## API Endpoints

Every response includes a `time_ns` field (request execution duration in nanoseconds).

### Geofences

| Method | Endpoint       | Description              |
|--------|----------------|--------------------------|
| POST   | `/geofences`   | Create a geofence        |
| GET    | `/geofences`   | List all geofences       |

**Create geofence**

```json
POST /geofences
{
  "name": "Warehouse Zone",
  "polygon": [
    { "lat": 12.97, "lng": 77.59 },
    { "lat": 12.98, "lng": 77.59 },
    { "lat": 12.98, "lng": 77.60 },
    { "lat": 12.97, "lng": 77.60 }
  ]
}
```

Polygons are validated for minimum 3 vertices, valid coordinates, non-zero area, and no self-intersection.

### Vehicles

| Method | Endpoint     | Description        |
|--------|--------------|--------------------|
| POST   | `/vehicles`  | Register a vehicle |
| GET    | `/vehicles`  | List all vehicles  |

**Create vehicle**

```json
POST /vehicles
{
  "name": "Truck-001"
}
```

### Vehicle Locations

| Method | Endpoint                          | Description                    |
|--------|-----------------------------------|--------------------------------|
| POST   | `/vehicles/location`              | Record vehicle location        |
| GET    | `/vehicles/location/:vehicle_id`  | Get location history           |

**Record location**

```json
POST /vehicles/location
{
  "vehicle_id": 1,
  "lat": 12.975,
  "lng": 77.595
}
```

Location updates trigger entry/exit detection against all geofences using a ray-casting point-in-polygon algorithm.

### Alerts

| Method | Endpoint             | Description              |
|--------|----------------------|--------------------------|
| POST   | `/alerts/configure`  | Configure alert rules    |
| GET    | `/alerts`            | List alert configurations|

**Configure alert**

```json
POST /alerts/configure
{
  "geofence_id": 1,
  "vehicle_id": 1,
  "alert_type": "both",
  "enabled": true
}
```

`alert_type` must be `entry`, `exit`, or `both`. Omit `vehicle_id` to apply the rule to all vehicles.

### Violations

| Method | Endpoint                | Description                          |
|--------|-------------------------|--------------------------------------|
| GET    | `/violations/history`   | Get violation history                |

Query parameters: `geofence_id`, `vehicle_id`, `limit` (default 100).

### WebSocket

| Method | Endpoint      | Description                    |
|--------|---------------|--------------------------------|
| GET    | `/ws/alerts`  | Real-time alert event stream   |

Connect with any WebSocket client:

```
ws://localhost:8080/ws/alerts
```

Events are broadcast when a configured entry or exit violation is detected:

```json
{
  "time_ns": 1250000,
  "data": {
    "violation_id": 1,
    "geofence_id": 1,
    "vehicle_id": 1,
    "type": "entry",
    "lat": 12.975,
    "lng": 77.595,
    "timestamp": "2024-06-14T10:00:00Z",
    "message": "Vehicle 1 entry geofence 1"
  }
}
```

## Project Structure

```
backend/
├── main.go
├── database/          # SQLite connection and auto-migration
├── models/            # Geofence, Vehicle, Location, AlertConfig, Violation
├── services/          # Business logic, polygon validation, detection
├── handlers/          # HTTP route handlers
├── websocket/         # WebSocket hub and broadcasting
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## Environment Variables

| Variable  | Default          | Description          |
|-----------|------------------|----------------------|
| `PORT`    | `8080`           | HTTP server port     |
| `DB_PATH` | `geofencing.db`  | SQLite database path |

## Response Format

All API responses follow this structure:

```json
{
  "time_ns": 1250000,
  "data": { }
}
```

Errors:

```json
{
  "time_ns": 1250000,
  "error": "polygon must have at least 3 distinct vertices"
}
```

## License

MapUp Geofencing Assessment
