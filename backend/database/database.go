package database

import (
	"log"
	"os"
	"path/filepath"

	"geofencing-system/models"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Connect() *gorm.DB {
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "geofencing.db"
	}

	if dir := filepath.Dir(dbPath); dir != "." && dir != "" {
		if err := os.MkdirAll(dir, 0755); err != nil {
			log.Fatalf("failed to create database directory: %v", err)
		}
	}

	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	if err := db.AutoMigrate(
		&models.Geofence{},
		&models.Vehicle{},
		&models.Location{},
		&models.AlertConfig{},
		&models.Violation{},
		&models.VehicleGeofenceState{},
	); err != nil {
		log.Fatalf("failed to auto-migrate database: %v", err)
	}

	return db
}
