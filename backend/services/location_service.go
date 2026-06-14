package services

import (
	"errors"
	"fmt"
	"time"

	"geofencing-system/models"

	"gorm.io/gorm"
)

var (
	ErrInvalidAlertType = errors.New("alert_type must be entry, exit, or both")
	ErrAlertNotFound    = errors.New("alert configuration not found")
)

type AlertService struct {
	db *gorm.DB
}

func NewAlertService(db *gorm.DB) *AlertService {
	return &AlertService{db: db}
}

func (s *AlertService) Configure(geofenceID uint, vehicleID *uint, alertType string, enabled bool) (*models.AlertConfig, error) {
	if alertType != "entry" && alertType != "exit" && alertType != "both" {
		return nil, ErrInvalidAlertType
	}

	var geofence models.Geofence
	if err := s.db.First(&geofence, geofenceID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrGeofenceNotFound
		}
		return nil, err
	}

	if vehicleID != nil {
		var vehicle models.Vehicle
		if err := s.db.First(&vehicle, *vehicleID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, ErrVehicleNotFound
			}
			return nil, err
		}
	}

	var config models.AlertConfig
	var err error
	if vehicleID == nil {
		err = s.db.Where("geofence_id = ? AND vehicle_id IS NULL", geofenceID).First(&config).Error
	} else {
		err = s.db.Where("geofence_id = ? AND vehicle_id = ?", geofenceID, *vehicleID).First(&config).Error
	}

	if err == nil {
		config.AlertType = alertType
		config.Enabled = enabled
		if err := s.db.Save(&config).Error; err != nil {
			return nil, err
		}
		return &config, nil
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	newConfig := &models.AlertConfig{
		GeofenceID: geofenceID,
		VehicleID:  vehicleID,
		AlertType:  alertType,
		Enabled:    enabled,
	}

	if err := s.db.Create(newConfig).Error; err != nil {
		return nil, err
	}
	return newConfig, nil
}

func (s *AlertService) List() ([]models.AlertConfig, error) {
	var configs []models.AlertConfig
	if err := s.db.Order("id asc").Find(&configs).Error; err != nil {
		return nil, err
	}
	return configs, nil
}

func (s *AlertService) ShouldAlert(config models.AlertConfig, vehicleID uint, violationType string) bool {
	if !config.Enabled {
		return false
	}
	if config.VehicleID != nil && *config.VehicleID != vehicleID {
		return false
	}
	switch config.AlertType {
	case "both":
		return violationType == "entry" || violationType == "exit"
	case violationType:
		return true
	default:
		return false
	}
}

type ViolationService struct {
	db *gorm.DB
}

func NewViolationService(db *gorm.DB) *ViolationService {
	return &ViolationService{db: db}
}

func (s *ViolationService) Create(violation *models.Violation) error {
	return s.db.Create(violation).Error
}

func (s *ViolationService) History(geofenceID, vehicleID *uint, limit int) ([]models.Violation, error) {
	if limit <= 0 {
		limit = 100
	}

	query := s.db.Order("timestamp desc").Limit(limit)
	if geofenceID != nil {
		query = query.Where("geofence_id = ?", *geofenceID)
	}
	if vehicleID != nil {
		query = query.Where("vehicle_id = ?", *vehicleID)
	}

	var violations []models.Violation
	if err := query.Find(&violations).Error; err != nil {
		return nil, err
	}
	return violations, nil
}

type LocationService struct {
	db            *gorm.DB
	geofenceSvc   *GeofenceService
	vehicleSvc    *VehicleService
	alertSvc      *AlertService
	violationSvc  *ViolationService
	broadcaster   AlertBroadcaster
}

type AlertBroadcaster interface {
	Broadcast(event models.AlertEvent)
}

func NewLocationService(
	db *gorm.DB,
	geofenceSvc *GeofenceService,
	vehicleSvc *VehicleService,
	alertSvc *AlertService,
	violationSvc *ViolationService,
	broadcaster AlertBroadcaster,
) *LocationService {
	return &LocationService{
		db:           db,
		geofenceSvc:  geofenceSvc,
		vehicleSvc:   vehicleSvc,
		alertSvc:     alertSvc,
		violationSvc: violationSvc,
		broadcaster:  broadcaster,
	}
}

func (s *LocationService) RecordLocation(vehicleID uint, lat, lng float64) (*models.Location, []models.AlertEvent, error) {
	if err := validatePoint(models.Point{Lat: lat, Lng: lng}); err != nil {
		return nil, nil, err
	}

	if _, err := s.vehicleSvc.GetByID(vehicleID); err != nil {
		return nil, nil, err
	}

	now := time.Now()
	location := &models.Location{
		VehicleID: vehicleID,
		Lat:       lat,
		Lng:       lng,
		Timestamp: now,
	}
	if err := s.db.Create(location).Error; err != nil {
		return nil, nil, err
	}

	events, err := s.detectViolations(vehicleID, lat, lng, now)
	if err != nil {
		return location, nil, err
	}

	for _, event := range events {
		if s.broadcaster != nil {
			s.broadcaster.Broadcast(event)
		}
	}

	return location, events, nil
}

func (s *LocationService) GetVehicleLocations(vehicleID uint) ([]models.Location, error) {
	if _, err := s.vehicleSvc.GetByID(vehicleID); err != nil {
		return nil, err
	}

	var locations []models.Location
	if err := s.db.Where("vehicle_id = ?", vehicleID).Order("timestamp desc").Find(&locations).Error; err != nil {
		return nil, err
	}
	return locations, nil
}

func (s *LocationService) detectViolations(vehicleID uint, lat, lng float64, timestamp time.Time) ([]models.AlertEvent, error) {
	geofences, err := s.geofenceSvc.List()
	if err != nil {
		return nil, err
	}

	alertConfigs, err := s.alertSvc.List()
	if err != nil {
		return nil, err
	}

	point := models.Point{Lat: lat, Lng: lng}
	var events []models.AlertEvent

	for _, geofence := range geofences {
		polygon, err := geofence.GetPolygon()
		if err != nil {
			return nil, err
		}

		inside := PointInPolygon(point, polygon)
		state, err := s.getOrCreateState(vehicleID, geofence.ID)
		if err != nil {
			return nil, err
		}

		var violationType string
		if inside && !state.Inside {
			violationType = "entry"
		} else if !inside && state.Inside {
			violationType = "exit"
		}

		if violationType != "" {
			shouldRecord := false
			for _, config := range alertConfigs {
				if config.GeofenceID == geofence.ID && s.alertSvc.ShouldAlert(config, vehicleID, violationType) {
					shouldRecord = true
					break
				}
			}

			if shouldRecord {
				violation := &models.Violation{
					GeofenceID: geofence.ID,
					VehicleID:  vehicleID,
					Type:       violationType,
					Lat:        lat,
					Lng:        lng,
					Timestamp:  timestamp,
				}
				if err := s.violationSvc.Create(violation); err != nil {
					return nil, err
				}

				event := models.AlertEvent{
					ViolationID: violation.ID,
					GeofenceID:  geofence.ID,
					VehicleID:   vehicleID,
					Type:        violationType,
					Lat:         lat,
					Lng:         lng,
					Timestamp:   timestamp,
					Message:     fmt.Sprintf("Vehicle %d %s geofence %d", vehicleID, violationType, geofence.ID),
				}
				events = append(events, event)
			}
		}

		state.Inside = inside
		if err := s.db.Save(state).Error; err != nil {
			return nil, err
		}
	}

	return events, nil
}

func (s *LocationService) getOrCreateState(vehicleID, geofenceID uint) (*models.VehicleGeofenceState, error) {
	var state models.VehicleGeofenceState
	err := s.db.Where(models.VehicleGeofenceState{VehicleID: vehicleID, GeofenceID: geofenceID}).
		FirstOrCreate(&state).Error
	if err != nil {
		return nil, err
	}
	return &state, nil
}
