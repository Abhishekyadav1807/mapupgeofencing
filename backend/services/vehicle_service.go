package services

import (
	"errors"

	"geofencing-system/models"

	"gorm.io/gorm"
)

var ErrVehicleNotFound = errors.New("vehicle not found")

type VehicleService struct {
	db *gorm.DB
}

func NewVehicleService(db *gorm.DB) *VehicleService {
	return &VehicleService{db: db}
}

func (s *VehicleService) Create(name string) (*models.Vehicle, error) {
	vehicle := &models.Vehicle{Name: name}
	if err := s.db.Create(vehicle).Error; err != nil {
		return nil, err
	}
	return vehicle, nil
}

func (s *VehicleService) List() ([]models.Vehicle, error) {
	var vehicles []models.Vehicle
	if err := s.db.Order("id asc").Find(&vehicles).Error; err != nil {
		return nil, err
	}
	return vehicles, nil
}

func (s *VehicleService) GetByID(id uint) (*models.Vehicle, error) {
	var vehicle models.Vehicle
	if err := s.db.First(&vehicle, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrVehicleNotFound
		}
		return nil, err
	}
	return &vehicle, nil
}
