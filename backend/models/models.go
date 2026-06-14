package models

import (
	"encoding/json"
	"time"
)

type Point struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

type Geofence struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Name      string    `json:"name" gorm:"not null"`
	Polygon   string    `json:"polygon" gorm:"type:text;not null"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (g *Geofence) GetPolygon() ([]Point, error) {
	var points []Point
	if err := json.Unmarshal([]byte(g.Polygon), &points); err != nil {
		return nil, err
	}
	return points, nil
}

func (g *Geofence) SetPolygon(points []Point) error {
	data, err := json.Marshal(points)
	if err != nil {
		return err
	}
	g.Polygon = string(data)
	return nil
}

func (g *Geofence) MarshalJSON() ([]byte, error) {
	type Alias Geofence
	var poly []Point
	if g.Polygon != "" {
		if err := json.Unmarshal([]byte(g.Polygon), &poly); err != nil {
			return nil, err
		}
	}
	return json.Marshal(&struct {
		*Alias
		Polygon []Point `json:"polygon"`
	}{
		Alias:   (*Alias)(g),
		Polygon: poly,
	})
}


type Vehicle struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Name      string    `json:"name" gorm:"not null;uniqueIndex"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Location struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	VehicleID uint      `json:"vehicle_id" gorm:"not null;index"`
	Lat       float64   `json:"lat" gorm:"not null"`
	Lng       float64   `json:"lng" gorm:"not null"`
	Timestamp time.Time `json:"timestamp" gorm:"not null;index"`
}

type AlertConfig struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	GeofenceID uint      `json:"geofence_id" gorm:"not null;index"`
	VehicleID  *uint     `json:"vehicle_id,omitempty" gorm:"index"`
	AlertType  string    `json:"alert_type" gorm:"not null"`
	Enabled    bool      `json:"enabled" gorm:"default:true"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type Violation struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	GeofenceID uint      `json:"geofence_id" gorm:"not null;index"`
	VehicleID  uint      `json:"vehicle_id" gorm:"not null;index"`
	Type       string    `json:"type" gorm:"not null"`
	Lat        float64   `json:"lat"`
	Lng        float64   `json:"lng"`
	Timestamp  time.Time `json:"timestamp" gorm:"not null;index"`
}

type VehicleGeofenceState struct {
	ID         uint `json:"id" gorm:"primaryKey"`
	VehicleID  uint `json:"vehicle_id" gorm:"not null;uniqueIndex:idx_vehicle_geofence"`
	GeofenceID uint `json:"geofence_id" gorm:"not null;uniqueIndex:idx_vehicle_geofence"`
	Inside     bool `json:"inside" gorm:"not null;default:false"`
}

type AlertEvent struct {
	ViolationID uint      `json:"violation_id"`
	GeofenceID  uint      `json:"geofence_id"`
	VehicleID   uint      `json:"vehicle_id"`
	Type        string    `json:"type"`
	Lat         float64   `json:"lat"`
	Lng         float64   `json:"lng"`
	Timestamp   time.Time `json:"timestamp"`
	Message     string    `json:"message"`
}
