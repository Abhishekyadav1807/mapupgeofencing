package services

import (
	"testing"

	"geofencing-system/models"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open in-memory database: %v", err)
	}

	err = db.AutoMigrate(
		&models.Geofence{},
		&models.Vehicle{},
		&models.Location{},
		&models.AlertConfig{},
		&models.Violation{},
		&models.VehicleGeofenceState{},
	)
	if err != nil {
		t.Fatalf("failed to auto-migrate: %v", err)
	}
	return db
}

type mockBroadcaster struct {
	events []models.AlertEvent
}

func (m *mockBroadcaster) Broadcast(event models.AlertEvent) {
	m.events = append(m.events, event)
}

func TestGeofenceClosedLoopStripping(t *testing.T) {
	db := setupTestDB(t)
	geofenceSvc := NewGeofenceService(db)

	polygon := []models.Point{
		{Lat: 0, Lng: 0},
		{Lat: 0, Lng: 10},
		{Lat: 10, Lng: 10},
		{Lat: 10, Lng: 0},
		{Lat: 0, Lng: 0}, // closing point
	}

	gf, err := geofenceSvc.Create("Test Geofence", polygon)
	if err != nil {
		t.Fatalf("failed to create geofence: %v", err)
	}

	points, err := gf.GetPolygon()
	if err != nil {
		t.Fatalf("failed to parse stored polygon: %v", err)
	}

	if len(points) != 4 {
		t.Errorf("expected 4 vertices after stripping the duplicate closing vertex, got %d", len(points))
	}
}

func TestAlertConfigureUpsert(t *testing.T) {
	db := setupTestDB(t)
	geofenceSvc := NewGeofenceService(db)
	vehicleSvc := NewVehicleService(db)
	alertSvc := NewAlertService(db)

	// Setup Geofence & Vehicle
	gf, err := geofenceSvc.Create("GF", []models.Point{
		{Lat: 0, Lng: 0},
		{Lat: 0, Lng: 10},
		{Lat: 10, Lng: 0},
	})
	if err != nil {
		t.Fatalf("failed to create geofence: %v", err)
	}

	vehicle, err := vehicleSvc.Create("V1")
	if err != nil {
		t.Fatalf("failed to create vehicle: %v", err)
	}

	// 1. Initial Configure (Enable)
	config, err := alertSvc.Configure(gf.ID, &vehicle.ID, "entry", true)
	if err != nil {
		t.Fatalf("failed to configure alert: %v", err)
	}
	if !config.Enabled || config.AlertType != "entry" {
		t.Errorf("initial config mismatch: %+v", config)
	}

	// Verify count is 1
	var count int64
	db.Model(&models.AlertConfig{}).Count(&count)
	if count != 1 {
		t.Errorf("expected 1 alert config record, got %d", count)
	}

	// 2. Configure Upsert (Disable and change type)
	config2, err := alertSvc.Configure(gf.ID, &vehicle.ID, "both", false)
	if err != nil {
		t.Fatalf("failed to configure alert upsert: %v", err)
	}
	if config2.ID != config.ID {
		t.Errorf("expected updated configuration to keep same ID %d, got %d", config.ID, config2.ID)
	}
	if config2.Enabled || config2.AlertType != "both" {
		t.Errorf("updated config did not reflect changes: %+v", config2)
	}

	// Verify count is still 1
	db.Model(&models.AlertConfig{}).Count(&count)
	if count != 1 {
		t.Errorf("expected exactly 1 alert config record after upsert, got %d", count)
	}
}

func TestLocationServiceRecordAndDetection(t *testing.T) {
	db := setupTestDB(t)
	geofenceSvc := NewGeofenceService(db)
	vehicleSvc := NewVehicleService(db)
	alertSvc := NewAlertService(db)
	violationSvc := NewViolationService(db)
	broadcaster := &mockBroadcaster{}

	locationSvc := NewLocationService(
		db,
		geofenceSvc,
		vehicleSvc,
		alertSvc,
		violationSvc,
		broadcaster,
	)

	// Create Geofence (0,0) to (10,10)
	polygon := []models.Point{
		{Lat: 0, Lng: 0},
		{Lat: 0, Lng: 10},
		{Lat: 10, Lng: 10},
		{Lat: 10, Lng: 0},
	}
	gf, err := geofenceSvc.Create("Warehouse", polygon)
	if err != nil {
		t.Fatalf("failed to create geofence: %v", err)
	}

	// Create Vehicle
	vehicle, err := vehicleSvc.Create("Truck-01")
	if err != nil {
		t.Fatalf("failed to create vehicle: %v", err)
	}

	// Configure alert rules for entry/exit
	_, err = alertSvc.Configure(gf.ID, &vehicle.ID, "both", true)
	if err != nil {
		t.Fatalf("failed to configure alert config: %v", err)
	}

	// 1. Initial point: Outside
	_, alerts, err := locationSvc.RecordLocation(vehicle.ID, 15.0, 15.0)
	if err != nil {
		t.Fatalf("failed to record location: %v", err)
	}
	if len(alerts) != 0 {
		t.Errorf("expected no alerts initially, got %d", len(alerts))
	}

	// Verify state inside is false
	var state models.VehicleGeofenceState
	if err := db.Where("vehicle_id = ? AND geofence_id = ?", vehicle.ID, gf.ID).First(&state).Error; err != nil {
		t.Fatalf("failed to find state: %v", err)
	}
	if state.Inside {
		t.Error("expected state inside to be false")
	}

	// 2. Transition point: Move Inside
	_, alerts, err = locationSvc.RecordLocation(vehicle.ID, 5.0, 5.0)
	if err != nil {
		t.Fatalf("failed to record location: %v", err)
	}
	if len(alerts) != 1 {
		t.Fatalf("expected 1 alert (entry), got %d", len(alerts))
	}
	if alerts[0].Type != "entry" {
		t.Errorf("expected entry alert, got %s", alerts[0].Type)
	}
	if len(broadcaster.events) != 1 {
		t.Errorf("expected 1 broadcast event, got %d", len(broadcaster.events))
	}

	// Verify state inside is now true
	if err := db.Where("vehicle_id = ? AND geofence_id = ?", vehicle.ID, gf.ID).First(&state).Error; err != nil {
		t.Fatalf("failed to find state: %v", err)
	}
	if !state.Inside {
		t.Error("expected state inside to be true")
	}

	// 3. Move again inside: Should not trigger additional alert
	_, alerts, err = locationSvc.RecordLocation(vehicle.ID, 6.0, 6.0)
	if err != nil {
		t.Fatalf("failed to record location: %v", err)
	}
	if len(alerts) != 0 {
		t.Errorf("expected no alerts on internal movement, got %d", len(alerts))
	}

	// 4. Transition point: Move Outside
	_, alerts, err = locationSvc.RecordLocation(vehicle.ID, 12.0, 12.0)
	if err != nil {
		t.Fatalf("failed to record location: %v", err)
	}
	if len(alerts) != 1 {
		t.Fatalf("expected 1 alert (exit), got %d", len(alerts))
	}
	if alerts[0].Type != "exit" {
		t.Errorf("expected exit alert, got %s", alerts[0].Type)
	}

	// Verify state inside is now false
	if err := db.Where("vehicle_id = ? AND geofence_id = ?", vehicle.ID, gf.ID).First(&state).Error; err != nil {
		t.Fatalf("failed to find state: %v", err)
	}
	if state.Inside {
		t.Error("expected state inside to be false")
	}
}
