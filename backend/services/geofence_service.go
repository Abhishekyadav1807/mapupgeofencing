package services

import (
	"errors"

	"geofencing-system/models"

	"gorm.io/gorm"
)

var ErrGeofenceNotFound = errors.New("geofence not found")

type GeofenceService struct {
	db *gorm.DB
}

func NewGeofenceService(db *gorm.DB) *GeofenceService {
	return &GeofenceService{db: db}
}

func (s *GeofenceService) Create(name string, polygon []models.Point) (*models.Geofence, error) {
	// If the polygon is closed (first and last vertex are equal), strip the last vertex
	// to convert it to an open vertex list representation.
	if len(polygon) > 1 && pointsEqual(polygon[0], polygon[len(polygon)-1]) {
		polygon = polygon[:len(polygon)-1]
	}

	if err := ValidatePolygon(polygon); err != nil {
		return nil, err
	}


	geofence := &models.Geofence{Name: name}
	if err := geofence.SetPolygon(polygon); err != nil {
		return nil, err
	}

	if err := s.db.Create(geofence).Error; err != nil {
		return nil, err
	}
	return geofence, nil
}

func (s *GeofenceService) List() ([]models.Geofence, error) {
	var geofences []models.Geofence
	if err := s.db.Order("id asc").Find(&geofences).Error; err != nil {
		return nil, err
	}
	return geofences, nil
}

func (s *GeofenceService) GetByID(id uint) (*models.Geofence, error) {
	var geofence models.Geofence
	if err := s.db.First(&geofence, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrGeofenceNotFound
		}
		return nil, err
	}
	return &geofence, nil
}

func (s *GeofenceService) IsPointInside(geofenceID uint, point models.Point) (bool, error) {
	geofence, err := s.GetByID(geofenceID)
	if err != nil {
		return false, err
	}
	polygon, err := geofence.GetPolygon()
	if err != nil {
		return false, err
	}
	return PointInPolygon(point, polygon), nil
}
